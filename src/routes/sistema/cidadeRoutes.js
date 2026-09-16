// src/routes/sistema/cidadeRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/cidadeRoutes.js
 * @description Rotas para gerenciamento de cidades.
 * 
 * @requires express
 * @requires ../controllers/sistema/PessoaController
 * @requires ../middlewares/authMiddleware
 */

const express = require('express');
const router = express.Router();
const CidadeController = require('../../controllers/sistema/CidadeController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware);

/**
 * Rota para listar cidades.
 * 
 * @name GET /api/sistema/cidadeRoutes.js
 * @function
 * @description Retorna lista de cidades (opcionalmente com filtros).
 * @access Privado – Qualquer usuário autenticado (sem restrição adicional)
 * 
 * @param {Object} req.query - Filtros (ex: nome, id_estado).
 * 
 * @returns {Object} 200 - Lista de cidades.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/cidades?nome=São Paulo
 */
router.get(
    '/cidades',
    CidadeController.listarCidades
);

/**
 * Rota para buscar cidade por ID.
 * 
 * @name GET /api/sistema/cidade/:id
 * @function
 * @description Retorna dados de uma cidade específica.
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {number} req.params.id - ID da cidade.
 * 
 * @returns {Object} 200 - Dados da cidade.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 404 - Cidade não encontrada.
 * 
 * @example
 * GET /api/sistema/cidade/1
 */
router.get(
    '/cidade/:id',
    CidadeController.buscarCidadeId
);

/**
 * Rota para buscar cidade por nome.
 * 
 * @name GET /api/sistema/cidades/nome/:nome
 * @function
 * @description Busca cidades pelo nome (pode ser parcial).
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {string} req.params.nome - Nome da cidade.
 * 
 * @returns {Object} 200 - Lista de cidades.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/pessoas/cidades/nome/Rio
 */
router.get(
    '/cidades/nome/:nome',
    CidadeController.buscarCidadeNome
);

/**
 * Rota para buscar cidades por ID do estado.
 * 
 * @name GET /api/sistema/cidades/estado/:id
 * @function
 * @description Retorna cidades pertencentes a um estado.
 * @access Privado – Qualquer usuário autenticado
 * 
 * @param {number} req.params.id - ID do estado.
 * 
 * @returns {Object} 200 - Lista de cidades.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/sistema/cidades/estado/1
 */
router.get(
    '/cidades/estado/:id',
    CidadeController.buscarCidadeEstadoId
);

module.exports = router;