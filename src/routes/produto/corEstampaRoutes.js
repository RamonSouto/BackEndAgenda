// src/routes/produto/corEstampaRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/produto/corEstampaRoutes.js
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
const CorEstampaController = require('../../controllers/produto/CorEstampaController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware, apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');
const { limiterUpload } = require('../../middlewares/rateLimitMiddleware');
const { uploadSingleOptional } = require('../../middlewares/uploadMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/produtos/cor_estampa
 * @method GET
 * @description Lista todas as cores e estampas.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista de cores/estampas.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/cor_estampa
 */
router.get(
    '/cor_estampa',
    apenasAdminMiddleware,
    CorEstampaController.listarCoresEstampas
);

/**
 * @route POST /api/produtos/cor_estampa
 * @method POST
 * @description Cria uma nova cor ou estampa.
 * @access Privado – Apenas Administradores
 * @param {Object} req.body - Dados da cor/estampa.
 * @returns {Object} 201 - Cor/estampa criada.
 * @returns {Object} 400 - Corpo vazio ou dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * POST /api/produtos/cor_estampa
 * Body: { nom_cor_estampa: 'Vermelho', ind_tipo: 'cor' }
 */
router.post(
    '/cor_estampa',
    apenasAdminMiddleware,
    // validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    limiterUpload,
    uploadSingleOptional('foto', 'cor_estampa'),
    CorEstampaController.adicionarCorEstampa
);

/**
 * @route GET /api/produtos/cor_estampa/:id
 * @method GET
 * @description Busca uma cor/estampa por ID.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da cor/estampa.
 * @returns {Object} 200 - Dados da cor/estampa.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/produtos/cor_estampa/1
 */
router.get(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    CorEstampaController.listarCorEstampa
);

/**
 * @route PUT /api/produtos/cor_estampa/:id
 * @method PUT
 * @description Atualiza uma cor/estampa existente.
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da cor/estampa.
 * @param {Object} req.body - Dados para atualizar.
 * @returns {Object} 200 - Cor/estampa atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * PUT /api/produtos/cor_estampa/1
 * Body: { nom_cor_estampa: 'Azul' }
 */
router.put(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    limiterUpload,
    uploadSingleOptional('foto', 'cor_estampa'),
    CorEstampaController.atualizarCorEstampa
);

/**
 * @route DELETE /api/produtos/cor_estampa/:id
 * @method DELETE
 * @description Deleta uma cor/estampa (soft delete).
 * @access Privado – Apenas Administradores
 * @param {number} req.params.id - ID da cor/estampa.
 * @returns {Object} 200 - Cor/estampa deletada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * DELETE /api/produtos/cor_estampa/1
 */
router.delete(
    '/cor_estampa/:id',
    apenasAdminMiddleware,
    CorEstampaController.deletarCorEstampa
);

module.exports = router;