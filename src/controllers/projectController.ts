import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Project from '../models/Project';
import Scan from '../models/Scan';
import { extractZipFile, findProjectRoot } from '../services/project/extractionService';
import { GitHubService } from '../services/project/githubService';
import { DependencyParser } from '../services/scanner/dependencyParser';
import config from '../config/environment';
import { AppError } from '../middleware/errorHandler';

export const uploadProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE');
    }

    const { originalname, path: uploadPath } = req.file;

    // Extract ZIP file into isolated working copy
    const extractPath = path.resolve(config.storage.workingDir, `upload-${uuidv4()}`);
    const extractionResult = await extractZipFile(uploadPath, extractPath);

    if (!extractionResult.success) {
      throw new AppError(
        'Failed to extract ZIP file: ' + extractionResult.error,
        400,
        'EXTRACTION_FAILED'
      );
    }

    if (!extractionResult.hasPackageJson) {
      throw new AppError(
        'Invalid Node.js project: package.json not found in root or subdirectories',
        400,
        'INVALID_PROJECT'
      );
    }

    // Find project root
    const projectRoot = findProjectRoot(extractPath);

    // Parse project info
    const projectInfo = DependencyParser.getProjectInfo(projectRoot);

    // Create project record
    const project = await Project.create({
      userId: '000000000000000000000000', // Placeholder for single-user intermediate prototype
      name: projectInfo.name || originalname.replace(/\.zip$/i, ''),
      type: 'upload',
      uploadPath: projectRoot,
      originalFilename: originalname,
      packageManager: 'npm',
      defaultBranch: 'main',
      hasPackageJson: extractionResult.hasPackageJson,
      hasPackageLock: extractionResult.hasPackageLock,
      status: 'uploaded',
    });

    res.json({
      success: true,
      data: {
        projectId: project._id,
        name: project.name,
        hasPackageJson: project.hasPackageJson,
        hasPackageLock: project.hasPackageLock,
        message: 'Project uploaded and validated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const importGitHubProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repoUrl, branch } = req.body;

    if (!repoUrl) {
      throw new AppError('GitHub repository URL is required', 400, 'VALIDATION_ERROR');
    }

    const importResult = await GitHubService.importRepository(repoUrl, branch);

    if (!importResult.success) {
      throw new AppError(
        `Failed to import GitHub repository: ${importResult.error}`,
        400,
        'GITHUB_IMPORT_FAILED'
      );
    }

    const project = await Project.create({
      userId: '000000000000000000000000',
      name: importResult.projectInfo.name || `${importResult.owner}/${importResult.repo}`,
      type: 'github',
      uploadPath: importResult.projectRoot,
      githubRepoUrl: repoUrl,
      githubOwner: importResult.owner,
      githubRepo: importResult.repo,
      defaultBranch: importResult.defaultBranch,
      packageManager: 'npm',
      hasPackageJson: importResult.hasPackageJson,
      hasPackageLock: importResult.hasPackageLock,
      status: 'uploaded',
    });

    res.json({
      success: true,
      data: {
        projectId: project._id,
        name: project.name,
        type: project.type,
        defaultBranch: project.defaultBranch,
        hasPackageJson: project.hasPackageJson,
        hasPackageLock: project.hasPackageLock,
        message: 'GitHub repository imported into isolated workspace successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Attach latest scan data to each project for rich dashboard display
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const latestScan = await Scan.findOne({ projectId: project._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...project,
          latestScan: latestScan || null,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedProjects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).lean();
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    const scans = await Scan.find({ projectId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        ...project,
        scans,
        latestScan: scans[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectScanHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const scans = await Scan.find({ projectId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: scans,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const connectGitHubRepoToProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { repoUrl, defaultBranch } = req.body;

    if (!repoUrl) {
      throw new AppError('GitHub repository URL is required', 400, 'VALIDATION_ERROR');
    }

    const { owner, repo } = GitHubService.parseRepoUrl(repoUrl);
    if (!owner || !repo) {
      throw new AppError(
        'Invalid GitHub repository URL format. Example: https://github.com/owner/repo or owner/repo',
        400,
        'INVALID_REPO_URL'
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    project.githubOwner = owner;
    project.githubRepo = repo;
    project.githubRepoUrl = `https://github.com/${owner}/${repo}`;
    project.defaultBranch = defaultBranch || project.defaultBranch || 'main';
    project.type = 'github';
    await project.save();

    res.json({
      success: true,
      data: project,
      message: `Project associated with GitHub repository ${owner}/${repo} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
