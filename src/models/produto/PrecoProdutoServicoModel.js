// src/models/produto/PrecoProdutoServicoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/PrecoProdutoServicoModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 * @requires ../../utils/sqlUtils
 */
const database = require('../../config/database');
const { montarUpdate } = require('../../utils/sqlUtils');
const CAMPOS_ATUALIZAVEIS = ['val_preco', 'dta_inicio'];

/**
 * Classe PrecoProdutoServicoModel.
 * @class PrecoProdutoServicoModel
 */
class PrecoProdutoServicoModel {
    /**
     * Cria um preço para uma associação produto-serviço.
     * 
     * @method criarPrecoProdutoServico
     * @param {Object} dados - Dados do preço.
     * @param {number} dados.id_produto_servico - ID da associação.
     * @param {number} dados.val_preco - Valor.
     * @param {string} dados.dta_inicio - Data de início.
     * @returns {Promise<number>} ID inserido.
     */
    async criarPrecoProdutoServico(dados) {

        const sql = `INSERT INTO tab_preco_produto_servico(id_produto_servico, val_preco, dta_inicio) VALUES(?,?,?)`;

        const valores = [
            dados.id_produto_servico,
            dados.val_preco,
            dados.dta_inicio
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca preço por ID.
     * 
     * @method buscarPrecoProdutoServicoPorId
     * @param {number} id - ID do preço.
     * @returns {Promise<Object|null>}
     */
    async buscarPrecoProdutoServicoPorId(id) {
        const sql = `
      SELECT id, id_produto_servico, val_preco, dta_inicio, created_at, updated_at, deleted_at
      FROM tab_preco_produto_servico
      WHERE id= ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todos os preços.
     * 
     * @method listarPrecoProdutoServico
     * @returns {Promise<Array>}
     */
    async listarPrecoProdutoServico() {
        const sql = `
      SELECT id, id_produto_servico, val_preco, dta_inicio, created_at, updated_at, deleted_at
      FROM tab_preco_produto_servico
      WHERE deleted_at IS NULL
      ORDER BY id_produto_servico, dta_inicio DESC
    `;

        return await database.query(sql);
    }

    /**
     * Atualiza preço.
     * 
     * @method atualizarPrecoProdutoServico
     * @param {number} id - ID do preço.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarPrecoProdutoServico(id, dados) {

        const { set, valores } = montarUpdate(dados, CAMPOS_ATUALIZAVEIS);

        const sql = `UPDATE tab_preco_produto_servico SET ${set} WHERE id = ? AND deleted_at IS NULL`;

        const resultado = await database.query(sql, [...valores, id]);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta preço (soft delete).
     * 
     * @method deletarPrecoProdutoServico
     * @param {number} id - ID do preço.
     * @returns {Promise<boolean>}
     */
    async deletarPrecoProdutoServico(id) {
        const sql = `
      UPDATE tab_preco_produto_servico 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }

}

module.exports = new PrecoProdutoServicoModel();