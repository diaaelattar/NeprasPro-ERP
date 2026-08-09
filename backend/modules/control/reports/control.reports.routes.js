/**
 * control.reports.routes.js — Independent Control Module Reports Routes
 * NeprasPro - Control Module Reports Sub-Router
 */

const express = require('express');
const router = express.Router();
const controller = require('./control.reports.controller');

// List available control reports
router.get('/', controller.listControlReports);

// Get JSON report data (for live preview & PDF print)
router.get('/:reportId/data', controller.getControlReportData);

// Export report as formatted Excel template
router.get('/:reportId/export-excel', controller.exportControlReportExcel);

module.exports = router;
