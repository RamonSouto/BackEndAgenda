// src/models/produto/TamanhoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/TamanhoModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe TamanhoModel.
 * @class TamanhoModel
 */
class TamanhoModel {
    /**
       * Cria um novo tamanho.
       * 
       * @method criarTamanhoProduto
       * @param {Object} dados - Dados do tamanho.
       * @param {string} dados.cod_tamanho - Código (ex: 'M').
       * @param {string} dados.des_tamanho - Descrição (ex: 'Médio').
       * @param {string} dados.des_categoria_tamanho - Categoria (vestuario, calcados, etc.).
       * @param {number} [dados.num_ordem_exibicao] - Ordem de exibição.
       * @returns {Promise<number>} ID do tamanho inserido.
       */
    async criarTamanhoProduto(dados) {

        const sql = `INSERT INTO tab_tamanhos(cod_tamanho, des_tamanho, des_categoria_tamanho, num_ordem_exibicao) VALUES(?,?,?,?)`;

        const valores = [
            dados.cod_tamanho,
            dados.des_tamanho,
            dados.des_categoria_tamanho,
            dados.num_ordem_exibicao
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca um tamanho por ID.
     * 
     * @method buscarTamanhoPorId
     * @param {number} id - ID do tamanho.
     * @returns {Promise<Object|null>} Dados do tamanho.
     */
    async buscarTamanhoPorId(id) {
        const sql = `
          SELECT id, cod_tamanho, des_tamanho, des_categoria_tamanho, num_ordem_exibicao, created_at, updated_at, deleted_at
          FROM tab_tamanhos
          WHERE id= ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todos os tamanhos.
     * 
     * @method listarTamanhos
     * @returns {Promise<Array>}
     */
    async listarTamanhos() {
        const sql = `
          SELECT id, cod_tamanho, des_tamanho, des_categoria_tamanho, num_ordem_exibicao, created_at, updated_at, deleted_at
          FROM tab_tamanhos
        `;

        return await database.query(sql);
    }

    /**
     * Atualiza um tamanho.
     * 
     * @method atualizarTamanho
     * @param {number} id - ID do tamanho.
     * @param {Object} dados - Campos a atualizar.
     * @returns {Promise<boolean>}
     * @throws {Error} Se nenhum campo fornecido.
     */
    async atualizarTamanho(id, dados) {
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
            UPDATE tab_tamanhos
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta (soft delete) um tamanho.
     * 
     * @method deletarTamanho
     * @param {number} id - ID do tamanho.
     * @returns {Promise<boolean>}
     */
    async deletarTamanho(id) {
        const sql = `
          UPDATE tab_tamanhos 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new TamanhoModel();