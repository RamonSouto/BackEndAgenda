// src/models/agendamento/AgendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.2.0
 * @file src/models/agendamento/AgendamentoModel.js
 * @description Persistência do cabeçalho de agendamentos (tab_agendamento).
 * Todos os métodos de escrita aceitam `connection` opcional (transação controlada pelo Service).
 *
 * @requires ../../utils/sqlUtils
 */
const { montarUpdate, executar } = require('../../utils/sqlUtils');

const CAMPOS_ATUALIZAVEIS = ['dta_agendamento', 'id_secretaria', 'des_observacoes_geral', 'des_observacoes_costureira'];

/** Coluna de data preenchida em cada transição de status. */
const COLUNA_DATA_STATUS = {
    confirmado: 'dta_confirmacao',
    concluido: 'dta_conclusao',
    cancelado: 'dta_cancelamento'
};

/** Comparecimento derivado do status (null = não se aplica). */
const COMPARECEU_POR_STATUS = { concluido: 1, falta: 0 };

class AgendamentoModel {

    /**
     * Monta WHERE e valores dos filtros de listagem (reuso entre listar e contar).
     *
     * @method _montarFiltros
     * @private
     * @param {Object} filtros
     * @returns {{where: string, valores: Array}}
     */
    _montarFiltros(filtros) {
        const condicoes = ['a.deleted_at IS NULL'];
        const valores = [];

        if (filtros.id_costureira) { condicoes.push('a.id_costureira = ?'); valores.push(filtros.id_costureira); }
        if (filtros.dta_inicio) { condicoes.push('a.dta_agendamento >= ?'); valores.push(`${filtros.dta_inicio} 00:00:00`); }
        if (filtros.dta_fim) { condicoes.push('a.dta_agendamento <= ?'); valores.push(`${filtros.dta_fim} 23:59:59`); }
        if (filtros.ind_status) { condicoes.push('a.ind_status = ?'); valores.push(filtros.ind_status); }

        return { where: condicoes.join(' AND '), valores };
    }

    /**
     * Cria o cabeçalho de um agendamento.
     *
     * @method criar
     * @param {Object} dados
     * @param {number} dados.id_paciente
     * @param {number} dados.id_costureira
     * @param {number} [dados.id_secretaria]
     * @param {string} dados.dta_agendamento - 'YYYY-MM-DD HH:MM:SS'.
     * @param {string} [dados.des_observacoes_geral]
     * @param {string} [dados.des_observacoes_costureira]
     * @param {string} dados.des_url_externa - UUID v4.
     * @param {Object|null} [connection]
     * @returns {Promise<number>} ID inserido.
     */
    async criar(dados, connection = null) {
        const sql = `
            INSERT INTO tab_agendamento
                (id_paciente, id_costureira, id_secretaria, dta_agendamento,
                 des_observacoes_geral, des_observacoes_costureira, ind_status, des_url_externa)
            VALUES (?, ?, ?, ?, ?, ?, 'agendado', ?)
        `;
        const resultado = await executar(sql, [
            dados.id_paciente,
            dados.id_costureira,
            dados.id_secretaria ?? null,
            dados.dta_agendamento,
            dados.des_observacoes_geral ?? null,
            dados.des_observacoes_costureira ?? null,
            dados.des_url_externa
        ], connection);
        return resultado.insertId;
    }

    /**
     * Busca agendamento por ID com dados básicos de paciente/costureira/secretária.
     *
     * @method buscarPorId
     * @param {number} id
     * @param {Object|null} [connection]
     * @returns {Promise<Object|null>}
     */
    async buscarPorId(id, connection = null) {
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
        const resultado = await executar(sql, [id], connection);
        return resultado[0] || null;
    }

    /**
     * Busca agendamento pelo UUID público (dados mínimos).
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
        const resultado = await executar(sql, [uuid]);
        return resultado[0] || null;
    }

    /**
     * Lista agendamentos paginados com filtros opcionais.
     *
     * @method listar
     * @param {Object} [filtros] - id_costureira, dta_inicio, dta_fim, ind_status, pagina, limite.
     * @returns {Promise<Array<Object>>}
     */
    async listar(filtros = {}) {
        const limite = Math.min(Math.max(Number.parseInt(filtros.limite, 10) || 20, 1), 100);
        const pagina = Math.max(Number.parseInt(filtros.pagina, 10) || 1, 1);
        const offset = (pagina - 1) * limite;
        const { where, valores } = this._montarFiltros(filtros);

        // LIMIT/OFFSET interpolados: inteiros já saneados acima (mysql2.execute não aceita ? em LIMIT de forma estável).
        const sql = `
            SELECT a.id, a.dta_agendamento, a.ind_status, a.des_url_externa,
                   a.id_paciente, a.id_costureira,
                   p.nom_completo AS nom_paciente,
                   c.nom_completo AS nom_costureira,
                   c.val_cor_hex AS val_cor_costureira
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            WHERE ${where}
            ORDER BY a.dta_agendamento ASC
            LIMIT ${limite} OFFSET ${offset}
        `;
        return executar(sql, valores);
    }

