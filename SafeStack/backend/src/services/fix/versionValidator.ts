import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

/**
 * Result of version validation for a proposed dependency fix.
 */
export interface VersionValidationResult {
  isValid: boolean;
  isDowngrade: boolean;
  currentVersion: string;
  recommendedVersion: string;
  reason: string;
  registryVerified: boolean;
  advisoryFixedVersion?: string;
  vulnerableRange?: string;
}

/**
 * Parsed semver version components.
 */
interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  raw: string;
}

/**
 * VersionValidator provides safe, semver-aware version selection for
 * SafeStack's automated security fix engine.
 *
 * Key guarantees:
 * - NEVER allows an automatic downgrade
 * - Validates the target version exists on the npm registry
 * - Derives the recommendation from advisory data, not hardcoded values
 * - Returns clear reasons when a fix cannot be safely applied
 */
export class VersionValidator {

  /**
   * Parse a version string into semver components.
   * Strips leading range characters (^, ~, >=, etc.).
   */
  static parseSemver(version: string): SemverParts | null {
    if (!version) return null;

    const cleaned = version.replace(/^[^\d]*/, '');
    const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || '',
      raw: cleaned,
    };
  }

  /**
   * Clean version string: remove range prefixes like ^, ~, >=, <=, >, <
   */
  static cleanVersion(version: string): string {
    return version.replace(/^[^\d]*/, '').trim();
  }

  /**
   * Compare two semver versions.
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  static compareSemver(versionA: string, versionB: string): number {
    const a = this.parseSemver(versionA);
    const b = this.parseSemver(versionB);

    if (!a || !b) {
      // Fallback to string comparison if we can't parse
      return versionA.localeCompare(versionB);
    }

    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

    // Prerelease versions have lower precedence than release
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && b.prerelease) {
      return a.prerelease.localeCompare(b.prerelease);
    }

    return 0;
  }

  /**
   * Check whether a version falls within a vulnerable range string.
   * Supports common npm audit range formats:
   *   "<4.17.21"   => versions below 4.17.21 are vulnerable
   *   ">=0 <4.17.21" => same
   *   "<=4.17.20"  => versions up to and including 4.17.20
   */
  static isVersionInVulnerableRange(version: string, vulnerableRange: string): boolean {
    if (!version || !vulnerableRange) return false;

    const cleaned = this.cleanVersion(version);
    const parsed = this.parseSemver(cleaned);
    if (!parsed) return false;

    // Extract the upper-bound from common range patterns
    // e.g., "<4.17.21" or ">=0 <4.17.21" or "<=4.17.20"
    const ltMatch = vulnerableRange.match(/<(=?)\s*(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/);
    if (ltMatch) {
      const isInclusive = ltMatch[1] === '=';
      const boundVersion = ltMatch[2];
      const cmp = this.compareSemver(cleaned, boundVersion);

      if (isInclusive) {
        return cmp <= 0; // vulnerable if version <= bound
      } else {
        return cmp < 0; // vulnerable if version < bound
      }
    }

    return false;
  }

  /**
   * Core validation: determine whether a recommended version is safe to apply.
   *
   * Rules:
   * 1. If recommended < current → REJECT (unsafe downgrade)
   * 2. If recommended == current → REJECT (no change needed)
   * 3. If current is NOT in the vulnerable range → the current version is already safe
   * 4. If recommended IS in the vulnerable range → REJECT (doesn't fix the issue)
   * 5. Validate the version exists on the npm registry
   */
  static async validateVersionSelection(
    packageName: string,
    currentVersion: string,
    recommendedVersion: string,
    vulnerableRange?: string
  ): Promise<VersionValidationResult> {
    const cleanCurrent = this.cleanVersion(currentVersion);
    const cleanRecommended = this.cleanVersion(recommendedVersion);

    // Rule 1: Downgrade detection
    const comparison = this.compareSemver(cleanRecommended, cleanCurrent);
    if (comparison < 0) {
      logger.warn('VersionValidator: REJECTED — recommended version is a downgrade', {
        packageName,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
      });

      return {
        isValid: false,
        isDowngrade: true,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
        reason: `Unsafe downgrade: ${cleanRecommended} < ${cleanCurrent}. SafeStack refuses to downgrade ${packageName} automatically.`,
        registryVerified: false,
        vulnerableRange,
      };
    }

    // Rule 2: No-op check
    if (comparison === 0) {
      // Current version equals recommended — check if it's actually vulnerable
      if (vulnerableRange && this.isVersionInVulnerableRange(cleanCurrent, vulnerableRange)) {
        return {
          isValid: false,
          isDowngrade: false,
          currentVersion: cleanCurrent,
          recommendedVersion: cleanRecommended,
          reason: `Recommended version ${cleanRecommended} equals installed version ${cleanCurrent}, but it is still within the vulnerable range (${vulnerableRange}). A higher version is required.`,
          registryVerified: false,
          vulnerableRange,
        };
      }

      return {
        isValid: false,
        isDowngrade: false,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
        reason: `Package ${packageName} is already at version ${cleanCurrent}. No update needed.`,
        registryVerified: false,
        vulnerableRange,
      };
    }

    // Rule 3: Check if the current version is already outside the vulnerable range
    if (vulnerableRange && !this.isVersionInVulnerableRange(cleanCurrent, vulnerableRange)) {
      logger.info('VersionValidator: current version is already outside vulnerable range', {
        packageName,
        currentVersion: cleanCurrent,
        vulnerableRange,
      });

      return {
        isValid: false,
        isDowngrade: false,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
        reason: `Package ${packageName}@${cleanCurrent} is already outside the vulnerable range (${vulnerableRange}). No fix needed.`,
        registryVerified: false,
        vulnerableRange,
      };
    }

    // Rule 4: Check the recommended version is outside the vulnerable range
    if (vulnerableRange && this.isVersionInVulnerableRange(cleanRecommended, vulnerableRange)) {
      return {
        isValid: false,
        isDowngrade: false,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
        reason: `Recommended version ${cleanRecommended} is still within the vulnerable range (${vulnerableRange}). It does not resolve the vulnerability.`,
        registryVerified: false,
        vulnerableRange,
      };
    }

    // Rule 5: Validate on npm registry
    const registryValid = await this.verifyVersionOnRegistry(packageName, cleanRecommended);
    if (!registryValid) {
      return {
        isValid: false,
        isDowngrade: false,
        currentVersion: cleanCurrent,
        recommendedVersion: cleanRecommended,
        reason: `Version ${cleanRecommended} of ${packageName} could not be verified on the npm registry.`,
        registryVerified: false,
        vulnerableRange,
      };
    }

    // All checks passed
    return {
      isValid: true,
      isDowngrade: false,
      currentVersion: cleanCurrent,
      recommendedVersion: cleanRecommended,
      reason: `Safe upgrade: ${packageName} ${cleanCurrent} → ${cleanRecommended}. Version verified on registry and resolves vulnerable range.`,
      registryVerified: true,
      advisoryFixedVersion: cleanRecommended,
      vulnerableRange,
    };
  }

  /**
   * Verify a package version exists on the npm registry.
   */
  static async verifyVersionOnRegistry(packageName: string, version: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName}@${version} version`, {
        timeout: 15000,
      });
      const registryVersion = stdout.trim();
      return registryVersion === version;
    } catch (error: any) {
      logger.warn('VersionValidator: npm registry verification failed', {
        packageName,
        version,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Query the npm registry for the latest version of a package.
   */
  static async getLatestVersion(packageName: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`, {
        timeout: 15000,
      });
      return stdout.trim() || null;
    } catch (error: any) {
      logger.warn('VersionValidator: failed to get latest version', {
        packageName,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Given a vulnerability advisory's fixed version and the current installed version,
   * determine the minimum safe upgrade version.
   *
   * Logic:
   * - If advisoryFixedVersion > currentVersion: use advisoryFixedVersion
   * - If advisoryFixedVersion <= currentVersion: current version is already safe
   *     (the advisory's vulnerable range does not include the current version)
   * - If no advisoryFixedVersion: cannot determine safe version
   */
  static determineSafeVersion(
    currentVersion: string,
    advisoryFixedVersion: string | undefined,
    vulnerableRange?: string
  ): { version: string | null; reason: string } {
    if (!advisoryFixedVersion) {
      return {
        version: null,
        reason: 'SafeStack could not determine a verified safe upgrade. Manual review required.',
      };
    }

    const cleanCurrent = this.cleanVersion(currentVersion);
    const cleanFixed = this.cleanVersion(advisoryFixedVersion);

    // If current is already >= fixed version, no upgrade needed
    const comparison = this.compareSemver(cleanCurrent, cleanFixed);
    if (comparison >= 0) {
      // Double-check against the vulnerable range if available
      if (vulnerableRange && this.isVersionInVulnerableRange(cleanCurrent, vulnerableRange)) {
        // Edge case: current >= fixed but still in vulnerable range
        // This shouldn't normally happen, but if it does, we cannot safely auto-fix
        return {
          version: null,
          reason: `Current version ${cleanCurrent} >= advisory fix ${cleanFixed}, but still appears in vulnerable range (${vulnerableRange}). Manual review required.`,
        };
      }
      return {
        version: null,
        reason: `Current version ${cleanCurrent} is already at or above the advisory fix version ${cleanFixed}. No upgrade needed.`,
      };
    }

    // Fixed version is higher than current — this is a valid upgrade
    return {
      version: cleanFixed,
      reason: `Upgrading from ${cleanCurrent} to ${cleanFixed} (minimum version that resolves the advisory).`,
    };
  }
}
