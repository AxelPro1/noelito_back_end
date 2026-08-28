const mongoose = require('mongoose');

const connectDB = async (customUri) => {
  try {
    // Toma la URL dada o busca en las variables de entorno
    let rawUri = customUri || process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI;

    if (!rawUri) {
      throw new Error("La URL de conexión a MongoDB no está disponible.");
    }

    // Sanitización: Elimina espacios en blanco y comillas accidentales
    const cleanUri = rawUri.trim().replace(/^["']|["']$/g, '');

    const conn = await mongoose.connect(cleanUri);
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
