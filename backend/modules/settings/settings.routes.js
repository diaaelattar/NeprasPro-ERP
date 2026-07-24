const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('./settings.controller');

// multer: store uploaded backup file in memory (no temp files on disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.get('/users',        ctrl.getUsers);
router.post('/users',       ctrl.createUser);
router.put('/users/:id',    ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/roles',        ctrl.getRoles);
router.get('/permissions',  ctrl.getPermissions);

// Classrooms
router.get('/classrooms',                ctrl.getClassrooms);
router.post('/classrooms/bulk-enroll',   ctrl.bulkEnrollStudents);
router.post('/classrooms',               ctrl.createClassroom);
router.put('/classrooms/:id',            ctrl.updateClassroom);
router.delete('/classrooms/:id',         ctrl.deleteClassroom);
router.post('/classrooms/:id/enroll',    ctrl.enrollStudent);


// Academic Years
router.get('/academic-years',            ctrl.getAcademicYears);
router.post('/academic-years',           ctrl.createAcademicYear);
router.put('/academic-years/:id',        ctrl.updateAcademicYear);
router.delete('/academic-years/:id',     ctrl.deleteAcademicYear);
router.post('/academic-years/:id/set-current', ctrl.setCurrentAcademicYear);

// Institution
router.get('/institution',               ctrl.getInstitution);
router.put('/institution',               ctrl.updateInstitution);

// Backups
router.get('/backups',                        ctrl.listBackups);
router.post('/backups',                       ctrl.createBackup);
router.get('/backups/download/:filename',     ctrl.downloadBackup);      // تصدير لأي مكان
router.post('/backups/import',                upload.single('file'), ctrl.importBackup); // استيراد من فلاشة
router.post('/backups/restore',               ctrl.restoreBackup);
router.delete('/backups/:filename',           ctrl.deleteBackup);

// Sections & Stages
router.get('/sections',                  ctrl.getSections);
router.post('/sections',                 ctrl.createSection);
router.put('/sections/:id',              ctrl.updateSection);
router.delete('/sections/:id',           ctrl.deleteSection);

router.get('/stages',                    ctrl.getStages);
router.post('/stages',                   ctrl.createStage);
router.put('/stages/:id',                 ctrl.updateStage);
router.delete('/stages/:id',              ctrl.deleteStage);

module.exports = router;

