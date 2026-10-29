// src/models/agendamento/agendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/AgendamentoModel.js
 * @description Modelo de dados para o cabeçalho de agendamentos (tab_agendamento).
 * Todos os métodos aceitam um parâmetro opcional `connection` para permitir
 * participação em transações controladas pelo Service (ex.: criar agendamento
 * + itens de forma atômica).
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Executa uma query usando a conexão de transação (se fornecida)
 * ou o pool padrão (comportamento normal fora de transação).
 * 
 * @private
 * @param {string} sql
 * @param {Array} params
 * @param {Object|null} connection - Conexão de transação (mysql2 PoolConnection).
 * @returns {Promise<Array>} Linhas retornadas.
 */
const exec = async (sql, params, connection = null) => {
    if (connection) {
        const [rows] = await connection.execute(sql, params);
        return rows;
    }
    return database.query(sql, params);
};

class AgendamentoModel {
    /**
     * Cria o cabeçalho de um agendamento.
     * 
     * @method criar
     * @param {Object} dados
     * @param {number} dados.id_paciente
     * @param {number} dados.id_costureira
     * @param {number} [dados.id_secretaria]
     * @param {string} dados.dta_agendamento
     * @param {string} [dados.des_observacoes_geral]
     * @param {string} [dados.des_observacoes_costureira]
     * @param {string} dados.des_url_externa - UUID v4 gerado pelo Service.
     * @param {Object|null} [connection] - Conexão de transação.
     * @returns {Promise<number>} ID inserido.
     */
    async criar(dados) {

        const sql = `
            INSERT INTO tab_agendamento
                (id_paciente, id_costureira, id_secretaria, dta_agendamento,
                 des_observacoes_geral, des_observacoes_costureira, ind_status, des_url_externa)
            VALUES (?, ?, ?, ?, ?, ?, 'agendado', ?)
        `;
        const valores = [
            dados.id_paciente,
            dados.id_costureira,
            dados.id_secretaria ?? null,
            dados.dta_agendamento,
            dados.des_observacoes_geral ?? null,
            dados.des_observacoes_costureira ?? null,
            dados.des_url_externa
        ];

        const resultado = await database.query(sql, valores)

        return resultado.insertId;
    }

