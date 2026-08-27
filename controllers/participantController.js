const Participant = require('../models/Participant');
const asyncHandler = require('../utils/asyncHandler');

const normalizePhone = (phone = '') => phone.replace(/[\s\-()+]/g, '');

const registerParticipant = asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    accountName,
    paymentProof,
    paymentProofName,
    paymentProofExtension,
    paymentProofMimeType,
  } = req.body;

  // Ya no hay req.file: el comprobante se sube directo a Filestack
  // desde el frontend y aquí solo recibimos la URL resultante.
  if (!paymentProof || typeof paymentProof !== 'string' || !paymentProof.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Debes subir el comprobante de pago',
    });
  }

  const cleanPhone = normalizePhone(phone);

  if (!fullName || !cleanPhone || !accountName || !accountName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nombre completo, número de celular y nombre de la cuenta del depositante son obligatorios',
    });
  }

  const existing = await Participant.findOne({ phone: cleanPhone });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Este número de celular ya está registrado en el sorteo. Cada número solo puede participar una vez.',
    });
  }

  const participant = await Participant.create({
    fullName: fullName.trim(),
    accountName: accountName.trim(),
    phone: cleanPhone,
    paymentProof: paymentProof.trim(), // URL de Filestack, no ruta local
    paymentProofName,
    paymentProofExtension,
    paymentProofMimeType,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'Registro recibido. Tu comprobante será revisado por el administrador.',
    data: {
      ticketNumber: participant.ticketNumber,
      fullName: participant.fullName,
      accountName: participant.accountName,
      phone: participant.phone,
      status: participant.status,
    },
  });
});

const checkStatus = asyncHandler(async (req, res) => {
  const cleanPhone = normalizePhone(req.params.phone);
  const participant = await Participant.findOne({ phone: cleanPhone }).select(
      'ticketNumber fullName status isWinner createdAt'
  );

  if (!participant) {
    return res.status(404).json({ success: false, message: 'No se encontró un registro con ese número' });
  }

  res.json({ success: true, data: participant });
});

module.exports = { registerParticipant, checkStatus };
