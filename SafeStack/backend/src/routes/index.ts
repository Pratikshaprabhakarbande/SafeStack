import { Router } from 'express';
import projectRoutes from './projects';
import scanRoutes from './scans';
import vulnerabilityRoutes from './vulnerabilities';
import fixRoutes from './fixes';
import pullRequestRoutes from './pullRequests';
import { getIntegrationStatus } from '../controllers/integrationController';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SafeStack API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SafeStack API v1',
    endpoints: {
      health: '/api/v1/health',
      projects: '/api/v1/projects',
      scans: '/api/v1/scans',
      vulnerabilities: '/api/v1/vulnerabilities',
      fixes: '/api/v1/fixes',
      pullRequests: '/api/v1/pull-requests',
    },
  });
});

// Route modules
router.use('/projects', projectRoutes);
router.use('/scans', scanRoutes);
router.use('/vulnerabilities', vulnerabilityRoutes);
router.use('/fixes', fixRoutes);
router.use('/pull-requests', pullRequestRoutes);

// Integration status (safe — never returns secrets)
router.get('/integrations/status', getIntegrationStatus);

export default router;
