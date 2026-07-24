const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');

// Staff routes
router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.post('/:id/leaves', staffController.addStaffLeave);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
