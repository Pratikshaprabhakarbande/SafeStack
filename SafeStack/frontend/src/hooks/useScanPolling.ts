import { useState, useEffect } from 'react';
import { scanService } from '../services/scanService';

interface ScanStatus {
  scanId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  totalDependencies?: number;
  vulnerableCount?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  errorMessage?: string;
}

export const useScanPolling = (scanId: string | null, enabled: boolean = true) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scanId || !enabled) return;

    let intervalId: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const result = await scanService.getScanStatus(scanId);
        setScanStatus(result.data);

        // Stop polling if completed or failed
        if (result.data.status === 'completed' || result.data.status === 'failed') {
          clearInterval(intervalId);
          setLoading(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    setLoading(true);
    poll(); // Initial poll
    intervalId = setInterval(poll, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [scanId, enabled]);

  return { scanStatus, loading };
};
