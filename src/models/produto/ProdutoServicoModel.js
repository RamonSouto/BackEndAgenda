// src/models/produto/ProdutoServicoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/ProdutoServicoModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe ProdutoServicoModel.
 * @class ProdutoServicoModel
 */
class ProdutoServicoModel {

    /**
       * Cria associação produto-serviço.
       * 
       * @method criarProdutoTipoServico
       * @param {Object} dados - Dados da associação.
       * @param {number} dados.id_produto - ID do produto.
       * @param {number} dados.id_tipo_servico - ID do tipo de serviço.
       * @param {boolean} dados.ind_ativo - Ativo.
       * @returns {Promise<number>} ID inserido.
       */
    async criarProdutoTipoServico(dados) {

        const sql = `INSERT INTO tab_produto_servico(id_produto, id_tipo_servico, ind_ativo) VALUES(?,?,?)`;

        const valores = [
            dados.id_produto,
            dados.id_tipo_servico,
            dados.ind_ativo
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca associação por ID.
     * 
     * @method buscarProdutoServicoPorId
     * @param {number} id - ID da associação.
     * @returns {Promise<Object|null>}
     */
    async buscarProdutoServicoPorId(id) {
        const sql = `
          SELECT id, id_produto, id_tipo_servico, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_produto_servico
          WHERE id= ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Busca Serviço por ID da Grade do Produto ID do Servico.
     * 
     * @method buscarProdutoGradeIdServicoPorId
     * @param {number} id - ID da associação.
     * @returns {Promise<Object|null>}
     */
    async buscarServicoPorIdEIdGrade(idServico, idGrade) {
        const sql = `
          SELECT tps.id as id_produto_servico,
                 tts.des_tipo_ajuste as des_tipo_ajuste_servico,
                 tpps.val_preco
          FROM tab_produto_servico tps
          LEFT JOIN tab_tipo_servico tts ON (tps.id_tipo_servico = tts.id)
          LEFT JOIN tab_preco_produto_servico tpps ON (tps.id = tpps.id_produto_servico)
          LEFT JOIN tab_produtos tp ON (tps.id_produto  = tp.id)
          LEFT JOIN tab_produto_grade tpg ON (tp.id = tpg.id_produto)
          WHERE tps.id = ?
          AND   tpg.id = ?
          AND   tps.ind_ativo = 1
          AND   tps.deleted_at is null
          AND   tts.ind_ativo = 1
          AND   tts.deleted_at is null
          AND   tpps.deleted_at is null
          AND   tpps.dta_inicio = (SELECT MAX(tpps2.dta_inicio)
                                  FROM tab_preco_produto_servico tpps2
                                  WHERE tpps2.id_produto_servico = tps.id
                                  AND tpps2.deleted_at is null)
        `;

        const resultado = await database.query(sql, [idServico, idGrade]);
        return resultado[0] || null;
    }

    /**
     * Lista todas as associações.
     * 
     * @method listarProdutoServico
     * @returns {Promise<Array>}
     */
    async listarProdutoServico() {
        const sql = `
          SELECT id, id_produto, id_tipo_servico, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_produto_servico
        `;

        return await database.query(sql);
    }

    /**
     * Atualiza associação.
     * 
     * @method atualizarProdutoServico
     * @param {number} id - ID da associação.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarProdutoServico(id, dados) {

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
            UPDATE tab_produto_servico
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta associação (soft delete).
     * 
     * @method deletarProdutoServico
     * @param {number} id - ID da associação.
     * @returns {Promise<boolean>}
     */
    async deletarProdutoServico(id) {
        const sql = `
          UPDATE tab_produto_servico 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new ProdutoServicoModel();