// src/services/LogService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/LogService.js
 * @description Serviço de registro e consulta de logs de auditoria.
 * Fornece métodos para criar logs, listar, buscar por usuário/tabela,
 * obter estatísticas e gerar relatórios.
 * 
 * @requires ../models/LogModel
 */
const LogModel = require('../models/LogModel');

/**
 * Classe LogService.
 * @class LogService
 */
class LogService {
    /**
     * Registra um log de auditoria.
     * 
     * @method registrar
     * @memberof LogService
     * @async
     * @param {Object} dados - Dados do log.
     * @param {number} [dados.id_usuario] - ID do usuário que realizou a ação (opcional).
     * @param {string} dados.des_acao - Nome da ação (ex: 'login', 'criar_pessoa').
     * @param {string} dados.des_tabela - Nome da tabela afetada.
     * @param {number} [dados.num_registro_id] - ID do registro afetado (opcional).
     * @param {Object} [dados.des_detalhes] - Detalhes adicionais em JSON.
     * @param {string} [dados.num_ip_address] - IP do cliente.
     * @param {string} [dados.des_user_agent] - User-Agent do cliente.
     * @param {Date} [dados.dta_criacao] - Data/hora do log (opcional).
     * @returns {Promise<number|null>} ID do log criado ou `null` em caso de erro.
     * 
     * @description
     * - Em caso de erro, o método não lança exceção, apenas loga no console e retorna `null`.
     * - Isso garante que a aplicação principal não seja interrompida por falhas no registro de logs.
     * 
     * @example
     * const logId = await logService.registrar({
     *   id_usuario: 1,
     *   des_acao: 'login',
     *   des_tabela: 'tab_pessoas',
     *   des_detalhes: { sucesso: true }
     * });
     */
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

    /**
     * Lista logs de auditoria com filtros opcionais.
     * 
     * @method listar
     * @memberof LogService
     * @async
     * @param {Object} [filtros={}] - Filtros para a consulta.
     * @param {string} [filtros.data_inicio] - Data inicial (ISO).
     * @param {string} [filtros.data_fim] - Data final (ISO).
     * @param {number} [filtros.id_usuario] - Filtrar por ID do usuário.
     * @param {string} [filtros.des_acao] - Filtrar por ação.
     * @param {string} [filtros.des_tabela] - Filtrar por tabela.
     * @param {number} [filtros.limite] - Limite de resultados (padrão: 100).
     * @param {number} [filtros.pagina] - Número da página para paginação.
     * @returns {Promise<Array<Object>>} Lista de logs.
     * @throws {Error} Repassa erros do modelo.
     * 
     * @example
     * const logs = await logService.listar({ 
     *   data_inicio: '2025-01-01', 
     *   id_usuario: 5,
     *   limite: 20 
     * });
     */
    async listar(filtros = {}) {
        try {
            return await LogModel.listar(filtros);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca logs por usuário.
     * 
     * @method buscarPorUsuario
     * @memberof LogService
     * @async
     * @param {number} id_usuario - ID do usuário.
     * @param {number} [limite=50] - Número máximo de registros.
     * @returns {Promise<Array<Object>>} Lista de logs do usuário.
     * @throws {Error} Repassa erros do modelo.
     * 
     * @example
     * const logs = await logService.buscarPorUsuario(1, 10);
     */
    async buscarPorUsuario(id_usuario, limite = 50) {
        try {
            return await LogModel.buscarPorUsuario(id_usuario, limite);
        } catch (error) {
            throw error;
        }
    }

    /**
    * Busca logs por tabela e, opcionalmente, por ID do registro.
    * 
    * @method buscarPorTabela
    * @memberof LogService
    * @async
    * @param {string} tabela - Nome da tabela.
    * @param {number} [registro_id=null] - ID do registro (opcional).
    * @returns {Promise<Array<Object>>} Lista de logs.
    * @throws {Error} Repassa erros do modelo.
    * 
    * @example
    * const logs = await logService.buscarPorTabela('tab_pessoas', 42);
    */
    async buscarPorTabela(tabela, registro_id = null) {
        try {
            return await LogModel.buscarPorTabela(tabela, registro_id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtém estatísticas de ações por período.
     * 
     * @method obterEstatisticasAcoes
     * @memberof LogService
     * @async
     * @param {string} data_inicio - Data inicial (ISO).
     * @param {string} data_fim - Data final (ISO).
     * @returns {Promise<Object>} Estatísticas (total por ação).
     * @throws {Error} Repassa erros do modelo.
     * 
     * @example
     * const stats = await logService.obterEstatisticasAcoes('2025-01-01', '2025-01-31');
     */
    async obterEstatisticasAcoes(data_inicio, data_fim) {
        try {
            return await LogModel.estatisticasAcoes(data_inicio, data_fim);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtém estatísticas de usuários por período.
     * 
     * @method obterEstatisticasUsuarios
     * @memberof LogService
     * @async
     * @param {string} data_inicio - Data inicial (ISO).
     * @param {string} data_fim - Data final (ISO).
     * @returns {Promise<Object>} Estatísticas (total por usuário).
     * @throws {Error} Repassa erros do modelo.
     * 
     * @example
     * const stats = await logService.obterEstatisticasUsuarios('2025-01-01', '2025-01-31');
     */
    async obterEstatisticasUsuarios(data_inicio, data_fim) {
        try {
            return await LogModel.estatisticasUsuarios(data_inicio, data_fim);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gera um relatório de auditoria completo com agregações e logs detalhados.
     * 
     * @method gerarRelatorioAuditoria
     * @memberof LogService
     * @async
     * @param {Object} [filtros={}] - Filtros para o relatório.
     * @param {string} [filtros.data_inicio] - Data inicial.
     * @param {string} [filtros.data_fim] - Data final.
     * @param {number} [filtros.id_usuario] - Filtrar por usuário.
     * @param {string} [filtros.des_acao] - Filtrar por ação.
     * @param {string} [filtros.des_tabela] - Filtrar por tabela.
     * @param {number} [filtros.limite] - Limite de logs detalhados.
     * @returns {Promise<Object>} Objeto com:
     *   - `total_logs`: número total de logs.
     *   - `periodo`: datas de início e fim.
     *   - `por_acao`: objeto com contagem por ação.
     *   - `por_usuario`: array de objetos com nome, tipo e total.
     *   - `por_tabela`: objeto com contagem por tabela.
     *   - `logs_detalhados`: array dos logs filtrados.
     * @throws {Error} Repassa erros do modelo ou de processamento.
     * 
     * @description
     * - Remove filtros com valores `undefined` ou `null`.
     * - Agrupa os logs em memória usando `reduce`.
     * - Inclui logs de debug (console.log) para depuração.
     * 
     * @example
     * const relatorio = await logService.gerarRelatorioAuditoria({
     *   data_inicio: '2025-01-01',
     *   data_fim: '2025-01-31'
     * });
     */
    async gerarRelatorioAuditoria(filtros = {}) {
        try {

            const filtrosLimpos = Object.fromEntries(
                Object.entries(filtros).filter(([_, v]) => v !== undefined && v !== null)
            );
            Object.entries(filtrosLimpos).forEach(([key, value]) => {
                console.log(`${key}: ${value} Tipo:` + typeof parseInt(value));
            })
            console.log(filtrosLimpos);

            const logs = await LogModel.listar(filtrosLimpos);

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
