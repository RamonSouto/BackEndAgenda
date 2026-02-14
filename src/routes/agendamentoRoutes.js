const express = require('express');
const router = express.Router();
const AgendamentoController = require('../controllers/AgendamentoController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
    secretariaOuAdminMiddleware,
    costureiraOuAdminMiddleware,
    tipoUsuarioMiddleware
} = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { limiterCriacao } = require('../middlewares/rateLimitMiddleware');
const { TIPO_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route   GET /api/agendamentos/estatisticas
 * @desc    Estatísticas de agendamentos
 * @access  Privado - Todos autenticados
 */
router.get('/estatisticas', AgendamentoController.estatisticas);

/**
 * @route   GET /api/agendamentos/meus
 * @desc    Listar meus agendamentos (costureira)
 * @access  Privado - Costureira
 */
router.get(
    '/meus',
    tipoUsuarioMiddleware(TIPO_PESSOA.COSTUREIRA),
    AgendamentoController.listarMeus
);

/**
 * @route   GET /api/agendamentos/costureira/:id_costureira
 * @desc    Listar agendamentos de uma costureira
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/costureira/:id_costureira',
    validarIdMiddleware('id_costureira'),
    secretariaOuAdminMiddleware,
    AgendamentoController.listarPorCostureira
);

/**
 * @route   POST /api/agendamentos
 * @desc    Criar novo agendamento
 * @access  Privado - Secretária, Costureira, Admin
 */
router.post(
    '/',
    limiterCriacao,
    validarBodyMiddleware,
    tipoUsuarioMiddleware([
        TIPO_PESSOA.SECRETARIA,
        TIPO_PESSOA.COSTUREIRA,
        TIPO_PESSOA.ADMINISTRADOR
    ]),
    AgendamentoController.criar
);

/**
 * @route   GET /api/agendamentos
 * @desc    Listar agendamentos com filtros
 * @access  Privado - Todos autenticados
 */
router.get('/', AgendamentoController.listar);

/**
 * @route   GET /api/agendamentos/:id
 * @desc    Buscar agendamento por ID
 * @access  Privado - Todos autenticados
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    AgendamentoController.buscarPorId
);

/**
 * @route   PUT /api/agendamentos/:id
 * @desc    Atualizar agendamento
 * @access  Privado - Secretária (próprios), Costureira (próprios), Admin (todos)
 */
router.put(
    '/:id',
    validarIdMiddleware(),
    validarBodyMiddleware,
    AgendamentoController.atualizar
);

/**
 * @route   PATCH /api/agendamentos/:id/cancelar
 * @desc    Cancelar agendamento
 * @access  Privado - Secretária (próprios), Admin (todos)
 */
router.patch(
    '/:id/cancelar',
    validarIdMiddleware(),
    secretariaOuAdminMiddleware,
    AgendamentoController.cancelar
);

/**
 * @route   PATCH /api/agendamentos/:id/confirmar
 * @desc    Confirmar agendamento
 * @access  Privado - Secretária, Admin
 */
router.patch(
    '/:id/confirmar',
    validarIdMiddleware(),
    secretariaOuAdminMiddleware,
    AgendamentoController.confirmar
);

/**
 * @route   POST /api/agendamentos/:id/comparecimento
 * @desc    Registrar comparecimento do paciente
 * @access  Privado - Costureira (próprios), Admin (todos)
 */
router.post(
    '/:id/comparecimento',
    validarIdMiddleware(),
    validarBodyMiddleware,
    costureiraOuAdminMiddleware,
    AgendamentoController.registrarComparecimento
);

/**
 * @route   DELETE /api/agendamentos/:id
 * @desc    Deletar agendamento (soft delete)
 * @access  Privado - Secretária (próprios), Admin (todos)
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    AgendamentoController.deletar
);

module.exports = router;
