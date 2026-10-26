// src/routes/agendamento/publicAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/publicAgendamentoRoutes.js
 * @description Rotas públicas (sem autenticação) para autoagendamento pelo
 * paciente. Protegidas por rate limiter agressivo (anti-spam/DoS de agenda).
 * NUNCA expor dados sensíveis de outras pessoas nestas rotas.
 * 
 * @requires express
 * @requires ../../controllers/agendamento/agendamentoController
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../schemas/agendamentoSchema
 */
const router = require('express').Router();
const agendamentoService = require('../../services/agendamento/agendamentoService');
const { limiterAgendamentoPublico } = require('../../middlewares/rateLimitMiddleware');
const validate = require('../../middlewares/validateMiddleware');
const { publicAgendamentoSchema } = require('../../schemas/publicAgendamentoSchema');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(limiterAgendamentoPublico);

/**
 * Verifica disponibilidade de horário (visão pública, sem expor lista de agendamentos).
 * @example GET /api/public/agendamentos/disponibilidade?idCostureira=3&data=2026-09-20 14:00:00
 */
router.get('/disponibilidade', asyncHandler(async (req, res) => {
    const { idCostureira, data } = req.query;
    const disponivel = await agendamentoService.verificarDisponibilidade(idCostureira, data);
    res.status(200).json({ sucesso: true, dados: { disponivel } });
}));

/**
 * Cria um agendamento via canal público (autoagendamento do paciente).
 * @example POST /api/public/agendamentos
 */
router.post('/', validate(publicAgendamentoSchema), asyncHandler(async (req, res) => {
    const dados = await agendamentoService.criarAgendamento(req.body, null);
    res.status(201).json({
        sucesso: true,
        mensagem: 'Agendamento solicitado com sucesso',
        dados: { id: dados.id, uuid: dados.des_url_externa, dta_agendamento: dados.dta_agendamento }
    });
}));

/**
 * Consulta pública de um agendamento pelo UUID (link enviado via WhatsApp/e-mail).
 * @example GET /api/public/agendamentos/:uuid
 */
router.get('/:uuid', asyncHandler(async (req, res) => {
    const dados = await agendamentoService.buscarPorUuidPublico(req.params.uuid);
    res.status(200).json({ sucesso: true, dados });
}));

module.exports = router;
