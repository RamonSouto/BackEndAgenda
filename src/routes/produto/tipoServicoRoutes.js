// src/routes/produto/tipoServicoRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/tipoServicoRoutes.js
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
const TipoServicoController = require('../../controllers/produto/TipoServicoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/produtos/tipoServico
 * @method POST
 * @description Cria um novo tipo de serviço (ajuste).
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados do tipo de serviço.
 * @returns {Object} 201 - Tipo de serviço criado.
 * @returns {Object} 400 - Dados inválidos (corpo vazio).
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/tipoServico
 * Body: { des_tipo_ajuste: 'Costura', ind_ativo: true }
 */
router.post(
    '/tipoServico',
    apenasAdminMiddleware,
    // validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    TipoServicoController.adicionarTipoServico
);

/**
 * @route GET /api/produtos/tipoServico
 * @method GET
 * @description Lista todos os tipos de serviço.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de tipos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/tipoServico
 */
router.get(
    '/tipoServico',
    apenasAdminMiddleware,
    TipoServicoController.listarTipoServico
);

/**
 * @route GET /api/produtos/tipoServico/:id
 * @method GET
 * @description Busca um tipo de serviço por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tipo.
 * @returns {Object} 200 - Dados do tipo.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/tipoServico/1
 */
router.get(
    '/tipoServico/:id',
    apenasAdminMiddleware,
    TipoServicoController.buscarTipoServicoId
);

/**
 * @route PUT /api/produtos/tipoServico/:id
 * @method PUT
 * @description Atualiza um tipo de serviço.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tipo.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Tipo atualizado.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/tipoServico/1
 * Body: { des_tipo_ajuste: 'Costura Fina' }
 */
router.put(
    '/tipoServico/:id',
    apenasAdminMiddleware,
    TipoServicoController.atualizarTipoServico
);

/**
 * @route DELETE /api/produtos/tipoServico/:id
 * @method DELETE
 * @description Deleta um tipo de serviço (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID do tipo.
 * @returns {Object} 200 - Tipo deletado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/tipoServico/1
 */
router.delete(
    '/tipoServico/:id',
    apenasAdminMiddleware,
    TipoServicoController.deletarTipoServico
);

module.exports = router;