// src/routes/produto/produtoServicoRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/produtoServicoRoutes.js
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
const PrecoProdutoServicoController = require('../../controllers/produto/PrecoProdutoServicoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/produtos/precoProdutoServico
 * @method POST
 * @description Cria um preço para uma associação produto-serviço.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados do preço.
 * @returns {Object} 201 - Preço criado.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/precoProdutoServico
 * Body: { id_produto_servico: 1, val_preco: 49.90, dta_inicio: '2025-01-01' }
 */
router.post(
    '/precoProdutoServico',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    PrecoProdutoServicoController.adicionarPrecoProdutoServico
);

/**
 * @route GET /api/produtos/precoProdutoServico
 * @method GET
 * @description Lista todos os preços de produto-serviço.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de preços.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/precoProdutoServico
 */
router.get(
    '/precoProdutoServico',
    apenasAdminMiddleware,
    PrecoProdutoServicoController.listarPrecoProdutoServico
);

/**
 * @route GET /api/produtos/precoProdutoServico/:id
 * @method GET
 * @description Busca um preço por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do preço.
 * @returns {Object} 200 - Dados do preço.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/precoProdutoServico/1
 */
router.get(
    '/precoProdutoServico/:id',
    apenasAdminMiddleware,
    PrecoProdutoServicoController.buscarPrecoProdutoServicoId
);

/**
 * @route PUT /api/produtos/precoProdutoServico/:id
 * @method PUT
 * @description Atualiza um preço de produto-serviço.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do preço.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Preço atualizado.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/precoProdutoServico/1
 * Body: { val_preco: 59.90 }
 */
router.put(
    '/precoProdutoServico/:id',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    PrecoProdutoServicoController.atualizarPrecoProdutoServico
);

/**
 * @route DELETE /api/produtos/precoProdutoServico/:id
 * @method DELETE
 * @description Deleta um preço de produto-serviço.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do preço.
 * @returns {Object} 200 - Preço deletado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/precoProdutoServico/1
 */
router.delete(
    '/precoProdutoServico/:id',
    apenasAdminMiddleware,
    PrecoProdutoServicoController.deletarPrecoProdutoServico
);


module.exports = router;