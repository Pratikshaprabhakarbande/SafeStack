import axios from 'axios';
import logger from '../../utils/logger';

interface OSVQuery {
  package: {
    name: string;
    ecosystem: string;
  };
  version?: string;
}

interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{
    type: string;
    score: string;
  }>;
  references?: Array<{
    type: string;
    url: string;
  }>;
  database_specific?: any;
  ecosystem_specific?: any;
}

export class OSVService {
  private static readonly OSV_API_URL = 'https://api.osv.dev/v1';

  static async queryVulnerability(packageName: string, version?: string): Promise<OSVVulnerability[]> {
    try {
      const query: OSVQuery = {
        package: {
          name: packageName,
          ecosystem: 'npm',
        },
      };

      if (version) {
        query.version = version;
      }

      const response = await axios.post(`${this.OSV_API_URL}/query`, query, {
        timeout: 10000,
      });

      const vulnerabilities = response.data.vulns || [];

      logger.info('OSV query completed', {
        packageName,
        version,
        vulnerabilityCount: vulnerabilities.length,
      });

      return vulnerabilities;
    } catch (error: any) {
      logger.error('OSV query failed', {
        packageName,
        version,
        error: error.message,
      });
      return [];
    }
  }

  static async batchQuery(packages: Array<{ name: string; version: string }>): Promise<Map<string, OSVVulnerability[]>> {
    const results = new Map<string, OSVVulnerability[]>();

    // Query in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < packages.length; i += batchSize) {
      const batch = packages.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (pkg) => {
          const vulnerabilities = await this.queryVulnerability(pkg.name, pkg.version);
          if (vulnerabilities.length > 0) {
            results.set(pkg.name, vulnerabilities);
          }
        })
      );

      // Rate limiting delay
      if (i + batchSize < packages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  static extractCVSSScore(vulnerability: OSVVulnerability): number | undefined {
    if (!vulnerability.severity) return undefined;

    for (const sev of vulnerability.severity) {
      if (sev.type === 'CVSS_V3') {
        const match = sev.score.match(/CVSS:3\.\d\/AV:[NALP]\/AC:[LH]\/PR:[NLH]\/UI:[NR]\/S:[UC]\/C:[NLH]\/I:[NLH]\/A:[NLH]\/E:[XUPFH]\/RL:[XOTWU]\/RC:[XURC]/);
        if (match) {
          // Parse CVSS score (simplified - would need full CVSS parser for accuracy)
          return 7.0; // Placeholder
        }
      }
    }

    return undefined;
  }

  static mapOSVSeverity(vulnerability: OSVVulnerability): 'critical' | 'high' | 'medium' | 'low' {
    const score = this.extractCVSSScore(vulnerability);

    if (score !== undefined) {
      if (score >= 9.0) return 'critical';
      if (score >= 7.0) return 'high';
      if (score >= 4.0) return 'medium';
      return 'low';
    }

    // Fallback to summary/details keywords
    const text = `${vulnerability.summary || ''} ${vulnerability.details || ''}`.toLowerCase();
    if (text.includes('critical') || text.includes('remote code execution')) return 'critical';
    if (text.includes('high') || text.includes('sql injection')) return 'high';
    if (text.includes('medium') || text.includes('moderate')) return 'medium';
    return 'low';
  }

  static extractFixedVersion(vulnerability: any): string | undefined {
    if (!vulnerability?.affected || !Array.isArray(vulnerability.affected)) return undefined;
    for (const affected of vulnerability.affected) {
      if (affected.ranges && Array.isArray(affected.ranges)) {
        for (const range of affected.ranges) {
          if (range.events && Array.isArray(range.events)) {
            for (const event of range.events) {
              if (event.fixed) return event.fixed;
            }
          }
        }
      }
    }
    return undefined;
  }
}
