import api from './api';

export interface FixRecord {
  _id: string;
  projectId: string;
  vulnerabilityId: any;
  branchName: string;
  baseBranch: string;
  status:
    | 'queued'
    | 'creating_branch'
    | 'updating_deps'
    | 'testing'
    | 'compatibility_issue'
    | 'retrying'
    | 'completed'
    | 'reverted'
    | 'failed';
  packagesBefore?: any;
  packagesAfter?: any;
  updatedPackages: Array<{
    name: string;
    fromVersion: string;
    toVersion: string;
  }>;
  diff?: string;
  testsRun: boolean;
  testsPassed?: boolean;
  testOutput?: string;
  hasCompatibilityIssue: boolean;
  compatibilityIssues: string[];
  resolutionAttempted: boolean;
  resolutionSuccessful?: boolean;
  reScanResult?: {
    isResolved: boolean;
    beforeStats: { critical: number; high: number; medium: number; low: number; total: number };
    afterStats: { critical: number; high: number; medium: number; low: number; total: number };
    comparison: {
      critical: { before: number; after: number };
      high: { before: number; after: number };
      medium: { before: number; after: number };
      low: { before: number; after: number };
      total: { before: number; after: number };
    };
    remainingVulnerabilities: Array<{
      packageName: string;
      title: string;
      severity: string;
    }>;
    resolvedPackage: string;
    resolvedVersion?: string;
  };
  pullRequestId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestRecord {
  _id: string;
  fixId: string;
  projectId: string;
  githubPrNumber?: number;
  githubPrUrl?: string;
  githubIntegrationConfigured: boolean;
  githubPrError?: string;
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  status: 'draft' | 'open' | 'merged' | 'closed' | 'error';
  createdAt: string;
}

export const fixService = {
  startFix: async (vulnerabilityId: string, targetVersion?: string) => {
    const response = await api.post('/fixes', { vulnerabilityId, targetVersion });
    return response.data;
  },

  getFix: async (fixId: string): Promise<{ success: boolean; data: FixRecord }> => {
    const response = await api.get(`/fixes/${fixId}`);
    return response.data;
  },

  getVulnerabilityFix: async (vulnerabilityId: string): Promise<{ success: boolean; data: FixRecord | null }> => {
    const response = await api.get(`/fixes/vulnerability/${vulnerabilityId}`);
    return response.data;
  },

  retryFix: async (fixId: string) => {
    const response = await api.post(`/fixes/${fixId}/retry`);
    return response.data;
  },

  revertFix: async (fixId: string) => {
    const response = await api.post(`/fixes/${fixId}/revert`);
    return response.data;
  },

  createPullRequest: async (fixId: string, customTitle?: string, customBody?: string): Promise<{ success: boolean; data: PullRequestRecord }> => {
    const response = await api.post('/pull-requests', { fixId, customTitle, customBody });
    return response.data;
  },

  getPullRequest: async (id: string): Promise<{ success: boolean; data: PullRequestRecord }> => {
    const response = await api.get(`/pull-requests/${id}`);
    return response.data;
  },

  getPullRequestByFix: async (fixId: string): Promise<{ success: boolean; data: PullRequestRecord | null }> => {
    const response = await api.get(`/pull-requests/fix/${fixId}`);
    return response.data;
  },

  getIntegrationStatus: async (): Promise<{
    success: boolean;
    data: {
      github: { configured: boolean; authenticated: boolean; login?: string; error?: string };
      gemini: { configured: boolean };
    };
  }> => {
    const response = await api.get('/integrations/status');
    return response.data;
  },
};
