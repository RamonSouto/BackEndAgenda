// src/routes/sistema/parametrizacaoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/parametrizacaoRoutes.js
 * @description Rotas para gerenciamento de parametrizações.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de parametrizações, com acesso restrito a administradores.
 * 
 * @requires express
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../controllers/sistema/ParametrizacaoController
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterCriacao } = require('../../middlewares/rateLimitMiddleware');
const ParametrizacaoController = require('../../controllers/sistema/ParametrizacaoController');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * Rota para criar uma nova parametrização.
 * 
 * @name POST /api/sistema/parametrizacao
 * @function
 * @description Cria uma nova configuração de parametrização (ex: horários de funcionamento).
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.body - Dados da parametrização (conforme schema `parametrizacaoSchema`).
 * @param {string} req.body.des_tipo_dia - Tipo do dia (UTIL, SABADO, etc.).
 * @param {string} req.body.hra_inicio - Horário de início (HH:MM:SS).
 * @param {string} req.body.hra_fim - Horário de fim (HH:MM:SS).
 * @param {number} req.body.qtd_minutos_intervalo - Duração do intervalo em minutos.
 * @param {boolean} req.body.ind_ativo - Indicador de ativo.
 * 
 * @returns {Object} 201 - Parametrização criada com sucesso.
 * @returns {Object} 400 - Erro de validação ou corpo vazio.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 429 - Muitas tentativas de criação.
 * 
 * @example
 * POST /api/sistema/parametrizacao
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "des_tipo_dia": "UTIL", "hra_inicio": "08:00:00", "hra_fim": "18:00:00", "qtd_minutos_intervalo": 60, "ind_ativo": true }
 */
router.post(
    '/parametrizacao',
    limiterCriacao,
    validarBodyMiddleware,
    apenasAdminMiddleware,
    ParametrizacaoController.criar
);

/**
 * Rota para listar todas as parametrizações.
 * 
 * @name GET /api/sistema/parametrizacao
 * @function
 * @description Retorna a lista de parametrizações cadastradas.
 * @access Privado – Apenas administradores
 * 
 * @param {Object} req.query - Filtros opcionais (ex: des_tipo_dia, ind_ativo).
 * 
 * @returns {Object} 200 - Lista de parametrizações.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/sistema/parametrizacao?ind_ativo=true
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/parametrizacao',
    apenasAdminMiddleware,
    ParametrizacaoController.listarParametrizacao
);

/**
 * Rota para buscar uma parametrização por ID.
 * 
 * @name GET /api/sistema/parametrizacao/:id
 * @function
 * @description Retorna os dados de uma parametrização específica.
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da parametrização (validado por `validarIdMiddleware`).
 * 
 * @returns {Object} 200 - Dados da parametrização.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Parametrização não encontrada.
 * 
 * @example
 * GET /api/sistema/parametrizacao/1
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/parametrizacao/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.buscarParametrizacaoPorId
);

/**
 * Rota para atualizar uma parametrização existente.
 * 
 * @name PUT /api/sistema/parametrizacao/:id
 * @function
 * @description Atualiza os dados de uma parametrização.
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da parametrização.
 * @param {Object} req.body - Dados a serem atualizados.
 * 
 * @returns {Object} 200 - Parametrização atualizada.
 * @returns {Object} 400 - Dados inválidos ou corpo vazio.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Parametrização não encontrada.
 * 
 * @example
 * PUT /api/sistema/parametrizacao/1
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "qtd_minutos_intervalo": 90 }
 */
router.put(
    '/parametrizacao/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.atualizar
);

/**
 * Rota para deletar uma parametrização (soft delete).
 * 
 * @name DELETE /api/sistema/parametrizacao/:id
 * @function
 * @description Marca uma parametrização como deletada (soft delete).
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da parametrização.
 * 
 * @returns {Object} 200 - Parametrização deletada com sucesso.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Parametrização não encontrada.
 * 
 * @example
 * DELETE /api/sistema/parametrizacao/1
 * Headers: { "Authorization": "Bearer ..." }
 */
router.delete(
    '/parametrizacao/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    ParametrizacaoController.deletar
);

module.exports = router;