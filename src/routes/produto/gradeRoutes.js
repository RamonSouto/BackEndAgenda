// src/routes/produto/tamanhoRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/tamanhoRoutes.js
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
const GradeController = require('../../controllers/produto/GradeController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/produtos/grade_produto
 * @method GET
 * @description Lista todas as grades de produtos.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de grades.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/grade_produto
 */
router.get(
    '/grade_produto',
    apenasAdminMiddleware,
    GradeController.listarGradesProdutos
);

/**
 * @route POST /api/produtos/grade_produto
 * @method POST
 * @description Cria uma nova grade de produto.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados da grade.
 * @returns {Object} 201 - Grade criada.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/grade_produto
 * Body: { id_produto: 1, id_variacao_cor_estampa: 2, id_tamanho: 3, ... }
 */
router.post(
    '/grade_produto',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    GradeController.adicionarGradeProduto
);

/**
 * @route GET /api/produtos/grade_produto/:id
 * @method GET
 * @description Busca uma grade por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da grade.
 * @returns {Object} 200 - Dados da grade.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/grade_produto/1
 */
router.get(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    GradeController.listarGradeProduto
);

/**
 * @route PUT /api/produtos/grade_produto/:id
 * @method PUT
 * @description Atualiza uma grade de produto.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da grade.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Grade atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/grade_produto/1
 * Body: { val_preco_variacao: 79.90 }
 */
router.put(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    GradeController.atualizarGradeProduto
);

/**
 * @route DELETE /api/produtos/grade_produto/:id
 * @method DELETE
 * @description Deleta uma grade (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da grade.
 * @returns {Object} 200 - Grade deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/grade_produto/1
 */
router.delete(
    '/grade_produto/:id',
    apenasAdminMiddleware,
    GradeController.deletarGradeProduto
);

module.exports = router;