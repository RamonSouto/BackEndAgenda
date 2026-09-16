// src/models/produto/CategoriaModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/CategoriaModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe CategoriaModel.
 * @class CategoriaModel
 */
class CategoriaModel {
    /**
       * Cria uma nova categoria de produto.
       * 
       * @method criarCategoriaProduto
       * @param {Object} dados - Dados da categoria.
       * @param {string} dados.nom_categoria - Nome da categoria.
       * @param {number} [dados.id_pai] - ID da categoria pai (opcional).
       * @returns {Promise<number>} ID da categoria inserida.
       */
    async criarCategoriaProduto(dados) {

        const sql = `INSERT INTO tab_categorias_produtos(nom_categoria, id_pai) VALUES(?,?)`;

        const valores = [
            dados.nom_categoria,
            dados.id_pai
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca uma categoria por ID (excluindo deletadas).
     * 
     * @method buscarCategoriaPorId
     * @param {number} id - ID da categoria.
     * @returns {Promise<Object|null>} Dados da categoria ou `null`.
     */
    async buscarCategoriaPorId(id) {
        const sql = `
          SELECT id, nom_categoria, id_pai, created_at, updated_at, deleted_at
          FROM tab_categorias_produtos
          WHERE id= ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Lista todas as categorias (incluindo deletadas?).
     * 
     * @method listarCategorias
     * @returns {Promise<Array>} Lista de categorias.
     */
    async listarCategorias() {
        const sql = `
          SELECT id, nom_categoria, id_pai, created_at, updated_at, deleted_at
          FROM tab_categorias_produtos
        `;

        return await database.query(sql);
    }

    /**
     * Atualiza uma categoria.
     * 
     * @method atualizarCategoria
     * @param {number} id - ID da categoria.
     * @param {Object} dados - Campos a atualizar.
     * @returns {Promise<boolean>} `true` se atualizado.
     * @throws {Error} Se nenhum campo for fornecido.
     */
    async atualizarCategoria(id, dados) {
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
          UPDATE tab_categorias_produtos
          SET ${campos.join(', ')}
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Busca subcategorias (filhas) de uma categoria.
     * 
     * @method buscarCategoriaFilho
     * @param {number} id - ID da categoria pai.
     * @returns {Promise<Array>} Lista de subcategorias.
     */
    async buscarCategoriaFilho(id) {
        const sql = `
          SELECT *
          FROM tab_categorias_produtos
          WHERE id_pai = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado;
    }

    /**
     * Deleta (soft delete) uma categoria.
     * 
     * @method deletarCategoria
     * @param {number} id - ID da categoria.
     * @returns {Promise<boolean>} `true` se deletado.
     */
    async deletarCategoria(id) {
        const sql = `
          UPDATE tab_categorias_produtos 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new CategoriaModel();