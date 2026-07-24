const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

router.get('/status', setupController.getStatus);
router.post('/sqlite', setupController.configureSQLite);      // Embedded mode (no external DB)
router.post('/database', setupController.configurePostgres);  // Network PostgreSQL mode
router.post('/wizard', setupController.runWizard);
router.post('/login',  setupController.loginUser);
router.get('/dashboard-stats', setupController.getDashboardStats);
router.post('/reset-institution', setupController.resetInstitution);

module.exports = router;
