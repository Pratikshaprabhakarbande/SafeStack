import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { SimpleGit } from 'simple-git';
import Fix, { IFix } from '../../models/Fix';
import Vulnerability from '../../models/Vulnerability';
import Scan from '../../models/Scan';
import Project from '../../models/Project';
import { TestRunnerService, TestRunResult } from './testRunnerService';
import { ReScanService } from '../scanner/reScanService';
import { VersionValidator } from './versionValidator';
import config from '../../config/environment';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

export class FixService {
  /**
   * Entry point: start an automated fix for a vulnerability.
   * Creates an isolated working copy and branch, and runs the workflow asynchronously.
   */
  static async startFix(vulnerabilityId: string, customVersion?: string): Promise<string> {
    const vulnerability = await Vulnerability.findById(vulnerabilityId);
    if (!vulnerability) {
      throw new Error(`Vulnerability not found: ${vulnerabilityId}`);
    }

    const scan = await Scan.findById(vulnerability.scanId);
    if (!scan) {
      throw new Error(`Scan not found for vulnerability: ${vulnerabilityId}`);
    }

    const project = await Project.findById(scan.projectId);
    if (!project) {
      throw new Error(`Project not found for scan: ${scan._id}`);
    }

    // Build isolated fix branch name following safestack naming convention
    const timestamp = Date.now();
    const safePkgName = vulnerability.packageName.replace(/[^a-zA-Z0-9-]/g, '-');
    const branchName = `safestack/security-fix-${safePkgName}-${timestamp}`;

    const fix = await Fix.create({
      projectId: project._id,
      vulnerabilityId: vulnerability._id,
      branchName,
      baseBranch: project.defaultBranch || 'main',
      status: 'queued',
      startedAt: new Date(),
      updatedPackages: [],
      testsRun: false,
      hasCompatibilityIssue: false,
      compatibilityIssues: [],
      resolutionAttempted: false,
    });

    const fixId = fix._id.toString();

    // Mark vulnerability status
    await Vulnerability.findByIdAndUpdate(vulnerabilityId, { status: 'fixing' });

    // Execute fix in background
    this.executeFix(fixId, vulnerability, project, customVersion).catch((error) => {
      logger.error('Fix execution failed unexpectedly', { fixId, error: error.message });
    });

    return fixId;
  }

