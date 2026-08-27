// Ejecutar con: npm run seed:admin
// Crea (o actualiza la contraseña de) el admin inicial definido en el .env
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

const run = async () => {
  await connectDB();

  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'CambiaEstaPassword123!';

  let admin = await Admin.findOne({ username });

  if (admin) {
    admin.password = password;
    admin.role = 'superadmin';
    await admin.save();
    console.log(`Contraseña actualizada para el admin existente "${username}"`);
  } else {
    admin = await Admin.create({ username, password, role: 'superadmin' });
    console.log(`Admin creado correctamente: "${username}"`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Error al crear el admin:', err);
  process.exit(1);
});
