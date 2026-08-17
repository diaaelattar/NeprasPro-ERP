const express = require('express');
const router = express.Router();
const ctrl = require('./system.controller');

router.get('/info', ctrl.getSystemInfo);
router.get('/check-updates', ctrl.checkUpdates);

module.exports = router;
