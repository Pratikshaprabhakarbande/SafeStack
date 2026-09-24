import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface PackageLock {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, any>;
  dependencies?: Record<string, any>;
}

interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  isDirect: boolean;
}

export class DependencyParser {
  static parsePackageJson(projectPath: string): PackageJson | null {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        logger.warn('package.json not found', { projectPath });
        return null;
      }

      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      logger.error('Failed to parse package.json', { projectPath, error: error.message });
      return null;
    }
  }

  static parsePackageLock(projectPath: string): PackageLock | null {
    try {
      const lockPath = path.join(projectPath, 'package-lock.json');
      if (!fs.existsSync(lockPath)) {
        logger.warn('package-lock.json not found', { projectPath });
        return null;
      }

      const content = fs.readFileSync(lockPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      logger.error('Failed to parse package-lock.json', { projectPath, error: error.message });
      return null;
    }
  }

  static extractDependencies(projectPath: string): Dependency[] {
    const packageJson = this.parsePackageJson(projectPath);
    const packageLock = this.parsePackageLock(projectPath);

    if (!packageJson) {
      return [];
    }

    const dependencies: Dependency[] = [];

    // Extract production dependencies
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: this.cleanVersion(version),
          type: 'production',
          isDirect: true,
        });
      });
    }

    // Extract dev dependencies
    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: this.cleanVersion(version),
          type: 'development',
          isDirect: true,
        });
      });
    }

    const directNames = new Set(dependencies.map(d => d.name));

    // Support modern npm lockfile v2/v3 packages map
    if (packageLock?.packages) {
      Object.entries(packageLock.packages).forEach(([pkgKey, info]: [string, any]) => {
        if (!pkgKey || pkgKey === '') return; // skip root project entry
        // Format: "node_modules/package-name" or "node_modules/pkg/node_modules/sub-pkg"
        const nameParts = pkgKey.split('node_modules/');
        const name = nameParts[nameParts.length - 1];
        if (name && !directNames.has(name) && !dependencies.some(d => d.name === name)) {
          dependencies.push({
            name,
            version: info.version || 'unknown',
            type: info.dev ? 'development' : 'production',
            isDirect: false,
          });
        }
      });
    }

    // Support legacy npm lockfile v1 dependencies map
    if (packageLock?.dependencies) {
      Object.entries(packageLock.dependencies).forEach(([name, info]: [string, any]) => {
        if (!directNames.has(name) && !dependencies.some(d => d.name === name)) {
          dependencies.push({
            name,
            version: info.version || 'unknown',
            type: info.dev ? 'development' : 'production',
            isDirect: false,
          });
        }
      });
    }

    logger.info('Dependencies extracted', {
      projectPath,
      totalDependencies: dependencies.length,
      directDependencies: dependencies.filter(d => d.isDirect).length,
    });

    return dependencies;
  }

  private static cleanVersion(version: string): string {
    // Remove semver prefixes (^, ~, >=, etc.)
    return version.replace(/^[\^~>=<]+/, '');
  }

  static getProjectInfo(projectPath: string): { name?: string; version?: string; hasTests: boolean } {
    const packageJson = this.parsePackageJson(projectPath);

    return {
      name: packageJson?.name,
      version: packageJson?.version,
      hasTests: !!(packageJson?.scripts?.test && packageJson.scripts.test !== 'echo "Error: no test specified" && exit 1'),
    };
  }
}
