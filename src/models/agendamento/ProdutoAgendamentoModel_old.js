// src/models/agendamento/produtoAgendadoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/produtoAgendadoModel.js
 * @description Model de acesso a dados da tabela tab_produto_agendamento.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

class ProdutoAgendadoModel {
    /**
     * Busca o preço vigente de um serviço de produto na data informada.
     * Regra: maior dta_inicio <= data de referência.
     * 
     * @async
     * @param {import('mysql2/promise').PoolConnection} conn
     * @param {number} idProdutoServico
     * @param {string} [dataReferencia] - YYYY-MM-DD (default: hoje)
     * @returns {Promise<number|null>} Preço vigente ou null se não configurado.
     */
    static async buscarPrecoVigente(conn, idProdutoServico, dataReferencia = null) {
        const [rows] = await conn.execute(
            `SELECT val_preco FROM tab_preco_produto_servico
             WHERE id_produto_servico = ?
               AND dta_inicio <= ?
               AND deleted_at IS NULL
             ORDER BY dta_inicio DESC
             LIMIT 1`,
            [idProdutoServico, dataReferencia || new Date().toISOString().slice(0, 10)]
        );
        return rows[0]?.val_preco ?? null;
    }

    /**
     * Insere um item de produto/serviço agendado.
     * @async
     * @param {import('mysql2/promise').PoolConnection} conn
     * @param {Object} dados
     * @returns {Promise<number>} ID inserido.
     */
    static async inserir(conn, dados) {
        const {
            id_agendamento, id_tipo_agendamento, id_produto_grade,
            id_produto_servico, des_ajuste_produto, val_preco_servico,
            val_desconto_servico = 0
        } = dados;

        const [result] = await conn.execute(
            `INSERT INTO tab_produto_agendamento
                (id_agendamento, id_tipo_agendamento, id_produto_grade, id_produto_servico,
                 des_ajuste_produto, val_preco_servico, val_desconto_servico, ind_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')`,
            [
                id_agendamento, id_tipo_agendamento, id_produto_grade, id_produto_servico,
                des_ajuste_produto ?? null, val_preco_servico, val_desconto_servico
            ]
        );
        return result.insertId;
    }

    /**
     * Lista os itens de um agendamento.
     * @async
     * @param {number} idAgendamento
     * @returns {Promise<Array>}
     */
    static async listarPorAgendamento(idAgendamento) {
        return database.query(
            `SELECT pa.*, pg.num_sku, ta.des_tipo_agendamento
             FROM tab_produto_agendamento pa
             INNER JOIN tab_produto_grade pg ON pg.id = pa.id_produto_grade
             INNER JOIN tab_tipo_agendamento ta ON ta.id = pa.id_tipo_agendamento
             WHERE pa.id_agendamento = ? AND pa.deleted_at IS NULL
             ORDER BY pa.id ASC`,
            [idAgendamento]
        );
    }

    /**
     * Busca um item por ID.
     * @async
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async buscarPorId(id) {
        const rows = await database.query(
            `SELECT * FROM tab_produto_agendamento WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Atualiza um item de agendamento (dados editáveis apenas).
     * @async
     * @param {number} id
     * @param {Object} dados
     * @returns {Promise<void>}
     */
    static async atualizar(id, { des_ajuste_produto, val_desconto_servico, ind_status }) {
        await database.query(
            `UPDATE tab_produto_agendamento
             SET des_ajuste_produto = COALESCE(?, des_ajuste_produto),
                 val_desconto_servico = COALESCE(?, val_desconto_servico),
                 ind_status = COALESCE(?, ind_status)
             WHERE id = ? AND deleted_at IS NULL`,
            [des_ajuste_produto ?? null, val_desconto_servico ?? null, ind_status ?? null, id]
        );
    }

    /**
     * Soft delete de um item de agendamento.
     * @async
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async remover(id) {
        const result = await database.query(
            `UPDATE tab_produto_agendamento SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = ProdutoAgendadoModel;
