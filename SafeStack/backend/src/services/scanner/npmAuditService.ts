import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

interface NpmAuditResult {
  vulnerabilities: Record<string, any>;
  metadata: {
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
      moderate: number;
      low: number;
    };
  };
}

export class NpmAuditService {
  static async runAudit(projectPath: string): Promise<NpmAuditResult | null> {
    try {
      logger.info('Running npm audit', { projectPath });

      // Run npm audit with JSON output
      const { stdout } = await execAsync('npm audit --json', {
        cwd: projectPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const result: NpmAuditResult = JSON.parse(stdout);

      logger.info('npm audit completed', {
        projectPath,
        totalVulnerabilities: result.metadata?.vulnerabilities?.total || 0,
      });

      return result;
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          const result: NpmAuditResult = JSON.parse(error.stdout);
          logger.info('npm audit completed with vulnerabilities', {
            projectPath,
            totalVulnerabilities: result.metadata?.vulnerabilities?.total || 0,
          });
          return result;
        } catch (parseError) {
          logger.error('Failed to parse npm audit output', {
            projectPath,
            error: parseError,
          });
        }
      }

      logger.error('npm audit failed', {
        projectPath,
        error: error.message,
      });
      return null;
    }
  }

  static parseVulnerabilities(auditResult: NpmAuditResult): Array<{
    packageName: string;
    currentVersion: string;
    recommendedVersion?: string;
    vulnerableRange?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    recommendation?: string;
    cve?: string[];
    cwe?: string[];
    cvssScore?: number;
    url?: string;
  }> {
    const vulnerabilities: any[] = [];

    if (!auditResult.vulnerabilities) {
      return vulnerabilities;
    }

    Object.entries(auditResult.vulnerabilities).forEach(([packageName, vulnData]: [string, any]) => {
      let recommendedVersion: string | undefined;

      if (typeof vulnData.fixAvailable === 'object' && vulnData.fixAvailable !== null) {
        recommendedVersion = vulnData.fixAvailable.version;
      } else if (vulnData.fixAvailable === true) {
        recommendedVersion = undefined; // Will be resolved during aggregation or semver check
      }

      if (vulnData.via && Array.isArray(vulnData.via)) {
        vulnData.via.forEach((via: any) => {
          if (typeof via === 'object' && via.title) {
            // If recommendedVersion is still empty, check if range has fixed upper bound (e.g. "<4.17.21" -> "4.17.21")
            let derivedFixed = recommendedVersion;
            if (!derivedFixed && via.range) {
              const match = via.range.match(/<(=)?\s*([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?)/);
              if (match && match[2]) {
                derivedFixed = match[2];
              }
            }

            const cveList: string[] = [];
            if (via.cve) {
              if (Array.isArray(via.cve)) cveList.push(...via.cve);
              else cveList.push(via.cve);
            }
            if (via.url && via.url.includes('GHSA-')) {
              const ghsaMatch = via.url.match(/GHSA-[a-zA-Z0-9-]+/);
              if (ghsaMatch && !cveList.includes(ghsaMatch[0])) {
                cveList.push(ghsaMatch[0]);
              }
            }

            vulnerabilities.push({
              packageName,
              currentVersion: vulnData.range || 'unknown',
              recommendedVersion: derivedFixed,
              vulnerableRange: via.range || vulnData.range,
              severity: this.mapSeverity(via.severity),
              title: via.title,
              description: via.url || via.title,
              recommendation: derivedFixed
                ? `Update ${packageName} to ${derivedFixed}`
                : vulnData.fixAvailable ? 'Update available' : 'No automated fix available',
              cve: cveList,
              cwe: Array.isArray(via.cwe) ? via.cwe : [],
              cvssScore: via.cvss?.score ? Number(via.cvss.score) : undefined,
              url: via.url,
            });
          }
        });
      }
    });

    return vulnerabilities;
  }

  private static mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const normalizedSeverity = severity.toLowerCase();
    if (normalizedSeverity === 'critical') return 'critical';
    if (normalizedSeverity === 'high') return 'high';
    if (normalizedSeverity === 'moderate') return 'medium';
    return 'low';
  }
}
