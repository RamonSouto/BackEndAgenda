// src/routes/agendamento/tipoAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/tipoAgendamentoRoutes.js
 * @description Rotas privadas de tipos de agendamento.
 * 
 * @requires express
 * @requires ../../controllers/agendamento/tipoAgendamentoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../schemas/agendamentoSchema
 */
const express = require('express');
const router = express.Router();
const TipoAgendamentoController = require('../../controllers/agendamento/TipoAgendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');

router.use(authMiddleware);

router.post(
    '/tipo',
    apenasAdminMiddleware,
    TipoAgendamentoController.criar
);

router.get(
    '/tipo',
    TipoAgendamentoController.listar
);

router.get(
    '/tipo/:id',
    TipoAgendamentoController.buscarPorId
);

router.put(
    '/tipo/:id',
    apenasAdminMiddleware,
    TipoAgendamentoController.atualizar
);

router.delete(
    '/tipo/:id',
    apenasAdminMiddleware,
    TipoAgendamentoController.deletar
);

module.exports = router;
