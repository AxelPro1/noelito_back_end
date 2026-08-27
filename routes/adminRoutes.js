const express = require('express');
const router = express.Router();
const {
  listParticipants,
  getParticipant,
  approveParticipant,
  rejectParticipant,
  deleteParticipant,
  getStats
} = require('../controllers/adminController');
const { protect, superAdminOnly } = require('../middleware/auth');

router.use(protect); // todas las rutas de este archivo requieren estar logueado como admin

router.get('/stats', getStats);
router.get('/participants', listParticipants);
router.get('/participants/:id', getParticipant);
router.patch('/participants/:id/approve', approveParticipant);
router.patch('/participants/:id/reject', rejectParticipant);
router.delete('/participants/:id', superAdminOnly, deleteParticipant);

module.exports = router;
