import Project from '../../models/Project';
import Scan from '../../models/Scan';
import Vulnerability from '../../models/Vulnerability';
import { DependencyParser } from './dependencyParser';
import { NpmAuditService } from './npmAuditService';
import { OSVService } from './osvService';
import logger from '../../utils/logger';

export class ScannerService {
  static async performScan(projectId: string, projectPath: string): Promise<string> {
    const scanId = await this.initiateScan(projectId);

    // Run scan in background
    this.executeScan(scanId, projectId, projectPath).catch(error => {
      logger.error('Scan execution failed', { scanId, error: error.message });
    });

    return scanId;
  }

  private static async initiateScan(projectId: string): Promise<string> {
    const scan = await Scan.create({
      projectId,
      status: 'queued',
    });

    await Project.findByIdAndUpdate(projectId, { status: 'scanning' });

    return scan._id.toString();
  }

  private static async executeScan(scanId: string, projectId: string, projectPath: string): Promise<void> {
    try {
      await Scan.findByIdAndUpdate(scanId, {
        status: 'running',
        startedAt: new Date(),
      });

      const startTime = Date.now();

      // Step 1: Parse dependencies
      const dependencies = DependencyParser.extractDependencies(projectPath);

      // Step 2: Run npm audit
      const npmAuditResult = await NpmAuditService.runAudit(projectPath);

      // Step 3: Query OSV database
      const osvResults = await OSVService.batchQuery(
        dependencies.map(d => ({ name: d.name, version: d.version }))
      );

      // Step 4: Aggregate and deduplicate vulnerabilities
      const vulnerabilities = await this.aggregateVulnerabilities(
        scanId,
        npmAuditResult,
        osvResults,
        dependencies
      );

      // Step 5: Calculate statistics
      const stats = this.calculateStats(vulnerabilities);

      // Step 6: Update scan record
      const duration = Math.floor((Date.now() - startTime) / 1000);

      await Scan.findByIdAndUpdate(scanId, {
        status: 'completed',
        completedAt: new Date(),
        duration,
        totalDependencies: dependencies.length,
        vulnerableCount: stats.total,
        criticalCount: stats.critical,
        highCount: stats.high,
        mediumCount: stats.medium,
        lowCount: stats.low,
        npmAuditResults: npmAuditResult,
        osvResults: Array.from(osvResults.entries()),
      });

      await Project.findByIdAndUpdate(projectId, {
        status: 'scanned',
        lastScanAt: new Date(),
      });

      logger.info('Scan completed successfully', {
        scanId,
        projectId,
        duration,
        vulnerabilitiesFound: stats.total,
      });
    } catch (error: any) {
      logger.error('Scan execution error', { scanId, error: error.message });

      await Scan.findByIdAndUpdate(scanId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
        errorStack: error.stack,
      });

      await Project.findByIdAndUpdate(projectId, { status: 'error' });
    }
  }

  private static async aggregateVulnerabilities(
    scanId: string,
    npmAuditResult: any,
    osvResults: Map<string, any[]>,
    dependencies: any[]
  ): Promise<any[]> {
    const vulnerabilityMap = new Map<string, any>();

    // Process npm audit results
    if (npmAuditResult) {
      const npmVulns = NpmAuditService.parseVulnerabilities(npmAuditResult);
      npmVulns.forEach(vuln => {
        const key = `${vuln.packageName}-${vuln.title}`;
        vulnerabilityMap.set(key, vuln);
      });
    }

    // Process OSV results
    osvResults.forEach((vulnerabilities, packageName) => {
      vulnerabilities.forEach(osvVuln => {
        const key = `${packageName}-${osvVuln.id}`;
        if (!vulnerabilityMap.has(key)) {
          const fixedVer = OSVService.extractFixedVersion(osvVuln);
          vulnerabilityMap.set(key, {
            packageName,
            currentVersion: dependencies.find(d => d.name === packageName)?.version || 'unknown',
            recommendedVersion: fixedVer,
            severity: OSVService.mapOSVSeverity(osvVuln),
            title: osvVuln.summary || 'Vulnerability detected',
            description: osvVuln.details || osvVuln.summary || 'No details available',
            cve: [osvVuln.id],
            osvId: osvVuln.id,
            recommendation: fixedVer ? `Update ${packageName} to ${fixedVer}` : undefined,
          });
        }
      });
    });

    // Save vulnerabilities to database
    const vulnerabilities = [];
    for (const vuln of vulnerabilityMap.values()) {
      const dependency = dependencies.find(d => d.name === vuln.packageName);
      const recommendedVersion = vuln.recommendedVersion || (vuln.recommendation?.includes('Update') ? 'latest' : undefined);
      const hasFixAvailable = !!recommendedVersion;

      const created = await Vulnerability.create({
        scanId,
        packageName: vuln.packageName,
        currentVersion: vuln.currentVersion,
        recommendedVersion,
        isDirect: dependency?.isDirect ?? true,
        cveId: vuln.cve?.[0],
        osvId: vuln.osvId,
        title: vuln.title,
        description: vuln.description,
        severity: vuln.severity,
        cvssScore: vuln.cvssScore,
        cwe: vuln.cwe || [],
        hasFixAvailable,
        fixType: hasFixAvailable ? 'update' : 'none',
        references: vuln.url ? [vuln.url] : [],
        status: 'open',
      });

      vulnerabilities.push(created);
    }

    return vulnerabilities;
  }

  private static calculateStats(vulnerabilities: any[]): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    return {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
    };
  }
}
