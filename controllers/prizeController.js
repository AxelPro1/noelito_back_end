const Prize = require('../models/Prize');
const asyncHandler = require('../utils/asyncHandler');

const DEFAULTS = [
  { rank: 1, label: 'PRIMER LUGAR', amount: 15000, medalEmoji: '🥇' },
  { rank: 2, label: 'SEGUNDO LUGAR', amount: 7000, medalEmoji: '🥈' },
  { rank: 3, label: 'TERCER LUGAR', amount: 3000, medalEmoji: '🥉' }
];

// @desc    Listar los 3 premios configurados (1ro, 2do, 3ro). Los crea con
//          valores por defecto la primera vez que se consultan si no existen.
// @route   GET /api/admin/prizes
// @access  Private (admin)
const listPrizes = asyncHandler(async (req, res) => {
  const existing = await Prize.find();

  if (existing.length === 0) {
    const created = await Prize.insertMany(DEFAULTS);
    return res.json({ success: true, data: created.sort((a, b) => a.rank - b.rank) });
  }

  // Si faltara algún rango (ej: base de datos parcialmente migrada), completarlo.
  const missingRanks = DEFAULTS.filter((d) => !existing.some((p) => p.rank === d.rank));
  if (missingRanks.length > 0) {
    await Prize.insertMany(missingRanks);
  }

  const all = await Prize.find().sort('rank');
  res.json({ success: true, data: all });
});

// @desc    Actualizar el monto/etiqueta de un premio por su rango (1, 2 o 3)
// @route   PUT /api/admin/prizes/:rank
// @access  Private (admin)
const updatePrize = asyncHandler(async (req, res) => {
  const rank = Number(req.params.rank);
  if (![1, 2, 3].includes(rank)) {
    return res.status(400).json({ success: false, message: 'El rango de premio debe ser 1, 2 o 3.' });
  }

  const { label, amount, medalEmoji, currency } = req.body;
  const update = { updatedBy: req.admin._id };
  if (label !== undefined) update.label = label;
  if (amount !== undefined) update.amount = amount;
  if (medalEmoji !== undefined) update.medalEmoji = medalEmoji;
  if (currency !== undefined) update.currency = currency;

  const prize = await Prize.findOneAndUpdate({ rank }, update, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true
  });

  res.json({ success: true, message: `Premio de ${prize.label} actualizado.`, data: prize });
});

module.exports = { listPrizes, updatePrize };
