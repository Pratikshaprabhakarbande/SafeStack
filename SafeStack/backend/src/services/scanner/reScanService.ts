import { NpmAuditService } from './npmAuditService';
import { DependencyParser } from './dependencyParser';
import { OSVService } from './osvService';
import logger from '../../utils/logger';

export interface BeforeAfterStats {
  critical: { before: number; after: number };
  high: { before: number; after: number };
  medium: { before: number; after: number };
  low: { before: number; after: number };
  total: { before: number; after: number };
}

export interface ReScanResult {
  isResolved: boolean;
  beforeStats: { critical: number; high: number; medium: number; low: number; total: number };
  afterStats: { critical: number; high: number; medium: number; low: number; total: number };
  comparison: BeforeAfterStats;
  remainingVulnerabilities: Array<{
    packageName: string;
    title: string;
    severity: string;
  }>;
  resolvedPackage: string;
  resolvedVersion?: string;
}

export class ReScanService {
  /**
   * Run a re-scan on the isolated fix workspace to compare vulnerability state
   * before and after applying the dependency update.
   */
  static async performReScan(
    workingDir: string,
    targetPackageName: string,
    originalVulnerability: any,
    originalScanStats?: { critical: number; high: number; medium: number; low: number; total: number }
  ): Promise<ReScanResult> {
    logger.info('Performing re-scan on fix workspace', { workingDir, targetPackageName });

    // Step 1: Run npm audit on updated workspace
    const npmAuditResult = await NpmAuditService.runAudit(workingDir);
    let afterVulns: any[] = [];

    if (npmAuditResult) {
      afterVulns = NpmAuditService.parseVulnerabilities(npmAuditResult);
    } else {
      // If npm audit was not able to run directly, query OSV for the updated package version
      const deps = DependencyParser.extractDependencies(workingDir);
      const updatedDep = deps.find(d => d.name === targetPackageName);
      if (updatedDep) {
        const osvVulns = await OSVService.queryVulnerability(updatedDep.name, updatedDep.version);
        afterVulns = osvVulns.map(v => ({
          packageName: targetPackageName,
          title: v.summary || 'OSV Advisory',
          severity: OSVService.mapOSVSeverity(v),
        }));
      }
    }

    // Step 2: Check if target package still has vulnerabilities
    const targetStillVulnerable = afterVulns.some(
      v => v.packageName.toLowerCase() === targetPackageName.toLowerCase()
    );

    const isResolved = !targetStillVulnerable;

    // Step 3: Calculate After Stats
    const afterStats = {
      critical: afterVulns.filter(v => v.severity === 'critical').length,
      high: afterVulns.filter(v => v.severity === 'high').length,
      medium: afterVulns.filter(v => v.severity === 'medium').length,
      low: afterVulns.filter(v => v.severity === 'low').length,
      total: afterVulns.length,
    };

    // Step 4: Before Stats
    const beforeStats = originalScanStats || {
      critical: originalVulnerability?.severity === 'critical' ? 1 : 0,
      high: originalVulnerability?.severity === 'high' ? 1 : 0,
      medium: originalVulnerability?.severity === 'medium' ? 1 : 0,
      low: originalVulnerability?.severity === 'low' ? 1 : 0,
      total: 1,
    };

    const comparison: BeforeAfterStats = {
      critical: { before: beforeStats.critical, after: afterStats.critical },
      high: { before: beforeStats.high, after: afterStats.high },
      medium: { before: beforeStats.medium, after: afterStats.medium },
      low: { before: beforeStats.low, after: afterStats.low },
      total: { before: beforeStats.total, after: afterStats.total },
    };

    logger.info('Re-scan completed', {
      targetPackageName,
      isResolved,
      beforeTotal: beforeStats.total,
      afterTotal: afterStats.total,
    });

    return {
      isResolved,
      beforeStats,
      afterStats,
      comparison,
      remainingVulnerabilities: afterVulns.map(v => ({
        packageName: v.packageName,
        title: v.title,
        severity: v.severity,
      })),
      resolvedPackage: targetPackageName,
      resolvedVersion: originalVulnerability?.recommendedVersion,
    };
  }
}
