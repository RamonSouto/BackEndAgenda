// src/routes/agendamento/publicAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/routes/agendamento/publicAgendamentoRoutes.js
 * @description Rotas públicas (sem autenticação): disponibilidade, autoagendamento
 * e consulta por UUID (link do e-mail). Validação do payload é feita no Service
 * (validators.publicAgendamentoSchema). NUNCA expor dados sensíveis aqui.
 *
 * @requires express
 * @requires express-rate-limit
 * @requires ../../controllers/agendamento/AgendamentoController
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../middlewares/errorMiddleware
 */
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const AgendamentoController = require('../../controllers/agendamento/AgendamentoController');
const { limiterPublicoAgendamento } = require('../../middlewares/rateLimitMiddleware');
const { validarBodyMiddleware } = require('../../middlewares/errorMiddleware');

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Consulta é mais permissiva que criação (o paciente pode reabrir o link várias vezes). */
const limiterConsultaPublica = rateLimit({
    windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false
});

/**
 * @route GET /api/public/agendamentos/disponibilidade
 * @method GET
 * @description Verifica disponibilidade de horário de uma costureira.
 * @access Público – rate limit 60 req/15min por IP
 * @returns {Object} 200 - { disponivel, motivo? }.
 * @returns {Object} 429 - Muitas requisições.
 *
 * @example
 * GET /api/public/agendamentos/disponibilidade?id_costureira=3&data=2026-11-20 14:00:00
 */
router.get(
    '/disponibilidade',
    limiterConsultaPublica,
    AgendamentoController.verificarDisponibilidadePublica
);

/**
 * @route POST /api/public/agendamentos
 * @method POST
 * @description Autoagendamento do paciente (localizado por CPF).
 * @access Público – rate limit 5 req/hora por IP
 * @returns {Object} 201 - Agendamento criado (dados mínimos + UUID).
 * @returns {Object} 400 - Payload inválido.
 * @returns {Object} 404 - CPF não cadastrado.
 * @returns {Object} 409 - Horário ocupado.
 * @returns {Object} 429 - Muitas requisições.
 *
 * @example
 * POST /api/public/agendamentos
 * Body: { "num_cpf": "11144477735", "id_costureira": 2, "dta_agendamento": "2026-11-20 14:00:00" }
 */
router.post('/', limiterPublicoAgendamento, validarBodyMiddleware, AgendamentoController.criarPublico);

/**
 * @route GET /api/public/agendamentos/:uuid
 * @method GET
 * @description Consulta pública do agendamento pelo UUID enviado por e-mail.
 * @access Público – rate limit 60 req/15min por IP
 * @returns {Object} 200 - Dados mínimos do agendamento.
 * @returns {Object} 400 - UUID inválido.
 * @returns {Object} 404 - Não encontrado.
 *
 * @example
 * GET /api/public/agendamentos/3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d
 */
router.get('/:uuid', limiterConsultaPublica, (req, res, next) => {
    if (!REGEX_UUID.test(req.params.uuid)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Identificador inválido' });
    }
    next();
}, AgendamentoController.buscarPorUuidPublico);

module.exports = router;