  /**
   * Main fix pipeline executed in an isolated workspace.
   */
  private static async executeFix(
    fixId: string,
    vulnerability: any,
    project: any,
    targetVersionOverride?: string
  ): Promise<void> {
    let workingDir: string | null = null;

    try {
      const projectSourceDir = this.resolveProjectPath(project);
      if (!projectSourceDir || !fs.existsSync(projectSourceDir)) {
        throw new Error(`Project source directory not found: ${projectSourceDir}`);
      }

      // Step 1: Create isolated working copy (Rule: NEVER modify main/original project)
      const workingBase = path.resolve(config.storage.workingDir);
      fs.mkdirSync(workingBase, { recursive: true });
      workingDir = path.join(workingBase, `fix-${uuidv4()}`);

      logger.info('Fix: creating isolated workspace', {
        fixId,
        source: projectSourceDir,
        dest: workingDir,
      });

      fs.cpSync(projectSourceDir, workingDir, { recursive: true });

      // Save working directory on fix record
      await Fix.findByIdAndUpdate(fixId, {
        workingDir,
        status: 'creating_branch',
      });

      // Step 2: Initialize Git in isolated copy if needed and create SafeStack branch
      const git: SimpleGit = simpleGit(workingDir);
      const isGitRepo = fs.existsSync(path.join(workingDir, '.git'));
      const fixDoc = await Fix.findById(fixId);
      const branchName = fixDoc?.branchName || `safestack/security-fix-${Date.now()}`;

      if (!isGitRepo) {
        await git.init();
        await git.add('.');
        await git.commit('Initial repository state');
      }

      // Create and checkout new fix branch
      try {
        await git.checkoutLocalBranch(branchName);
      } catch {
        await git.checkout(['-b', branchName]);
      }

      logger.info('Fix: checked out isolated fix branch', { fixId, branchName });

      // Step 3: Read package.json in working copy
      const packageJsonPath = path.join(workingDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found in working copy');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const packagesBefore = {
        dependencies: { ...packageJson.dependencies },
        devDependencies: { ...packageJson.devDependencies },
      };

      await Fix.findByIdAndUpdate(fixId, { packagesBefore });

      // Step 4: Determine target safe version with validation
      const packageName: string = vulnerability.packageName;
      const fromVersion = this.findCurrentVersion(packageJson, packageName);
      const installedVersion = fromVersion || vulnerability.currentVersion || 'unknown';

      // Extract vulnerable range from advisory data
      const vulnerableRange = vulnerability.vulnerableRange || vulnerability.currentVersion || undefined;

      // Determine the advisory's fixed version (from scanner data, NOT hardcoded)
      const advisoryFixedVersion = targetVersionOverride || vulnerability.recommendedVersion;

      // If no advisory fixed version is available, we cannot safely auto-fix
      if (!advisoryFixedVersion) {
        logger.warn('Fix: no verified safe version available from advisory data', {
          fixId,
          packageName,
          installedVersion,
        });

        await Fix.findByIdAndUpdate(fixId, {
          status: 'manual_review_required',
          completedAt: new Date(),
          errorMessage: 'SafeStack could not determine a verified safe upgrade. Manual review required.',
          versionValidation: {
            isValid: false,
            isDowngrade: false,
            currentVersion: installedVersion,
            recommendedVersion: 'unknown',
            reason: 'No advisory-recommended version available.',
            registryVerified: false,
          },
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
        return;
      }

      // Use VersionValidator to derive the safe version
      const safeVersionResult = VersionValidator.determineSafeVersion(
        installedVersion,
        advisoryFixedVersion,
        vulnerableRange
      );

      const targetVersion = safeVersionResult.version;

      if (!targetVersion) {
        // Current version is already at or above the fix — no upgrade needed
        logger.info('Fix: current version is already safe or no upgrade path found', {
          fixId,
          packageName,
          installedVersion,
          advisoryFixedVersion,
          reason: safeVersionResult.reason,
        });

        // Check if this is specifically a downgrade scenario
        const comparison = VersionValidator.compareSemver(
          VersionValidator.cleanVersion(advisoryFixedVersion),
          VersionValidator.cleanVersion(installedVersion)
        );

        const status = comparison < 0 ? 'unsafe_downgrade' : 'manual_review_required';

        await Fix.findByIdAndUpdate(fixId, {
          status,
          completedAt: new Date(),
          errorMessage: safeVersionResult.reason,
          versionValidation: {
            isValid: false,
            isDowngrade: comparison < 0,
            currentVersion: installedVersion,
            recommendedVersion: advisoryFixedVersion,
            reason: safeVersionResult.reason,
            registryVerified: false,
            advisoryFixedVersion,
            vulnerableRange,
          },
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
        return;
      }

      // Step 5: Validate version with full safety checks
      const validation = await VersionValidator.validateVersionSelection(
        packageName,
        installedVersion,
        targetVersion,
        vulnerableRange
      );

      logger.info('Fix: version validation result', {
        fixId,
        packageName,
        validation,
      });

      // Save validation result regardless of outcome
      await Fix.findByIdAndUpdate(fixId, { versionValidation: validation });

      // CRITICAL: Reject unsafe downgrades — STOP automated fix
      if (validation.isDowngrade) {
        logger.error('Fix: REJECTED — unsafe downgrade detected', {
          fixId,
          packageName,
          currentVersion: validation.currentVersion,
          recommendedVersion: validation.recommendedVersion,
        });

        await Fix.findByIdAndUpdate(fixId, {
          status: 'unsafe_downgrade',
          completedAt: new Date(),
          errorMessage: validation.reason,
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
        return; // DO NOT create a PR for a downgrade
      }

      // Reject if validation fails for other reasons
      if (!validation.isValid) {
        logger.warn('Fix: version validation failed', {
          fixId,
          packageName,
          reason: validation.reason,
        });

        await Fix.findByIdAndUpdate(fixId, {
          status: 'manual_review_required',
          completedAt: new Date(),
          errorMessage: validation.reason,
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
        return;
      }

      // Step 6: Update package.json target dependency safely
      await Fix.findByIdAndUpdate(fixId, { status: 'updating_deps' });

      const updated = this.updatePackageVersion(packageJson, packageName, targetVersion);
      if (!updated) {
        throw new Error(`Package "${packageName}" not found in dependencies or devDependencies`);
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

      // Step 7: Controlled update of package-lock.json (NEVER use npm audit fix --force)
      try {
        await execAsync('npm install --package-lock-only', {
          cwd: workingDir,
          timeout: 120000,
          maxBuffer: 5 * 1024 * 1024,
        });
        logger.info('Fix: package-lock.json updated safely', { fixId });
      } catch (npmError: any) {
        logger.warn('Fix: npm install had warnings', { fixId, stderr: npmError.stderr?.slice(0, 300) });
      }

      // Record packagesAfter
      const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const packagesAfter = {
        dependencies: { ...updatedPackageJson.dependencies },
        devDependencies: { ...updatedPackageJson.devDependencies },
      };

      const actualToVersion = this.findCurrentVersion(updatedPackageJson, packageName) || targetVersion;

      // Generate git diff of changes
      let diffOutput = '';
      try {
        diffOutput = await git.diff();
      } catch (diffErr: any) {
        logger.warn('Could not generate git diff', { error: diffErr.message });
      }

      await Fix.findByIdAndUpdate(fixId, {
        packagesAfter,
        diff: diffOutput,
        updatedPackages: [
          {
            name: packageName,
            fromVersion: fromVersion || vulnerability.currentVersion,
            toVersion: actualToVersion,
          },
        ],
        status: 'testing',
      });

      // Step 7: Compatibility testing in isolated environment (Docker / fallback)
      const testResult: TestRunResult = await TestRunnerService.runTests(
        workingDir,
        fixId,
        project._id.toString()
      );

      await Fix.findByIdAndUpdate(fixId, {
        testsRun: true,
        testsPassed: testResult.passed,
        testOutput: testResult.output,
      });

      // Step 8: Evaluate test results
      if (testResult.passed) {
        // Step 9: Re-scan to verify vulnerability resolution
        const originalScan = await Scan.findById(vulnerability.scanId);
        const originalStats = originalScan
          ? {
              critical: originalScan.criticalCount,
              high: originalScan.highCount,
              medium: originalScan.mediumCount,
              low: originalScan.lowCount,
              total: originalScan.vulnerableCount,
            }
          : undefined;

        const reScanResult = await ReScanService.performReScan(
          workingDir,
          packageName,
          vulnerability,
          originalStats
        );

        // CRITICAL: Only mark as completed if re-scan confirms resolution
        if (reScanResult.isResolved) {
          // Commit changes to fix branch
          try {
            await git.add(['package.json', 'package-lock.json']);
            await git.commit(
              `fix(deps): update ${packageName} from ${fromVersion} to ${actualToVersion} [SafeStack]`
            );
          } catch (commitErr: any) {
            logger.warn('Failed to commit in fix branch', { error: commitErr.message });
          }

          await Fix.findByIdAndUpdate(fixId, {
            status: 'completed',
            completedAt: new Date(),
            reScanResult,
          });

          // Mark vulnerability as resolved in database
          await Vulnerability.findByIdAndUpdate(vulnerability._id, {
            status: 'fixed',
            resolvedAt: new Date(),
          });

          logger.info('Fix: applied, tested, and re-scanned successfully', {
            fixId,
            packageName,
            fromVersion,
            toVersion: actualToVersion,
            isResolved: true,
          });
        } else {
          // Re-scan shows vulnerability is NOT resolved despite update
          logger.warn('Fix: re-scan shows vulnerability still present after update', {
            fixId,
            packageName,
            fromVersion,
            toVersion: actualToVersion,
            isResolved: false,
            remainingVulnerabilities: reScanResult.remainingVulnerabilities?.length,
          });

          await Fix.findByIdAndUpdate(fixId, {
            status: 'manual_review_required',
            completedAt: new Date(),
            reScanResult,
            errorMessage: `Re-scan detected that ${packageName} vulnerability is still present after updating to ${actualToVersion}. The fix did not resolve the vulnerability. Manual review required.`,
          });

          await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
        }
      } else {
        // Test failed -> Compatibility issue
        logger.warn('Fix: tests failed after update', { fixId, exitCode: testResult.exitCode });

        await Fix.findByIdAndUpdate(fixId, {
          status: 'compatibility_issue',
          hasCompatibilityIssue: true,
          compatibilityIssues: [
            `Tests failed with exit code ${testResult.exitCode}. Output: ${testResult.output.slice(0, 300)}`,
          ],
          errorMessage: 'Fix could not be safely applied due to test failures.',
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
      }
    } catch (error: any) {
      logger.error('Fix execution error', { fixId, error: error.message });

      await Fix.findByIdAndUpdate(fixId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
      });

      await Vulnerability.findByIdAndUpdate(vulnerability._id, { status: 'open' });
    }
  }

  /**
   * Attempt alternative compatible version when standard fix causes test failures.
   */
  static async retryWithCompatibleVersion(fixId: string): Promise<boolean> {
    const fix = await Fix.findById(fixId);
    if (!fix || !fix.workingDir || !fs.existsSync(fix.workingDir)) {
      throw new Error('Fix workspace not found for retry');
    }

    const vulnerability = await Vulnerability.findById(fix.vulnerabilityId);
    if (!vulnerability) {
      throw new Error('Vulnerability not found');
    }

    const packageJsonPath = path.join(fix.workingDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const packageName = vulnerability.packageName;
    const currentVer = this.findCurrentVersion(packageJson, packageName) || vulnerability.currentVersion;

    // Derive a conservative minor/patch target version
    const cleanVer = currentVer.replace(/[^0-9.]/g, '');
    const parts = cleanVer.split('.');
    let conservativeVersion = 'latest';

    if (parts.length >= 2) {
      const nextMinor = `${parts[0]}.${parseInt(parts[1], 10) + 1}.0`;
      conservativeVersion = `^${nextMinor}`;
    }

    // Validate that the conservative version is not a downgrade
    const cleanConservative = VersionValidator.cleanVersion(conservativeVersion);
    const comparison = VersionValidator.compareSemver(cleanConservative, VersionValidator.cleanVersion(currentVer));
    if (comparison < 0) {
      logger.warn('Retry: conservative version would be a downgrade, aborting', {
        fixId,
        packageName,
        currentVer,
        conservativeVersion,
      });

      await Fix.findByIdAndUpdate(fixId, {
        status: 'unsafe_downgrade',
        resolutionAttempted: true,
        resolutionSuccessful: false,
        errorMessage: `Conservative version ${conservativeVersion} would downgrade ${packageName} from ${currentVer}. Manual review required.`,
      });
      return false;
    }

    logger.info('Retrying fix with compatible version', { fixId, packageName, conservativeVersion });

    await Fix.findByIdAndUpdate(fixId, {
      status: 'retrying',
      resolutionAttempted: true,
    });

    try {
      this.updatePackageVersion(packageJson, packageName, conservativeVersion);
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

      try {
        await execAsync('npm install --package-lock-only', {
          cwd: fix.workingDir,
          timeout: 120000,
        });
      } catch {
        // non-fatal
      }

      const testResult = await TestRunnerService.runTests(fix.workingDir, fixId);

      if (testResult.passed) {
        const reScan = await ReScanService.performReScan(
          fix.workingDir,
          packageName,
          vulnerability
        );

        await Fix.findByIdAndUpdate(fixId, {
          status: 'completed',
          completedAt: new Date(),
          resolutionSuccessful: true,
          testsPassed: true,
          reScanResult: reScan,
        });

        await Vulnerability.findByIdAndUpdate(vulnerability._id, {
          status: 'fixed',
          resolvedAt: new Date(),
        });

        return true;
      } else {
        await Fix.findByIdAndUpdate(fixId, {
          status: 'compatibility_issue',
          resolutionSuccessful: false,
          errorMessage: 'Alternative compatible version also failed tests.',
        });
        return false;
      }
    } catch (err: any) {
      logger.error('Retry failed', { fixId, error: err.message });
      return false;
    }
  }

  /**
   * Revert the fix in the isolated workspace back to original dependencies.
   */
  static async revertFix(fixId: string): Promise<boolean> {
    const fix = await Fix.findById(fixId);
    if (!fix || !fix.workingDir || !fs.existsSync(fix.workingDir)) {
      throw new Error('Fix workspace not found');
    }

    try {
      if (fix.packagesBefore) {
        const packageJsonPath = path.join(fix.workingDir, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        packageJson.dependencies = fix.packagesBefore.dependencies;
        packageJson.devDependencies = fix.packagesBefore.devDependencies;

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

        try {
          await execAsync('npm install --package-lock-only', { cwd: fix.workingDir });
        } catch {
          // ignore
        }
      }

      await Fix.findByIdAndUpdate(fixId, {
        status: 'reverted',
        completedAt: new Date(),
      });

      await Vulnerability.findByIdAndUpdate(fix.vulnerabilityId, {
        status: 'open',
      });

      logger.info('Fix reverted successfully', { fixId });
      return true;
    } catch (err: any) {
      logger.error('Failed to revert fix', { fixId, error: err.message });
      return false;
    }
  }

  /**
   * Path resolution with path traversal security check.
   */
  private static resolveProjectPath(project: any): string {
    if (!project.uploadPath) {
      throw new Error('Project has no upload path');
    }

    const resolved = path.resolve(project.uploadPath);
    if (resolved.includes('..')) {
      throw new Error('Invalid project path: contains path traversal');
    }

    return resolved;
  }

  private static findCurrentVersion(packageJson: any, packageName: string): string | null {
    if (packageJson.dependencies?.[packageName]) {
      return packageJson.dependencies[packageName];
    }
    if (packageJson.devDependencies?.[packageName]) {
      return packageJson.devDependencies[packageName];
    }
    return null;
  }

  private static updatePackageVersion(
    packageJson: any,
    packageName: string,
    newVersion: string
  ): boolean {
    if (packageJson.dependencies?.[packageName] !== undefined) {
      packageJson.dependencies[packageName] = newVersion;
      return true;
    }
    if (packageJson.devDependencies?.[packageName] !== undefined) {
      packageJson.devDependencies[packageName] = newVersion;
      return true;
    }
    return false;
  }
}
