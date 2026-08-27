const express = require('express');
const router = express.Router();
const {
  startRound,
  getCurrentRound,
  getRoundById,
  drawWinner,
  listWinners,
  undoWinner
} = require('../controllers/winnerController');
const { protect, superAdminOnly } = require('../middleware/auth');

router.use(protect); // el módulo de sorteo SOLO es visible para el administrador logueado

router.post('/round/start', startRound); // abre (o retoma) la ronda de 3er->2do->1er lugar
router.get('/round/current', getCurrentRound); // estado de la ronda en curso
router.get('/round/:id', getRoundById); // resumen de una ronda puntual (pantalla final)

router.post('/draw', drawWinner); // sortea el SIGUIENTE nivel de premio de la ronda activa
router.get('/', listWinners); // historial completo, todas las rondas
router.delete('/:id', superAdminOnly, undoWinner);

module.exports = router;
