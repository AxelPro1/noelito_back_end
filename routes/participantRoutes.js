const express = require('express');
const router = express.Router();
const { registerParticipant, checkStatus } = require('../controllers/participantController');

// Formulario público: nombre, celular y comprobante de pago (URL de Filestack)
router.post('/register', registerParticipant);

// Permite al participante consultar el estado de su inscripción
router.get('/status/:phone', checkStatus);

module.exports = router;
