// src/models/ProdutosModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file ProdutoModel.js
 * @description Modelo de dados para produtos, categorias, tamanhos, cores/estampas,
 * grades, imagens, tipos de serviço, associações produto-serviço e preços.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Classe ProdutoModel.
 * @class ProdutoModel
 */
class ProdutoModel {

  /**
   * Cria um novo produto.
   * 
   * @method criarProduto
   * @param {Object} dados - Dados do produto.
   * @param {number} dados.id_categoria - ID da categoria.
   * @param {string} dados.nom_produto - Nome.
   * @param {string} [dados.num_sku] - SKU.
   * @param {string} [dados.des_produto] - Descrição.
   * @param {string} [dados.ref_produto] - Referência.
   * @param {number} [dados.val_preco_base] - Preço base.
   * @param {boolean} dados.ind_ativo - Ativo.
   * @returns {Promise<number>} ID inserido.
   */
  async criarProduto(dados) {

    const sql = `INSERT INTO tab_produtos(id_categoria, nom_produto, num_sku, des_produto, ref_produto, val_preco_base, ind_ativo) VALUES(?,?,?,?,?,?,?)`;

    const valores = [
      dados.id_categoria,
      dados.nom_produto,
      dados.num_sku,
      dados.des_produto,
      dados.ref_produto,
      dados.val_preco_base,
      dados.ind_ativo
    ];

    const resultado = await database.query(sql, valores);

    return resultado.insertId;
  }

  /**
   * Busca produto por ID.
   * 
   * @method buscarProdutoPorId
   * @param {number} id - ID do produto.
   * @returns {Promise<Object|null>}
   */
  async buscarProdutoPorId(id) {
    const sql = `
      SELECT id, id_categoria, nom_produto, num_sku, des_produto, ref_produto, val_preco_base, ind_ativo, created_at, updated_at, deleted_at
      FROM tab_produtos
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  /**
   * Lista todos os produtos.
   * 
   * @method listarProdutos
   * @returns {Promise<Array>}
   */
  async listarProdutos() {
    const sql = `
      SELECT id, id_categoria, nom_produto, num_sku, des_produto, ref_produto, val_preco_base, ind_ativo, created_at, updated_at, deleted_at
      FROM tab_produtos
    `;

    return await database.query(sql);
  }

  /**
   * Atualiza produto.
   * 
   * @method atualizarProduto
   * @param {number} id - ID do produto.
   * @param {Object} dados - Campos.
   * @returns {Promise<boolean>}
   */
  async atualizarProduto(id, dados) {

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
        UPDATE tab_produtos
        SET ${campos.join(', ')}
        WHERE id = ? AND deleted_at IS NULL
      `;

    const resultado = await database.query(sql, valores);

    return resultado.affectedRows > 0;
  }

  /**
   * Deleta produto (soft delete).
   * 
   * @method deletarProduto
   * @param {number} id - ID do produto.
   * @returns {Promise<boolean>}
   */
  async deletarProduto(id) {
    const sql = `
      UPDATE tab_produtos 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }
}



module.exports = new ProdutoModel();
