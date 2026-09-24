import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Github,
  Upload,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  GitBranch,
  Calendar,
  Layers,
  Wrench,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import ProjectUpload from '../components/project/ProjectUpload';
import ScanProgress from '../components/scan/ScanProgress';
import { GitHubConnectModal } from '../components/project/GitHubConnectModal';
import { FixWorkflowModal } from '../components/fix/FixWorkflowModal';
import { scanService } from '../services/scanService';
import { projectService } from '../services/projectService';
import { fixService } from '../services/fixService';
import { vulnerabilityService } from '../services/vulnerabilityService';
import toast from 'react-hot-toast';

type DashboardView = 'selection' | 'upload' | 'scanning';

export const Dashboard = () => {
  const [view, setView] = useState<DashboardView>('selection');
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [loadingVulnerabilities, setLoadingVulnerabilities] = useState(false);
  const [selectedVulnerabilityForFix, setSelectedVulnerabilityForFix] = useState<any | null>(null);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<{
    github: { configured: boolean; authenticated: boolean; login?: string; error?: string };
    gemini: { configured: boolean };
  } | null>(null);

  useEffect(() => {
    loadProjects();
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const res = await fixService.getIntegrationStatus();
      setIntegrationStatus(res.data);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const result = await projectService.getProjects();
      const loadedProjects = result.data || [];
      setProjects(loadedProjects);
      if (loadedProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(loadedProjects[0]._id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const selectedProject = projects.find((p) => p._id === selectedProjectId) || projects[0];
  const latestScan = selectedProject?.latestScan;

  // Load vulnerabilities for selected project's latest scan
  useEffect(() => {
    if (latestScan?._id) {
      loadVulnerabilities(latestScan._id);
    } else {
      setVulnerabilities([]);
    }
  }, [latestScan?._id]);

  const loadVulnerabilities = async (scanId: string) => {
    setLoadingVulnerabilities(true);
    try {
      const result = await scanService.getScanResults(scanId);
      setVulnerabilities(result.data.vulnerabilities || []);
    } catch (err) {
      console.error('Failed to load vulnerabilities:', err);
    } finally {
      setLoadingVulnerabilities(false);
    }
  };

  const handleProjectImported = async (projectId: string) => {
    toast.success('Starting security scan...');
    try {
      const result = await scanService.createScan(projectId);
      setCurrentScanId(result.data.scanId);
      setView('scanning');
      await loadProjects();
      setSelectedProjectId(projectId);
    } catch (error: any) {
      toast.error('Failed to start scan');
      console.error(error);
    }
  };

  const handleScanComplete = async () => {
    if (currentScanId) {
      await loadProjects();
      setView('selection');
      toast.success('Scan complete! Viewing security posture.');
    }
  };

  const startScan = async (projectId: string) => {
    try {
      const result = await scanService.createScan(projectId);
      setCurrentScanId(result.data.scanId);
      setView('scanning');
      toast.success('Security scan initiated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to start scan');
    }
  };

  const handleGenerateAiExplanation = async (vulnId: string) => {
    setGeneratingAiId(vulnId);
    try {
      const res = await vulnerabilityService.generateExplanation(vulnId);
      setVulnerabilities((prev) =>
        prev.map((v) =>
          v._id === vulnId
            ? { ...v, aiExplanation: res.data.explanation, aiExplanationGenerated: true }
            : v
        )
      );
      toast.success('AI explanation generated!');
    } catch (err) {
      toast.error('Failed to generate AI explanation');
    } finally {
      setGeneratingAiId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200 sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-secondary-900">SafeStack</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-secondary-100 text-secondary-700 rounded-md text-xs font-semibold">
              Software Supply-Chain Platform
            </span>
          </div>

          {/* Integration Status Badge */}
          <div className="flex items-center space-x-3">
            {integrationStatus && (
              <div
                className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  integrationStatus.github.authenticated
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : integrationStatus.github.configured
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    : 'bg-secondary-100 text-secondary-700 border-secondary-200'
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                {integrationStatus.github.authenticated ? (
                  <span>Connected as @{integrationStatus.github.login}</span>
                ) : (
                  <span>GitHub Token Missing</span>
                )}
              </div>
            )}

            {view !== 'selection' && (
              <button
                onClick={() => setView('selection')}
                className="flex items-center space-x-1.5 text-secondary-600 hover:text-secondary-900 transition text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {view === 'selection' && (
          <div className="space-y-8">
            {/* Top Hero / Action Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-secondary-900">
                  Security Overview & Automated Fix Dashboard
                </h1>
                <p className="text-sm text-secondary-600 mt-1">
                  Connect GitHub repositories, run supply-chain vulnerability scans, inspect AI rationale, and apply automated fixes.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsGitHubModalOpen(true)}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  <Github className="w-4 h-4" />
                  <span>Connect GitHub</span>
                </button>

                <button
                  onClick={() => setView('upload')}
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Project ZIP</span>
                </button>
              </div>
            </div>

            {/* Selected Project Security Metrics & Status Panel */}
            {selectedProject && (
              <div className="bg-white rounded-xl shadow-md border border-secondary-200 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-secondary-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white uppercase tracking-wider">
                        {selectedProject.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-secondary-300 mt-2 font-mono">
                      <span className="flex items-center space-x-1">
                        <GitBranch className="w-3.5 h-3.5 text-primary-400" />
                        <span>Branch: {selectedProject.defaultBranch || 'main'}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-primary-400" />
                        <span>
                          Last Scan:{' '}
                          {latestScan?.completedAt
                            ? new Date(latestScan.completedAt).toLocaleString()
                            : 'Not scanned yet'}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-primary-400" />
                        <span>Dependencies: {latestScan?.totalDependencies || 0}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => startScan(selectedProject._id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{latestScan ? 'Re-scan Project' : 'Scan Project'}</span>
                    </button>
                    {latestScan && (
                      <Link
                        to={`/scan/${latestScan._id}/results`}
                        className="px-4 py-2 bg-white text-secondary-900 hover:bg-secondary-100 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow"
                      >
                        <span>Full Report</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="p-6 bg-white border-b border-secondary-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-500 mb-4">
                    Security Vulnerability Breakdown
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-secondary-900">
                        {latestScan?.vulnerableCount || 0}
                      </div>
                      <div className="text-xs text-secondary-500 font-semibold mt-1">Total</div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-red-600">
                        {latestScan?.criticalCount || 0}
                      </div>
                      <div className="text-xs text-red-700 font-semibold mt-1">Critical</div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-orange-600">
                        {latestScan?.highCount || 0}
                      </div>
                      <div className="text-xs text-orange-700 font-semibold mt-1">High</div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-yellow-600">
                        {latestScan?.mediumCount || 0}
                      </div>
                      <div className="text-xs text-yellow-700 font-semibold mt-1">Medium</div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-blue-600">
                        {latestScan?.lowCount || 0}
                      </div>
                      <div className="text-xs text-blue-700 font-semibold mt-1">Low</div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3.5">
                      <div className="text-2xl font-extrabold text-green-600">
                        {latestScan?.vulnerableCount || 0}
                      </div>
                      <div className="text-xs text-green-700 font-semibold mt-1">Fixable</div>
                    </div>
                  </div>
                </div>

                {/* Vulnerabilities & Safe Automated Fix Section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-secondary-900">
                        Detected Vulnerabilities & Fix Pipeline
                      </h3>
                      <p className="text-xs text-secondary-500">
                        Inspect AI rationale and trigger branch-isolated fixes with automated test runner and GitHub PR creation.
                      </p>
                    </div>
                    {latestScan && (
                      <span className="text-xs font-mono font-semibold text-secondary-500">
                        {vulnerabilities.length} items detected
                      </span>
                    )}
                  </div>

                  {loadingVulnerabilities ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-secondary-500">Loading vulnerabilities...</p>
                    </div>
                  ) : !latestScan ? (
                    <div className="text-center py-8 bg-secondary-50 border border-dashed border-secondary-300 rounded-lg">
                      <Shield className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-secondary-700 mb-2">
                        Project not scanned yet
                      </p>
                      <button
                        onClick={() => startScan(selectedProject._id)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        Run Security Scan Now
                      </button>
                    </div>
                  ) : vulnerabilities.length === 0 ? (
                    <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-green-900">No vulnerabilities detected!</p>
                      <p className="text-xs text-green-700">Your supply-chain dependencies are secure.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vulnerabilities.map((vuln) => (
                        <div
                          key={vuln._id}
                          className="border border-secondary-200 hover:border-secondary-300 rounded-lg p-4 bg-white transition space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  vuln.severity === 'critical'
                                    ? 'bg-red-100 text-red-800'
                                    : vuln.severity === 'high'
                                    ? 'bg-orange-100 text-orange-800'
                                    : vuln.severity === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {vuln.severity}
                              </span>
                              <span className="font-bold text-secondary-900 text-base">
                                {vuln.packageName}
                              </span>
                              <div className="flex items-center space-x-1.5 text-xs text-secondary-600 font-mono">
                                <span>{vuln.currentVersion}</span>
                                {vuln.recommendedVersion && (
                                  <>
                                    <ChevronRight className="w-3.5 h-3.5 text-secondary-400" />
                                    <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                                      {vuln.recommendedVersion}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Fix Action Buttons */}
                            <div className="flex items-center space-x-2">
                              {!vuln.aiExplanationGenerated && (
                                <button
                                  onClick={() => handleGenerateAiExplanation(vuln._id)}
                                  disabled={generatingAiId === vuln._id}
                                  className="px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 rounded text-xs font-bold transition flex items-center space-x-1"
                                >
                                  {generatingAiId === vuln._id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
                                  )}
                                  <span>AI Explain</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedVulnerabilityForFix(vuln)}
                                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Apply Safe Fix</span>
                              </button>

                              <Link
                                to={`/vulnerability/${vuln._id}`}
                                className="px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 rounded text-xs font-bold transition"
                              >
                                Details
                              </Link>
                            </div>
                          </div>

                          <p className="text-xs text-secondary-600 line-clamp-2">{vuln.title || vuln.description}</p>

                          {vuln.aiExplanation && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-md p-2.5 text-xs text-indigo-900 leading-relaxed">
                              <span className="font-bold flex items-center mb-0.5 text-indigo-800">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-600 mr-1" />
                                AI Plain-English Explanation:
                              </span>
                              {vuln.aiExplanation.slice(0, 220)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Repositories & Projects Grid */}
            <div className="bg-white rounded-xl shadow-md border border-secondary-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-secondary-900">Your Repositories & Projects</h2>
                  <p className="text-sm text-secondary-500">
                    Select a project to view vulnerability posture or initiate scans
                  </p>
                </div>
                <button
                  onClick={loadProjects}
                  className="p-2 text-secondary-500 hover:text-secondary-800 transition"
                  title="Refresh Projects"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loadingProjects ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                  <p className="text-secondary-600 text-sm">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-secondary-200 rounded-lg">
                  <Shield className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-secondary-900 mb-1">
                    No Projects Added Yet
                  </h3>
                  <p className="text-sm text-secondary-500 mb-4 max-w-sm mx-auto">
                    Upload a Node.js project ZIP or import a GitHub repository to begin supply-chain scanning.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setView('upload')}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition"
                    >
                      Upload ZIP
                    </button>
                    <button
                      onClick={() => setIsGitHubModalOpen(true)}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition"
                    >
                      Connect GitHub
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const isSelected = project._id === selectedProject?._id;
                    const scan = project.latestScan;
                    return (
                      <div
                        key={project._id}
                        onClick={() => setSelectedProjectId(project._id)}
                        className={`cursor-pointer border rounded-lg p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500'
                            : 'border-secondary-200 hover:border-secondary-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-secondary-100 text-secondary-700 mt-1">
                            {project.type === 'github' ? (
                              <Github className="w-5 h-5" />
                            ) : (
                              <Upload className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-secondary-900">{project.name}</h3>
                              <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-0.5 rounded font-mono">
                                {project.defaultBranch || 'main'}
                              </span>
                            </div>
                            <p className="text-xs text-secondary-500 mt-1">
                              {project.type === 'github'
                                ? `GitHub Repo: ${project.githubRepoUrl || project.name}`
                                : 'Uploaded ZIP Archive'}
                              {' • Added '}
                              {new Date(project.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {scan ? (
                            <div className="flex items-center space-x-2">
                              {scan.vulnerableCount > 0 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{scan.vulnerableCount} Vulnerabilities</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Secure</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-secondary-400 italic">Not scanned</span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startScan(project._id);
                            }}
                            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-bold transition"
                          >
                            Scan Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Core Safety Guarantee Banner */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 flex items-start space-x-3">
              <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">
                  SafeStack Core Safety Guarantee: Zero Production Branch Modification
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  SafeStack <strong>never directly modifies main, master, or production branches</strong>. All dependency updates, lockfile regenerations, and compatibility tests execute in an isolated sandbox branch (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">safestack/security-fix-...</code>). You maintain total ownership over reviewing and merging pull requests on GitHub.
                </p>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-secondary-900">Upload Node.js Project ZIP</h1>
              <button
                onClick={() => setView('selection')}
                className="px-3 py-1.5 bg-secondary-200 hover:bg-secondary-300 text-secondary-800 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
            <p className="text-secondary-600">
              Upload a ZIP archive of your Node.js application to run vulnerability scans and generate automated safe fixes.
            </p>
            <ProjectUpload onUploadComplete={handleProjectImported} />
          </div>
        )}

        {view === 'scanning' && currentScanId && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-secondary-900 text-center">
              Scanning Dependencies
            </h1>
            <ScanProgress scanId={currentScanId} onScanComplete={handleScanComplete} />
          </div>
        )}
      </main>

      {/* GitHub Connect Modal */}
      <GitHubConnectModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportComplete={handleProjectImported}
      />

      {/* Interactive Fix Workflow Modal */}
      {selectedVulnerabilityForFix && (
        <FixWorkflowModal
          isOpen={!!selectedVulnerabilityForFix}
          onClose={() => setSelectedVulnerabilityForFix(null)}
          vulnerability={selectedVulnerabilityForFix}
          onFixCompleted={() => {
            if (latestScan?._id) loadVulnerabilities(latestScan._id);
            loadProjects();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
