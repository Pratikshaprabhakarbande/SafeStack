import { Request, Response, NextFunction } from 'express';
import Fix from '../models/Fix';
import { FixService } from '../services/fix/fixService';
import { AppError } from '../middleware/errorHandler';

export const startFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vulnerabilityId, targetVersion } = req.body;

    if (!vulnerabilityId) {
      throw new AppError('vulnerabilityId is required', 400, 'VALIDATION_ERROR');
    }

    const fixId = await FixService.startFix(vulnerabilityId, targetVersion);

    res.json({
      success: true,
      data: {
        fixId,
        message: 'Safe fix workflow initiated in isolated workspace',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const fix = await Fix.findById(id).populate('vulnerabilityId').lean();
    if (!fix) {
      throw new AppError('Fix record not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: fix,
    });
  } catch (error) {
    next(error);
  }
};

export const getVulnerabilityFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vulnerabilityId } = req.params;

    const fix = await Fix.findOne({ vulnerabilityId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: fix || null,
    });
  } catch (error) {
    next(error);
  }
};

export const retryFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const success = await FixService.retryWithCompatibleVersion(id);
    const updatedFix = await Fix.findById(id).lean();

    res.json({
      success,
      data: updatedFix,
      message: success
        ? 'Compatible version applied and tested successfully'
        : 'Compatible version also failed tests',
    });
  } catch (error) {
    next(error);
  }
};

export const revertFix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const success = await FixService.revertFix(id);
    const updatedFix = await Fix.findById(id).lean();

    res.json({
      success,
      data: updatedFix,
      message: success ? 'Fix reverted successfully' : 'Failed to revert fix',
    });
  } catch (error) {
    next(error);
  }
};
