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
const ProdutoServicoController = require('../../controllers/produto/ProdutoServicoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/produtos/produtoServico
 * @method POST
 * @description Associa um produto a um tipo de serviço.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados da associação.
 * @returns {Object} 201 - Associação criada.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/produtoServico
 * Body: { id_produto: 1, id_tipo_servico: 2 }
 */
router.post(
    '/produtoServico',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    ProdutoServicoController.adicionarProdutoServico
);

/**
 * @route GET /api/produtos/produtoServico
 * @method GET
 * @description Lista todas as associações produto-serviço.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de associações.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/produtoServico
 */
router.get(
    '/produtoServico',
    apenasAdminMiddleware,
    ProdutoServicoController.listarProdutoServico
);

/**
 * @route GET /api/produtos/produtoServico/:id
 * @method GET
 * @description Busca uma associação por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da associação.
 * @returns {Object} 200 - Dados da associação.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/produtoServico/1
 */
router.get(
    '/produtoServico/:id',
    apenasAdminMiddleware,
    ProdutoServicoController.buscarProdutoServicoId
);

/**
 * @route PUT /api/produtos/produtoServico/:id
 * @method PUT
 * @description Atualiza uma associação produto-serviço.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da associação.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Associação atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/produtoServico/1
 * Body: { ind_ativo: false }
 */
router.put(
    '/produtoServico/:id',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    ProdutoServicoController.atualizarProdutoServico
);

/**
 * @route DELETE /api/produtos/produtoServico/:id
 * @method DELETE
 * @description Deleta uma associação produto-serviço (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da associação.
 * @returns {Object} 200 - Associação deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/produtoServico/1
 */
router.delete(
    '/produtoServico/:id',
    apenasAdminMiddleware,
    ProdutoServicoController.deletarProdutoServico
);

module.exports = router;