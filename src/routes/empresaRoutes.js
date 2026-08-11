const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware, papelMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { limiterCriacao } = require('../middlewares/rateLimitMiddleware');
const EmpresaController = require('../controllers/EmpresaController');
const { PAPEIS_PESSOA } = require('../utils/constants');
const { uploadFields } = require('../middlewares/uploadMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route   POST /api/empresa
 * @desc    Criar Empresa
 * @access  Privado - Admin (todos)
 */
router.post(
    '/',
    limiterCriacao,
    // validarBodyMiddleware,
    apenasAdminMiddleware,
    uploadFields([
        { name: 'des_url_logo_vertical', maxCount: 1 },
        { name: 'des_url_logo_horizontal', maxCount: 1 },
        { name: 'des_url_logo_vertical_negativa', maxCount: 1 },
        { name: 'des_url_logo_horizontal_negativa', maxCount: 1 }
    ], 'empresa'),
    EmpresaController.criar
);

/**
 * @route   GET /api/empresa
 * @desc    Listar empresa
 * @access  Privado - Admin (todos)
 */
router.get(
    '/',
    apenasAdminMiddleware,
    EmpresaController.listarEmpresa
);

/**
 * @route   POST /api/empresa
 * @desc    Buscar empresa por ID
 * @access  Privado - Admin (todos)
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.buscarEmpresaPorId
);

/**
 * @route   PUT /api/empresa
 * @desc    Atualizar empresa por ID
 * @access  Privado - Admin (todos)
 */
router.put(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.atualizar
);

/**
 * @route   DELETE /api/empresa/:id
 * @desc    Deletar empresa (soft delete)
 * @access  Privado - Admin
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.deletar
);

module.exports = router;