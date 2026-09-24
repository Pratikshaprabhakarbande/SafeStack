import { useState } from 'react';
import { Github, X, Loader2, GitBranch, Shield, ArrowRight } from 'lucide-react';
import { projectService } from '../../services/projectService';
import toast from 'react-hot-toast';

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (projectId: string) => void;
}

const DEMO_REPOSITORIES = [
  {
    name: 'Pratikshaprabhakarbande/SafeStack',
    url: 'https://github.com/Pratikshaprabhakarbande/SafeStack',
    branch: 'main',
    desc: '⭐ SafeStack — connect your own repo for full GitHub PR demo',
    highlight: true,
  },
  {
    name: 'expressjs/express',
    url: 'https://github.com/expressjs/express',
    branch: 'master',
    desc: 'Fast, unopinionated, minimalist web framework for Node.js',
    highlight: false,
  },
  {
    name: 'lodash/lodash',
    url: 'https://github.com/lodash/lodash',
    branch: 'main',
    desc: 'Modern JavaScript utility library delivering modularity & performance',
    highlight: false,
  },
];

export const GitHubConnectModal = ({
  isOpen,
  onClose,
  onImportComplete,
}: GitHubConnectModalProps) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleImport = async (urlToUse?: string, branchToUse?: string) => {
    const finalUrl = (urlToUse || repoUrl).trim();
    const finalBranch = (branchToUse || branch).trim() || 'main';

    if (!finalUrl) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    try {
      toast('Cloning repository into isolated workspace...', { icon: '⏳' });
      const result = await projectService.importGitHubRepo(finalUrl, finalBranch);
      toast.success('Repository imported successfully!');
      onClose();
      onImportComplete(result.data.projectId);
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.message || 'Failed to import repository';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-secondary-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Connect GitHub Repository</h2>
              <p className="text-sm text-gray-300">
                Clone into an isolated SafeStack workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-secondary-800 mb-1">
                Repository URL or Owner/Repo
              </label>
              <input
                type="text"
                placeholder="e.g. https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-800 mb-1">
                Branch (optional)
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-secondary-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => handleImport()}
              disabled={loading || !repoUrl.trim()}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cloning into isolated workspace...</span>
                </>
              ) : (
                <>
                  <span>Import & Start Security Scan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Demo Repositories */}
          <div className="pt-4 border-t border-secondary-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-500 mb-3">
              Quick Connect — Repository
            </h3>
            <div className="space-y-2">
              {DEMO_REPOSITORIES.map((demo) => (
                <button
                  key={demo.name}
                  onClick={() => {
                    setRepoUrl(demo.url);
                    setBranch(demo.branch);
                    handleImport(demo.url, demo.branch);
                  }}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between group ${
                    demo.highlight
                      ? 'border-primary-400 bg-primary-50 hover:bg-primary-100 ring-1 ring-primary-300'
                      : 'border-secondary-200 hover:border-primary-400 hover:bg-primary-50/50'
                  }`}
                >
                  <div>
                    <div className={`font-semibold text-sm ${demo.highlight ? 'text-primary-800' : 'text-secondary-900 group-hover:text-primary-700'}`}>
                      {demo.name}
                    </div>
                    <div className="text-xs text-secondary-500">
                      {demo.desc}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-mono ${demo.highlight ? 'bg-primary-200 text-primary-800' : 'bg-secondary-100 text-secondary-700'}`}>
                    {demo.branch}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Safety Rule Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-blue-900">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>SafeStack Safety Guarantee:</strong> Cloned repositories are strictly isolated in a sandbox workspace. SafeStack never pushes or modifies your original repository without your explicit action.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
