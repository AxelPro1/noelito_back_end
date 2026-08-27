const mongoose = require('mongoose');

// Los premios son configurables desde el panel de administrador, pero el RANGO
// (1 = primer lugar, 2 = segundo, 3 = tercero) es fijo porque define el orden
// obligatorio de sorteo: siempre se sortea primero el 3er lugar y al final el 1ro.
const prizeSchema = new mongoose.Schema(
  {
    rank: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      unique: true
    },
    label: {
      type: String,
      required: true,
      trim: true
      // ej: "PRIMER LUGAR"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
      // monto en bolivianos, ej: 15000
    },
    currency: {
      type: String,
      default: 'BOB'
    },
    medalEmoji: {
      type: String,
      default: '🏅'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prize', prizeSchema);
