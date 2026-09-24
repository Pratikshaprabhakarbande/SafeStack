import { Request, Response, NextFunction } from 'express';
import PullRequest from '../models/PullRequest';
import { PullRequestService } from '../services/project/pullRequestService';
import { AppError } from '../middleware/errorHandler';

export const createPullRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fixId, customTitle, customBody } = req.body;

    if (!fixId) {
      throw new AppError('fixId is required', 400, 'VALIDATION_ERROR');
    }

    const pr = await PullRequestService.createPullRequest({
      fixId,
      customTitle,
      customBody,
    });

    res.json({
      success: true,
      data: pr,
      message: 'Pull request created successfully for user review',
    });
  } catch (error) {
    next(error);
  }
};

export const getPullRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const pr = await PullRequest.findById(id).populate('fixId').lean();
    if (!pr) {
      throw new AppError('Pull request not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: pr,
    });
  } catch (error) {
    next(error);
  }
};

export const getPullRequestByFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fixId } = req.params;

    const pr = await PullRequest.findOne({ fixId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: pr || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectPullRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const prs = await PullRequest.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: prs,
    });
  } catch (error) {
    next(error);
  }
};
