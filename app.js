require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const participantRoutes = require('./routes/participantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const winnerRoutes = require('./routes/winnerRoutes');
const prizeRoutes = require('./routes/prizeRoutes');

// Obtención flexible de la URL
const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("FATAL ERROR: La variable de entorno para MongoDB no está definida.");
  process.exit(1);
}

// Conectar pasando la URL validada
connectDB(mongoUri);

const app = express();

// Seguridad y utilidades base
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Límite de peticiones al formulario público
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de registro. Intenta de nuevo más tarde.' }
});
app.use('/api/participants/register', registerLimiter);

// Archivos estáticos
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