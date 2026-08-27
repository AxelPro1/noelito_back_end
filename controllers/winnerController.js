const Participant = require('../models/Participant');
const Winner = require('../models/Winner');
const Prize = require('../models/Prize');
const RaffleRound = require('../models/RaffleRound');
const asyncHandler = require('../utils/asyncHandler');
const { pickRandom } = require('../utils/randomPicker');

// Orden obligatorio de sorteo: siempre se sortea primero el 3er lugar y al final el 1ro.
const DRAW_ORDER = [3, 2, 1];

const nextRankFor = (winners) => {
  const taken = new Set(winners.map((w) => w.rank));
  return DRAW_ORDER.find((rank) => !taken.has(rank)) || null;
};

const buildRoundPayload = async (round) => {
  const winners = await Winner.find({ round: round._id })
    .sort('rank')
    .populate('participant', 'ticketNumber fullName phone')
    .populate('prize', 'rank label amount currency medalEmoji');

  return {
    _id: round._id,
    status: round.status,
    startedAt: round.startedAt,
    finishedAt: round.finishedAt,
    winners,
    nextRank: nextRankFor(winners)
  };
};

// @desc    Inicia una nueva ronda de sorteo (3er -> 2do -> 1er lugar), o devuelve
//          la ronda ya en progreso si existiera una sin terminar.
// @route   POST /api/admin/winner/round/start
// @access  Private (admin)
const startRound = asyncHandler(async (req, res) => {
  let round = await RaffleRound.findOne({ status: 'en_progreso' });

  if (!round) {
    round = await RaffleRound.create({ startedBy: req.admin._id });
  }

  const payload = await buildRoundPayload(round);
  res.status(201).json({ success: true, data: payload });
});

// @desc    Obtiene la ronda en progreso (si existe) con sus ganadores parciales.
// @route   GET /api/admin/winner/round/current
// @access  Private (admin)
const getCurrentRound = asyncHandler(async (req, res) => {
  const round = await RaffleRound.findOne({ status: 'en_progreso' });
  if (!round) {
    return res.json({ success: true, data: null });
  }
  const payload = await buildRoundPayload(round);
  res.json({ success: true, data: payload });
});

// @desc    Obtiene una ronda por id (usada para la pantalla final "Ganadores del Sorteo").
// @route   GET /api/admin/winner/round/:id
// @access  Private (admin)
const getRoundById = asyncHandler(async (req, res) => {
  const round = await RaffleRound.findById(req.params.id);
  if (!round) {
    return res.status(404).json({ success: false, message: 'Ronda no encontrada' });
  }
  const payload = await buildRoundPayload(round);
  res.json({ success: true, data: payload });
});

// @desc    Sortea el ganador del SIGUIENTE nivel de premio dentro de la ronda en
//          progreso (siempre 3er -> 2do -> 1er). Devuelve el ticket completo ya
//          validado contra la base de datos; el frontend solo debe animar la
//          revelacion digito por digito, nunca decidir el ganador.
// @route   POST /api/admin/winner/draw
// @access  Private (admin)
const drawWinner = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const round = await RaffleRound.findOne({ status: 'en_progreso' });
  if (!round) {
    return res.status(400).json({
      success: false,
      message: 'No hay una ronda de sorteo en progreso. Inicia una ronda primero.'
    });
  }

  const winnersSoFar = await Winner.find({ round: round._id });
  const rank = nextRankFor(winnersSoFar);

  if (!rank) {
    return res.status(400).json({
      success: false,
      message: 'Esta ronda ya tiene los 3 premios sorteados.'
    });
  }

  const prize = await Prize.findOne({ rank });
  if (!prize) {
    return res.status(400).json({
      success: false,
      message: `No hay un premio configurado para el rango ${rank}. Configuralo en Premios.`
    });
  }

  // Elegibles: deposito aprobado y que jamas hayan ganado (ni en esta ronda ni en anteriores).
  const eligible = await Participant.find({ status: 'aprobado', isWinner: false });

  if (eligible.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No hay tickets elegibles (aprobados y sin premio previo) para sortear.'
    });
  }

  const chosen = pickRandom(eligible);

  let winner;
  try {
    winner = await Winner.create({
      round: round._id,
      rank,
      prize: prize._id,
      prizeSnapshot: { label: prize.label, amount: prize.amount, currency: prize.currency },
      participant: chosen._id,
      drawnBy: req.admin._id,
      totalEligibleAtDraw: eligible.length,
      notes: notes || ''
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Ese nivel de premio ya fue sorteado.' });
    }
    throw err;
  }

  chosen.isWinner = true;
  await chosen.save();

  if (rank === 1) {
    round.status = 'finalizado';
    round.finishedAt = new Date();
    await round.save();
  }

  const populated = await winner.populate([
    { path: 'participant', select: 'ticketNumber fullName phone' },
    { path: 'prize', select: 'rank label amount currency medalEmoji' }
  ]);

  res.status(201).json({
    success: true,
    message: `${prize.medalEmoji} ${prize.label}! Ticket #${chosen.ticketNumber} - ${chosen.fullName}`,
    data: {
      winner: populated,
      roundStatus: round.status,
      nextRank: rank === 1 ? null : nextRankFor([...winnersSoFar, winner])
    }
  });
});

// @desc    Historial completo de ganadores (todas las rondas/eventos).
// @route   GET /api/admin/winner
// @access  Private (admin)
const listWinners = asyncHandler(async (req, res) => {
  const winners = await Winner.find()
    .sort('-createdAt')
    .populate('participant', 'ticketNumber fullName phone')
    .populate('prize', 'rank label amount currency medalEmoji')
    .populate('drawnBy', 'username')
    .populate('round', 'status startedAt finishedAt');

  res.json({ success: true, data: winners });
});

// @desc    Deshacer un sorteo (por si se sorteo por error). Libera el ticket y,
//          si la ronda ya estaba marcada como finalizada, la reabre.
// @route   DELETE /api/admin/winner/:id
// @access  Private (superadmin)
const undoWinner = asyncHandler(async (req, res) => {
  const winner = await Winner.findById(req.params.id);
  if (!winner) {
    return res.status(404).json({ success: false, message: 'Registro de ganador no encontrado' });
  }

  await Participant.findByIdAndUpdate(winner.participant, { isWinner: false });

  const round = await RaffleRound.findById(winner.round);
  await winner.deleteOne();

  if (round && round.status === 'finalizado') {
    round.status = 'en_progreso';
    round.finishedAt = null;
    await round.save();
  }

  res.json({ success: true, message: 'Sorteo deshecho. El ticket vuelve a estar disponible.' });
});

module.exports = {
  startRound,
  getCurrentRound,
  getRoundById,
  drawWinner,
  listWinners,
  undoWinner
};
