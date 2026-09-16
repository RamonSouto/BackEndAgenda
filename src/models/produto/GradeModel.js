// src/models/produto/GradeModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/GradeModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe GradeModel.
 * @class GradeModel
 */
class GradeModel {
    /**
       * Cria uma nova grade de produto.
       * 
       * @method criarGradeProduto
       * @param {Object} dados - Dados da grade.
       * @param {number} dados.id_produto - ID do produto.
       * @param {number} dados.id_variacao_cor_estampa - ID da cor/estampa.
       * @param {number} dados.id_tamanho - ID do tamanho.
       * @param {string} [dados.num_sku] - SKU.
       * @param {number} [dados.val_preco_variacao] - Preço.
       * @param {boolean} dados.ind_ativo - Ativo.
       * @param {string} [dados.num_codigo_barras] - Código de barras.
       * @returns {Promise<number>} ID inserido.
       */
    async criarGradeProduto(dados) {

        const sql = `INSERT INTO tab_produto_grade(id_produto, id_variacao_cor_estampa, id_tamanho, num_sku, val_preco_variacao, ind_ativo, num_codigo_barras) VALUES(?,?,?,?,?,?,?)`;

        const valores = [
            dados.id_produto,
            dados.id_variacao_cor_estampa,
            dados.id_tamanho,
            dados.num_sku,
            dados.val_preco_variacao,
            dados.ind_ativo,
            dados.num_codigo_barras
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca grade por ID.
     * 
     * @method buscarGradeProdutoPorId
     * @param {number} id - ID da grade.
     * @returns {Promise<Object|null>}
     */
    async buscarGradeProdutoPorId(id) {
        const sql = `
      SELECT id, id_produto, id_variacao_cor_estampa, id_tamanho, num_sku, val_preco_variacao, ind_ativo, num_codigo_barras, created_at, updated_at, deleted_at
      FROM tab_produto_grade
      WHERE id= ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todas as grades.
     * 
     * @method listarGradesProdutos
     * @returns {Promise<Array>}
     */
    async listarGradesProdutos() {
        const sql = `
      SELECT id, id_produto, id_variacao_cor_estampa, id_tamanho, num_sku, val_preco_variacao, ind_ativo, num_codigo_barras, created_at, updated_at, deleted_at
      FROM tab_produto_grade
    `;

        return await database.query(sql);
    }

    /**
     * Atualiza grade.
     * 
     * @method atualizarGradeProduto
     * @param {number} id - ID da grade.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarGradeProduto(id, dados) {

        const campos = [];
        const valores = [];
        Object.keys(dados).forEach(campo => {
            if (dados[campo] !== undefined && campo !== 'id') {
                campos.push(`${campo} = ?`);
                valores.push(dados[campo]);
            }
        });

        if (campos.length === 0) {
            throw new Error('Nenhum campo para atualizar')
        }

        valores.push(id);

        const sql = `
        UPDATE tab_produto_grade
        SET ${campos.join(', ')}
        WHERE id = ? AND deleted_at IS NULL
      `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta grade (soft delete).
     * 
     * @method deletarGradeProduto
     * @param {number} id - ID da grade.
     * @returns {Promise<boolean>}
     */
    async deletarGradeProduto(id) {
        const sql = `
      UPDATE tab_produto_grade 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new GradeModel();