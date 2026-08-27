const express = require('express');
const router = express.Router();
const { listPrizes, updatePrize } = require('../controllers/prizeController');
const { protect } = require('../middleware/auth');

router.use(protect); // configuración de premios solo visible para el administrador logueado

router.get('/', listPrizes);
router.put('/:rank', updatePrize);

module.exports = router;
