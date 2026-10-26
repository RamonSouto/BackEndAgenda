// src/models/agendamento/FotoProdutoAgendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/FotoProdutoAgendamentoModel.js
 * @description Modelo de dados das fotos de ajuste dos itens agendados
 * (tab_agendamento_item_fotos). Camada pura de persistência.
 * Todos os métodos aceitam `connection` opcional para participar de transações.
 *
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Executa a query na conexão de transação (se houver) ou no pool.
 *
 * @private
 * @param {string} sql
 * @param {Array} params
 * @param {Object|null} connection
 * @returns {Promise<Array|Object>}
 */
const exec = async (sql, params, connection = null) => {
    if (connection) {
        const [rows] = await connection.execute(sql, params);
        return rows;
    }
    return database.query(sql, params);
};

class FotoProdutoAgendamentoModel {

    /**
     * Busca o contexto de um item (agendamento pai, costureira e status)
     * para regras de acesso e de status.
     *
     * @method buscarContextoItem
     * @param {number} idItem - ID do item agendado.
     * @param {Object|null} [connection] - Conexão de transação.
     * @param {boolean} [bloquear=false] - Aplica `FOR UPDATE` (serializa uploads concorrentes no mesmo item).
     * @returns {Promise<Object|null>} { id_item, id_agendamento, ind_status_item, ind_status_agendamento, id_costureira }
     */
    async buscarContextoItem(idItem, connection = null, bloquear = false) {
        const sql = `
            SELECT ai.id AS id_item,
                   ai.id_agendamento,
                   ai.ind_status AS ind_status_item,
                   a.ind_status AS ind_status_agendamento,
                   a.id_costureira
            FROM tab_agendamento_item ai
            INNER JOIN tab_agendamento a ON (a.id = ai.id_agendamento)
            WHERE ai.id = ?
              AND ai.deleted_at IS NULL
              AND a.deleted_at IS NULL
            ${bloquear ? 'FOR UPDATE' : ''}
        `;
        const resultado = await exec(sql, [idItem], connection);
        return resultado[0] || null;
    }

    /**
     * Conta as fotos ativas de um item.
     *
     * @method contarPorItem
     * @param {number} idItem
     * @param {Object|null} [connection]
     * @returns {Promise<number>} Total de fotos ativas.
     */
    async contarPorItem(idItem, connection = null) {
        const sql = `
            SELECT COUNT(*) AS total
            FROM tab_agendamento_item_fotos
            WHERE id_produto_agendamento = ? AND deleted_at IS NULL
        `;
        const resultado = await exec(sql, [idItem], connection);
        return Number(resultado[0].total);
    }

    /**
     * Cria o registro de uma foto.
     *
     * @method criar
     * @param {Object} dados
     * @param {number} dados.id_produto_agendamento - ID do item agendado.
     * @param {string} dados.des_caminho_arquivo - Caminho relativo ao diretório de uploads.
     * @param {string} dados.nom_original - Nome original sanitizado.
     * @param {number} dados.num_tamanho_bytes - Tamanho em bytes.
     * @param {string} dados.ind_tipo_foto - 'antes' | 'depois'.
     * @param {Object|null} [connection]
     * @returns {Promise<number>} ID inserido.
     */
    async criar(dados, connection = null) {
        const sql = `
            INSERT INTO tab_agendamento_item_fotos
                (id_produto_agendamento, des_caminho_arquivo, nom_original, num_tamanho_bytes, ind_tipo_foto)
            VALUES (?, ?, ?, ?, ?)
        `;
        const resultado = await exec(sql, [
            dados.id_produto_agendamento,
            dados.des_caminho_arquivo,
            dados.nom_original,
            dados.num_tamanho_bytes,
            dados.ind_tipo_foto
        ], connection);
        return resultado.insertId;
    }

    /**
     * Lista as fotos ativas de um item.
     *
     * @method listarPorItem
     * @param {number} idItem
     * @returns {Promise<Array<Object>>}
     */
    async listarPorItem(idItem) {
        const sql = `
            SELECT id, id_produto_agendamento, ind_tipo_foto, nom_original,
                   num_tamanho_bytes, created_at
            FROM tab_agendamento_item_fotos
            WHERE id_produto_agendamento = ? AND deleted_at IS NULL
            ORDER BY ind_tipo_foto ASC, created_at ASC
        `;
        return exec(sql, [idItem]);
    }

    /**
     * Busca uma foto ativa por ID, com o contexto do item e do agendamento.
     *
     * @method buscarPorId
     * @param {number} id
     * @param {Object|null} [connection]
     * @param {boolean} [bloquear=false] - Aplica `FOR UPDATE`.
     * @returns {Promise<Object|null>}
     */
    async buscarPorId(id, connection = null, bloquear = false) {
        const sql = `
            SELECT f.*,
                   ai.id_agendamento,
                   ai.ind_status AS ind_status_item,
                   a.ind_status AS ind_status_agendamento,
                   a.id_costureira
            FROM tab_agendamento_item_fotos f
            INNER JOIN tab_agendamento_item ai ON (ai.id = f.id_produto_agendamento)
            INNER JOIN tab_agendamento a ON (a.id = ai.id_agendamento)
            WHERE f.id = ? AND f.deleted_at IS NULL
            ${bloquear ? 'FOR UPDATE' : ''}
        `;
        const resultado = await exec(sql, [id], connection);
        return resultado[0] || null;
    }

    /**
     * Soft delete da foto, atualizando o caminho para a pasta de deletados.
     *
     * @method deletar
     * @param {number} id
     * @param {string|null} novoCaminho - Novo caminho relativo (null mantém o atual).
     * @param {Object|null} [connection]
     * @returns {Promise<boolean>}
     */
    async deletar(id, novoCaminho, connection = null) {
        const sql = `
            UPDATE tab_agendamento_item_fotos
            SET deleted_at = CURRENT_TIMESTAMP,
                des_caminho_arquivo = COALESCE(?, des_caminho_arquivo)
            WHERE id = ? AND deleted_at IS NULL
        `;
        const resultado = await exec(sql, [novoCaminho, id], connection);
        return resultado.affectedRows > 0;
    }
}

module.exports = new FotoProdutoAgendamentoModel();
