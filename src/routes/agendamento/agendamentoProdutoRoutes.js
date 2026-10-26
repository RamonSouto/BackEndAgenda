// src/routes/agendamento/agendadoProdutoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/produtoAgendadoRoutes.js
 * @description Rotas privadas para operações diretas em itens de produto/serviço
 * agendados (edição/remoção pontual, independente do agendamento pai).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/produtoAgendadoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../schemas/produtoAgendadoSchema
 */
const express = require('express');
const router = express.Router();
const AgendamentoProdutoController = require('../../controllers/agendamento/AgendamentoProdutoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware, costureiraAdminSecretariaMiddleware } = require('../../middlewares/permissionMiddleware');

router.use(authMiddleware);

router.post(
    '/:idAgendamento/itens',
    secretariaOuAdminMiddleware,
    AgendamentoProdutoController.adicionarItem
);

router.get(
    '/:idAgendamento/itens',
    costureiraAdminSecretariaMiddleware,
    AgendamentoProdutoController.listarPorAgendamento
);

router.patch(
    '/:idAgendamento/:idProdutoAgendado',
    costureiraAdminSecretariaMiddleware,
    AgendamentoProdutoController.atualizar
)

router.delete(
    '/:idAgendamento/:idAgendadoProduto',
    secretariaOuAdminMiddleware,
    AgendamentoProdutoController.removerdetelarItemAgendamentoer
)

module.exports = router;
