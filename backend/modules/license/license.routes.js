const express = require('express');
const router = express.Router();
const { getLicenseStatus, activateLicense } = require('./license.controller');

router.get('/status', getLicenseStatus);
router.post('/activate', activateLicense);

module.exports = router;
