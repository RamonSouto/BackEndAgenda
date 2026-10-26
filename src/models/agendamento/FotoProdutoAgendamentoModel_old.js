// src/models/agendamento/fotoProdutoAgendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/fotoProdutoAgendamentoModel.js
 * @description Model de acesso a dados da tabela tab_agendamento_item_fotos.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

class FotoProdutoAgendamentoModel {
    /**
     * Insere metadados de uma foto de ajuste.
     * @async
     * @param {Object} dados
     * @returns {Promise<Object>}
     */
    static async inserir({
        id_produto_agendamento, des_caminho_arquivo, nom_original,
        num_tamanho_bytes, ind_tipo_foto
    }) {
        const result = await database.query(
            `INSERT INTO tab_agendamento_item_fotos
                (id_produto_agendamento, des_caminho_arquivo, nom_original, num_tamanho_bytes, ind_tipo_foto)
             VALUES (?, ?, ?, ?, ?)`,
            [id_produto_agendamento, des_caminho_arquivo, nom_original, num_tamanho_bytes, ind_tipo_foto ?? null]
        );
        return this.buscarPorId(result.insertId);
    }

    /**
     * Busca uma foto por ID.
     * @async
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async buscarPorId(id) {
        const rows = await database.query(
            `SELECT * FROM tab_agendamento_item_fotos WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Lista fotos de um item de agendamento.
     * @async
     * @param {number} idProdutoAgendamento
     * @returns {Promise<Array>}
     */
    static async listarPorItem(idProdutoAgendamento) {
        return database.query(
            `SELECT * FROM tab_agendamento_item_fotos
             WHERE id_produto_agendamento = ? AND deleted_at IS NULL
             ORDER BY created_at ASC`,
            [idProdutoAgendamento]
        );
    }

    /**
     * Soft delete de uma foto.
     * @async
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async remover(id) {
        const result = await database.query(
            `UPDATE tab_agendamento_item_fotos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = FotoProdutoAgendamentoModel;
