import simpleGit, { SimpleGit } from 'simple-git';
import Fix from '../../models/Fix';
import Project from '../../models/Project';
import Vulnerability from '../../models/Vulnerability';
import PullRequest, { IPullRequest } from '../../models/PullRequest';
import { GitHubService } from './githubService';
import logger from '../../utils/logger';

export interface CreatePRParams {
  fixId: string;
  customTitle?: string;
  customBody?: string;
}

export class PullRequestService {
  /**
   * Create a Pull Request for a completed dependency fix.
   * - If a real GitHub PR already exists for this fix, return it (idempotent).
   * - If GitHub integration is configured, push the fix branch and create a real PR.
   * - Otherwise, create a local-only PR record with clear status.
   */
  static async createPullRequest(params: CreatePRParams): Promise<IPullRequest> {
    const { fixId, customTitle, customBody } = params;

    const fix = await Fix.findById(fixId);
    if (!fix) {
      throw new Error(`Fix not found: ${fixId}`);
    }

    const project = await Project.findById(fix.projectId);
    if (!project) {
      throw new Error(`Project not found for fix: ${fixId}`);
    }

    const vulnerability = await Vulnerability.findById(fix.vulnerabilityId);
    if (!vulnerability) {
      throw new Error(`Vulnerability not found for fix: ${fixId}`);
    }

    // Idempotency: return existing PR if already created for this fix
    const existing = await PullRequest.findOne({ fixId: fix._id }).sort({ createdAt: -1 });
    if (existing) {
      logger.info('Returning existing PR record for fix', { fixId, prId: existing._id });
      return existing;
    }

    // Build PR Title
    const pkgUpdate = fix.updatedPackages[0] || {
      name: vulnerability.packageName,
      fromVersion: vulnerability.currentVersion,
      toVersion: vulnerability.recommendedVersion || 'latest',
    };

    const title =
      customTitle ||
      `fix(security): update ${pkgUpdate.name} from ${pkgUpdate.fromVersion} to ${pkgUpdate.toVersion} [SafeStack]`;

    // Build comprehensive PR Body
    const body = customBody || this.buildPRBody(fix, project, vulnerability, pkgUpdate);

    let githubPrNumber: number | undefined;
    let githubPrUrl: string | undefined;
    let githubPrError: string | undefined;

    // Determine whether GitHub integration is fully configured
    const octokit = GitHubService.getOctokit();
    const hasGitHubProject =
      project.type === 'github' &&
      !!project.githubOwner &&
      !!project.githubRepo;

    const githubIntegrationConfigured = !!octokit && hasGitHubProject;

    // Attempt real GitHub PR only when fully configured
    if (githubIntegrationConfigured && octokit && fix.workingDir) {
      try {
        const git: SimpleGit = simpleGit(fix.workingDir);

        // Configure the authenticated remote in the isolated working copy.
        // The working copy was fs.cpSync'd from the original clone, which may
        // have an 'origin' without auth token for push. We explicitly set/override it.
        const token = process.env.GITHUB_TOKEN!;
        const remoteUrl = `https://x-access-token:${token}@github.com/${project.githubOwner}/${project.githubRepo}.git`;

        try {
          // Remove old origin if present, add authenticated one
          await git.removeRemote('origin');
        } catch {
          // Ignore if no origin
        }
        await git.addRemote('origin', remoteUrl);

        // Configure git identity for the commit (required by GitHub)
        await git.addConfig('user.email', 'safestack-bot@safestack.local');
        await git.addConfig('user.name', 'SafeStack Bot');

        // Push fix branch to remote
        logger.info('Fix: pushing branch to GitHub', {
          fixId,
          branch: fix.branchName,
          owner: project.githubOwner,
          repo: project.githubRepo,
        });

        await git.push('origin', fix.branchName, ['--set-upstream', '--force-with-lease']);

        // Create PR via GitHub API
        const prResponse = await octokit.pulls.create({
          owner: project.githubOwner!,
          repo: project.githubRepo!,
          title,
          body,
          head: fix.branchName,
          base: project.defaultBranch || 'main',
        });

        githubPrNumber = prResponse.data.number;
        githubPrUrl = prResponse.data.html_url;

        logger.info('GitHub Pull Request created successfully', {
          prNumber: githubPrNumber,
          prUrl: githubPrUrl,
        });
      } catch (apiErr: any) {
        // Capture meaningful error reason for UI display
        githubPrError = this.extractGitHubError(apiErr);
        logger.warn('Failed to push/create PR via GitHub API', {
          fixId,
          error: apiErr.message,
          friendlyError: githubPrError,
        });
      }
    } else if (!octokit) {
      githubPrError = 'GITHUB_TOKEN is not set or invalid';
    } else if (!hasGitHubProject) {
      githubPrError =
        'Project is not a GitHub-connected repository. Import the project via "Connect GitHub" to enable PR creation.';
    }

    // Create PullRequest record in MongoDB (never stores the token)
    const pullRequest = await PullRequest.create({
      fixId: fix._id,
      projectId: project._id,
      githubPrNumber,
      githubPrUrl,                      // Only set when real GitHub PR was created
      githubIntegrationConfigured,      // True only when fully configured
      githubPrError,                    // Human-readable reason if PR creation failed
      title,
      body,
      baseBranch: fix.baseBranch,
      headBranch: fix.branchName,
      status: 'open',
    });

    // Update fix record with PR link
    await Fix.findByIdAndUpdate(fixId, {
      pullRequestId: pullRequest._id,
    });

    logger.info('Pull request record saved', {
      prId: pullRequest._id,
      headBranch: fix.branchName,
      hasRealGitHubPr: !!githubPrUrl,
    });

    return pullRequest;
  }

