import { Router } from 'express';
import upload from '../middleware/upload';
import * as projectController from '../controllers/projectController';

const router = Router();

router.post('/upload', upload.single('project'), projectController.uploadProject);
router.post('/github', projectController.importGitHubProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.get('/:id/scans', projectController.getProjectScanHistory);
router.post('/:id/connect-github', projectController.connectGitHubRepoToProject);
router.delete('/:id', projectController.deleteProject);

export default router;
