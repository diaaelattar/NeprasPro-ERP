const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

router.get('/status', setupController.getStatus);
router.post('/sqlite', setupController.configureSQLite);
router.post('/database', setupController.configurePostgres);
router.post('/wizard', setupController.runWizard);
router.post('/login',  setupController.loginUser);
router.post('/recover-password', setupController.recoverPassword);
router.get('/dashboard-stats', setupController.getDashboardStats);
router.post('/reset-institution', setupController.resetInstitution);

// Lookup data routes
router.get('/governorates', setupController.getGovernorates);
router.get('/administrations', setupController.getAdministrations);
router.post('/administrations', setupController.addAdministration);
router.get('/onboarding-status', setupController.getOnboardingStatus);
router.get('/master-structure-lookups', setupController.getMasterStructureLookups);
router.post('/save-institution-structure', setupController.saveInstitutionStructure);

module.exports = router;
