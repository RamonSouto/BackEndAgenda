// src/routes/agendamento/publicAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/publicAgendamentoRoutes.js
 * @description Rotas PÚBLICAS (sem autenticação) para agendamento externo
 * (página pública / link enviado via WhatsApp).
 * 
 * @description
 * ⚠️ Superfície de risco: rota pública é vetor clássico de spam/DoS de agenda.
 * Mitigações aplicadas:
 * - `limiterPublicoAgendamento`: 5 requisições/hora por IP.
 * - Validação estrita via Joi (`publicAgendamentoSchema`).
 * - Não cria paciente: exige CPF já cadastrado (bloqueia cadastro anônimo em massa).
 * - Retorno reduzido (não expõe dados internos completos do agendamento).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/AgendamentoController
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../middlewares/errorMiddleware
 */
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../../controllers/agendamento/AgendamentoController');
const { limiterPublicoAgendamento } = require('../../middlewares/rateLimitMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');

/**
 * @route GET /api/publico/agendamentos/disponibilidade
 * @description Verifica horários disponíveis de uma costureira (uso na página pública).
 * @access Público.
 * 
 * @example
 * GET /api/publico/agendamentos/disponibilidade?id_costureira=2&dta_agendamento=2025-12-01 10:00:00
 */
router.get(
    '/disponibilidade',
    limiterPublicoAgendamento,
    AgendamentoController.verificarDisponibilidade
);

/**
 * @route POST /api/publico/agendamentos
 * @description Cria um agendamento a partir da página pública (sem autenticação).
 * Exige que o paciente já esteja cadastrado (busca por CPF).
 * @access Público – protegido por rate limit agressivo.
 * 
 * @example
 * POST /api/publico/agendamentos
 * Body: {
 *   "num_cpf": "11144477735",
 *   "id_costureira": 2,
 *   "dta_agendamento": "2025-12-01 10:00:00",
 *   "item": { "id_produto_grade": 5, "id_produto_servico": 3, "id_tipo_agendamento": 1 }
 * }
 */
router.post(
    '/',
    limiterPublicoAgendamento,
    validarBodyMiddleware,
    AgendamentoController.criarPublico
);

/**
 * @route GET /api/publico/agendamentos/:uuid
 * @description Consulta o status de um agendamento via UUID público (des_url_externa).
 * Usado em link de confirmação enviado por WhatsApp.
 * @access Público – protegido por rate limit agressivo.
 * 
 * @example
 * GET /api/publico/agendamentos/a1b2c3d4-...
 */
router.get(
    '/:uuid',
    limiterPublicoAgendamento,
    AgendamentoController.buscarPorUuidPublico
);

module.exports = router;
