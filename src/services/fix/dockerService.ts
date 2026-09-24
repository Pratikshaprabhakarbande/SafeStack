import { exec } from 'child_process';
import { promisify } from 'util';
import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

export interface DockerExecutionResult {
  available: boolean;
  executed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string;
  durationMs: number;
  error?: string;
}

export class DockerService {
  private static docker: Docker | null = null;
  private static isDockerAvailable: boolean | null = null;

  /**
   * Check if Docker daemon is running and accessible.
   */
  static async checkAvailability(): Promise<boolean> {
    if (this.isDockerAvailable !== null) {
      return this.isDockerAvailable;
    }

    try {
      if (!this.docker) {
        this.docker = new Docker();
      }

      await this.docker.ping();
      this.isDockerAvailable = true;
      logger.info('Docker daemon detected and accessible');
      return true;
    } catch (err: any) {
      this.isDockerAvailable = false;
      logger.warn('Docker daemon is not accessible, using controlled host-isolation fallback', {
        reason: err.message,
      });
      return false;
    }
  }

  /**
   * Run command in an isolated Docker container mounting the workspace.
   */
  static async runInContainer(
    workingDir: string,
    command: string = 'npm test',
    image: string = 'node:18-alpine',
    timeoutMs: number = 300000
  ): Promise<DockerExecutionResult> {
    const startTime = Date.now();
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      return {
        available: false,
        executed: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Docker daemon is not available.',
        output: 'Docker daemon is not available.',
        durationMs: 0,
      };
    }

    try {
      const normalizedPath = path.resolve(workingDir).replace(/\\/g, '/');
      const dockerCmd = `docker run --rm -v "${normalizedPath}:/workspace" -w /workspace -e CI=true -e NODE_ENV=test ${image} sh -c "${command}"`;

      logger.info('Executing command in Docker container', { dockerCmd });

      const { stdout, stderr } = await execAsync(dockerCmd, {
        timeout: timeoutMs,
        maxBuffer: 5 * 1024 * 1024,
      });

      const durationMs = Date.now() - startTime;
      const output = [stdout, stderr].filter(Boolean).join('\n');

      return {
        available: true,
        executed: true,
        exitCode: 0,
        stdout,
        stderr,
        output,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const exitCode = error.code !== undefined ? error.code : 1;
      const stdout = error.stdout || '';
      const stderr = error.stderr || error.message || '';
      const output = [stdout, stderr].filter(Boolean).join('\n');

      return {
        available: true,
        executed: true,
        exitCode: typeof exitCode === 'number' ? exitCode : 1,
        stdout,
        stderr,
        output,
        durationMs,
        error: error.message,
      };
    }
  }
}
