// src/routes/sistema/relatorioRoutes.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/relatorioRoutes.js
 * @description Rotas para relatórios, dashboards e estatísticas.
 * Gerencia endpoints de auditoria, logs por usuário/tabela, estatísticas de ações/usuários,
 * relatórios de agendamentos, produtividade de costureiras e dashboard geral.
 * 
 * @requires express
 * @requires ../controllers/RelatorioController
 * @requires ../middlewares/authMiddleware
 * @requires ../middlewares/permissionMiddleware
 * @requires ../middlewares/errorMiddleware
 * @requires ../utils/constants
 */

const express = require('express');
const router = express.Router();
const RelatorioController = require('../controllers/RelatorioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware, papelMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware } = require('../middlewares/errorMiddleware');
const { PAPEIS_PESSOA } = require('../utils/constants');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * Rota para dashboard geral com métricas resumidas.
 * 
 * @name GET /api/relatorios/dashboard
 * @function
 * @description Retorna métricas do mês atual, agendamentos de hoje e disponibilidade de costureiras.
 * @access Privado – Todos os usuários autenticados (sem restrição adicional)
 * 
 * @param {Object} req.usuario - Usuário autenticado (injetado pelo authMiddleware).
 * @param {number} req.usuario.id - ID do usuário.
 * @param {string} req.usuario.tipo - Tipo de usuário (para filtragem de dados).
 * 
 * @returns {Object} 200 - Dashboard com métricas agregadas.
 * @returns {Object} 401 - Token inválido ou ausente.
 * 
 * @example
 * GET /api/relatorios/dashboard
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get('/dashboard', RelatorioController.dashboard);

/**
 * Rota para relatório de auditoria (logs do sistema).
 * 
 * @name GET /api/relatorios/auditoria
 * @function
 * @description Gera relatório detalhado de logs com filtros opcionais (usuário, ação, tabela, datas).
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.query - Filtros para o relatório.
 * @param {string} [req.query.id_usuario] - ID do usuário (opcional).
 * @param {string} [req.query.acao] - Nome da ação (ex: 'login', 'criar_pessoa').
 * @param {string} [req.query.tabela] - Tabela afetada.
 * @param {string} [req.query.data_inicio] - Data inicial (ISO).
 * @param {string} [req.query.data_fim] - Data final (ISO).
 * @param {number} [req.query.limite=100] - Limite de registros.
 * 
 * @returns {Object} 200 - Relatório com agregações e lista de logs.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/auditoria?data_inicio=2025-01-01&data_fim=2025-01-31&limite=50
 */
router.get('/auditoria', apenasAdminMiddleware, RelatorioController.auditoria);

/**
 * Rota para logs de um usuário específico.
 * 
 * @name GET /api/relatorios/logs/usuario/:id_usuario
 * @function
 * @description Retorna os logs gerados por um determinado usuário.
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {number} req.params.id_usuario - ID do usuário (validado por `validarIdMiddleware`).
 * @param {Object} req.query - Parâmetros adicionais.
 * @param {number} [req.query.limite=50] - Número máximo de registros.
 * 
 * @returns {Object} 200 - Lista de logs do usuário.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/logs/usuario/1?limite=20
 */
router.get(
    '/logs/usuario/:id_usuario',
    validarIdMiddleware('id_usuario'),
    apenasAdminMiddleware,
    RelatorioController.logsPorUsuario
);

/**
 * Rota para logs de uma tabela específica.
 * 
 * @name GET /api/relatorios/logs/tabela/:tabela
 * @function
 * @description Retorna logs filtrados por tabela e, opcionalmente, por ID do registro.
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {string} req.params.tabela - Nome da tabela.
 * @param {Object} req.query - Parâmetros adicionais.
 * @param {number} [req.query.registro_id] - ID do registro (opcional).
 * 
 * @returns {Object} 200 - Lista de logs da tabela.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/logs/tabela/tab_pessoas?registro_id=1
 */
router.get(
    '/logs/tabela/:tabela',
    apenasAdminMiddleware,
    RelatorioController.logsPorTabela
);

/**
 * Rota para estatísticas de ações (por tipo de ação).
 * 
 * @name GET /api/relatorios/estatisticas/acoes
 * @function
 * @description Retorna contagem de ações agrupadas por `des_acao` no período informado.
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.query - Parâmetros de consulta.
 * @param {string} [req.query.data_inicio] - Data inicial (ISO). Padrão: início do mês atual.
 * @param {string} [req.query.data_fim] - Data final (ISO). Padrão: fim do mês atual.
 * 
 * @returns {Object} 200 - Estatísticas de ações.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/estatisticas/acoes?data_inicio=2025-01-01
 */
router.get(
    '/estatisticas/acoes',
    apenasAdminMiddleware,
    RelatorioController.estatisticasAcoes
);

/**
 * Rota para estatísticas de usuários.
 * 
 * @name GET /api/relatorios/estatisticas/usuarios
 * @function
 * @description Retorna contagem de ações por usuário no período informado.
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.query - Parâmetros de consulta.
 * @param {string} [req.query.data_inicio] - Data inicial (ISO). Padrão: início do mês atual.
 * @param {string} [req.query.data_fim] - Data final (ISO). Padrão: fim do mês atual.
 * 
 * @returns {Object} 200 - Estatísticas de usuários.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/estatisticas/usuarios?data_inicio=2025-01-01
 */
router.get(
    '/estatisticas/usuarios',
    apenasAdminMiddleware,
    RelatorioController.estatisticasUsuarios
);

/**
 * Rota para relatório de agendamentos com estatísticas agregadas.
 * 
 * @name GET /api/relatorios/agendamentos
 * @function
 * @description Retorna lista de agendamentos com resumo (por status, costureira, comparecimento).
 * @access Privado – Secretárias, médicos e administradores (papelMiddleware)
 * 
 * @param {Object} req.query - Filtros para agendamentos.
 * @param {number} [req.query.id_paciente] - ID do paciente.
 * @param {number} [req.query.id_costureira] - ID da costureira.
 * @param {number} [req.query.id_secretaria] - ID da secretária.
 * @param {string} [req.query.status] - Status do agendamento.
 * @param {string} [req.query.data_inicio] - Data inicial.
 * @param {string} [req.query.data_fim] - Data final.
 * 
 * @returns {Object} 200 - Relatório com resumo e lista.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/relatorios/agendamentos?status=concluido&data_inicio=2025-01-01
 */
router.get(
    '/agendamentos',
    papelMiddleware([
        PAPEIS_PESSOA.SECRETARIA,
        PAPEIS_PESSOA.MEDICO,
        PAPEIS_PESSOA.ADMINISTRADOR
    ]),
    RelatorioController.agendamentos
);

/**
 * Rota para relatório de produtividade por costureira.
 * 
 * @name GET /api/relatorios/produtividade/costureiras
 * @function
 * @description Retorna produtividade de cada costureira (total de agendamentos, concluídos, cancelados, etc.).
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.query - Parâmetros de consulta.
 * @param {string} [req.query.data_inicio] - Data inicial (ISO). Padrão: início do mês atual.
 * @param {string} [req.query.data_fim] - Data final (ISO). Padrão: fim do mês atual.
 * 
 * @returns {Object} 200 - Produtividade por costureira (ordenada).
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/relatorios/produtividade/costureiras?data_inicio=2025-01-01
 */
router.get(
    '/produtividade/costureiras',
    apenasAdminMiddleware,
    RelatorioController.produtividadeCostureiras
);

module.exports = router;
