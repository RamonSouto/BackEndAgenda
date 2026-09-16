// src/models/produto/CorEstampaModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/CorEstampaModel.js
 * @description Modelo de dados para Cor e Estampa.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe TamanhoModel.
 * @class TamanhoModel
 */
class CorEstampaModel {
    /**
       * Cria uma nova cor/estampa.
       * 
       * @method criarCorEstampaProduto
       * @param {Object} dados - Dados da cor/estampa.
       * @param {string} dados.nom_cor_estampa - Nome.
       * @param {string} dados.ind_tipo - 'cor' ou 'estampa'.
       * @param {string} [dados.val_codigo_hex] - Código hex (opcional).
       * @param {string} [dados.des_imagem_url] - URL da imagem.
       * @param {number} [dados.num_ordem_exibicao] - Ordem.
       * @returns {Promise<number>} ID inserido.
       */
    async criarCorEstampaProduto(dados) {

        console.log({ "criarCorEstampaProdutoMODEL": dados });
        const sql = `INSERT INTO tab_variacoes_cor_estampa(nom_cor_estampa, ind_tipo, val_codigo_hex, des_imagem_url, num_ordem_exibicao) VALUES(?,?,?,?,?)`;

        const valores = [
            dados.nom_cor_estampa,
            dados.ind_tipo,
            dados.val_codigo_hex,
            dados.des_imagem_url,
            dados.num_ordem_exibicao
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca cor/estampa por ID.
     * 
     * @method buscarCorEstampaPorId
     * @param {number} id - ID.
     * @returns {Promise<Object|null>}
     */
    async buscarCorEstampaPorId(id) {
        const sql = `
          SELECT id, nom_cor_estampa, ind_tipo, val_codigo_hex, des_imagem_url, num_ordem_exibicao, created_at, updated_at, deleted_at
          FROM tab_variacoes_cor_estampa
          WHERE id= ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todas as cores/estampas.
     * 
     * @method listarCoresEstampas
     * @returns {Promise<Array>}
     */
    async listarCoresEstampas() {
        const sql = `
          SELECT id, nom_cor_estampa, ind_tipo, val_codigo_hex, des_imagem_url, num_ordem_exibicao, created_at, updated_at, deleted_at
          FROM tab_variacoes_cor_estampa
        `;

        return await database.query(sql);
    }

    /**
     * Atualiza cor/estampa.
     * 
     * @method atualizarCorEstampa
     * @param {number} id - ID.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarCorEstampa(id, dados) {

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
            UPDATE tab_variacoes_cor_estampa
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta (soft delete) cor/estampa.
     * 
     * @method deletarCorEstampa
     * @param {number} id - ID.
     * @returns {Promise<boolean>}
     */
    async deletarCorEstampa(id) {
        const sql = `
          UPDATE tab_variacoes_cor_estampa 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new CorEstampaModel();