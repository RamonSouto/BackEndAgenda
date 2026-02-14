const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { limiterLogin } = require('../middlewares/rateLimitMiddleware');
const { validarBodyMiddleware } = require('../middlewares/errorMiddleware');

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuário
 * @access  Público
 */
router.post('/login', limiterLogin, validarBodyMiddleware, AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuário
 * @access  Privado
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * @route   GET /api/auth/verificar
 * @desc    Verificar token JWT
 * @access  Privado
 */
router.get('/verificar', authMiddleware, AuthController.verificarToken);

/**
 * @route   GET /api/auth/perfil
 * @desc    Obter perfil do usuário logado
 * @access  Privado
 */
router.get('/perfil', authMiddleware, AuthController.obterPerfil);

/**
 * @route   PUT /api/auth/alterar-senha
 * @desc    Alterar senha do próprio usuário
 * @access  Privado
 */
router.put('/alterar-senha', authMiddleware, validarBodyMiddleware, AuthController.alterarSenha);

/**
 * @route   POST /api/auth/resetar-senha
 * @desc    Resetar senha de um usuário (apenas admin)
 * @access  Privado - Admin
 */
router.post(
    '/resetar-senha',
    authMiddleware,
    apenasAdminMiddleware,
    validarBodyMiddleware,
    AuthController.resetarSenha
);

module.exports = router;
