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
const TamanhoController = require('../../controllers/produto/TamanhoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/produtos/tamanho
 * @method GET
 * @description Lista todos os tamanhos.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de tamanhos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/tamanho
 */
router.get(
    '/tamanho',
    apenasAdminMiddleware,
    TamanhoController.listarTamanhos
);

/**
 * @route POST /api/produtos/tamanho
 * @method POST
 * @description Cria um novo tamanho.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados do tamanho.
 * @returns {Object} 201 - Tamanho criado.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/tamanho
 * Body: { cod_tamanho: 'M', des_tamanho: 'Médio' }
 */
router.post(
    '/tamanho',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    TamanhoController.adicionarTamanho
);

/**
 * @route GET /api/produtos/tamanho/:id
 * @method GET
 * @description Busca um tamanho por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tamanho.
 * @returns {Object} 200 - Dados do tamanho.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/tamanho/1
 */
router.get(
    '/tamanho/:id',
    apenasAdminMiddleware,
    TamanhoController.buscarTamanho
);

/**
 * @route PUT /api/produtos/tamanho/:id
 * @method PUT
 * @description Atualiza um tamanho existente.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tamanho.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Tamanho atualizado.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/tamanho/1
 * Body: { des_tamanho: 'Médio Grande' }
 */
router.put(
    '/tamanho/:id',
    apenasAdminMiddleware,
    TamanhoController.atualizarTamanhos
);

/**
 * @route DELETE /api/produtos/tamanho/:id
 * @method DELETE
 * @description Deleta um tamanho (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tamanho.
 * @returns {Object} 200 - Tamanho deletado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/tamanho/1
 */
router.delete(
    '/tamanho/:id',
    apenasAdminMiddleware,
    TamanhoController.deletarTamanhos
);

module.exports = router;