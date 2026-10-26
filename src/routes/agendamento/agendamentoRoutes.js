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

router.get(
    '/disponibilidade',
    AgendamentoController.verificarDisponibilidade
);



router.patch(
    '/:id/costureira',
    secretariaOuAdminMiddleware,
    AgendamentoController.trocarCostureira
);





// router.patch(
//     '/:id/status',
//     costureiraAdminSecretariaMiddleware,
//     AgendamentoController.atualizarStatus
// );






// // Fotos do item — sub-sub-recurso (reaproveita uploadMiddleware existente)
// router.get(
//     '/itens/:idItem/fotos',
//     FotoProdutoAgendamentoController.listarPorItem
// );

// router.post(
//     '/itens/:idItem/fotos',
//     costureiraAdminSecretariaMiddleware,
//     uploadMiddleware.uploadSingle('foto'),
//     FotoProdutoAgendamentoController.adicionar
// );

// router.delete(
//     '/itens/fotos/:id',
//     apenasAdminMiddleware,
//     FotoProdutoAgendamentoController.deletar
// );

module.exports = router;
