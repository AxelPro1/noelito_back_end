const fs = require('fs');
const path = require('path');
const Participant = require('../models/Participant');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Listar todos los depósitos/participantes con filtros y búsqueda
// @route   GET /api/admin/participants?status=pendiente&search=juan&page=1&limit=20
// @access  Private (admin)
const listParticipants = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const query = {};
  if (status && ['pendiente', 'aprobado', 'rechazado'].includes(status)) {
    query.status = status;
  }
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { ticketNumber: Number.isNaN(Number(search)) ? -1 : Number(search) }
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [participants, total] = await Promise.all([
    Participant.find(query)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('reviewedBy', 'username'),
    Participant.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: participants,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum
    }
  });
});

// @desc    Obtener un participante por ID
// @route   GET /api/admin/participants/:id
// @access  Private (admin)
const getParticipant = asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id).populate('reviewedBy', 'username');
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participante no encontrado' });
  }
  res.json({ success: true, data: participant });
});

// @desc    Aprobar el depósito de un participante
// @route   PATCH /api/admin/participants/:id/approve
// @access  Private (admin)
const approveParticipant = asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id);
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participante no encontrado' });
  }

  participant.status = 'aprobado';
  participant.rejectionReason = null;
  participant.reviewedBy = req.admin._id;
  participant.reviewedAt = new Date();
  await participant.save();

  res.json({ success: true, message: 'Depósito aprobado. El participante entra al sorteo.', data: participant });
});

// @desc    Rechazar el depósito de un participante
// @route   PATCH /api/admin/participants/:id/reject
// @access  Private (admin)
const rejectParticipant = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const participant = await Participant.findById(req.params.id);
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participante no encontrado' });
  }

  participant.status = 'rechazado';
  participant.rejectionReason = reason || 'Comprobante inválido o no coincide con el monto requerido';
  participant.reviewedBy = req.admin._id;
  participant.reviewedAt = new Date();
  await participant.save();

  res.json({ success: true, message: 'Depósito rechazado.', data: participant });
});

// @desc    Eliminar un registro (y su comprobante en disco)
// @route   DELETE /api/admin/participants/:id
// @access  Private (superadmin)
const deleteParticipant = asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id);
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participante no encontrado' });
  }

  if (participant.paymentProof) {
    const filePath = path.join(__dirname, '..', participant.paymentProof);
    fs.unlink(filePath, () => {}); // no bloquea si el archivo ya no existe
  }

  await participant.deleteOne();
  res.json({ success: true, message: 'Registro eliminado correctamente' });
});

// @desc    Estadísticas para el dashboard del panel principal
// @route   GET /api/admin/stats
// @access  Private (admin)
const getStats = asyncHandler(async (req, res) => {
  const [total, pendientes, aprobados, rechazados] = await Promise.all([
    Participant.countDocuments(),
    Participant.countDocuments({ status: 'pendiente' }),
    Participant.countDocuments({ status: 'aprobado' }),
    Participant.countDocuments({ status: 'rechazado' })
  ]);

  res.json({
    success: true,
    data: {
      total,
      pendientes,
      aprobados,
      rechazados,
      elegiblesParaSorteo: aprobados
    }
  });
});

module.exports = {
  listParticipants,
  getParticipant,
  approveParticipant,
  rejectParticipant,
  deleteParticipant,
  getStats
};
