// src/models/produto/ImagemModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/produto/ImagemModel.js
 * @description Modelo de dados para categorias.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe ImagemModel.
 * @class ImagemModel
 */
class ImagemModel {

    /**
     * Cria uma imagem de produto.
     * 
     * @method criarImagemProduto
     * @param {Object} dados - Dados da imagem.
     * @param {number} [dados.id_produto_grade] - ID da grade (opcional).
     * @param {number} [dados.id_produto] - ID do produto (opcional).
     * @param {string} [dados.des_titulo_imagem] - Título.
     * @param {string} [dados.des_imagem] - Descrição.
     * @param {string} dados.des_url_imagem - URL da imagem.
     * @param {number} [dados.num_ordem] - Ordem.
     * @param {boolean} dados.ind_principal - Indica principal.
     * @returns {Promise<number>} ID inserido.
     */
    async criarImagemProduto(dados) {

        const sql = `INSERT INTO tab_produto_imagens(id_produto_grade, id_produto, des_titulo_imagem, des_imagem, des_url_imagem, num_ordem, ind_principal) VALUES(?,?,?,?,?,?,?)`;

        const valores = [
            dados.id_produto_grade,
            dados.id_produto,
            dados.des_titulo_imagem,
            dados.des_imagem,
            dados.des_url_imagem,
            dados.num_ordem,
            dados.ind_principal
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Lista todas as imagens.
     * 
     * @method listarImagemProdutos
     * @returns {Promise<Array>}
     */
    async listarImagemProdutos() {
        const sql = `
          SELECT id, id_produto_grade, id_produto, des_url_imagem, des_titulo_imagem, des_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
          FROM tab_produto_imagens
        `;

        return await database.query(sql);
    }

    /**
     * Busca imagem por ID.
     * 
     * @method buscarImagemProdutoId
     * @param {number} id - ID da imagem.
     * @returns {Promise<Array|null>} Array com uma imagem (ou vazio).
     */
    async buscarImagemProdutoId(id) {
        const sql = `
          SELECT id, id_produto_grade, id_produto, des_url_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
          FROM tab_produto_imagens
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado || null;
    }

    /**
     * Busca imagens associadas a um produto (por id_produto).
     * 
     * @method buscarImagemProdutoPorId
     * @param {number} id_produto - ID do produto.
     * @returns {Promise<Array|null>}
     */
    async buscarImagemProdutoPorId(id_produto) {
        const sql = `
          SELECT id, id_produto_grade, id_produto, des_url_imagem, des_titulo_imagem, des_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
          FROM tab_produto_imagens
          WHERE id_produto = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id_produto]);
        return resultado || null;
    }

    /**
     * Busca imagens associadas a uma grade (por id_produto_grade).
     * 
     * @method buscarImagemProdutoGradeID
     * @param {number} id_produto_grade - ID da grade.
     * @returns {Promise<Array|null>}
     */
    async buscarImagemProdutoGradeID(id_produto_grade) {
        const sql = `
          SELECT id, id_produto_grade, id_produto, des_url_imagem, des_titulo_imagem, des_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
          FROM tab_produto_imagens
          WHERE id_produto_grade = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id_produto_grade]);
        return resultado || null;
    }

    /**
     * Atualiza imagem.
     * 
     * @method atualizarImagemProduto
     * @param {number} id - ID da imagem.
     * @param {Object} dados - Campos.
     * @returns {Promise<boolean>}
     */
    async atualizarImagemProduto(id, dados) {

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
            UPDATE tab_produto_imagens
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `;

        const resultado = await database.query(sql, valores);

        return resultado.affectedRows > 0;
    }

    /**
     * Deleta imagem (soft delete).
     * 
     * @method deletarImagemProduto
     * @param {number} id - ID da imagem.
     * @returns {Promise<boolean>}
     */
    async deletarImagemProduto(id) {
        const sql = `
          UPDATE tab_produto_imagens 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }

    /**
     * Desmarca todas as imagens principais de um produto.
     * 
     * @method desmarcarImagemPrincipalPorProduto
     * @param {number} id_produto - ID do produto.
     * @returns {Promise<boolean>}
     */
    async desmarcarImagemPrincipalPorProduto(id_produto) {
        const sql = `
          UPDATE tab_produto_imagens 
          SET ind_principal = false
          WHERE id_produto = ? AND ind_principal = true AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id_produto]);

        return resultado.affectedRows > 0;
    }

    /**
     * Desmarca todas as imagens principais de uma grade.
     * 
     * @method desmarcarImagemPrincipalPorGrade
     * @param {number} id_produto_grade - ID da grade.
     * @returns {Promise<boolean>}
     */
    async desmarcarImagemPrincipalPorGrade(id_produto_grade) {
        const sql = `
          UPDATE tab_produto_imagens
          SET ind_principal = false
          WHERE id_produto_grade = ? AND ind_principal = true AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id_produto_grade]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new ImagemModel();