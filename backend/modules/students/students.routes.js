const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const ctrl    = require('./students.controller');

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

// ── EMIS Sync Routes ──────────────────────────────────────
router.post('/emis/sync',                         ctrl.emisSync);
router.get('/emis/status',                        ctrl.emisStatus);
router.post('/emis/approve-all',                  ctrl.emisApproveAll);
router.post('/emis/approve/:logId',               ctrl.emisApprove);
router.delete('/emis/session',                    ctrl.emisClearSession);

// ── Students CRUD ─────────────────────────────────────────
router.get('/',                                   ctrl.getStudents);
router.get('/export/excel',                       ctrl.exportExcelTemplate);
router.get('/export/class-list',                  ctrl.exportClassListExcel);
router.get('/export/full-class-list',             ctrl.exportFullClassListExcel);
// ── Report PDF & Desktop Excel Automation ─────────────────
router.get('/export/classes-for-export',          ctrl.getClassesForExport);
router.get('/export/report-pdf',                  ctrl.exportReportPdf);
router.get('/export/open-in-excel',               ctrl.openInExcel);

router.get('/transfers/list',                      ctrl.getTransfersList);
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
router.post('/generate-seating-numbers',          ctrl.generateSeatingNumbers);
router.get('/seating-lists',                      ctrl.getSeatingLists);
router.get('/duplicates',                         ctrl.getDuplicateStudents);



router.get('/:id',                                ctrl.getStudent);
router.post('/',                                  ctrl.createStudent);
router.put('/:id',                                ctrl.updateStudent);
router.delete('/:id/permanent',                   ctrl.deleteStudentPermanently);
router.post('/:id/transfers',                     ctrl.createTransfer);
router.put('/:id/transfers/:tid/complete',        ctrl.completeTransfer);

module.exports = router;

