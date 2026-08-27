const crypto = require('crypto');

/**
 * Selecciona un índice aleatorio de forma criptográficamente segura
 * (mucho más justo y auditable que Math.random para un sorteo real).
 */
const secureRandomIndex = (arrayLength) => {
  if (arrayLength <= 0) return -1;
  const randomBuffer = crypto.randomBytes(4);
  const randomInt = randomBuffer.readUInt32BE(0);
  return randomInt % arrayLength;
};

/**
 * Elige un elemento al azar de una lista.
 */
const pickRandom = (list) => {
  const index = secureRandomIndex(list.length);
  return index === -1 ? null : list[index];
};

module.exports = { secureRandomIndex, pickRandom };
