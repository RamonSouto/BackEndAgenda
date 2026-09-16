// src/models/produto/TipoServicoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/TipoServicoModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe TipoServicoModel.
 * @class TipoServicoModel
 */
class TipoServicoModel {
    /**
       * Cria um novo tipo de serviço.
       * 
       * @method criarTipoServico
       * @param {Object} dados - Dados do tipo.
       * @param {string} dados.des_tipo_ajuste - Descrição.
       * @param {boolean} dados.ind_ativo - Ativo.
       * @returns {Promise<number>} ID inserido.
       */
    async criarTipoServico(dados) {

        const sql = `INSERT INTO tab_tipo_servico(des_tipo_ajuste, ind_ativo) VALUES(?,?)`;

        const valores = [
            dados.des_tipo_ajuste,
            dados.ind_ativo,
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca tipo de serviço por ID.
     * 
     * @method buscarTipoServicoPorId
     * @param {number} id - ID do tipo.
     * @returns {Promise<Object|null>}
     */
    async buscarTipoServicoPorId(id) {
        const sql = `
          SELECT id, des_tipo_ajuste, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_tipo_servico
          WHERE id= ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todos os tipos de serviço.
     * 
     * @method listarTipoServico
     * @returns {Promise<Array>}
     */
    async listarTipoServico() {
        const sql = `
          SELECT id, des_tipo_ajuste, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_tipo_servico
        `;

        return await database.query(sql);
    }

    /**
     * Atualiza tipo de serviço.
     * 
     * @method atualizarTipoServico
     * @param {number} id - ID do tipo.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarTipoServico(id, dados) {

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
            UPDATE tab_tipo_servico
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta tipo de serviço (soft delete).
     * 
     * @method deletarTipoServico
     * @param {number} id - ID do tipo.
     * @returns {Promise<boolean>}
     */
    async deletarTipoServico(id) {
        const sql = `
          UPDATE tab_tipo_servico 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new TipoServicoModel();