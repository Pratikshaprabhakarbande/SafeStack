import { Router } from 'express';
import * as scanController from '../controllers/scanController';

const router = Router();

router.post('/', scanController.createScan);
router.get('/:id', scanController.getScanStatus);
router.get('/:id/results', scanController.getScanResults);
router.get('/project/:projectId', scanController.getProjectScans);

export default router;
