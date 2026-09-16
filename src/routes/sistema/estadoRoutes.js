// src/routes/sistema/estadoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/estadoRoutes.js
 * @description Rotas para gerenciamento de estados.
 * 
 * @requires express
 * @requires ../../controllers/sistema/EstadoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 */

const express = require('express');
const router = express.Router();
const EstadoController = require('../../controllers/sistema/EstadoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterCriacao } = require('../../middlewares/rateLimitMiddleware');

router.use(authMiddleware);

/**
 * Rota para listar estados.
 * 
 * @name GET /api/sistema/estados
 * @function
 * @description Retorna lista de estados.
 * @access Privado – Qualquer usuário autenticado
 * 
 * @returns {Object} 200 - Lista de estados.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/estados
 */
router.get(
    '/estados',
    EstadoController.listarEstados
);

/**
 * Rota para buscar estado por ID.
 * 
 * @name GET /api/sistema/estado/id/:id
 * @function
 * @description Retorna dados de um estado específico.
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {number} req.params.id - ID do estado.
 * 
 * @returns {Object} 200 - Dados do estado.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/estado/id/1
 */
router.get(
    '/estado/id/:id',
    EstadoController.buscarEstadoId
);

/**
 * Rota para buscar estado por nome.
 * 
 * @name GET /api/sistema/estado/nome/:nome
 * @function
 * @description Busca estado pelo nome.
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {string} req.params.nome - Nome do estado.
 * 
 * @returns {Object} 200 - Dados do estado.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/estado/nome/São Paulo
 */
router.get(
    '/estado/nome/:nome',
    EstadoController.buscarEstadoNome
);

/**
 * Rota para buscar estado por sigla.
 * 
 * @name GET /api/sistema/estado/sgl/:sgl
 * @function
 * @description Busca estado pela sigla (ex: SP).
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {string} req.params.sgl - Sigla do estado (2 caracteres).
 * 
 * @returns {Object} 200 - Dados do estado.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/estado/sgl/SP
 */
router.get(
    '/estado/sgl/:sgl',
    EstadoController.buscarEstadoSgl
);

module.exports = router;