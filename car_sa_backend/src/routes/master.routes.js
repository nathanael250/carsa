const express = require('express');
const router = express.Router();
const MasterController = require('../controllers/masterController');
const AuthMiddleware = require('../middleware/auth');

router.post('/',
    AuthMiddleware.optionalAuthenticate.bind(AuthMiddleware),
    MasterController
);

module.exports = router;
