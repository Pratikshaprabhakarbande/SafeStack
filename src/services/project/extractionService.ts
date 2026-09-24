import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import logger from '../../utils/logger';

interface ExtractionResult {
  success: boolean;
  extractedPath: string;
  error?: string;
  hasPackageJson: boolean;
  hasPackageLock: boolean;
}

export const extractZipFile = async (
  zipPath: string,
  extractTo: string
): Promise<ExtractionResult> => {
  try {
    const resolvedTarget = path.resolve(extractTo);

    // Create extraction directory
    if (!fs.existsSync(resolvedTarget)) {
      fs.mkdirSync(resolvedTarget, { recursive: true });
    }

    // Safely extract ZIP with zip-slip path traversal check
    const directory = await unzipper.Open.file(zipPath);

    for (const file of directory.files) {
      const targetFilePath = path.resolve(resolvedTarget, file.path);

      // Zip-slip prevention: ensure extracted path is strictly within resolvedTarget
      if (!targetFilePath.startsWith(resolvedTarget + path.sep) && targetFilePath !== resolvedTarget) {
        throw new Error(`Security Exception: Zip-slip path traversal detected in file "${file.path}"`);
      }

      if (file.type === 'Directory') {
        fs.mkdirSync(targetFilePath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
        const content = await file.buffer();
        fs.writeFileSync(targetFilePath, content);
      }
    }

    // Verify package.json and package-lock.json
    const projectRoot = findProjectRoot(resolvedTarget);
    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasPackageLock = fs.existsSync(path.join(projectRoot, 'package-lock.json'));

    logger.info('ZIP extraction successful with security validation', {
      zipPath,
      extractedPath: resolvedTarget,
      projectRoot,
      hasPackageJson,
      hasPackageLock,
    });

    return {
      success: true,
      extractedPath: resolvedTarget,
      hasPackageJson,
      hasPackageLock,
    };
  } catch (error: any) {
    logger.error('ZIP extraction failed', { zipPath, error: error.message });
    return {
      success: false,
      extractedPath: extractTo,
      error: error.message,
      hasPackageJson: false,
      hasPackageLock: false,
    };
  }
};

export const findProjectRoot = (extractedPath: string): string => {
  const resolved = path.resolve(extractedPath);

  // Check if package.json is in root
  if (fs.existsSync(path.join(resolved, 'package.json'))) {
    return resolved;
  }

  // Check subdirectories up to 2 levels deep (common for monorepos or nested GitHub/ZIP archives)
  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    // Prioritize 'backend' or 'app' directory if present
    const prioritizedNames = ['backend', 'app', 'server', 'src'];
    for (const name of prioritizedNames) {
      const subPath = path.join(resolved, name);
      if (fs.existsSync(path.join(subPath, 'package.json'))) {
        return subPath;
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subPath = path.join(resolved, entry.name);
        if (fs.existsSync(path.join(subPath, 'package.json'))) {
          return subPath;
        }
        // Level 2 search
        try {
          const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
          for (const subEntry of subEntries) {
            if (subEntry.isDirectory() && !subEntry.name.startsWith('.')) {
              const level2Path = path.join(subPath, subEntry.name);
              if (fs.existsSync(path.join(level2Path, 'package.json'))) {
                return level2Path;
              }
            }
          }
        } catch {
          // ignore level 2 error
        }
      }
    }
  } catch (err: any) {
    logger.warn('Failed while searching for project root', { error: err.message });
  }

  return resolved;
};
