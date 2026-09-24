import { Request, Response } from 'express';
import { GitHubService } from '../services/project/githubService';
import { GeminiService } from '../services/ai/geminiService';

/**
 * GET /api/v1/integrations/status
 * Returns safe (no secrets) integration configuration status.
 */
export const getIntegrationStatus = async (_req: Request, res: Response) => {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubConfigured = !!(githubToken && githubToken.length > 10);

  // Try a lightweight auth check if token present
  let githubAuthenticated = false;
  let githubAuthError: string | undefined;

  if (githubConfigured) {
    try {
      const octokit = GitHubService.getOctokit();
      if (octokit) {
        const { data } = await octokit.users.getAuthenticated();
        githubAuthenticated = true;
        // Only log, never return the login in prod — but for demo UX, safe to show username
        githubAuthError = undefined;
        res.json({
          success: true,
          data: {
            github: {
              configured: true,
              authenticated: true,
              login: data.login,
            },
            gemini: {
              configured: GeminiService.isAvailable(),
            },
          },
        });
        return;
      }
    } catch (err: any) {
      githubAuthenticated = false;
      githubAuthError = err.message?.includes('401')
        ? 'Invalid or expired GitHub token'
        : err.message?.includes('403')
        ? 'GitHub token lacks required permissions'
        : 'GitHub authentication failed';
    }
  }

  res.json({
    success: true,
    data: {
      github: {
        configured: githubConfigured,
        authenticated: githubAuthenticated,
        ...(githubAuthError ? { error: githubAuthError } : {}),
      },
      gemini: {
        configured: GeminiService.isAvailable(),
      },
    },
  });
};
