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
const ProdutoController = require('../../controllers/produto/ProdutoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');
const { apenasAdminMiddleware, papelMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

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
    // apenasAdminMiddleware,
    // validarBodyMiddleware,
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

module.exports = router;
