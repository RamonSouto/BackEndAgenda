// src/routes/produto/imagemRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/imagemRoutes.js
 * @description Rotas para gerenciamento de categorias
 * 
 * @requires express
 * @requires ../../controllers/produto/CategoriaController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../utils/constants
 */
const express = require('express');
const router = express.Router();
const ImagemController = require('../../controllers/produto/ImagemController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');
const { limiterUpload } = require('../../middlewares/rateLimitMiddleware');
const { uploadSingle, uploadSingleOptional } = require('../../middlewares/uploadMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/produtos/imagemProduto
 * @method POST
 * @description Upload de uma imagem para um produto.
 * @access Privado – Apenas Administradores
 * @param {File} req.file - Arquivo de imagem (campo 'foto').
 * @param {Object} req.body - Dados adicionais (id_produto_grade, id_produto, etc.).
 * @returns {Object} 201 - Imagem cadastrada.
 * @returns {Object} 400 - Erro de upload ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 429 - Muitos uploads.
 * 
 * @example
 * POST /api/produtos/imagemProduto
 * Headers: { "Authorization": "Bearer ..." }
 * Body (multipart/form-data): foto: (arquivo), id_produto: 1
 */
router.post(
    '/imagemProduto',
    apenasAdminMiddleware,
    // validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    limiterUpload,
    uploadSingle('foto', 'imagem_produto'),
    ImagemController.adicionarImagemProduto
);

/**
 * @route GET /api/produtos/imagemProduto
 * @method GET
 * @description Lista todas as imagens de produtos.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de imagens.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/imagemProduto
 */
router.get(
    '/imagemProduto',
    apenasAdminMiddleware,
    ImagemController.listarImagemProdutos
);

/**
 * @route GET /api/produtos/imagemProduto/:id
 * @method GET
 * @description Busca uma imagem de produto por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da imagem.
 * @returns {Object} 200 - Dados da imagem.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/imagemProduto/1
 */
router.get(
    '/imagemProduto/:id',
    apenasAdminMiddleware,
    ImagemController.buscarImagemProdutoId
);

/**
 * @route GET /api/produtos/imagemProdutoGrade/:id
 * @method GET
 * @description Busca imagens associadas a uma grade de produto.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da grade.
 * @returns {Object} 200 - Lista de imagens da grade.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/imagemProdutoGrade/1
 */
router.get(
    '/imagemProdutoGrade/:id',
    apenasAdminMiddleware,
    ImagemController.buscarImagemProdutoGradeId
);

/**
 * @route PUT /api/produtos/imagemProduto/:id
 * @method PUT
 * @description Atualiza uma imagem (opcionalmente substitui o arquivo).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da imagem.
 * @param {File} [req.file] - Novo arquivo (opcional).
 * @param {Object} req.body - Dados para atualizar (ex: ind_principal, num_ordem).
 * @returns {Object} 200 - Imagem atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 429 - Muitos uploads.
 * 
 * @example
 * PUT /api/produtos/imagemProduto/1
 * Body (multipart/form-data): foto: (novo arquivo), ind_principal: true
 */
router.put(
    '/imagemProduto/:id',
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    apenasAdminMiddleware,
    limiterUpload,
    uploadSingleOptional('foto', 'imagem_produto'),
    ImagemController.atualizarImagemProduto
);

/**
 * @route DELETE /api/produtos/imagemProduto/:id
 * @method DELETE
 * @description Deleta uma imagem de produto (soft delete e remove arquivo).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da imagem.
 * @returns {Object} 200 - Imagem deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/imagemProduto/1
 */
router.delete(
    '/imagemProduto/:id',
    apenasAdminMiddleware,
    ImagemController.deletarImagemProduto
);


module.exports = router;