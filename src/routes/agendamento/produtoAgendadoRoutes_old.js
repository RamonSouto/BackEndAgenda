// src/routes/agendamento/produtoAgendadoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/produtoAgendadoRoutes.js
 * @description Rotas internas para itens de agendamento (produto + serviço).
 * 
 * @requires express
 * @requires ../../controllers/agendamento/ProdutoAgendadoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 */
const express = require('express');
const router = express.Router();
const ProdutoAgendadoController = require('../../controllers/agendamento/ProdutoAgendadoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { secretariaOuAdminMiddleware, papelMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../../utils/constants');

router.use(authMiddleware);

/**
 * @route POST /api/agendamentos/itens
 * @description Adiciona um item (produto/serviço) a um agendamento existente.
 * @access Privado – Secretária ou Administrador.
 */
router.post(
    '/itens',
    validarBodyMiddleware,
    secretariaOuAdminMiddleware,
    ProdutoAgendadoController.adicionar
);

/**
 * @route GET /api/agendamentos/:id/itens
 * @description Lista os itens de um agendamento.
 * @access Privado – Qualquer usuário autenticado.
 */
router.get(
    '/:id/itens',
    validarIdMiddleware(),
    ProdutoAgendadoController.listarPorAgendamento
);

/**
 * @route GET /api/agendamentos/itens/:id
 * @description Busca um item por ID.
 * @access Privado – Qualquer usuário autenticado.
 */
router.get(
    '/itens/:id',
    validarIdMiddleware(),
    ProdutoAgendadoController.buscarPorId
);

/**
 * @route PUT /api/agendamentos/itens/:id
 * @description Atualiza dados livres do item (desconto, descrição do ajuste).
 * @access Privado – Secretária ou Administrador.
 */
router.put(
    '/itens/:id',
    validarIdMiddleware(),
    secretariaOuAdminMiddleware,
    ProdutoAgendadoController.atualizar
);

/**
 * @route PATCH /api/agendamentos/itens/:id/status
 * @description Altera o status individual do item.
 * @access Privado – Costureira, Secretária ou Administrador.
 */
router.patch(
    '/itens/:id/status',
    validarIdMiddleware(),
    validarBodyMiddleware,
    papelMiddleware([PAPEIS_PESSOA.COSTUREIRA, PAPEIS_PESSOA.SECRETARIA, PAPEIS_PESSOA.ADMINISTRADOR]),
    ProdutoAgendadoController.alterarStatus
);

/**
 * @route DELETE /api/agendamentos/itens/:id
 * @description Deleta (soft delete) um item de agendamento.
 * @access Privado – Apenas Administrador.
 */
router.delete(
    '/itens/:id',
    validarIdMiddleware(),
    papelMiddleware([PAPEIS_PESSOA.ADMINISTRADOR]),
    ProdutoAgendadoController.deletar
);

module.exports = router;
