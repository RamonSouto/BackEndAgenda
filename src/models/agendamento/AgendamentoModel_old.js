// src/models/agendamento/agendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/agendamentoModel.js
 * @description Model de acesso a dados da tabela tab_agendamento.
 * Contém apenas queries — validações de regra de negócio ficam no Service.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

class AgendamentoModel {
    /**
     * Busca um agendamento pelo ID, com dados básicos das pessoas envolvidas.
     * @async
     * @param {number} id
     * @param {import('mysql2/promise').PoolConnection} [conn] - Conexão de transação opcional.
     * @returns {Promise<Object|null>}
     */
    static async buscarPorId(id, conn = null) {
        const executor = conn || database;
        const sql = `
            SELECT id, 
                   des_url_externa,
                   id_paciente,
                   id_costureira,
                   id_secretaria,
                   dta_agendamento,
                   des_observacoes_geral,
                   des_observacoes_costureira,
                   ind_status,
                   ind_paciente_compareceu,
                   dta_confirmacao,
                   dta_conclusao,
                   dta_cancelamento,
                   des_url_externa,
                   created_at,
                   updated_at,
                   deleted_at
            FROM tab_agendamento a
            WHERE a.id = ? AND a.deleted_at IS NULL
        `;
        const rows = conn
            ? (await conn.execute(sql, [id]))[0]
            : await executor.query(sql, [id]);
        return rows[0] || null;
    }

    /**
     * Busca um agendamento pelo UUID público (des_url_externa).
     * @async
     * @param {string} uuid
     * @returns {Promise<Object|null>}
     */
    static async buscarPorUuid(uuid) {
        const rows = await database.query(
            `SELECT a.id, 
                    a.dta_agendamento,
                    a.ind_status,
                    a.des_observacoes_geral,
                    p.nom_completo AS nom_paciente,
                    c.nom_completo AS nom_costureira
             FROM tab_agendamento a
             INNER JOIN tab_pessoas p ON p.id = a.id_paciente
             INNER JOIN tab_pessoas c ON c.id = a.id_costureira
             WHERE a.des_url_externa = ? AND a.deleted_at IS NULL`,
            [uuid]
        );
        return rows[0] || null;
    }

    /**
     * Lista agendamentos com filtros e paginação.
     * @async
     * @param {Object} filtros
     * @param {number} [filtros.pagina=1]
     * @param {number} [filtros.limite=20]
     * @param {string} [filtros.status]
     * @param {number} [filtros.idCostureira]
     * @param {string} [filtros.dataInicio] - YYYY-MM-DD
     * @param {string} [filtros.dataFim] - YYYY-MM-DD
     * @returns {Promise<{dados: Array, total: number}>}
     */
    static async listar({ pagina = 1, limite = 20, status, idCostureira, dataInicio, dataFim } = {}) {

        const where = ['a.deleted_at IS NULL'];
        const params = [];

        if (status) { where.push('a.ind_status = ?'); params.push(status); }
        if (idCostureira) { where.push('a.id_costureira = ?'); params.push(idCostureira); }
        if (dataInicio) { where.push('a.dta_agendamento >= ?'); params.push(dataInicio); }
        if (dataFim) { where.push('a.dta_agendamento <= ?'); params.push(dataFim); }

        const whereClause = where.join(' AND ');
        const offset = (pagina - 1) * limite;


        const dados = await database.query(
            `SELECT id,
                    des_url_externa,
                    id_paciente,
                    id_costureira,
                    id_secretaria,
                    dta_agendamento,
                    des_observacoes_geral,
                    des_observacoes_costureira,
                    ind_status,
                    ind_paciente_compareceu,
                    dta_confirmacao,
                    dta_conclusao,
                    dta_cancelamento,
                    des_url_externa,
                    created_at,
                    updated_at,
                    deleted_at
             FROM tab_agendamento a
             WHERE ${whereClause}
             ORDER BY a.dta_agendamento ASC
             LIMIT ${limite} OFFSET ${offset}`,
            [...params]
        );

        const [{ total }] = await database.query(
            `SELECT COUNT(*) AS total FROM tab_agendamento a WHERE ${whereClause}`,
            params
        );

        return { dados, total }

    }