    /**
     * Conta agendamentos com os mesmos filtros da listagem (paginação real).
     *
     * @method contar
     * @param {Object} [filtros]
     * @returns {Promise<number>}
     */
    async contar(filtros = {}) {
        const { where, valores } = this._montarFiltros(filtros);
        const resultado = await executar(`SELECT COUNT(*) AS total FROM tab_agendamento a WHERE ${where}`, valores);
        return Number(resultado[0].total);
    }

    /**
     * Verifica se a costureira possui agendamento ativo no horário exato.
     *
     * @method verificarConflito
     * @param {number} id_costureira
     * @param {string} dta_agendamento - 'YYYY-MM-DD HH:MM:SS'.
     * @param {number|null} [ignorarId] - ID do próprio agendamento (edição/troca).
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>} `true` se houver conflito.
     */
    async verificarConflito(id_costureira, dta_agendamento, ignorarId = null, connection = null) {
        let sql = `
            SELECT id FROM tab_agendamento
            WHERE id_costureira = ? AND dta_agendamento = ?
              AND ind_status != 'cancelado' AND deleted_at IS NULL
        `;
        const valores = [id_costureira, dta_agendamento];
        if (ignorarId) { sql += ' AND id != ?'; valores.push(ignorarId); }

        const resultado = await executar(sql, valores, connection);
        return resultado.length > 0;
    }

    /**
     * Atualiza o status com lock otimista: só grava se o status atual ainda for `statusAtual`.
     * Preenche a coluna de data da transição e `ind_paciente_compareceu` (concluido=1, falta=0).
     *
     * @method atualizarStatus
     * @param {number} id
     * @param {string} statusAtual - Status lido pelo Service (condição de concorrência).
     * @param {string} novoStatus
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>} `false` se outro processo alterou antes (ou não existe).
     */
    async atualizarStatus(id, statusAtual, novoStatus, connection = null) {
        const sets = ['ind_status = ?'];
        const valores = [novoStatus];

        const colunaData = COLUNA_DATA_STATUS[novoStatus];
        if (colunaData) sets.push(`${colunaData} = CURRENT_TIMESTAMP`);

        if (novoStatus in COMPARECEU_POR_STATUS) {
            sets.push('ind_paciente_compareceu = ?');
            valores.push(COMPARECEU_POR_STATUS[novoStatus]);
        }

        const sql = `
            UPDATE tab_agendamento SET ${sets.join(', ')}
            WHERE id = ? AND ind_status = ? AND deleted_at IS NULL
        `;
        const resultado = await executar(sql, [...valores, id, statusAtual], connection);
        return resultado.affectedRows > 0;
    }

    /**
     * Troca a costureira responsável.
     *
     * @method trocarCostureira
     * @param {number} id
     * @param {number} novoIdCostureira
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>}
     */
    async trocarCostureira(id, novoIdCostureira, connection = null) {
        const sql = 'UPDATE tab_agendamento SET id_costureira = ? WHERE id = ? AND deleted_at IS NULL';
        const resultado = await executar(sql, [novoIdCostureira, id], connection);
        return resultado.affectedRows > 0;
    }

    /**
     * Atualiza campos livres (whitelist CAMPOS_ATUALIZAVEIS).
     *
     * @method atualizar
     * @param {number} id
     * @param {Object} dados
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>}
     */
    async atualizar(id, dados, connection = null) {
        const { set, valores } = montarUpdate(dados, CAMPOS_ATUALIZAVEIS);
        const sql = `UPDATE tab_agendamento SET ${set} WHERE id = ? AND deleted_at IS NULL`;
        const resultado = await executar(sql, [...valores, id], connection);
        return resultado.affectedRows > 0;
    }

    /**
     * Soft delete de um agendamento.
     *
     * @method deletar
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deletar(id) {
        const sql = 'UPDATE tab_agendamento SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
        const resultado = await executar(sql, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Dados mínimos para notificação por e-mail.
     *
     * @method buscarDadosNotificacao
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async buscarDadosNotificacao(id) {
        const sql = `
            SELECT a.id, a.des_url_externa, a.dta_agendamento, a.ind_status,
                   p.nom_completo AS nom_paciente,
                   p.des_email_1 AS des_email_paciente,
                   c.nom_completo AS nom_costureira
            FROM tab_agendamento a
            INNER JOIN tab_pessoas p ON (a.id_paciente = p.id)
            INNER JOIN tab_pessoas c ON (a.id_costureira = c.id)
            WHERE a.id = ? AND a.deleted_at IS NULL
        `;
        const resultado = await executar(sql, [id]);
        return resultado[0] || null;
    }
}

module.exports = new AgendamentoModel();