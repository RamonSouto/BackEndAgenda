//src/models/LogModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/LogModel.js
 * @description Modelo de dados para logs de auditoria.
 * Gerencia operações CRUD e consultas estatísticas na tabela `tab_logs`.
 * 
 * @requires ../config/database
 */
const database = require('../config/database');

/**
 * Classe LogModel.
 * @class LogModel
 */
class LogModel {
    /**
     * Insere um novo log na tabela `tab_logs`.
     * 
     * @method criar
     * @memberof LogModel
     * @async
     * @param {Object} dados - Dados do log.
     * @param {number} [dados.id_usuario] - ID do usuário (opcional).
     * @param {string} dados.des_acao - Nome da ação (obrigatório).
     * @param {string} dados.des_tabela - Nome da tabela afetada (obrigatório).
     * @param {number} [dados.num_registro_id] - ID do registro afetado (opcional).
     * @param {Object} [dados.des_detalhes] - Detalhes adicionais em JSON (opcional).
     * @param {string} [dados.num_ip_address] - IP do cliente (opcional).
     * @param {string} [dados.des_user_agent] - User-Agent do cliente (opcional).
     * @returns {Promise<number>} ID do log inserido.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const logId = await logModel.criar({
     *   id_usuario: 1,
     *   des_acao: 'login',
     *   des_tabela: 'tab_pessoas',
     *   des_detalhes: { sucesso: true },
     *   num_ip_address: '192.168.1.1'
     * });
     */
    async criar(dados) {
        const sql = `
      INSERT INTO tab_logs (
        id_usuario, des_acao, des_tabela, num_registro_id,
        des_detalhes, num_ip_address, des_user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        const valores = [
            dados.id_usuario || null,
            dados.des_acao,
            dados.des_tabela,
            dados.num_registro_id || null,
            JSON.stringify(dados.des_detalhes || {}),
            dados.num_ip_address || null,
            dados.des_user_agent || null
        ];

        const resultado = await database.query(sql, valores);
        return resultado.insertId;
    }

    /**
     * Lista logs com filtros opcionais.
     * 
     * @method listar
     * @memberof LogModel
     * @async
     * @param {Object} [filtros={}] - Filtros para a consulta.
     * @param {number} [filtros.id_usuario] - Filtrar por ID do usuário.
     * @param {string} [filtros.des_acao] - Filtrar por nome da ação.
     * @param {string} [filtros.des_tabela] - Filtrar por tabela.
     * @param {string} [filtros.data_inicio] - Data inicial (formato ISO ou compatível).
     * @param {string} [filtros.data_fim] - Data final (formato ISO ou compatível).
     * @param {number} [filtros.limite] - Número máximo de registros.
     * @returns {Promise<Array<Object>>} Lista de logs com dados do usuário associado (via LEFT JOIN).
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * - Converte datas para o formato MySQL (`YYYY-MM-DD HH:MM:SS`).
     * - Aplica `ORDER BY created_at DESC`.
     * - Realiza JOIN com `tab_pessoas` para obter nome e papéis do usuário.
     * 
     * @example
     * const logs = await logModel.listar({
     *   id_usuario: 5,
     *   data_inicio: '2025-01-01',
     *   data_fim: '2025-01-31',
     *   limite: 10
     * });
     */
    async listar(filtros = {}) {
        let sql = `
            SELECT l.*,
                p.nom_completo as usuario_nome,
                p.ind_administrador as usuario_administrador,
                p.ind_costureira as usuario_costureira,
                p.ind_secretaria as usuario_secretaria,
                p.ind_medico as usuario_medico,
                p.ind_paciente as usuario_paciente
            FROM tab_logs l
            LEFT JOIN tab_pessoas p ON l.id_usuario = p.id
            WHERE 1=1
        `;

        const valores = [];

        if (filtros.id_usuario !== undefined && filtros.id_usuario !== null) {
            sql += ' AND l.id_usuario = ?';
            valores.push(parseInt(filtros.id_usuario));
        }

        if (filtros.des_acao) {
            sql += ' AND l.des_acao = ?';
            valores.push(filtros.des_acao);
        }

        if (filtros.des_tabela) {
            sql += ' AND l.des_tabela = ?';
            valores.push(filtros.des_tabela);
        }

        if (filtros.data_inicio && filtros.data_fim) {
            // Converte para string no formato aceito pelo MySQL
            const inicio = new Date(filtros.data_inicio).toISOString().slice(0, 19).replace('T', ' ');
            const fim = new Date(filtros.data_fim).toISOString().slice(0, 19).replace('T', ' ');
            sql += ' AND l.created_at BETWEEN ? AND ?';
            valores.push(inicio, fim);
        }

        sql += ' ORDER BY l.created_at DESC';

        if (filtros.limite) {
            const limite = parseInt(filtros.limite, 10);
            if (!isNaN(limite) && limite > 0) {
                sql += ' LIMIT ?';
                valores.push(parseInt(limite));
            }
        }
        console.log({ filtros })
        return await database.query(sql, valores);
    }

    /**
     * Busca logs por ID do usuário.
     * 
     * @method buscarPorUsuario
     * @memberof LogModel
     * @async
     * @param {number} id_usuario - ID do usuário.
     * @param {number} [limite=50] - Número máximo de registros.
     * @returns {Promise<Array<Object>>} Lista de logs.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const logs = await logModel.buscarPorUsuario(1, 10);
     */
    async buscarPorUsuario(id_usuario, limite = 50) {
        const sql = `
      SELECT * FROM tab_logs
      WHERE id_usuario = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

        return await database.query(sql, [id_usuario, limite]);
    }