    /**
     * Verifica se existe conflito de horário ativo para a costureira.
     * Usa FOR UPDATE para travar as linhas concorrentes dentro da transação
     * e evitar condição de corrida na criação simultânea de agendamentos.
     * 
     * @async
     * @param {import('mysql2/promise').PoolConnection} conn - Conexão de transação (obrigatória).
     * @param {number} idCostureira
     * @param {string} dataAgendamento - DATETIME formatado 'YYYY-MM-DD HH:mm:ss'.
     * @param {number} [ignorarId] - ID do agendamento a ignorar (uso em edição).
     * @returns {Promise<boolean>} true se houver conflito.
     */
    static async existeConflito(conn, idCostureira, dataAgendamento, ignorarId = null) {
        const params = [idCostureira, dataAgendamento];
        let sql = `
            SELECT id FROM tab_agendamento
            WHERE id_costureira = ?
              AND dta_agendamento = ?
              AND ind_status NOT IN ('cancelado', 'falta')
              AND deleted_at IS NULL
        `;
        if (ignorarId) { sql += ' AND id != ?'; params.push(ignorarId); }
        sql += ' FOR UPDATE';

        const [rows] = await conn.execute(sql, params);
        return rows.length > 0;
    }

    /**
     * Insere um novo agendamento (deve ser chamado dentro de uma transação).
     * @async
     * @param {import('mysql2/promise').PoolConnection} conn
     * @param {Object} dados
     * @returns {Promise<number>} ID inserido.
     */
    static async inserir(conn, dados) {
        const {
            id_paciente, id_costureira, id_secretaria, dta_agendamento,
            des_observacoes_geral, des_observacoes_costureira, des_url_externa
        } = dados;

        const [result] = await conn.execute(
            `INSERT INTO tab_agendamento
                (id_paciente, id_costureira, id_secretaria, dta_agendamento,
                 des_observacoes_geral, des_observacoes_costureira, des_url_externa, ind_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'agendado')`,
            [
                id_paciente, id_costureira, id_secretaria ?? null, dta_agendamento,
                des_observacoes_geral ?? null, des_observacoes_costureira ?? null, des_url_externa
            ]
        );
        return result.insertId;
    }

    /**
     * Atualiza os dados gerais de um agendamento (sem alterar status).
     * @async
     * @param {number} id
     * @param {Object} dados
     * @returns {Promise<void>}
     */
    static async atualizar(id, dados) {
        const {
            id_costureira, id_secretaria, dta_agendamento,
            des_observacoes_geral, des_observacoes_costureira
        } = dados;

        await database.query(
            `UPDATE tab_agendamento
             SET id_costureira = COALESCE(?, id_costureira),
                 id_secretaria = COALESCE(?, id_secretaria),
                 dta_agendamento = COALESCE(?, dta_agendamento),
                 des_observacoes_geral = COALESCE(?, des_observacoes_geral),
                 des_observacoes_costureira = COALESCE(?, des_observacoes_costureira)
             WHERE id = ? AND deleted_at IS NULL`,
            [
                id_costureira ?? null, id_secretaria ?? null, dta_agendamento ?? null,
                des_observacoes_geral ?? null, des_observacoes_costureira ?? null, id
            ]
        );
    }

    /**
     * Atualiza o status do agendamento e os timestamps correlatos.
     * @async
     * @param {number} id
     * @param {string} novoStatus
     * @param {import('mysql2/promise').PoolConnection} [conn]
     * @returns {Promise<void>}
     */
    static async atualizarStatus(id, novoStatus, conn = null) {
        const colunaData = {
            confirmado: 'dta_confirmacao',
            concluido: 'dta_conclusao',
            cancelado: 'dta_cancelamento'
        }[novoStatus];

        const sql = `
            UPDATE tab_agendamento
            SET ind_status = ?${colunaData ? `, ${colunaData} = NOW()` : ''}
            WHERE id = ? AND deleted_at IS NULL
        `;
        if (conn) {
            await conn.execute(sql, [novoStatus, id]);
        } else {
            await database.query(sql, [novoStatus, id]);
        }
    }

    /**
     * Soft delete de um agendamento.
     * @async
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async remover(id) {
        const result = await database.query(
            `UPDATE tab_agendamento SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = AgendamentoModel;
