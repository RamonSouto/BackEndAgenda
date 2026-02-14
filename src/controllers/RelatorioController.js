const LogService = require('../services/LogService');
const AgendamentoService = require('../services/AgendamentoService');
const PessoaService = require('../services/PessoaService');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const { startOfMonth, endOfMonth, startOfDay, endOfDay } = require('date-fns');

class RelatorioController {
    /**
     * Relatório de auditoria (logs)
     * GET /api/relatorios/auditoria
     */
    auditoria = asyncHandler(async (req, res) => {
        const filtros = {
            id_usuario: req.query.id_usuario,
            des_acao: req.query.acao,
            des_tabela: req.query.tabela,
            data_inicio: req.query.data_inicio,
            data_fim: req.query.data_fim,
            limite: req.query.limite || 100
        };

        const relatorio = await LogService.gerarRelatorioAuditoria(filtros);

        return res.status(200).json({
            sucesso: true,
            dados: relatorio
        });
    });

    /**
     * Relatório de logs por usuário
     * GET /api/relatorios/logs/usuario/:id_usuario
     */
    logsPorUsuario = asyncHandler(async (req, res) => {
        const { id_usuario } = req.params;
        const limite = req.query.limite || 50;

        const logs = await LogService.buscarPorUsuario(id_usuario, limite);

        return res.status(200).json({
            sucesso: true,
            total: logs.length,
            dados: logs
        });
    });

    /**
     * Relatório de logs por tabela
     * GET /api/relatorios/logs/tabela/:tabela
     */
    logsPorTabela = asyncHandler(async (req, res) => {
        const { tabela } = req.params;
        const registro_id = req.query.registro_id;

        const logs = await LogService.buscarPorTabela(tabela, registro_id);

        return res.status(200).json({
            sucesso: true,
            total: logs.length,
            dados: logs
        });
    });

    /**
     * Estatísticas de ações
     * GET /api/relatorios/estatisticas/acoes
     */
    estatisticasAcoes = asyncHandler(async (req, res) => {
        let { data_inicio, data_fim } = req.query;

        // Se não fornecido, usar o mês atual
        if (!data_inicio || !data_fim) {
            const hoje = new Date();
            data_inicio = startOfMonth(hoje).toISOString();
            data_fim = endOfMonth(hoje).toISOString();
        }

        const estatisticas = await LogService.obterEstatisticasAcoes(data_inicio, data_fim);

        return res.status(200).json({
            sucesso: true,
            periodo: { data_inicio, data_fim },
            dados: estatisticas
        });
    });

    /**
     * Estatísticas de usuários
     * GET /api/relatorios/estatisticas/usuarios
     */
    estatisticasUsuarios = asyncHandler(async (req, res) => {
        let { data_inicio, data_fim } = req.query;

        // Se não fornecido, usar o mês atual
        if (!data_inicio || !data_fim) {
            const hoje = new Date();
            data_inicio = startOfMonth(hoje).toISOString();
            data_fim = endOfMonth(hoje).toISOString();
        }

        const estatisticas = await LogService.obterEstatisticasUsuarios(data_inicio, data_fim);

        return res.status(200).json({
            sucesso: true,
            periodo: { data_inicio, data_fim },
            dados: estatisticas
        });
    });

    /**
     * Relatório de agendamentos
     * GET /api/relatorios/agendamentos
     */
    agendamentos = asyncHandler(async (req, res) => {
        const filtros = {
            id_paciente: req.query.id_paciente,
            id_costureira: req.query.id_costureira,
            id_secretaria: req.query.id_secretaria,
            ind_status: req.query.status,
            data_inicio: req.query.data_inicio,
            data_fim: req.query.data_fim
        };

        const agendamentos = await AgendamentoService.listar(
            filtros,
            req.usuario.id,
            req.usuario.tipo
        );

        // Estatísticas
        const total = agendamentos.length;
        const porStatus = agendamentos.reduce((acc, ag) => {
            acc[ag.ind_status] = (acc[ag.ind_status] || 0) + 1;
            return acc;
        }, {});

        const porCostureira = agendamentos.reduce((acc, ag) => {
            const nome = ag.costureira_nome;
            if (!acc[nome]) {
                acc[nome] = { nome, total: 0 };
            }
            acc[nome].total++;
            return acc;
        }, {});

        const comparecimentos = agendamentos.filter(ag => ag.ind_paciente_compareceu !== null).length;
        const compareceram = agendamentos.filter(ag => ag.ind_paciente_compareceu === true).length;
        const faltas = agendamentos.filter(ag => ag.ind_paciente_compareceu === false).length;

        return res.status(200).json({
            sucesso: true,
            dados: {
                resumo: {
                    total,
                    por_status: porStatus,
                    por_costureira: Object.values(porCostureira),
                    comparecimentos: {
                        total: comparecimentos,
                        compareceram,
                        faltas,
                        taxa_comparecimento: comparecimentos > 0
                            ? `${((compareceram / comparecimentos) * 100).toFixed(2)}%`
                            : '0%'
                    }
                },
                agendamentos
            }
        });
    });

