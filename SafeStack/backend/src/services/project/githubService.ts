import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import config from '../../config/environment';
import logger from '../../utils/logger';
import { findProjectRoot } from './extractionService';
import { DependencyParser } from '../scanner/dependencyParser';

export interface GitHubImportResult {
  success: boolean;
  localPath: string;
  projectRoot: string;
  hasPackageJson: boolean;
  hasPackageLock: boolean;
  defaultBranch: string;
  owner: string;
  repo: string;
  projectInfo: { name?: string; version?: string; hasTests: boolean };
  error?: string;
}

export class GitHubService {
  /**
   * Clone a GitHub repository into an isolated workspace directory.
   */
  static async importRepository(
    repoUrl: string,
    branch?: string
  ): Promise<GitHubImportResult> {
    const targetDir = path.resolve(config.storage.workingDir, `github-${uuidv4()}`);

    try {
      // Parse owner and repo name from URL
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      if (!owner || !repo) {
        throw new Error('Invalid GitHub repository URL. Format should be: https://github.com/owner/repo or owner/repo');
      }

      fs.mkdirSync(targetDir, { recursive: true });

      const git: SimpleGit = simpleGit();
      const cloneUrl = this.buildCloneUrl(owner, repo);
      const targetBranch = branch || 'main';

      logger.info('Cloning GitHub repository into isolated workspace', {
        owner,
        repo,
        branch: targetBranch,
        targetDir,
      });

      // Attempt clone with specified branch, fallback to default branch if branch fails
      try {
        await git.clone(cloneUrl, targetDir, ['--depth', '1', '--branch', targetBranch]);
      } catch (branchError: any) {
        // Fallback to clone without explicit branch (uses default branch)
        logger.warn(`Could not clone branch "${targetBranch}", cloning default branch instead: ${branchError.message}`);
        if (fs.existsSync(targetDir)) {
          try {
            fs.rmSync(targetDir, { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
        fs.mkdirSync(targetDir, { recursive: true });
        await git.clone(cloneUrl, targetDir, ['--depth', '1']);
      }

      // Check current checked-out branch
      const repoGit = simpleGit(targetDir);
      const branchSummary = await repoGit.branchLocal();
      const actualBranch = branchSummary.current || targetBranch;

      // Locate project root containing package.json
      const projectRoot = findProjectRoot(targetDir);
      const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
      const hasPackageLock = fs.existsSync(path.join(projectRoot, 'package-lock.json'));

      if (!hasPackageJson) {
        throw new Error('No package.json found in the repository. SafeStack only supports Node.js projects.');
      }

      const projectInfo = DependencyParser.getProjectInfo(projectRoot);

      logger.info('GitHub repository imported successfully', {
        owner,
        repo,
        branch: actualBranch,
        projectRoot,
        projectName: projectInfo.name,
      });

      return {
        success: true,
        localPath: targetDir,
        projectRoot,
        hasPackageJson,
        hasPackageLock,
        defaultBranch: actualBranch,
        owner,
        repo,
        projectInfo,
      };
    } catch (error: any) {
      logger.error('Failed to import GitHub repository', { repoUrl, error: error.message });

      // Clean up directory on failure
      if (fs.existsSync(targetDir)) {
        try {
          fs.rmSync(targetDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }

      return {
        success: false,
        localPath: targetDir,
        projectRoot: targetDir,
        hasPackageJson: false,
        hasPackageLock: false,
        defaultBranch: branch || 'main',
        owner: '',
        repo: '',
        projectInfo: { hasTests: false },
        error: error.message,
      };
    }
  }

  /**
   * Parse owner and repository name from various URL formats.
   */
  static parseRepoUrl(url: string): { owner: string; repo: string } {
    let clean = url.trim();
    clean = clean.replace(/\.git$/, '');

    // Pattern 1: owner/repo
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(clean)) {
      const [owner, repo] = clean.split('/');
      return { owner, repo };
    }

    // Pattern 2: https://github.com/owner/repo or git@github.com:owner/repo
    const match = clean.match(/github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }

    return { owner: '', repo: '' };
  }

  /**
   * Build HTTPS clone URL (incorporating token if configured).
   */
  private static buildCloneUrl(owner: string, repo: string): string {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    }
    return `https://github.com/${owner}/${repo}.git`;
  }

  /**
   * Helper to get an authenticated Octokit client if credentials are configured.
   */
  static getOctokit(): Octokit | null {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      return new Octokit({ auth: token });
    }
    return null;
  }
}
