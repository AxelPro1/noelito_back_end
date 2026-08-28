require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose'); // Importante para la validación de seguridad

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const participantRoutes = require('./routes/participantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const winnerRoutes = require('./routes/winnerRoutes');
const prizeRoutes = require('./routes/prizeRoutes');

// Validación de seguridad para evitar el error "undefined" en Railway
const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("FATAL ERROR: La variable de entorno para MongoDB no está definida.");
  process.exit(1);
}

connectDB();

const app = express();

// Seguridad y utilidades base
app.use(helmet({ crossOriginResourcePolicy: false })); // false para poder servir imagenes de /uploads
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Limite de peticiones al formulario publico para evitar spam/bots
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { success: false, message: 'Demasiados intentos de registro. Intenta de nuevo más tarde.' }
});
app.use('/api/participants/register', registerLimiter);

// Archivos estáticos: comprobantes de pago subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/winner', winnerRoutes);
app.use('/api/admin/prizes', prizeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API del sorteo funcionando correctamente' });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;