import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, ArrowLeft, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { scanService } from '../services/scanService';
import toast from 'react-hot-toast';

interface Vulnerability {
  _id: string;
  packageName: string;
  currentVersion: string;
  recommendedVersion?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: string;
}

const ScanResults = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (scanId) {
      loadResults();
    }
  }, [scanId]);

  const loadResults = async () => {
    try {
      const result = await scanService.getScanResults(scanId!);
      setVulnerabilities(result.data.vulnerabilities);
    } catch (error) {
      toast.error('Failed to load scan results');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="w-5 h-5" />;
    }
    if (severity === 'medium') {
      return <Info className="w-5 h-5" />;
    }
    return <CheckCircle className="w-5 h-5" />;
  };

  const filteredVulnerabilities = vulnerabilities.filter(v =>
    filter === 'all' || v.severity === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm">
        <nav className="container py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-secondary-900">SafeStack</span>
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-secondary-600 hover:text-secondary-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="container py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-secondary-900 mb-2">
            Scan Results
          </h1>
          <p className="text-xl text-secondary-600 mb-8">
            Found {vulnerabilities.length} vulnerabilities in your project
          </p>

          {/* Filter Buttons */}
          <div className="flex space-x-4 mb-8">
            {['all', 'critical', 'high', 'medium', 'low'].map(severity => (
              <button
                key={severity}
                onClick={() => setFilter(severity)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === severity
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                {severity !== 'all' && (
                  <span className="ml-2">
                    ({vulnerabilities.filter(v => v.severity === severity).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Vulnerabilities List */}
          <div className="space-y-4">
            {filteredVulnerabilities.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">
                  No vulnerabilities found
                </h2>
                <p className="text-secondary-600">
                  {filter === 'all'
                    ? 'Your project is secure!'
                    : `No ${filter} severity vulnerabilities found`}
                </p>
              </div>
            ) : (
              filteredVulnerabilities.map(vuln => (
                <Link
                  key={vuln._id}
                  to={`/vulnerability/${vuln._id}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${getSeverityColor(vuln.severity)}`}>
                          {getSeverityIcon(vuln.severity)}
                          <span>{vuln.severity.toUpperCase()}</span>
                        </span>
                        <h3 className="text-lg font-bold text-secondary-900">
                          {vuln.packageName}@{vuln.currentVersion}
                        </h3>
                      </div>
                      <p className="text-secondary-700 mb-2">{vuln.title}</p>
                      <p className="text-sm text-secondary-500 line-clamp-2">
                        {vuln.description}
                      </p>
                      {vuln.recommendedVersion && (
                        <div className="mt-3 inline-flex items-center text-sm text-green-600 font-semibold">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Fix available: Update to {vuln.recommendedVersion}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScanResults;
