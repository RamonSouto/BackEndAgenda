const express = require('express');
const router = express.Router();
const ProdutoController = require('../controllers/ProdutoController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
    costureiraOuAdminMiddleware,
    tipoUsuarioMiddleware
} = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { uploadSingle, uploadMultiple } = require('../middlewares/uploadMiddleware');
const { limiterUpload } = require('../middlewares/rateLimitMiddleware');
const { TIPO_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route   GET /api/produtos/fotos/:id/download
 * @desc    Download de foto de ajuste
 * @access  Privado - Todos autenticados
 */
router.get(
    '/fotos/:id/download',
    validarIdMiddleware(),
    ProdutoController.downloadFoto
);

/**
 * @route   GET /api/produtos/fotos/:id/visualizar
 * @desc    Visualizar foto de ajuste
 * @access  Privado - Todos autenticados
 */
router.get(
    '/fotos/:id/visualizar',
    validarIdMiddleware(),
    ProdutoController.visualizarFoto
);

/**
 * @route   DELETE /api/produtos/fotos/:id
 * @desc    Deletar foto de ajuste
 * @access  Privado - Costureira, Admin
 */
router.delete(
    '/fotos/:id',
    validarIdMiddleware(),
    costureiraOuAdminMiddleware,
    ProdutoController.deletarFoto
);

/**
 * @route   POST /api/produtos/agendamento
 * @desc    Adicionar produto ao agendamento
 * @access  Privado - Secretária, Costureira, Admin
 */
router.post(
    '/agendamento',
    validarBodyMiddleware,
    tipoUsuarioMiddleware([
        TIPO_PESSOA.SECRETARIA,
        TIPO_PESSOA.COSTUREIRA,
        TIPO_PESSOA.ADMINISTRADOR
    ]),
    ProdutoController.adicionarProdutoAgendamento
);

/**
 * @route   GET /api/produtos/agendamento/:id_agendamento
 * @desc    Listar produtos de um agendamento
 * @access  Privado - Todos autenticados
 */
router.get(
    '/agendamento/:id_agendamento',
    validarIdMiddleware('id_agendamento'),
    ProdutoController.listarProdutosAgendamento
);

/**
 * @route   PATCH /api/produtos/:id/status
 * @desc    Atualizar status de produto
 * @access  Privado - Costureira, Admin
 */
router.patch(
    '/:id/status',
    validarIdMiddleware(),
    validarBodyMiddleware,
    costureiraOuAdminMiddleware,
    ProdutoController.atualizarStatus
);

/**
 * @route   POST /api/produtos/:id_produto_agendamento/fotos
 * @desc    Upload de foto de ajuste (única)
 * @access  Privado - Costureira, Admin
 */
router.post(
    '/:id_produto_agendamento/fotos',
    validarIdMiddleware('id_produto_agendamento'),
    costureiraOuAdminMiddleware,
    limiterUpload,
    uploadSingle('foto'),
    ProdutoController.uploadFoto
);

/**
 * @route   POST /api/produtos/:id_produto_agendamento/fotos/multiplas
 * @desc    Upload de múltiplas fotos de ajuste
 * @access  Privado - Costureira, Admin
 */
router.post(
    '/:id_produto_agendamento/fotos/multiplas',
    validarIdMiddleware('id_produto_agendamento'),
    costureiraOuAdminMiddleware,
    limiterUpload,
    uploadMultiple('fotos', 10),
    ProdutoController.uploadFotosMultiplas
);

/**
 * @route   GET /api/produtos/:id_produto_agendamento/fotos
 * @desc    Listar fotos de ajuste
 * @access  Privado - Todos autenticados
 */
router.get(
    '/:id_produto_agendamento/fotos',
    validarIdMiddleware('id_produto_agendamento'),
    ProdutoController.listarFotos
);

module.exports = router;
