const LogModel = require('../models/LogModel');

class LogService {
    async registrar(dados) {
        try {
            const logId = await LogModel.criar(dados);
            return logId;
        } catch (error) {
            // Não lançar erro para não interromper o fluxo principal
            console.error('Erro ao registrar log:', error.message);
            return null;
        }
    }

    async listar(filtros = {}) {
        try {
            return await LogModel.listar(filtros);
        } catch (error) {
            throw error;
        }
    }

    async buscarPorUsuario(id_usuario, limite = 50) {
        try {
            return await LogModel.buscarPorUsuario(id_usuario, limite);
        } catch (error) {
            throw error;
        }
    }

    async buscarPorTabela(tabela, registro_id = null) {
        try {
            return await LogModel.buscarPorTabela(tabela, registro_id);
        } catch (error) {
            throw error;
        }
    }

    async obterEstatisticasAcoes(data_inicio, data_fim) {
        try {
            return await LogModel.estatisticasAcoes(data_inicio, data_fim);
        } catch (error) {
            throw error;
        }
    }

    async obterEstatisticasUsuarios(data_inicio, data_fim) {
        try {
            return await LogModel.estatisticasUsuarios(data_inicio, data_fim);
        } catch (error) {
            throw error;
        }
    }

    async gerarRelatorioAuditoria(filtros = {}) {
        try {
            const logs = await LogModel.listar(filtros);

            // Agrupar por tipo de ação
            const porAcao = logs.reduce((acc, log) => {
                if (!acc[log.des_acao]) {
                    acc[log.des_acao] = 0;
                }
                acc[log.des_acao]++;
                return acc;
            }, {});

            // Agrupar por usuário
            const porUsuario = logs.reduce((acc, log) => {
                if (!log.usuario_nome) return acc;

                if (!acc[log.usuario_nome]) {
                    acc[log.usuario_nome] = {
                        nome: log.usuario_nome,
                        tipo: log.usuario_tipo,
                        total: 0
                    };
                }
                acc[log.usuario_nome].total++;
                return acc;
            }, {});

            // Agrupar por tabela
            const porTabela = logs.reduce((acc, log) => {
                if (!acc[log.des_tabela]) {
                    acc[log.des_tabela] = 0;
                }
                acc[log.des_tabela]++;
                return acc;
            }, {});

            return {
                total_logs: logs.length,
                periodo: {
                    inicio: filtros.data_inicio,
                    fim: filtros.data_fim
                },
                por_acao: porAcao,
                por_usuario: Object.values(porUsuario).sort((a, b) => b.total - a.total),
                por_tabela: porTabela,
                logs_detalhados: logs
            };

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new LogService();
