// src/routes/produtoRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produtoRoutes.js
 * @description Rotas para gerenciamento de produtos, categorias, tamanhos,
 * cores/estampas, grades, imagens, tipos de serviço, associações produto-serviço,
 * preços e fotos de ajuste.
 * 
 * @requires express
 * @requires ../controllers/ProdutoController
 * @requires ../middlewares/authMiddleware
 * @requires ../middlewares/permissionMiddleware
 * @requires ../middlewares/errorMiddleware
 * @requires ../middlewares/uploadMiddleware
 * @requires ../middlewares/rateLimitMiddleware
 * @requires ../utils/constants
 */
const express = require('express');
const router = express.Router();
const ProdutoController = require('../controllers/ProdutoController');
const authMiddleware = require('../middlewares/authMiddleware');
const { costureiraOuAdminMiddleware, papelMiddleware, apenasAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { uploadSingle, uploadMultiple, uploadSingleOptional } = require('../middlewares/uploadMiddleware');
const { limiterUpload } = require('../middlewares/rateLimitMiddleware');
const { PAPEIS_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * ===========================================
 * FOTO AJUSTE
 * ===========================================
 */

/**
 * @route GET /api/produtos/fotos/:id/download
 * @method GET
 * @description Faz o download de uma foto de ajuste por ID.
 * @access Privado – Todos os usuários autenticados
 * @param {number} req.params.id - ID da foto (validado por `validarIdMiddleware`).
 * @returns {Object} 200 - Arquivo de imagem.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 404 - Foto não encontrada.
 * 
 * @example
 * GET /api/produtos/fotos/1/download
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/fotos/:id/download',
    validarIdMiddleware(),
    ProdutoController.downloadFoto
);

/**
 * @route GET /api/produtos/fotos/:id/visualizar
 * @method GET
 * @description Visualiza (exibe inline) uma foto de ajuste.
 * @access Privado – Todos os usuários autenticados
 * @param {number} req.params.id - ID da foto.
 * @returns {Object} 200 - Imagem (inline).
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 404 - Foto não encontrada.
 * 
 * @example
 * GET /api/produtos/fotos/1/visualizar
 */
router.get(
    '/fotos/:id/visualizar',
    validarIdMiddleware(),
    ProdutoController.visualizarFoto
);

/**
 * @route DELETE /api/produtos/fotos/:id
 * @method DELETE
 * @description Deleta uma foto de ajuste.
 * @access Privado – Costureiras e Administradores (costureiraOuAdminMiddleware)
 * @param {number} req.params.id - ID da foto.
 * @returns {Object} 200 - Foto deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Foto não encontrada.
 * 
 * @example
 * DELETE /api/produtos/fotos/1
 */
router.delete(
    '/fotos/:id',
    validarIdMiddleware(),
    costureiraOuAdminMiddleware,
    ProdutoController.deletarFoto
);

/**
 * @route POST /api/produtos/:id_produto_agendamento/fotos
 * @method POST
 * @description Upload de uma única foto de ajuste para um produto de agendamento.
 * @access Privado – Costureiras e Administradores
 * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
 * @param {File} req.file - Arquivo de imagem (campo 'foto').
 * @returns {Object} 201 - Foto cadastrada.
 * @returns {Object} 400 - Erro de upload ou arquivo inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 429 - Muitos uploads (rate limit).
 * 
 * @example
 * POST /api/produtos/1/fotos
 * Headers: { "Authorization": "Bearer ..." }
 * Body (multipart/form-data): foto: (arquivo)
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
 * @route POST /api/produtos/:id_produto_agendamento/fotos/multiplas
 * @method POST
 * @description Upload de múltiplas fotos de ajuste para um produto de agendamento.
 * @access Privado – Costureiras e Administradores
 * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
 * @param {File[]} req.files - Arquivos de imagem (campo 'fotos').
 * @returns {Object} 201 - Fotos cadastradas.
 * @returns {Object} 400 - Erro de upload ou arquivos inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 429 - Muitos uploads (rate limit).
 * 
 * @example
 * POST /api/produtos/1/fotos/multiplas
 * Body (multipart/form-data): fotos: (arquivo1), fotos: (arquivo2), ...
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
 * @route GET /api/produtos/:id_produto_agendamento/fotos
 * @method GET
 * @description Lista todas as fotos de ajuste de um produto de agendamento.
 * @access Privado – Todos os usuários autenticados
 * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
 * @returns {Object} 200 - Lista de fotos.
 * @returns {Object} 401 - Token inválido/ausente.
 * 
 * @example
 * GET /api/produtos/1/fotos
 */
router.get(
    '/:id_produto_agendamento/fotos',
    validarIdMiddleware('id_produto_agendamento'),
    ProdutoController.listarFotos
);





/**
 * ===========================================
 * PRODUTO AGENDAMENTO
 * ===========================================
 */

/**
 * @route POST /api/produtos/agendamento
 * @method POST
 * @description Adiciona um produto a um agendamento.
 * @access Privado – Secretárias, Costureiras e Administradores (papelMiddleware)
 * @param {Object} req.body - Dados do produto no agendamento.
 * @returns {Object} 201 - Produto adicionado.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/agendamento
 * Body: { id_agendamento: 1, id_produto_grade: 5, ... }
 */
router.post(
    '/agendamento',
    validarBodyMiddleware,
    papelMiddleware([
        PAPEIS_PESSOA.SECRETARIA,
        PAPEIS_PESSOA.COSTUREIRA,
        PAPEIS_PESSOA.ADMINISTRADOR
    ]),
    ProdutoController.adicionarProdutoAgendamento
);

/**
 * @route GET /api/produtos/agendamento/:id_agendamento
 * @method GET
 * @description Lista os produtos de um agendamento.
 * @access Privado – Todos os usuários autenticados
 * @param {number} req.params.id_agendamento - ID do agendamento.
 * @returns {Object} 200 - Lista de produtos.
 * @returns {Object} 401 - Token inválido/ausente.
 * 
 * @example
 * GET /api/produtos/agendamento/1
 */
router.get(
    '/agendamento/:id_agendamento',
    validarIdMiddleware('id_agendamento'),
    ProdutoController.listarProdutosAgendamento
);

/**
 * @route PATCH /api/produtos/:id/status
 * @method PATCH
 * @description Atualiza o status de um produto de agendamento.
 * @access Privado – Costureiras e Administradores
 * @param {number} req.params.id - ID do produto de agendamento.
 * @param {Object} req.body - Status (ex: { ind_status: 'concluido' }).
 * @returns {Object} 200 - Status atualizado.
 * @returns {Object} 400 - Corpo vazio ou status inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PATCH /api/produtos/1/status
 * Body: { ind_status: 'concluido' }
 */
router.patch(
    '/:id/status',
    validarIdMiddleware(),
    validarBodyMiddleware,
    costureiraOuAdminMiddleware,
    ProdutoController.atualizarStatus
);




/**
 * ===========================================
 * CATEGORIAS
 * ===========================================
 */




/**
 * ===========================================
 * TAMANHOS
 * ===========================================
 */




/**
 * ===========================================
 * COR E ESTAMPA
 * ===========================================
 */




/**
 * ===========================================
 * PRODUTOS
 * ===========================================
 */

/**
 * @route GET /api/produtos/produto
 * @method GET
 * @description Lista todos os produtos (administrativo).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de produtos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/produto
 */
router.get(
    '/produto',
    apenasAdminMiddleware,
    ProdutoController.listarProdutos
);

/**
 * @route POST /api/produtos/produto
 * @method POST
 * @description Cria um novo produto.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados do produto.
 * @returns {Object} 201 - Produto criado.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/produto
 * Body: { id_categoria: 1, nom_produto: 'Camisa Polo', ... }
 */
router.post(
    '/produto',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    ProdutoController.adicionarProduto
);

/**
 * @route GET /api/produtos/produto/:id
 * @method GET
 * @description Busca um produto por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do produto.
 * @returns {Object} 200 - Dados do produto.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/produto/1
 */
router.get(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.listarProduto
);

/**
 * @route PUT /api/produtos/produto/:id
 * @method PUT
 * @description Atualiza um produto existente.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do produto.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Produto atualizado.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/produto/1
 * Body: { nom_produto: 'Camisa Polo Azul' }
 */
router.put(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.atualizarProduto
);

/**
 * @route DELETE /api/produtos/produto/:id
 * @method DELETE
 * @description Deleta um produto (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do produto.
 * @returns {Object} 200 - Produto deletado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/produto/1
 */
router.delete(
    '/produto/:id',
    apenasAdminMiddleware,
    ProdutoController.deletarProduto
);





/**
 * ===========================================
 * GRADE DE PRODUTOS
 * ===========================================
 */







/**
 * ===========================================
 * IMAGEM DE PRODUTOS
 * ===========================================
 */







/**
 * ===========================================
 * TIPO DE SERVIÇO
 * ===========================================
 */







/**
 * ===========================================
 * PRODUTO SERVIÇO
 * ===========================================
 */







/**
 * ===========================================
 * PREÇO PRODUTO SERVIÇO
 * ===========================================
 */



module.exports = router;
