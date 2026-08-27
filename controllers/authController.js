const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

// @desc    Login de administrador
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios' });
  }

  const admin = await Admin.findOne({ username: username.toLowerCase() });

  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }

  res.json({
    success: true,
    data: {
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token: generateToken(admin._id)
    }
  });
});

// @desc    Obtener perfil del admin logueado
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.admin });
});

module.exports = { login, getMe };
