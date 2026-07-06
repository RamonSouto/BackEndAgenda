const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { limiterCriacao } = require('../middlewares/rateLimitMiddleware');
const ParametrizacaoController = require('../controllers/ParametrizacaoController');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route   POST /api/parametrizacao
 * @desc    Criar parametrizacao
 * @access  Privado - Admin (todos)
 */
router.post(
    '/',
    limiterCriacao,
    validarBodyMiddleware,
    apenasAdminMiddleware,
    ParametrizacaoController.criar
);

/**
 * @route   GET /api/parametrizacao
 * @desc    Listar parametrizacao
 * @access  Privado - Admin (todos)
 */
router.get(
    '/',
    apenasAdminMiddleware,
    ParametrizacaoController.listarParametrizacao
);

/**
 * @route   POST /api/parametrizacao
 * @desc    Buscar parametrizacao por ID
 * @access  Privado - Admin (todos)
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.buscarParametrizacaoPorId
);

/**
 * @route   PUT /api/parametrizacao
 * @desc    Atualizar parametrizacao por ID
 * @access  Privado - Admin (todos)
 */
router.put(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.atualizar
);

/**
 * @route   DELETE /api/parametrizacao/:id
 * @desc    Deletar pessoa (soft delete)
 * @access  Privado - Admin
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.deletar
);
module.exports = router;