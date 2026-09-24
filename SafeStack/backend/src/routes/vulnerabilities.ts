import { Router } from 'express';
import * as vulnerabilityController from '../controllers/vulnerabilityController';

const router = Router();

router.get('/:id', vulnerabilityController.getVulnerability);
router.post('/:id/explain', vulnerabilityController.generateExplanation);
router.get('/scan/:scanId', vulnerabilityController.getScanVulnerabilities);
router.patch('/:id/status', vulnerabilityController.updateVulnerabilityStatus);

export default router;
