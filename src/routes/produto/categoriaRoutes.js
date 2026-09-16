// src/routes/produto/categoriaRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/categoriaRoutes.js
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
const CategoriaController = require('../../controllers/produto/CategoriaController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/produtos/categoria
 * @method GET
 * @description Lista todas as categorias de produtos.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de categorias.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/categoria
 */
router.get(
    '/categoria',
    apenasAdminMiddleware,
    CategoriaController.listarCategorias
);

/**
 * @route POST /api/produtos/categoria
 * @method POST
 * @description Cria uma nova categoria de produto.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados da categoria.
 * @returns {Object} 201 - Categoria criada.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/categoria
 * Body: { nom_categoria: 'Camisas', id_pai: null }
 */
router.post(
    '/categoria',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    CategoriaController.adicionarCategoria
);

/**
 * @route GET /api/produtos/categoria/:id
 * @method GET
 * @description Busca uma categoria por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da categoria.
 * @returns {Object} 200 - Dados da categoria.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/categoria/1
 */
router.get(
    '/categoria/:id',
    apenasAdminMiddleware,
    CategoriaController.listarCategoria
);

/**
 * @route PUT /api/produtos/categoria/:id
 * @method PUT
 * @description Atualiza uma categoria existente.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da categoria.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Categoria atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/categoria/1
 * Body: { nom_categoria: 'Nova Categoria' }
 */
router.put(
    '/categoria/:id',
    apenasAdminMiddleware,
    CategoriaController.atualizarCategoria
);

/**
 * @route DELETE /api/produtos/categoria/:id
 * @method DELETE
 * @description Deleta uma categoria (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da categoria.
 * @returns {Object} 200 - Categoria deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/categoria/1
 */
router.delete(
    '/categoria/:id',
    apenasAdminMiddleware,
    CategoriaController.deletarCategoria
);

module.exports = router;