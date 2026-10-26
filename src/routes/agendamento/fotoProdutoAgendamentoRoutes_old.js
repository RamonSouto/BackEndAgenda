// src/routes/agendamento/fotoProdutoAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/fotoProdutoAgendamentoRoutes.js
 * @description Rotas internas para fotos de "antes/depois" de itens de agendamento.
 * Reaproveita o uploadMiddleware já existente no projeto (uploadSingle).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/FotoProdutoAgendamentoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../middlewares/uploadMiddleware
 */
const express = require('express');
const router = express.Router();
const FotoProdutoAgendamentoController = require('../../controllers/agendamento/FotoProdutoAgendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { papelMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterUpload } = require('../../middlewares/rateLimitMiddleware');
const { uploadSingle } = require('../../middlewares/uploadMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

router.use(authMiddleware);

/**
 * @route POST /api/agendamentos/itens/:itemId/fotos
 * @description Upload de foto de ajuste (antes/depois) para um item de agendamento.
 * @access Privado – Costureira ou Administrador (quem executa o ajuste tira a foto).
 * 
 * @example
 * POST /api/agendamentos/itens/5/fotos
 * Body (multipart/form-data): foto: (arquivo), ind_tipo_foto: 'antes'
 */
router.post(
    '/itens/:itemId/fotos',
    validarIdMiddleware('itemId'),
    papelMiddleware([PAPEIS_PESSOA.COSTUREIRA, PAPEIS_PESSOA.ADMINISTRADOR]),
    limiterUpload,
    uploadSingle('foto', 'fotos_ajustes'),
    FotoProdutoAgendamentoController.adicionar
);

/**
 * @route GET /api/agendamentos/itens/:itemId/fotos
 * @description Lista as fotos de um item de agendamento.
 * @access Privado – Qualquer usuário autenticado.
 */
router.get(
    '/itens/:itemId/fotos',
    validarIdMiddleware('itemId'),
    FotoProdutoAgendamentoController.listarPorItem
);

/**
 * @route DELETE /api/agendamentos/itens/fotos/:id
 * @description Deleta (soft delete + remoção física) uma foto de ajuste.
 * @access Privado – Apenas Administrador.
 */
router.delete(
    '/itens/fotos/:id',
    validarIdMiddleware(),
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    FotoProdutoAgendamentoController.deletar
);

module.exports = router;