    /**
     * Busca agendamento por ID (com dados básicos de paciente/costureira).
     * 
     * @method buscarPorId
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async buscarPorId(id) {
        const sql = `
            SELECT a.*,
                   p.nom_completo AS nom_paciente,
                   p.num_celular_1 AS num_celular_paciente,
                   c.nom_completo AS nom_costureira,
                   c.val_cor_hex AS val_cor_costureira,
                   s.nom_completo AS nom_secretaria
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            LEFT JOIN tab_pessoas s ON (a.id_secretaria = s.id)
            WHERE a.id = ? AND a.deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Busca agendamento pelo UUID público (des_url_externa).
     * Usado pelo fluxo público/WhatsApp para consulta sem autenticação.
     * 
     * @method buscarPorUuid
     * @param {string} uuid
     * @returns {Promise<Object|null>}
     */
    async buscarPorUuid(uuid) {
        const sql = `
            SELECT a.id, a.dta_agendamento, a.ind_status, a.des_url_externa,
                   p.nom_completo AS nom_paciente,
                   c.nom_completo AS nom_costureira
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            WHERE a.des_url_externa = ? AND a.deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [uuid]);
        return resultado[0] || null;
    }

    /**
     * Lista agendamentos com filtros opcionais (data, costureira, status).
     * 
     * @method listar
     * @param {Object} [filtros]
     * @param {number} [filtros.id_costureira]
     * @param {string} [filtros.dta_inicio] - Formato YYYY-MM-DD.
     * @param {string} [filtros.dta_fim]
     * @param {string} [filtros.ind_status]
     * @returns {Promise<Array<Object>>}
     */
    async listar(filtros = {}) {

        const limite = Math.min(Math.max(Number.parseInt(filtros.limite, 10) || 20, 1), 100);
        const pagina = Math.max(Number.parseInt(filtros.pagina, 10) || 1, 1);
        const offset = (pagina - 1) * limite;

        const condicoes = ['a.deleted_at IS NULL'];

        const valores = [];

        if (filtros.id_costureira) {
            condicoes.push('a.id_costureira = ?');
            valores.push(filtros.id_costureira);
        }
        if (filtros.dta_inicio) {
            condicoes.push('a.dta_agendamento >= ?');
            valores.push(`${filtros.dta_inicio} 00:00:00`);
        }
        if (filtros.dta_fim) {
            condicoes.push('a.dta_agendamento <= ?');
            valores.push(`${filtros.dta_fim} 23:59:59`);
        }
        if (filtros.ind_status) {
            condicoes.push('a.ind_status = ?');
            valores.push(filtros.ind_status);
        }

        const sql = `
            SELECT a.id, 
                   a.dta_agendamento, 
                   a.ind_status, 
                   a.des_url_externa,
                   a.id_paciente, a.id_costureira,
                   p.nom_completo AS nom_paciente,
                   c.nom_completo AS nom_costureira,
                   c.val_cor_hex AS val_cor_costureira
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            WHERE ${condicoes.join(' AND ')}
            ORDER BY a.dta_agendamento ASC
            LIMIT ${limite} OFFSET ${offset}
        `;

        return database.query(sql, valores);
    }

    /**
     * Verifica se a costureira já possui agendamento ATIVO (não cancelado)
     * no horário exato informado. Base da regra 2.2.4.
     * 
     * @method verificarConflito
     * @param {number} id_costureira
     * @param {string} dta_agendamento - Datetime completo (YYYY-MM-DD HH:MM:SS).
     * @param {number|null} [ignorarId] - ID do próprio agendamento (uso em edição/troca de costureira).
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>} `true` se houver conflito.
     */
    async verificarConflito(id_costureira, dta_agendamento, ignorarId = null, connection = null) {
        let sql = `
            SELECT id FROM tab_agendamento
            WHERE id_costureira = ?
              AND dta_agendamento = ?
              AND ind_status != 'cancelado'
              AND deleted_at IS NULL
        `;
        const valores = [id_costureira, dta_agendamento];

        if (ignorarId) {
            sql += ' AND id != ?';
            valores.push(ignorarId);
        }

        const resultado = await database.query(sql, valores);
        return resultado.length > 0;
    }

    /**
     * Atualiza o status do agendamento e a coluna de data correspondente
     * (dta_confirmacao, dta_conclusao ou dta_cancelamento).
     * 
     * @method atualizarStatus
     * @param {number} id
     * @param {string} novoStatus - 'confirmado' | 'concluido' | 'cancelado' | 'falta'.
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>}
     */
    async atualizarStatus(id, novoStatus, connection = null) {
        const colunaData = {
            confirmado: 'dta_confirmacao',
            concluido: 'dta_conclusao',
            cancelado: 'dta_cancelamento'
        }[novoStatus];

        const sql = colunaData
            ? `UPDATE tab_agendamento SET ind_status = ?, ${colunaData} = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`
            : `UPDATE tab_agendamento SET ind_status = ? WHERE id = ? AND deleted_at IS NULL`;

        if (connection) {
            const [resultado] = await connection.execute(sql, [novoStatus, id]);
            return resultado.affectedRows > 0;
        }
        const resultado = await database.query(sql, [novoStatus, id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Troca a costureira responsável por um agendamento.
     * 
     * @method trocarCostureira
     * @param {number} id
     * @param {number} novoIdCostureira
     * @returns {Promise<boolean>}
     */
    async trocarCostureira(id, novoIdCostureira) {
        const sql = `
            UPDATE tab_agendamento
            SET id_costureira = ?
            WHERE id = ? AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [novoIdCostureira, id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Atualiza campos livres do agendamento (observações, data, etc.).
     * 
     * @method atualizar
     * @param {number} id
     * @param {Object} dados
     * @returns {Promise<boolean>}
     */
    async atualizar(id, dados) {
        const campos = [];

        const valores = [];

        Object.keys(dados).forEach(campo => {
            if (dados[campo] !== undefined && campo !== 'id') {
                campos.push(`${campo} = ?`);
                valores.push(dados[campo]);
            }
        });

        if (campos.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }

        valores.push(id);

        const sql = `
            UPDATE tab_agendamento
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta (soft delete) um agendamento.
     * 
     * @method deletar
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deletar(id) {
        const sql = `
            UPDATE tab_agendamento
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Busca dados mínimos para notificação por e-mail (inclui e-mail do paciente).
     * @method buscarDadosNotificacao
     * @param {number} id - ID do agendamento.
     * @returns {Promise<Object|null>}
     **/
    async buscarDadosNotificacao(id) {
        const sql = `
            SELECT a.id, 
                   a.des_url_externa, 
                   a.dta_agendamento, 
                   a.ind_status,
                   p.nom_completo AS nom_paciente,
                   p.des_email_1 AS des_email_paciente,
                   c.nom_completo AS nom_costureira
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            WHERE a.id = ?
            AND a.deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }
}

module.exports = new AgendamentoModel();