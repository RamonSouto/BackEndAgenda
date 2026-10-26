// src/routes/agendamento/agendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/agendamentoRoutes.js
 * @description Rotas internas (autenticadas) para gerenciamento de agendamentos.
 * 
 * @requires express
 * @requires ../../controllers/agendamento/AgendamentoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 */
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../../controllers/agendamento/AgendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const {
    secretariaOuAdminMiddleware,
    papelMiddleware
} = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterCriacao } = require('../../middlewares/rateLimitMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @route GET /api/agendamentos/disponibilidade
 * @description Verifica disponibilidade de horário para uma costureira.
 * @access Privado – Qualquer usuário autenticado.
 * 
 * @example
 * GET /api/agendamentos/disponibilidade?id_costureira=2&dta_agendamento=2025-12-01 10:00:00
 */
router.get(
    '/disponibilidade',
    AgendamentoController.verificarDisponibilidade
);

/**
 * @route POST /api/agendamentos
 * @description Cria um agendamento completo (cabeçalho + itens), de forma transacional.
 * @access Privado – Secretária ou Administrador.
 * 
 * @example
 * POST /api/agendamentos
 * Body: {
 *   "id_paciente": 1, "id_costureira": 2,
 *   "dta_agendamento": "2025-12-01 10:00:00",
 *   "itens": [{ "id_produto_grade": 5, "id_produto_servico": 3, "id_tipo_agendamento": 1 }]
 * }
 */
router.post(
    '/',
    limiterCriacao,
    validarBodyMiddleware,
    secretariaOuAdminMiddleware,
    AgendamentoController.criar
);

/**
 * @route GET /api/agendamentos
 * @description Lista agendamentos com filtros (id_costureira, dta_inicio, dta_fim, ind_status).
 * @access Privado – Qualquer usuário autenticado.
 * 
 * @example
 * GET /api/agendamentos?id_costureira=2&dta_inicio=2025-12-01&dta_fim=2025-12-31
 */
router.get(
    '/',
    AgendamentoController.listar
);

/**
 * @route GET /api/agendamentos/:id
 * @description Busca um agendamento (com itens) por ID.
 * @access Privado – Qualquer usuário autenticado.
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    AgendamentoController.buscarPorId
);

/**
 * @route PATCH /api/agendamentos/:id/costureira
 * @description Troca a costureira de um agendamento (afastamento, férias, falta).
 * @access Privado – Secretária ou Administrador.
 * 
 * @example
 * PATCH /api/agendamentos/1/costureira
 * Body: { "id_costureira": 5 }
 */
router.patch(
    '/:id/costureira',
    validarIdMiddleware(),
    validarBodyMiddleware,
    secretariaOuAdminMiddleware,
    AgendamentoController.trocarCostureira
);

/**
 * @route PATCH /api/agendamentos/:id/status
 * @description Altera o status do agendamento respeitando a máquina de estados
 * (agendado -> confirmado -> concluido/cancelado/falta).
 * @access Privado – Secretária, Costureira ou Administrador.
 * 
 * @example
 * PATCH /api/agendamentos/1/status
 * Body: { "ind_status": "confirmado" }
 */
router.patch(
    '/:id/status',
    validarIdMiddleware(),
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.SECRETARIA, PAPEIS_PESSOA.COSTUREIRA, PAPEIS_PESSOA.ADMINISTRADOR]),
    AgendamentoController.alterarStatus
);

/**
 * @route DELETE /api/agendamentos/:id
 * @description Deleta (soft delete) um agendamento.
 * @access Privado – Apenas Administrador.
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    AgendamentoController.deletar
);

module.exports = router;
