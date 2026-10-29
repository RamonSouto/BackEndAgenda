// src/routes/agendamento/agendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/agendamentoRoutes.js
 * @description Rotas privadas de agendamentos (área interna).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/agendamentoController
 * @requires ../../controllers/agendamento/ProdutoAgendadoController
 * @requires ../../controllers/agendamento/FotoProdutoAgendamentoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/uploadMiddleware
 * @requires ../../schemas/agendamentoSchema
 * @requires ../../schemas/produtoAgendadoSchema
 * @requires ../../schemas/fotoProdutoAgendamentoSchema
 */
const express = require('express');
const router = express.Router();
const AgendamentoController = require('../../controllers/agendamento/AgendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { validarIdMiddleware } = require('../../middlewares/errorMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware, costureiraAdminSecretariaMiddleware } = require('../../middlewares/permissionMiddleware');

router.use(authMiddleware);


// Agendamento (cabeçalho)
router.post(
    '/',
    secretariaOuAdminMiddleware,
    AgendamentoController.criar
);

router.get(
    '/',
    AgendamentoController.listar
);

router.get(
    '/disponibilidade',
    AgendamentoController.verificarDisponibilidade
);

router.get(
    '/:id',
    AgendamentoController.buscarPorId
);

router.put(
    '/:id',
    secretariaOuAdminMiddleware,
    AgendamentoController.atualizar
)

router.delete(
    '/:id',
    apenasAdminMiddleware,
    AgendamentoController.deletar
);

router.patch(
    '/:id/costureira',
    secretariaOuAdminMiddleware,
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
    AgendamentoController.atualizarStatus
);

module.exports = router;