    /**
     * Busca logs por tabela e, opcionalmente, por ID do registro.
     * 
     * @method buscarPorTabela
     * @memberof LogModel
     * @async
     * @param {string} tabela - Nome da tabela (des_tabela).
     * @param {number} [registro_id=null] - ID do registro para filtrar.
     * @returns {Promise<Array<Object>>} Lista de logs com nome do usuário (via JOIN).
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const logs = await logModel.buscarPorTabela('tab_pessoas', 42);
     */
    async buscarPorTabela(tabela, registro_id = null) {
        let sql = `
      SELECT 
        l.*,
        p.nom_completo as usuario_nome
      FROM tab_logs l
      LEFT JOIN tab_pessoas p ON l.id_usuario = p.id
      WHERE l.des_tabela = ?
    `;

        const valores = [tabela];

        if (registro_id) {
            sql += ' AND l.num_registro_id = ?';
            valores.push(registro_id);
        }

        sql += ' ORDER BY l.created_at DESC';

        return await database.query(sql, valores);
    }

    /**
     * Obtém estatísticas de ações por período (agrupadas por des_acao).
     * 
     * @method estatisticasAcoes
     * @memberof LogModel
     * @async
     * @param {string} data_inicio - Data inicial (formato aceito pelo MySQL).
     * @param {string} data_fim - Data final (formato aceito pelo MySQL).
     * @returns {Promise<Array<Object>>} Lista de objetos com `des_acao`, `total` e `usuarios_unicos`.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const stats = await logModel.estatisticasAcoes('2025-01-01', '2025-01-31');
     */
    async estatisticasAcoes(data_inicio, data_fim) {
        const sql = `
      SELECT 
        des_acao,
        COUNT(*) as total,
        COUNT(DISTINCT id_usuario) as usuarios_unicos
      FROM tab_logs
      WHERE created_at BETWEEN ? AND ?
      GROUP BY des_acao
      ORDER BY total DESC
    `;

        return await database.query(sql, [data_inicio, data_fim]);
    }

    /**
     * Obtém estatísticas de usuários por período (agrupadas por usuário).
     * 
     * @method estatisticasUsuarios
     * @memberof LogModel
     * @async
     * @param {string} data_inicio - Data inicial.
     * @param {string} data_fim - Data final.
     * @returns {Promise<Array<Object>>} Lista de objetos com `id`, `nom_completo`, `ind_tipo_pessoa` e `total_acoes`.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * - Realiza INNER JOIN com `tab_pessoas` para incluir apenas usuários que têm logs.
     * - Agrupa por ID do usuário.
     * - Ordena por total de ações decrescente.
     * 
     * @example
     * const stats = await logModel.estatisticasUsuarios('2025-01-01', '2025-01-31');
     */
    async estatisticasUsuarios(data_inicio, data_fim) {
        const sql = `
      SELECT 
        p.id,
        p.nom_completo,
        p.ind_tipo_pessoa,
        COUNT(l.id) as total_acoes
      FROM tab_pessoas p
      INNER JOIN tab_logs l ON p.id = l.id_usuario
      WHERE l.created_at BETWEEN ? AND ?
      GROUP BY p.id, p.nom_completo, p.ind_tipo_pessoa
      ORDER BY total_acoes DESC
    `;

        return await database.query(sql, [data_inicio, data_fim]);
    }
}

module.exports = new LogModel();
