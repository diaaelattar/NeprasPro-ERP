const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const ctrl      = require('./students.controller');
const printCtrl = require('./print.controller');

// multer: store uploaded files in memory buffer (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات Excel (.xlsx أو .xls)'));
    }
  }
});

// ── Form Options & Stats ─────────────────────────────────
router.get('/form-options',                       ctrl.getFormOptions);
router.get('/stats',                              ctrl.getStats);

// ── Import Routes (must be before /:id) ──────────────────
router.get('/import/template',                    ctrl.downloadImportTemplate);
router.post('/import/preview',   upload.single('file'), ctrl.importPreview);
router.post('/import/execute',                    ctrl.importExecute);

// ── EMIS Sync & Collector Config Routes ───────────────────
router.get('/emis/registered-codes',              ctrl.getRegisteredEmisCodes);
router.post('/emis/sync',                         ctrl.emisSync);
router.get('/emis/status',                        ctrl.emisStatus);
router.post('/emis/approve-all',                  ctrl.emisApproveAll);
router.post('/emis/approve/:logId',               ctrl.emisApprove);
router.delete('/emis/session',                    ctrl.emisClearSession);
router.get('/emis/config',                        ctrl.getEmisConfig);
router.post('/emis/config',                       ctrl.updateEmisConfig);
router.post('/emis/diff',                         ctrl.getEmisDiff);

// ── Students CRUD ─────────────────────────────────────────
router.get('/',                                   ctrl.getStudents);
router.get('/export/excel',                       ctrl.exportExcelTemplate);
router.get('/export/general-census',              ctrl.exportGeneralCensusExcel);
router.get('/export/class-list',                  ctrl.exportClassListExcel);
router.get('/export/full-class-list',             ctrl.exportFullClassListExcel);
// ── Report PDF & Desktop Excel Automation ─────────────────
router.get('/export/classes-for-export',          ctrl.getClassesForExport);
router.get('/export/report-pdf',                  ctrl.exportReportPdf);
router.get('/export/open-in-excel',               ctrl.openInExcel);

router.get('/transfers/list',                      ctrl.getTransfersList);
router.put('/transfers/:tid/complete',             ctrl.completeTransfer);
router.put('/transfers/:tid/cancel',               ctrl.cancelTransfer);
router.delete('/transfers/:tid',                   ctrl.deleteTransfer);
router.get('/export/transfers',                    ctrl.exportTransfersExcel);

// ── Bulk Operations (must be before /:id) ────────────────
router.post('/bulk-delete',                       ctrl.deleteStudents);
router.post('/bulk-restore',                      ctrl.restoreStudents);
router.put('/bulk-update',                        ctrl.bulkUpdate);
router.post('/bulk-extract-national-id',          ctrl.bulkExtractNationalIdInfo);
router.post('/purge-all',                         ctrl.purgeAllStudents);
router.post('/bulk-delete-permanent',             ctrl.bulkDeletePermanently);

// ── Absence & Seating List Routes ─────────────────────
router.get('/absence-warnings',                   ctrl.getAbsenceWarnings);
router.post('/record-absence',                    ctrl.recordStudentAbsence);
router.get('/absence/weekly-class',                ctrl.getWeeklyClassAbsence);
router.post('/absence/weekly-bulk',                ctrl.recordBulkWeeklyAbsence);
router.post('/generate-seating-numbers',          ctrl.generateSeatingNumbers);
router.get('/seating-lists',                      ctrl.getSeatingLists);
router.get('/document-types',                     ctrl.getDocumentTypes);
router.get('/reports/register-41',                ctrl.getRegister41Data);
router.get('/reports/october-census',             ctrl.getOctoberCensusData);
router.post('/print/doc',                         printCtrl.printStudentDoc);
router.post('/print/october-census',               printCtrl.printOctoberCensusPdf);
router.get('/siblings/detect',                     ctrl.getDetectedSiblings);
router.post('/siblings/auto-link',                 ctrl.autoLinkSiblings);
router.get('/duplicates',                         ctrl.getDuplicateStudents);

router.get('/:id',                                ctrl.getStudent);
router.post('/',                                  ctrl.createStudent);
router.put('/:id',                                ctrl.updateStudent);
router.put('/:id/merge-info',                      ctrl.updateStudentMergeInfo);
router.delete('/:id/permanent',                   ctrl.deleteStudentPermanently);
router.post('/:id/documents',                     ctrl.addStudentDocument);
router.delete('/:id/documents/:docId',             ctrl.deleteStudentDocument);
router.post('/:id/transfers',                     ctrl.createTransfer);
router.put('/:id/transfers/:tid/complete',        ctrl.completeTransfer);
router.put('/:id/transfers/:tid/cancel',          ctrl.cancelTransfer);
router.delete('/:id/transfers/:tid',              ctrl.deleteTransfer);

module.exports = router;

