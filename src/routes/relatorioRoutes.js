const express = require('express');
const router = express.Router();
const RelatorioController = require('../controllers/RelatorioController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
    apenasAdminMiddleware,
    tipoUsuarioMiddleware
} = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware } = require('../middlewares/errorMiddleware');
const { TIPO_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * @route   GET /api/relatorios/dashboard
 * @desc    Dashboard geral com resumo
 * @access  Privado - Todos autenticados
 */
router.get('/dashboard', RelatorioController.dashboard);

/**
 * @route   GET /api/relatorios/auditoria
 * @desc    Relatório de auditoria (logs)
 * @access  Privado - Admin
 */
router.get('/auditoria', apenasAdminMiddleware, RelatorioController.auditoria);

/**
 * @route   GET /api/relatorios/logs/usuario/:id_usuario
 * @desc    Relatório de logs por usuário
 * @access  Privado - Admin
 */
router.get(
    '/logs/usuario/:id_usuario',
    validarIdMiddleware('id_usuario'),
    apenasAdminMiddleware,
    RelatorioController.logsPorUsuario
);

/**
 * @route   GET /api/relatorios/logs/tabela/:tabela
 * @desc    Relatório de logs por tabela
 * @access  Privado - Admin
 */
router.get(
    '/logs/tabela/:tabela',
    apenasAdminMiddleware,
    RelatorioController.logsPorTabela
);

/**
 * @route   GET /api/relatorios/estatisticas/acoes
 * @desc    Estatísticas de ações
 * @access  Privado - Admin
 */
router.get(
    '/estatisticas/acoes',
    apenasAdminMiddleware,
    RelatorioController.estatisticasAcoes
);

/**
 * @route   GET /api/relatorios/estatisticas/usuarios
 * @desc    Estatísticas de usuários
 * @access  Privado - Admin
 */
router.get(
    '/estatisticas/usuarios',
    apenasAdminMiddleware,
    RelatorioController.estatisticasUsuarios
);

/**
 * @route   GET /api/relatorios/agendamentos
 * @desc    Relatório de agendamentos
 * @access  Privado - Secretária, Médico, Admin
 */
router.get(
    '/agendamentos',
    tipoUsuarioMiddleware([
        TIPO_PESSOA.SECRETARIA,
        TIPO_PESSOA.MEDICO,
        TIPO_PESSOA.ADMINISTRADOR
    ]),
    RelatorioController.agendamentos
);

/**
 * @route   GET /api/relatorios/produtividade/costureiras
 * @desc    Relatório de produtividade por costureira
 * @access  Privado - Admin
 */
router.get(
    '/produtividade/costureiras',
    apenasAdminMiddleware,
    RelatorioController.produtividadeCostureiras
);

module.exports = router;
