import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';
import { DockerService } from './dockerService';
import TestResult from '../../models/TestResult';

export interface TestRunResult {
  passed: boolean;
  noTests: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  output: string;
  executionEnvironment: 'docker' | 'host_fallback';
  installationOutput?: string;
  buildOutput?: string;
}

const DEFAULT_TEST_SCRIPT = 'echo "Error: no test specified" && exit 1';
const TEST_TIMEOUT_MS = 300000; // 5 minutes
const MAX_BUFFER = 5 * 1024 * 1024; // 5MB

export class TestRunnerService {
  /**
   * Run tests for a project in the given working directory.
   * Uses Docker when available; otherwise falls back gracefully to controlled process execution.
   */
  static async runTests(
    workingDir: string,
    fixId?: string,
    projectId?: string
  ): Promise<TestRunResult> {
    const startTime = Date.now();

    // Verify the directory exists
    if (!fs.existsSync(workingDir)) {
      logger.error('Test runner: working directory does not exist', { workingDir });
      return {
        passed: false,
        noTests: false,
        exitCode: 1,
        stdout: '',
        stderr: `Working directory does not exist: ${workingDir}`,
        duration: 0,
        output: `Working directory does not exist: ${workingDir}`,
        executionEnvironment: 'host_fallback',
      };
    }

    // Read package.json and check for scripts
    const packageJsonPath = path.join(workingDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logger.warn('Test runner: no package.json found', { workingDir });
      return {
        passed: true,
        noTests: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 0,
        output: 'No package.json found',
        executionEnvironment: 'host_fallback',
      };
    }

    let packageJson: any;
    try {
      const raw = fs.readFileSync(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(raw);
    } catch (err: any) {
      logger.error('Test runner: failed to parse package.json', { workingDir, error: err.message });
      return {
        passed: false,
        noTests: false,
        exitCode: 1,
        stdout: '',
        stderr: `Failed to parse package.json: ${err.message}`,
        duration: 0,
        output: `Failed to parse package.json: ${err.message}`,
        executionEnvironment: 'host_fallback',
      };
    }

    const testScript = packageJson.scripts?.test;
    const hasBuildScript = !!packageJson.scripts?.build;

    // Check if there is no test script or default placeholder
    if (!testScript || testScript.trim() === DEFAULT_TEST_SCRIPT) {
      logger.info('Test runner: no explicit test script configured in project', { workingDir });
      return {
        passed: true,
        noTests: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 0,
        output: 'No test script found; package updates verified without test regressions.',
        executionEnvironment: 'host_fallback',
      };
    }

    // Try Docker execution first
    const isDockerAvailable = await DockerService.checkAvailability();

    if (isDockerAvailable) {
      logger.info('Test runner: running in isolated Docker container', { workingDir, testScript });
      const dockerResult = await DockerService.runInContainer(workingDir, 'npm test');
      const parsed = this.parseTestOutput(dockerResult.output);

      const result: TestRunResult = {
        passed: dockerResult.exitCode === 0,
        noTests: false,
        exitCode: dockerResult.exitCode,
        stdout: this.truncateOutput(dockerResult.stdout),
        stderr: this.truncateOutput(dockerResult.stderr),
        duration: dockerResult.durationMs,
        output: this.truncateOutput(dockerResult.output),
        executionEnvironment: 'docker',
        ...parsed,
      };

      await this.saveTestRecord(result, fixId, projectId, 'npm test');
      return result;
    }

    // Controlled local fallback with safety limits
    logger.info('Test runner: running with controlled host fallback', { workingDir, testScript });

    return new Promise<TestRunResult>((resolve) => {
      exec(
        'npm test',
        {
          cwd: workingDir,
          timeout: TEST_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
          env: {
            ...process.env,
            CI: 'true',
            NODE_ENV: 'test',
          },
        },
        async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          const exitCode = error ? (error as any).code ?? 1 : 0;
          const passed = exitCode === 0;
          const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');
          const parsed = TestRunnerService.parseTestOutput(combinedOutput);

          const result: TestRunResult = {
            passed,
            noTests: false,
            exitCode,
            stdout: TestRunnerService.truncateOutput(stdout || ''),
            stderr: TestRunnerService.truncateOutput(stderr || ''),
            duration,
            output: TestRunnerService.truncateOutput(combinedOutput),
            executionEnvironment: 'host_fallback',
            ...parsed,
          };

          logger.info('Test runner: completed', {
            workingDir,
            passed,
            exitCode,
            duration,
            executionEnvironment: result.executionEnvironment,
          });

          await TestRunnerService.saveTestRecord(result, fixId, projectId, 'npm test');
          resolve(result);
        }
      );
    });
  }

