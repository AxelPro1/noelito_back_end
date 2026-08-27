const mongoose = require('mongoose');

// Una "ronda" agrupa los 3 sorteos (3er, 2do y 1er lugar) de un mismo evento en vivo.
// Permite saber en todo momento qué rango falta por sortear y armar la pantalla final
// de "Ganadores del Sorteo" sin mezclar rondas de eventos anteriores.
const raffleRoundSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['en_progreso', 'finalizado'],
      default: 'en_progreso'
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    finishedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RaffleRound', raffleRoundSchema);
