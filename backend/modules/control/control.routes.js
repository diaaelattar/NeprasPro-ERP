/**
 * control.routes.js — NeprasPro Control Room & Exams Routes
 */
const express = require('express');
const router = express.Router();
const controlController = require('./control.controller');

router.get('/grades',                   controlController.getControlGrades);
router.get('/stats',                    controlController.getStats);
router.post('/sync',                   controlController.syncStudents);
router.get('/students',                controlController.getControlStudents);
router.post('/generate-seat-numbers',  controlController.generateSeatNumbers);
router.post('/generate-secret-codes',  controlController.generateSecretCodes);
router.get('/secret-groups',           controlController.getSecretGroupsSummary);
router.post('/verify-pin',             controlController.verifyMasterPin);
router.post('/committees',             controlController.saveCommittees);
router.get('/committees/stats',       controlController.getCommitteesStats);
router.put('/students/:id/control-data', controlController.updateStudentControlData);
router.put('/students/:id/enrollment-and-language', controlController.updateStudentEnrollmentAndLanguage);
router.delete('/students/:id', controlController.excludeOrDeleteControlStudent);
router.get('/subjects',                controlController.getExamSubjects);
router.post('/subjects',               controlController.saveExamSubject);
router.delete('/subjects/:id',            controlController.deleteExamSubject);
router.get('/master-subjects',         controlController.getMasterSubjects);
router.post('/master-subjects',        controlController.createMasterSubject);
router.get('/passing-rules',          controlController.getPassingRules);
router.post('/passing-rules',         controlController.savePassingRules);
router.post('/preset-default/save',    controlController.saveGradePresetAsDefault);
router.post('/preset-default/restore', controlController.restoreGradePresetDefaults);
router.post('/preset-primary/setup',   controlController.setupPrimaryPreset);
router.post('/preset-primary3/setup',  controlController.setupPrimary3Preset);
router.post('/preset-primary456/setup',controlController.setupPrimary456Preset);
router.post('/preset-prep12/setup',    controlController.setupPrep12Preset);
router.post('/marks/save',             controlController.saveControlMarks);
router.post('/marks',                  controlController.saveControlMarks);
router.post('/marks/single',           controlController.saveSingleMark);
router.get('/marks',                  controlController.getControlMarks);
router.get('/marks/grid',             controlController.getControlMarks);
router.post('/marks/bulk-fill',        controlController.bulkFillSubjectMarks);

const controlReportsRoutes = require('./reports/control.reports.routes');
router.use('/reports-engine', controlReportsRoutes);

module.exports = router;

