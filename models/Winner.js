const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema(
  {
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RaffleRound',
      required: true
    },
    rank: {
      // 1 = primer lugar, 2 = segundo, 3 = tercero
      type: Number,
      enum: [1, 2, 3],
      required: true
    },
    prize: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prize',
      required: true
    },
    // Copia del premio al momento del sorteo, para que el historial no cambie
    // si luego el admin edita los montos configurados.
    prizeSnapshot: {
      label: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, default: 'BOB' }
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true
    },
    drawnBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    totalEligibleAtDraw: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Un mismo rango no puede repetirse dentro de la misma ronda.
winnerSchema.index({ round: 1, rank: 1 }, { unique: true });

module.exports = mongoose.model('Winner', winnerSchema);
