const express = require('express');
const router = express.Router();
const ProdutoController = require('../controllers/ProdutoController');
const authMiddleware = require('../middlewares/authMiddleware');
const { costureiraOuAdminMiddleware, tipoUsuarioMiddleware, apenasAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { uploadSingle, uploadMultiple } = require('../middlewares/uploadMiddleware');
const { limiterUpload } = require('../middlewares/rateLimitMiddleware');
const { TIPO_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * FOTO AJUSTE
 */

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





/**
 * PRODUTO AGENDAMENTO
 */

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
 * CATEGORIAS
 */

/**
 * @route   GET /api/produtos/categoria
 * @desc    Listar categoria
 * @access  Privado - Admin
 */
router.get(
    '/categoria',
    apenasAdminMiddleware,
    ProdutoController.listarCategorias
);

/**
 * @route   POST /api/produtos/categoria
 * @desc    Adicionar categoria
 * @access  Privado - Admin
 */
router.post(
    '/categoria',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarCategoria
);

/**
 * @route   GET /api/produtos/categoria/:id
 * @desc    Listar categoria
 * @access  Privado - Admin
 */
router.get(
    '/categoria/:id',
    apenasAdminMiddleware,
    ProdutoController.listarCategoria
);

/**
 * @route   PUT /api/produtos/categoria/:id
 * @desc    Atualizar categoria
 * @access  Privado - Admin
 */
router.put(
    '/categoria/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarCategoria
);

/**
 * @route   DELETE /api/produtos/categoria/:id
 * @desc    Deletar categoria
 * @access  Privado - Admin
 */
router.delete(
    '/categoria/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarCategoria
);





/**
 * TAMANHOS
 */

/**
 * @route   GET /api/produtos/tamanho
 * @desc    Listar tamanhos
 * @access  Privado - Admin
 */
router.get(
    '/tamanho',
    apenasAdminMiddleware,
    ProdutoController.listarTamanhos
);

/**
 * @route   POST /api/produtos/tamanho
 * @desc    Adicionar categoria
 * @access  Privado - Admin
 */
router.post(
    '/tamanho',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarTamanho
);

/**
 * @route   GET /api/produtos/tamanho/:id
 * @desc    Listar tamanho
 * @access  Privado - Admin
 */
router.get(
    '/tamanho/:id',
    apenasAdminMiddleware,
    ProdutoController.listarTamanho
);

/**
 * @route   PUT /api/produtos/tamanho/:id
 * @desc    Atualizar categoria
 * @access  Privado - Admin
 */
router.put(
    '/tamanho/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarTamanhos
);

/**
 * @route   DELETE /api/produtos/tamanho/:id
 * @desc    Deletar categoria
 * @access  Privado - Admin
 */
router.delete(
    '/tamanho/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarTamanhos
);





/**
 * COR E ESTAMPA
 */

/**
 * @route   GET /api/produtos/cor_estampa
 * @desc    Listar cor e estampa
 * @access  Privado - Admin
 */
router.get(
    '/cor_estampa',
    apenasAdminMiddleware,
    ProdutoController.listarCoresEstampas
);

/**
 * @route   POST /api/produtos/cor_estampa
 * @desc    Adicionar cor e estampa
 * @access  Privado - Admin
 */
router.post(
    '/cor_estampa',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarCorEstampa
);

/**
 * @route   GET /api/produtos/cor_estampa/:id
 * @desc    Listar cor e estampa
 * @access  Privado - Admin
 */
router.get(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    ProdutoController.listarCorEstampa
);

/**
 * @route   PUT /api/produtos/cor_estampa/:id
 * @desc    Atualizar cor e estampa
 * @access  Privado - Admin
 */
router.put(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarCorEstampa
);

/**
 * @route   DELETE /api/produtos/cor_estampa/:id
 * @desc    Deletar cor e estampa
 * @access  Privado - Admin
 */
router.delete(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarCorEstampa
);





/**
 * Produtos
 */

/**
 * @route   GET /api/produtos/produto
 * @desc    Listar produtos
 * @access  Privado - Admin
 */
router.get(
    '/produto',
    apenasAdminMiddleware,
    ProdutoController.listarProdutos
);

/**
 * @route   POST /api/produtos/produto
 * @desc    Adicionar produto
 * @access  Privado - Admin
 */
router.post(
    '/produto',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarProduto
);

/**
 * @route   GET /api/produtos/produto/:id
 * @desc    Listar produtos
 * @access  Privado - Admin
 */
router.get(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.listarProduto
);

/**
 * @route   PUT /api/produtos/produto/:id
 * @desc    Atualizar produto
 * @access  Privado - Admin
 */
router.put(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarProduto
);

/**
 * @route   DELETE /api/produtos/produto/:id
 * @desc    Deletar produtos
 * @access  Privado - Admin
 */
router.delete(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarProduto
);





/**
 * Grade de Produtos
 */

/**
 * @route   GET /api/produtos/grade_produto
 * @desc    Listar grades de produtos
 * @access  Privado - Admin
 */
router.get(
    '/grade_produto',
    apenasAdminMiddleware,
    ProdutoController.listarGradesProdutos
);

/**
 * @route   POST /api/produtos/grade_produto
 * @desc    Adicionar grades de produtos
 * @access  Privado - Admin
 */
router.post(
    '/grade_produto',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarGradeProduto
);

/**
 * @route   GET /api/produtos/grade_produto/:id
 * @desc    Listar grades de produtos
 * @access  Privado - Admin
 */
router.get(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    ProdutoController.listarGradeProduto
);

/**
 * @route   PUT /api/produtos/grade_produto/:id
 * @desc    Atualizar grades de produtos
 * @access  Privado - Admin
 */
router.put(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarGradeProduto
);

/**
 * @route   DELETE /api/produtos/grade_produto/:id
 * @desc    Deletar grades de produtos
 * @access  Privado - Admin
 */
router.delete(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarGradeProduto
);





/**
 * Imagem de Produtos
 */

/**
 * @route   POST /api/produtos/imagemProduto
 * @desc    Adicionar imagem de produtos
 * @access  Privado - Admin
 */
router.post(
    '/imagemProduto',
    apenasAdminMiddleware,
    // validarBodyMiddleware,
    tipoUsuarioMiddleware([TIPO_PESSOA.ADMINISTRADOR]),
    limiterUpload,
    uploadSingle('foto', 'imagem_produto'),
    ProdutoController.adicionarImagemProduto
);

/**
 * @route   GET /api/produtos/imagemProduto
 * @desc    Listar imagens de produtos
 * @access  Privado - Admin
 */
router.get(
    '/imagemProduto',
    apenasAdminMiddleware,
    ProdutoController.listarImagemProdutos
);

/**
 * @route   GET /api/produtos/imagemProduto/:id
 * @desc    Buscar imagem de produtos
 * @access  Privado - Admin
 */
router.get(
    '/imagemProduto/:id',
    apenasAdminMiddleware,
    ProdutoController.buscarImagemProdutoId
);

/**
 * @route   GET /api/produtos/imagemProdutoGrade/:id
 * @desc    Busca imagem de produtos grade
 * @access  Privado - Admin
 */
router.get(
    '/imagemProdutoGrade/:id',
    apenasAdminMiddleware,
    ProdutoController.buscarImagemProdutoGradeId
);

/**
 * @route   PUT /api/produtos/imagemProduto/:id
 * @desc    Atualizar imagem de produtos
 * @access  Privado - Admin
 */
router.put(
    '/imagemProduto/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarImagemProduto
);

/**
 * @route   DELETE /api/produtos/imagemProduto/:id
 * @desc    Deletar imagem de produtos
 * @access  Privado - Admin
 */
router.delete(
    '/imagemProduto/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarImagemProduto
);


module.exports = router;