    /**
     * Relatório de produtividade por costureira
     * GET /api/relatorios/produtividade/costureiras
     */
    produtividadeCostureiras = asyncHandler(async (req, res) => {
        let { data_inicio, data_fim } = req.query;

        // Se não fornecido, usar o mês atual
        if (!data_inicio || !data_fim) {
            const hoje = new Date();
            data_inicio = startOfMonth(hoje).toISOString();
            data_fim = endOfMonth(hoje).toISOString();
        }

        const agendamentos = await AgendamentoService.listar(
            { data_inicio, data_fim },
            req.usuario.id,
            req.usuario.tipo
        );

        // Agrupar por costureira
        const produtividade = agendamentos.reduce((acc, ag) => {
            const id = ag.costureira_id;
            const nome = ag.costureira_nome;

            if (!acc[id]) {
                acc[id] = {
                    id,
                    nome,
                    total_agendamentos: 0,
                    concluidos: 0,
                    cancelados: 0,
                    faltas: 0,
                    em_andamento: 0
                };
            }

            acc[id].total_agendamentos++;

            switch (ag.ind_status) {
                case 'concluido':
                    acc[id].concluidos++;
                    break;
                case 'cancelado':
                    acc[id].cancelados++;
                    break;
                case 'falta':
                    acc[id].faltas++;
                    break;
                default:
                    acc[id].em_andamento++;
            }

            return acc;
        }, {});

        const dados = Object.values(produtividade).sort((a, b) =>
            b.total_agendamentos - a.total_agendamentos
        );

        return res.status(200).json({
            sucesso: true,
            periodo: { data_inicio, data_fim },
            total_costureiras: dados.length,
            dados
        });
    });

    /**
     * Dashboard geral
     * GET /api/relatorios/dashboard
     */
    dashboard = asyncHandler(async (req, res) => {
        const hoje = new Date();
        const inicioMes = startOfMonth(hoje).toISOString();
        const fimMes = endOfMonth(hoje).toISOString();
        const inicioHoje = startOfDay(hoje).toISOString();
        const fimHoje = endOfDay(hoje).toISOString();

        // Agendamentos do mês
        const agendamentosMes = await AgendamentoService.listar(
            { data_inicio: inicioMes, data_fim: fimMes },
            req.usuario.id,
            req.usuario.tipo
        );

        // Agendamentos de hoje
        const agendamentosHoje = await AgendamentoService.listar(
            { data_inicio: inicioHoje, data_fim: fimHoje },
            req.usuario.id,
            req.usuario.tipo
        );

        // Costureiras disponíveis
        const costureiras = await PessoaService.listarCostureirasDisponiveis(req.usuario.id);

        // Estatísticas do mês
        const totalMes = agendamentosMes.length;
        const concluidosMes = agendamentosMes.filter(ag => ag.ind_status === 'concluido').length;
        const canceladosMes = agendamentosMes.filter(ag => ag.ind_status === 'cancelado').length;
        const ativosMes = agendamentosMes.filter(ag =>
            ['agendado', 'confirmado'].includes(ag.ind_status)
        ).length;

        return res.status(200).json({
            sucesso: true,
            dados: {
                mes_atual: {
                    total: totalMes,
                    concluidos: concluidosMes,
                    cancelados: canceladosMes,
                    ativos: ativosMes
                },
                hoje: {
                    total: agendamentosHoje.length,
                    agendamentos: agendamentosHoje
                },
                costureiras: {
                    total: costureiras.length,
                    disponiveis: costureiras.filter(c => c.disponivel).length,
                    ocupadas: costureiras.filter(c => !c.disponivel).length
                }
            }
        });
    });
}

module.exports = new RelatorioController();
