import { useEffect, useState } from 'react';
import { useScanPolling } from '../../hooks/useScanPolling';
import { Loader2, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

interface ScanProgressProps {
  scanId: string;
  onScanComplete: () => void;
}

const ScanProgress = ({ scanId, onScanComplete }: ScanProgressProps) => {
  const { scanStatus } = useScanPolling(scanId, true);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (scanStatus?.status === 'completed' && !hasCompleted) {
      setHasCompleted(true);
      setTimeout(onScanComplete, 1000);
    }
  }, [scanStatus, hasCompleted, onScanComplete]);

  if (!scanStatus) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-secondary-600">Initializing scan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          {scanStatus.status === 'running' && (
            <>
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-secondary-900 mb-2">
                Scanning Dependencies
              </h3>
              <p className="text-secondary-600">
                Analyzing your project for security vulnerabilities...
              </p>
            </>
          )}

          {scanStatus.status === 'completed' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-secondary-900 mb-2">
                Scan Complete
              </h3>
              <p className="text-secondary-600">
                Found {scanStatus.vulnerableCount || 0} vulnerabilities
              </p>
            </>
          )}

          {scanStatus.status === 'failed' && (
            <>
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-secondary-900 mb-2">
                Scan Failed
              </h3>
              <p className="text-red-600">
                {scanStatus.errorMessage || 'An error occurred during scanning'}
              </p>
            </>
          )}
        </div>

        {scanStatus.status === 'completed' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">
                {scanStatus.criticalCount || 0}
              </div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {scanStatus.highCount || 0}
              </div>
              <div className="text-sm text-orange-700">High</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {scanStatus.mediumCount || 0}
              </div>
              <div className="text-sm text-yellow-700">Medium</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {scanStatus.lowCount || 0}
              </div>
              <div className="text-sm text-blue-700">Low</div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-secondary-200">
          <div className="flex items-center justify-center text-sm text-secondary-500">
            <Shield className="w-4 h-4 mr-2" />
            <span>Scan ID: {scanId.substring(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanProgress;
