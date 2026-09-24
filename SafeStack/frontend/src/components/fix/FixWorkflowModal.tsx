import { useState, useEffect } from 'react';
import {
  Shield,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Terminal,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Github,
} from 'lucide-react';
import { fixService, FixRecord, PullRequestRecord } from '../../services/fixService';
import { projectService } from '../../services/projectService';
import toast from 'react-hot-toast';

interface FixWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  vulnerability: {
    _id: string;
    packageName: string;
    currentVersion: string;
    recommendedVersion?: string;
    severity: string;
    title: string;
    description: string;
    aiExplanation?: string;
  };
  onFixCompleted?: () => void;
}

export const FixWorkflowModal = ({
  isOpen,
  onClose,
  vulnerability,
  onFixCompleted,
}: FixWorkflowModalProps) => {
  const [fixId, setFixId] = useState<string | null>(null);
  const [fixRecord, setFixRecord] = useState<FixRecord | null>(null);
  const [pullRequest, setPullRequest] = useState<PullRequestRecord | null>(null);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    github: { configured: boolean; authenticated: boolean; login?: string; error?: string };
    gemini: { configured: boolean };
  } | null>(null);

  useEffect(() => {
    if (isOpen && vulnerability._id) {
      // Fetch integration status so we can show meaningful GitHub status
      fixService.getIntegrationStatus().then((res) => {
        setIntegrationStatus(res.data);
      }).catch(() => {
        // Non-fatal: integration status is a UI enhancement
      });

      // Check if an existing fix exists for this vulnerability
      fixService.getVulnerabilityFix(vulnerability._id).then((res) => {
        if (res.data) {
          setFixId(res.data._id);
          setFixRecord(res.data);
          if (res.data.pullRequestId) {
            fixService.getPullRequestByFix(res.data._id).then((prRes) => {
              if (prRes.data) setPullRequest(prRes.data);
            });
          }
        }
      });
    } else {
      setFixId(null);
      setFixRecord(null);
      setPullRequest(null);
      setIntegrationStatus(null);
    }
  }, [isOpen, vulnerability]);

  // Polling fix status while active
  useEffect(() => {
    if (!fixId) return;

    const isFinished =
      fixRecord?.status === 'completed' ||
      fixRecord?.status === 'compatibility_issue' ||
      fixRecord?.status === 'reverted' ||
      fixRecord?.status === 'failed';

    if (isFinished) return;

    const interval = setInterval(async () => {
      try {
        const res = await fixService.getFix(fixId);
        setFixRecord(res.data);
        if (res.data.status === 'completed' && onFixCompleted) {
          onFixCompleted();
        }
      } catch (err) {
        console.error('Failed to poll fix status', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fixId, fixRecord?.status, onFixCompleted]);

  if (!isOpen) return null;

  const handleStartFix = async () => {
    setStarting(true);
    try {
      const res = await fixService.startFix(
        vulnerability._id,
        vulnerability.recommendedVersion
      );
      setFixId(res.data.fixId);
      toast.success('Safe fix pipeline initiated in isolated branch');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to start fix');
    } finally {
      setStarting(false);
    }
  };

  const handleRetry = async () => {
    if (!fixId) return;
    setRetrying(true);
    try {
      toast('Trying compatible alternative version...', { icon: '🔄' });
      await fixService.retryFix(fixId);
      const res = await fixService.getFix(fixId);
      setFixRecord(res.data);
      if (res.data.status === 'completed') {
        toast.success('Compatible version passed tests and re-scan!');
        if (onFixCompleted) onFixCompleted();
      } else {
        toast.error('Compatible version also encountered issues.');
      }
    } catch (err: any) {
      toast.error('Retry failed: ' + err.message);
    } finally {
      setRetrying(false);
    }
  };

  const handleRevert = async () => {
    if (!fixId) return;
    setReverting(true);
    try {
      await fixService.revertFix(fixId);
      const res = await fixService.getFix(fixId);
      setFixRecord(res.data);
      toast.success('Fix reverted safely in isolated workspace');
      if (onFixCompleted) onFixCompleted();
    } catch (err: any) {
      toast.error('Revert failed: ' + err.message);
    } finally {
      setReverting(false);
    }
  };

  const handleCreatePR = async () => {
    if (!fixId) return;
    setCreatingPR(true);
    try {
      const res = await fixService.createPullRequest(fixId);
      setPullRequest(res.data);
      toast.success('Pull Request generated for user review!');
    } catch (err: any) {
      toast.error('PR creation failed: ' + err.message);
    } finally {
      setCreatingPR(false);
    }
  };

  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [connectingRepo, setConnectingRepo] = useState(false);

  const handleConnectRepo = async () => {
    if (!fixRecord?.projectId || !repoUrlInput.trim()) return;
    setConnectingRepo(true);
    try {
      await projectService.connectGitHubRepo(fixRecord.projectId, repoUrlInput.trim());
      toast.success('GitHub repository connected to project!');
      const res = await fixService.createPullRequest(fixId!);
      setPullRequest(res.data);
      toast.success('Pull Request created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to connect repository');
    } finally {
      setConnectingRepo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-secondary-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-700 to-indigo-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Safe Automated Fix Pipeline</h2>
              <p className="text-sm text-blue-100">
                Isolated sandbox execution • Zero main-branch modification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Pre-fix Summary */}
          {!fixRecord && (
            <div className="space-y-5">
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary-500">
                    Vulnerable Package
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-100 text-red-800">
                    {vulnerability.severity}
                  </span>
                </div>
                <div className="text-2xl font-bold text-secondary-900 mb-2">
                  {vulnerability.packageName}
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div>
                    <span className="text-secondary-500">Current: </span>
                    <span className="font-mono font-semibold text-secondary-800">
                      {vulnerability.currentVersion}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-secondary-400" />
                  <div>
                    <span className="text-secondary-500">Recommended: </span>
                    <span className="font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      {vulnerability.recommendedVersion || 'latest safe version'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow Roadmap */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-600">
                  Execution Workflow
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs text-secondary-700 bg-white border border-secondary-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">1</span>
                    <span>Create isolated sandbox & SafeStack fix branch</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">2</span>
                    <span>Controlled package.json & package-lock.json update</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">3</span>
                    <span>Run project tests in isolated Docker container</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">4</span>
                    <span>Re-scan dependencies to verify security resolution</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">5</span>
                    <span>Generate Pull Request for your final review</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartFix}
                disabled={starting}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base transition flex items-center justify-center space-x-2 shadow-md"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Initiating Safe Fix Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Apply Safe Automated Fix</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Fix in Progress / Completed */}
          {fixRecord && (
            <div className="space-y-6">
              {/* Branch Indicator */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-primary-600" />
                  <span>Fix Branch:</span>
                  <code className="font-mono bg-blue-100 px-2 py-0.5 rounded font-bold">
                    {fixRecord.branchName}
                  </code>
                </div>
                <span className="capitalize font-semibold px-2 py-0.5 rounded bg-blue-200 text-blue-800">
                  {fixRecord.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="space-y-3 bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-600 mb-2">
                  Pipeline Status
                </h4>

                <div className="space-y-2.5 text-sm">
                  {/* Creating branch */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {fixRecord.status === 'queued' || fixRecord.status === 'creating_branch' ? (
                        <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-secondary-800">Create isolated fix branch</span>
                    </div>
                    <span className="text-xs text-secondary-500 font-mono">
                      {fixRecord.branchName}
                    </span>
                  </div>

                  {/* Updating deps */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {fixRecord.status === 'updating_deps' ? (
                        <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                      ) : fixRecord.packagesAfter ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-secondary-300 inline-block" />
                      )}
                      <span className="text-secondary-800">Controlled lockfile regeneration</span>
                    </div>
                    {fixRecord.updatedPackages?.[0] && (
                      <span className="text-xs text-green-700 font-mono font-bold">
                        → {fixRecord.updatedPackages[0].toVersion}
                      </span>
                    )}
                  </div>

                  {/* Testing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {fixRecord.status === 'testing' ? (
                        <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                      ) : fixRecord.testsRun ? (
                        fixRecord.testsPassed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-secondary-300 inline-block" />
                      )}
                      <span className="text-secondary-800">Docker compatibility tests</span>
                    </div>
                    {fixRecord.testsRun && (
                      <span className={`text-xs font-semibold ${fixRecord.testsPassed ? 'text-green-600' : 'text-orange-600'}`}>
                        {fixRecord.testsPassed ? 'Passed' : 'Failed'}
                      </span>
                    )}
                  </div>

                  {/* Re-scan */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {fixRecord.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-secondary-300 inline-block" />
                      )}
                      <span className="text-secondary-800">Security re-scan & verification</span>
                    </div>
                    {fixRecord.reScanResult && (
                      <span className="text-xs text-green-600 font-semibold">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Failed Fix Handling (Phase H) */}
              {fixRecord.status === 'compatibility_issue' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-red-900 text-sm">
                        Fix could not be safely applied
                      </h4>
                      <p className="text-xs text-red-700 mt-1">
                        The updated package version caused existing test or build scripts to fail. SafeStack prevented modifying your codebase.
                      </p>
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      {retrying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Try Recommended Compatible Version</span>
                    </button>

                    <button
                      onClick={handleRevert}
                      disabled={reverting}
                      className="px-3.5 py-2 bg-secondary-700 hover:bg-secondary-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      {reverting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Revert Fix</span>
                    </button>

                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="px-3.5 py-2 bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-100 rounded-lg text-xs font-semibold transition"
                    >
                      {showLogs ? 'Hide Failure Logs' : 'Review Manually (Logs)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reverted state */}
              {fixRecord.status === 'reverted' && (
                <div className="bg-secondary-100 border border-secondary-300 rounded-lg p-4 text-center">
                  <p className="text-sm font-semibold text-secondary-800">
                    Fix was safely reverted to original dependencies.
                  </p>
                </div>
              )}

              {/* Successful Fix: Before vs After Delta (Phase I) */}
              {fixRecord.status === 'completed' && fixRecord.reScanResult && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-green-900 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Vulnerability Successfully Resolved!</span>
                  </div>

                  {/* Severity Delta Table */}
                  <div className="bg-white rounded-lg border border-green-200 overflow-hidden text-xs">
                    <div className="grid grid-cols-4 bg-green-100/60 p-2 font-bold text-green-900 text-center">
                      <div>Severity</div>
                      <div>Before</div>
                      <div>After</div>
                      <div>Delta</div>
                    </div>
                    {fixRecord.reScanResult.comparison && (
                      <>
                        <div className="grid grid-cols-4 p-2 text-center border-t border-green-100 text-red-700">
                          <span className="font-semibold">Critical</span>
                          <span>{fixRecord.reScanResult.comparison.critical.before}</span>
                          <span>{fixRecord.reScanResult.comparison.critical.after}</span>
                          <span className="font-bold">{fixRecord.reScanResult.comparison.critical.after - fixRecord.reScanResult.comparison.critical.before}</span>
                        </div>
                        <div className="grid grid-cols-4 p-2 text-center border-t border-green-100 text-orange-700">
                          <span className="font-semibold">High</span>
                          <span>{fixRecord.reScanResult.comparison.high.before}</span>
                          <span>{fixRecord.reScanResult.comparison.high.after}</span>
                          <span className="font-bold">{fixRecord.reScanResult.comparison.high.after - fixRecord.reScanResult.comparison.high.before}</span>
                        </div>
                        <div className="grid grid-cols-4 p-2 text-center border-t border-green-100 text-yellow-700">
                          <span className="font-semibold">Medium</span>
                          <span>{fixRecord.reScanResult.comparison.medium.before}</span>
                          <span>{fixRecord.reScanResult.comparison.medium.after}</span>
                          <span className="font-bold">{fixRecord.reScanResult.comparison.medium.after - fixRecord.reScanResult.comparison.medium.before}</span>
                        </div>
                        <div className="grid grid-cols-4 p-2 text-center border-t border-green-100 font-bold bg-green-50 text-green-900">
                          <span>Total</span>
                          <span>{fixRecord.reScanResult.comparison.total.before}</span>
                          <span>{fixRecord.reScanResult.comparison.total.after}</span>
                          <span className="text-green-700">{fixRecord.reScanResult.comparison.total.after - fixRecord.reScanResult.comparison.total.before}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions for Completed Fix */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {!pullRequest ? (
                      <button
                        onClick={handleCreatePR}
                        disabled={creatingPR}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-sm transition flex items-center justify-center space-x-2 shadow"
                      >
                        {creatingPR ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Creating Pull Request...</span>
                          </>
                        ) : (
                          <>
                            <GitPullRequest className="w-4 h-4" />
                            <span>Create Pull Request</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full bg-white border-2 border-primary-300 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-bold text-secondary-900 text-sm">
                            <GitPullRequest className="w-4 h-4 text-primary-600" />
                            <span>Pull Request Ready for Review</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-100 text-green-800">
                            {pullRequest.status}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-600 font-semibold">
                          {pullRequest.title}
                        </p>

                        {/* Branch info */}
                        <div className="flex items-center space-x-2 text-xs text-secondary-500 font-mono">
                          <GitBranch className="w-3.5 h-3.5 text-primary-500" />
                          <span>{pullRequest.headBranch}</span>
                          <span className="text-secondary-400">→</span>
                          <span>{pullRequest.baseBranch}</span>
                        </div>

                        {/* GitHub integration status badge */}
                        {integrationStatus && (
                          <div className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md font-semibold ${
                            integrationStatus.github.authenticated
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : integrationStatus.github.configured
                              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                              : 'bg-secondary-100 text-secondary-600 border border-secondary-200'
                          }`}>
                            {integrationStatus.github.authenticated ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>GitHub connected as @{integrationStatus.github.login}</span>
                              </>
                            ) : integrationStatus.github.configured ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>GitHub token present but authentication failed: {integrationStatus.github.error}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>GitHub not configured — GITHUB_TOKEN missing</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* OPEN button — real PR URL, or clear error reason */}
                        {pullRequest.githubPrUrl ? (
                          <a
                            href={pullRequest.githubPrUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition shadow"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>OPEN Pull Request on GitHub</span>
                          </a>
                        ) : pullRequest.githubPrError ? (
                          <div className="w-full rounded-lg border border-orange-200 bg-orange-50 p-3.5 space-y-2.5">
                            <div className="flex items-center space-x-1.5 text-orange-900 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-orange-600" />
                              <span>GitHub PR Creation Info</span>
                            </div>
                            <p className="text-xs text-orange-800 leading-relaxed">
                              {pullRequest.githubPrError}
                            </p>

                            {/* Inline GitHub Connection Box if repository not yet linked */}
                            {pullRequest.githubPrError.includes('not a GitHub-connected repository') && (
                              <div className="pt-2 border-t border-orange-200 space-y-2">
                                <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-900">
                                  <Github className="w-4 h-4 text-gray-700" />
                                  <span>Associate Project with GitHub Repository</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                  Enter repository owner/name (e.g. <code className="font-mono bg-gray-100 px-1 rounded">Pratikshaprabhakarbande/SafeStack</code>) to enable real Pull Request creation:
                                </p>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    placeholder="e.g. https://github.com/Pratikshaprabhakarbande/SafeStack"
                                    value={repoUrlInput}
                                    onChange={(e) => setRepoUrlInput(e.target.value)}
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-mono outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                  <button
                                    onClick={handleConnectRepo}
                                    disabled={connectingRepo || !repoUrlInput.trim()}
                                    className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded text-xs font-bold transition flex items-center space-x-1"
                                  >
                                    {connectingRepo ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <span>Connect & Create PR</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full rounded-lg border border-secondary-200 bg-secondary-50 p-3 text-xs text-secondary-600 space-y-1">
                            <p className="font-semibold">GitHub PR integration not configured</p>
                            <p>To enable pull request creation:</p>
                            <ol className="list-decimal list-inside space-y-0.5 text-secondary-500">
                              <li>Add <code className="font-mono bg-secondary-100 px-1 rounded">GITHUB_TOKEN</code> to <code className="font-mono bg-secondary-100 px-1 rounded">backend/.env</code></li>
                              <li>Import your project via "Connect GitHub" on the dashboard</li>
                              <li>Run the fix again on the GitHub-connected project</li>
                            </ol>
                          </div>
                        )}

                        <div className="text-xs text-secondary-500 pt-1 border-t border-secondary-100">
                          🛡️ Final decision is yours. SafeStack never automatically merges code into main.
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 w-full pt-1">
                      {fixRecord.diff && (
                        <button
                          onClick={() => setShowDiff(!showDiff)}
                          className="flex-1 py-1.5 text-xs text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded font-semibold transition"
                        >
                          {showDiff ? 'Hide Git Diff' : 'View Git Diff'}
                        </button>
                      )}
                      <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="flex-1 py-1.5 text-xs text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded font-semibold transition"
                      >
                        {showLogs ? 'Hide Test Output' : 'View Test Output'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Git Diff Viewer */}
              {showDiff && fixRecord.diff && (
                <div className="bg-secondary-900 text-secondary-100 rounded-lg p-3 overflow-x-auto text-xs font-mono max-h-48">
                  <div className="flex items-center justify-between text-secondary-400 mb-2 border-b border-secondary-700 pb-1">
                    <span>Git Changes</span>
                  </div>
                  <pre className="whitespace-pre-wrap">{fixRecord.diff}</pre>
                </div>
              )}

              {/* Logs Viewer */}
              {showLogs && fixRecord.testOutput && (
                <div className="bg-secondary-950 text-green-400 rounded-lg p-3 overflow-x-auto text-xs font-mono max-h-52">
                  <div className="flex items-center space-x-2 text-secondary-400 mb-2 border-b border-secondary-800 pb-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Test & Build Terminal Output</span>
                  </div>
                  <pre className="whitespace-pre-wrap">{fixRecord.testOutput}</pre>
                </div>
              )}
            </div>
          )}

          {/* Safety Rule Notice */}
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3 text-xs text-secondary-600 flex items-start space-x-2">
            <Shield className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>SafeStack Safety Guarantee:</strong> All actions take place in isolated working copies on dedicated fix branches. Your production code is never modified without user approval.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
