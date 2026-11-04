// src/routes/agendamento/agendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/routes/agendamento/agendamentoRoutes.js
 * @description Rotas privadas de agendamentos (área interna).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/AgendamentoController
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/permissionMiddleware
 */
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../../controllers/agendamento/AgendamentoController');

const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware, costureiraAdminSecretariaMiddleware, permissionMiddleware } = require('../../middlewares/permissionMiddleware');

const podeVisualizar = permissionMiddleware(['agendamento:visualizar', 'agendamento:visualizar_proprio']);

/**
 * @route POST /api/agendamentos
 * @method POST
 * @description Cria um agendamento e enfileira o e-mail de cadastro.
 * @access Privado – Secretária e Administrador
 * @returns {Object} 201 - Agendamento criado.
 * @returns {Object} 400 - Dados inválidos ou fora do expediente.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 409 - Horário ocupado.
 *
 * @example
 * POST /api/agendamentos
 * Body: { "id_paciente": 1, "id_costureira": 2, "dta_agendamento": "2026-11-20 14:00:00" }
 */
router.post(
    '/',
    secretariaOuAdminMiddleware,
    validarBodyMiddleware,
    AgendamentoController.criar
);

/**
 * @route GET /api/agendamentos
 * @method GET
 * @description Lista agendamentos com filtros e paginação. Costureira vê apenas os próprios.
 * @access Privado – Administrador, Secretária, Médico e Costureira (próprios)
 * @returns {Object} 200 - Lista paginada.
 * @returns {Object} 400 - Filtro inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 *
 * @example
 * GET /api/agendamentos?ind_status=agendado&dta_inicio=2026-11-01&pagina=1&limite=20
 */
router.get(
    '/',
    podeVisualizar,
    AgendamentoController.listar
);

/**
 * @route GET /api/agendamentos/disponibilidade
 * @method GET
 * @description Verifica se o horário está livre para a costureira.
 * @access Privado – Administrador, Secretária, Médico e Costureira
 * @returns {Object} 200 - { disponivel, motivo? }.
 * @returns {Object} 400 - Parâmetros inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 *
 * @example
 * GET /api/agendamentos/disponibilidade?id_costureira=3&data=2026-11-20 14:00:00
 */
router.get(
    '/disponibilidade',
    podeVisualizar,
    AgendamentoController.verificarDisponibilidade

);

/**
 * @route GET /api/agendamentos/:id
 * @method GET
 * @description Busca agendamento com itens. Costureira só acessa os próprios.
 * @access Privado – Administrador, Secretária, Médico e Costureira (próprios)
 * @returns {Object} 200 - Agendamento completo.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Agendamento de outra costureira.
 * @returns {Object} 404 - Não encontrado.
 *
 * @example
 * GET /api/agendamentos/10
 */
router.get(
    '/:id',
    validarIdMiddleware('id'),
    podeVisualizar,
    AgendamentoController.buscarPorId
);

/**
 * @route PUT /api/agendamentos/:id
 * @method PUT
 * @description Atualiza os dados gerais (data, secretária e observações).
 * @access Privado – Secretária e Administrador
 * @returns {Object} 200 - Agendamento atualizado.
 * @returns {Object} 400 - Dados inválidos ou agendamento finalizado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Não encontrado.
 * @returns {Object} 409 - Horário ocupado.
 *
 * @example
 * PUT /api/agendamentos/10
 * Body: { "dta_agendamento": "2026-11-21 09:00:00" }
 */
router.put(
    '/:id',
    validarIdMiddleware('id'),
    secretariaOuAdminMiddleware,
    validarBodyMiddleware,
    AgendamentoController.atualizar
)

/**
 * @route DELETE /api/agendamentos/:id
 * @method DELETE
 * @description Remove o agendamento (soft delete).
 * @access Privado – Apenas Administrador
 * @returns {Object} 200 - Agendamento removido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Não encontrado.
 *
 * @example
 * DELETE /api/agendamentos/10
 */
router.delete(
    '/:id',
    validarIdMiddleware('id'),
    apenasAdminMiddleware,
    AgendamentoController.deletar
);

/**
 * @route PATCH /api/agendamentos/:id/costureira
 * @method PATCH
 * @description Troca a costureira responsável (férias, afastamento, falta).
 * @access Privado – Secretária e Administrador
 * @returns {Object} 200 - Costureira alterada.
 * @returns {Object} 400 - Costureira inválida ou agendamento finalizado.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Não encontrado.
 * @returns {Object} 409 - Nova costureira ocupada no horário.
 *
 * @example
 * PATCH /api/agendamentos/10/costureira
 * Body: { "id_costureira": 5, "des_motivo": "férias" }
 */
router.patch(
    '/:id/costureira',
    validarIdMiddleware('id'),
    secretariaOuAdminMiddleware,
    validarBodyMiddleware,
    AgendamentoController.trocarCostureira
);

/**
 * @route PATCH /api/agendamentos/:id/status
 * @method PATCH
 * @description Altera status (agendado→confirmado→concluido|cancelado|falta). Concluído/cancelado enviam e-mail.
 * @access Privado – Costureira, Secretária e Administrador
 * @returns {Object} 200 - Agendamento atualizado.
 * @returns {Object} 400 - Transição inválida ou prazo de cancelamento.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Agendamento não encontrado.
 *
 * @example
 * PATCH /api/agendamentos/10/status
 * Body: { "status": "cancelado" }
 */
router.patch(
    '/:id/status',
    validarIdMiddleware('id'),
    costureiraAdminSecretariaMiddleware,
    validarBodyMiddleware,
    AgendamentoController.atualizarStatus
);

module.exports = router;