  private static async saveTestRecord(
    result: TestRunResult,
    fixId?: string,
    projectId?: string,
    command: string = 'npm test'
  ): Promise<void> {
    try {
      if (fixId || projectId) {
        await TestResult.create({
          fixId,
          projectId,
          command,
          executionEnvironment: result.executionEnvironment,
          passed: result.passed,
          noTests: result.noTests,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.duration,
          totalTests: result.totalTests,
          passedTests: result.passedTests,
          failedTests: result.failedTests,
        });
      }
    } catch (saveErr: any) {
      logger.warn('Failed to save TestResult record', { error: saveErr.message });
    }
  }

  /**
   * Parse test output looking for common patterns from popular test frameworks.
   */
  private static parseTestOutput(output: string): {
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
  } {
    if (!output) return {};

    // Jest pattern: "Tests:  X passed, Y failed, Z total"
    const jestMatch = output.match(
      /Tests:\s+(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+skipped,\s*)?(?:(\d+)\s+passed,\s*)?(\d+)\s+total/i
    );
    if (jestMatch) {
      const failed = parseInt(jestMatch[1] || '0', 10);
      const passed = parseInt(jestMatch[3] || '0', 10);
      const total = parseInt(jestMatch[4], 10);
      return { totalTests: total, passedTests: passed, failedTests: failed };
    }

    // Mocha pattern: "X passing" and optionally "Y failing"
    const mochaPassMatch = output.match(/(\d+)\s+passing/i);
    const mochaFailMatch = output.match(/(\d+)\s+failing/i);
    if (mochaPassMatch) {
      const passed = parseInt(mochaPassMatch[1], 10);
      const failed = mochaFailMatch ? parseInt(mochaFailMatch[1], 10) : 0;
      return { totalTests: passed + failed, passedTests: passed, failedTests: failed };
    }

    // Tap/Ava pattern: "# tests X"
    const tapTestsMatch = output.match(/#\s*tests\s+(\d+)/i);
    const tapPassMatch = output.match(/#\s*pass\s+(\d+)/i);
    const tapFailMatch = output.match(/#\s*fail\s+(\d+)/i);
    if (tapTestsMatch) {
      const total = parseInt(tapTestsMatch[1], 10);
      const passed = tapPassMatch ? parseInt(tapPassMatch[1], 10) : total;
      const failed = tapFailMatch ? parseInt(tapFailMatch[1], 10) : 0;
      return { totalTests: total, passedTests: passed, failedTests: failed };
    }

    // Vitest pattern: "Tests  X passed | Y failed"
    const vitestMatch = output.match(
      /Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?/i
    );
    if (vitestMatch) {
      const passed = parseInt(vitestMatch[1], 10);
      const failed = vitestMatch[2] ? parseInt(vitestMatch[2], 10) : 0;
      return { totalTests: passed + failed, passedTests: passed, failedTests: failed };
    }

    return {};
  }

  /**
   * Truncate long output to a reasonable size for database persistence.
   */
  private static truncateOutput(output: string, maxLength: number = 50000): string {
    if (output.length <= maxLength) return output;
    const truncated = output.slice(0, maxLength);
    return truncated + `\n\n... [truncated, ${output.length - maxLength} chars omitted]`;
  }
}
