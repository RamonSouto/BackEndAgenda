// src/routes/agendamento/tipoAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/routes/agendamento/tipoAgendamentoRoutes.js
 * @description Rotas privadas de tipos de agendamento.
 * Autenticação é aplicada uma única vez em routes/index.js.
 *
 * @requires express
 * @requires ../../controllers/agendamento/TipoAgendamentoController
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 */
const express = require('express');
const router = express.Router();
const TipoAgendamentoController = require('../../controllers/agendamento/TipoAgendamentoController');
const { apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');

router.post(
    '/tipo',
    apenasAdminMiddleware,
    validarBodyMiddleware,
    TipoAgendamentoController.criar
);

router.get(
    '/tipo',
    TipoAgendamentoController.listar
);

router.get(
    '/tipo/:id',
    validarIdMiddleware('id'),
    TipoAgendamentoController.buscarPorId
);

router.put(
    '/tipo/:id',
    validarIdMiddleware('id'),
    apenasAdminMiddleware,
    validarBodyMiddleware,
    TipoAgendamentoController.atualizar
);

router.delete(
    '/tipo/:id',
    validarIdMiddleware('id'),
    apenasAdminMiddleware,
    TipoAgendamentoController.deletar
);

module.exports = router;
