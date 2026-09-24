import { Router } from 'express';
import * as fixController from '../controllers/fixController';

const router = Router();

router.post('/', fixController.startFix);
router.get('/:id', fixController.getFix);
router.get('/vulnerability/:vulnerabilityId', fixController.getVulnerabilityFix);
router.post('/:id/retry', fixController.retryFix);
router.post('/:id/revert', fixController.revertFix);

export default router;
