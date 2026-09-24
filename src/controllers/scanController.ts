import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project';
import Scan from '../models/Scan';
import Vulnerability from '../models/Vulnerability';
import { ScannerService } from '../services/scanner/scannerService';
import { findProjectRoot } from '../services/project/extractionService';
import { AppError } from '../middleware/errorHandler';

export const createScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      throw new AppError('Project ID is required', 400, 'VALIDATION_ERROR');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Determine project path safely
    let projectPath: string;
    if (project.uploadPath) {
      projectPath = findProjectRoot(project.uploadPath);
    } else if (project.type === 'github' && project.githubRepoUrl) {
      const { GitHubService } = await import('../services/project/githubService');
      const importResult = await GitHubService.importRepository(project.githubRepoUrl, project.defaultBranch);
      if (!importResult.success) {
        throw new AppError(`Failed to fetch GitHub project: ${importResult.error}`, 400, 'GITHUB_ERROR');
      }
      project.uploadPath = importResult.projectRoot;
      await project.save();
      projectPath = importResult.projectRoot;
    } else {
      throw new AppError('Project workspace path not found', 400, 'INVALID_PROJECT');
    }

    // Start scan
    const scanId = await ScannerService.performScan(projectId, projectPath);

    res.json({
      success: true,
      data: {
        scanId,
        message: 'Scan started successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getScanStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const scan = await Scan.findById(id);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        scanId: scan._id,
        status: scan.status,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        duration: scan.duration,
        totalDependencies: scan.totalDependencies,
        vulnerableCount: scan.vulnerableCount,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        errorMessage: scan.errorMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getScanResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const scan = await Scan.findById(id);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    const vulnerabilities = await Vulnerability.find({ scanId: id })
      .sort({ severity: 1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        scan: {
          scanId: scan._id,
          status: scan.status,
          completedAt: scan.completedAt,
          statistics: {
            total: scan.vulnerableCount,
            critical: scan.criticalCount,
            high: scan.highCount,
            medium: scan.mediumCount,
            low: scan.lowCount,
          },
        },
        vulnerabilities,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectScans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const scans = await Scan.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: scans,
    });
  } catch (error) {
    next(error);
  }
};
