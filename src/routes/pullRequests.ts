import { Router } from 'express';
import * as pullRequestController from '../controllers/pullRequestController';

const router = Router();

router.post('/', pullRequestController.createPullRequest);
router.get('/:id', pullRequestController.getPullRequest);
router.get('/fix/:fixId', pullRequestController.getPullRequestByFix);
router.get('/project/:projectId', pullRequestController.getProjectPullRequests);

export default router;
