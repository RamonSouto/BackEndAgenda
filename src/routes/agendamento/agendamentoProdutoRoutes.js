// src/routes/agendamento/agendamentoProdutoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/routes/agendamento/agendamentoProdutoRoutes.js
 * @description Rotas privadas dos itens de um agendamento (sub-recurso /itens).
 * Autenticação é aplicada uma única vez em routes/index.js.
 *
 * @requires express
 * @requires ../../controllers/agendamento/AgendamentoProdutoController
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 */
const router = require('express').Router();
const Controller = require('../../controllers/agendamento/AgendamentoProdutoController');
const { secretariaOuAdminMiddleware, costureiraAdminSecretariaMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');

const validarIds = [validarIdMiddleware('idAgendamento'), validarIdMiddleware('idItem')];

/**
 * @route POST /api/agendamentos/:idAgendamento/itens
 * @method POST
 * @description Adiciona um item (produto + serviço) ao agendamento.
 * @access Privado – Secretária e Administrador
 * @returns {Object} 201 - Item criado.
 * @returns {Object} 400 - Payload inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Agendamento não encontrado.
 * @returns {Object} 422 - Agendamento finalizado, serviço sem preço ou desconto inválido.
 *
 * @example
 * POST /api/agendamentos/1/itens
 * Body: { "id_produto_grade": 5, "id_produto_servico": 3, "id_tipo_agendamento": 1 }
 */
router.post(
    '/:idAgendamento/itens',
    validarIdMiddleware('idAgendamento'),
    secretariaOuAdminMiddleware,
    validarBodyMiddleware,
    Controller.adicionarItem
);

/**
 * @route GET /api/agendamentos/:idAgendamento/itens
 * @method GET
 * @description Lista os itens de um agendamento.
 * @access Privado – Costureira, Secretária e Administrador
 * @returns {Object} 200 - Lista de itens.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Agendamento não encontrado.
 *
 * @example
 * GET /api/agendamentos/1/itens
 */
router.get(
    '/:idAgendamento/itens',
    validarIdMiddleware('idAgendamento'),
    costureiraAdminSecretariaMiddleware,
    Controller.listarPorAgendamento
);

/**
 * @route GET /api/agendamentos/:idAgendamento/itens/:idItem
 * @method GET
 * @description Busca um item do agendamento.
 * @access Privado – Costureira, Secretária e Administrador
 * @returns {Object} 200 - Dados do item.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Item não pertence ao agendamento.
 *
 * @example
 * GET /api/agendamentos/1/itens/3
 */
router.get(
    '/:idAgendamento/itens/:idItem',
    ...validarIds,
    costureiraAdminSecretariaMiddleware,
    Controller.buscarPorId
);

/**
 * @route PATCH /api/agendamentos/:idAgendamento/itens/:idItem
 * @method PATCH
 * @description Atualiza parcialmente um item (status, desconto, ajuste, grade/serviço).
 * @access Privado – Costureira, Secretária e Administrador
 * @returns {Object} 200 - Item atualizado.
 * @returns {Object} 400 - Payload inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Item não pertence ao agendamento.
 * @returns {Object} 422 - Agendamento/item finalizado.
 *
 * @example
 * PATCH /api/agendamentos/1/itens/3
 * Body: { "ind_status": "producao" }
 */
router.patch(
    '/:idAgendamento/itens/:idItem',
    ...validarIds,
    costureiraAdminSecretariaMiddleware,
    validarBodyMiddleware,
    Controller.atualizar
);

/**
 * @route DELETE /api/agendamentos/:idAgendamento/itens/:idItem
 * @method DELETE
 * @description Remove (soft delete) um item.
 * @access Privado – Secretária e Administrador
 * @returns {Object} 200 - Item removido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Item não pertence ao agendamento.
 * @returns {Object} 422 - Agendamento finalizado.
 *
 * @example
 * DELETE /api/agendamentos/1/itens/3
 */
router.delete(
    '/:idAgendamento/itens/:idItem',
    ...validarIds,
    secretariaOuAdminMiddleware,
    Controller.deletar

);

module.exports = router;