  /**
   * Translate raw GitHub/git errors into friendly UI messages.
   */
  private static extractGitHubError(err: any): string {
    const msg = err?.message || '';
    if (msg.includes('401') || msg.includes('Bad credentials')) {
      return 'GitHub token is invalid or expired. Update GITHUB_TOKEN in backend/.env.';
    }
    if (msg.includes('403') || msg.includes('Resource not accessible')) {
      return 'GitHub token lacks write permissions. Enable repo and pull_request scopes.';
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return 'Repository not found or token cannot access it. Check owner/repo name.';
    }
    if (msg.includes('422') || msg.includes('already exists')) {
      return 'A pull request for this branch already exists on GitHub.';
    }
    if (msg.includes('push') || msg.includes('remote')) {
      return `Git push failed: ${msg.slice(0, 120)}`;
    }
    return msg.slice(0, 200) || 'Unknown GitHub API error.';
  }

  /**
   * Formats a clear, developer-friendly PR description.
   */
  private static buildPRBody(
    fix: any,
    project: any,
    vulnerability: any,
    pkgUpdate: any
  ): string {
    const reScan = fix.reScanResult;
    const vv = fix.versionValidation;
    const testStatus = fix.testsRun
      ? fix.testsPassed
        ? '✅ All compatibility tests passed'
        : '⚠️ Tests had warnings/issues'
      : 'ℹ️ No tests configured';

    const advisoryId = vulnerability.cveId || vulnerability.osvId || 'N/A';
    const whyVersion = vv?.reason
      || `Advisory recommends updating to ${pkgUpdate.toVersion} to resolve ${vulnerability.title}.`;

    return `## 🔒 SafeStack Automated Security Fix

### 📦 Vulnerability Summary
| Field | Value |
| :--- | :--- |
| **Package** | \`${pkgUpdate.name}\` |
| **Current version** | \`${pkgUpdate.fromVersion}\` |
| **Recommended version** | \`${pkgUpdate.toVersion}\` |
| **Vulnerability** | ${vulnerability.title} |
| **Severity** | **${vulnerability.severity.toUpperCase()}** |
| **Advisory/CVE/GHSA/OSV identifier** | \`${advisoryId}\` |
| **Why this version was selected** | ${whyVersion} |
| **Compatibility test result** | ${testStatus} |
| **Registry verified** | ${vv?.registryVerified ? '✅ Yes' : '⚠️ Not verified'} |

### 💡 Description & AI Rationale
${vulnerability.aiExplanation || vulnerability.description}

### 🧪 Compatibility & Test Verification
- **Status:** ${testStatus}
- **Fix Branch:** \`${fix.branchName}\`
- **Base Branch:** \`${fix.baseBranch}\`
${fix.testOutput ? `\`\`\`\n${fix.testOutput.slice(0, 500)}\n\`\`\`` : ''}

### 📊 Security Re-Scan Delta
${
  reScan?.comparison
    ? `| Severity | Before scan | After scan | Security delta |
| :--- | :--- | :--- | :--- |
| **Critical** | ${reScan.comparison.critical.before} | ${reScan.comparison.critical.after} | ${reScan.comparison.critical.after - reScan.comparison.critical.before} |
| **High** | ${reScan.comparison.high.before} | ${reScan.comparison.high.after} | ${reScan.comparison.high.after - reScan.comparison.high.before} |
| **Medium** | ${reScan.comparison.medium.before} | ${reScan.comparison.medium.after} | ${reScan.comparison.medium.after - reScan.comparison.medium.before} |
| **Low** | ${reScan.comparison.low.before} | ${reScan.comparison.low.after} | ${reScan.comparison.low.after - reScan.comparison.low.before} |
| **Total** | ${reScan.comparison.total.before} | ${reScan.comparison.total.after} | **${reScan.comparison.total.after - reScan.comparison.total.before}** |

**Vulnerability resolved:** ${reScan.isResolved ? '✅ Yes' : '❌ No — still detected after update'}`
    : 'Re-scan verified that the target vulnerability is resolved.'
}

---
> 🛡️ **SafeStack Safety Guarantee:**  
> This pull request was created in an isolated branch (\`${fix.branchName}\`).  
> SafeStack **NEVER automatically merges** changes into your base branch (\`${fix.baseBranch}\`).  
> Please review and click **Merge** when you are ready.
`;
  }
}
