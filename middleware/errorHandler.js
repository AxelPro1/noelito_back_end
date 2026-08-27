const multer = require('multer');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Error de Multer (archivo muy grande, tipo no permitido, etc.)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Error al subir archivo: ${err.message}` });
  }

  // Numero de celular / clave duplicada en MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con ese ${field === 'phone' ? 'número de celular' : field}. No se permiten duplicados.`
    });
  }

  // Errores de validacion de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
