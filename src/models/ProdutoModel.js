// src/models/ProdutosModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file ProdutoModel.js
 * @description Modelo de dados para produtos, categorias, tamanhos, cores/estampas,
 * grades, imagens, tipos de serviço, associações produto-serviço e preços.
 * 
 * @requires ../config/database
 */
const database = require('../config/database');

/**
 * Classe ProdutoModel.
 * @class ProdutoModel
 */
class ProdutoModel {
  // ==============================
  // PRODUTOS EM AGENDAMENTO
  // ==============================

  /**
   * Adiciona um produto a um agendamento.
   * 
   * @method adicionarProdutoAgendamento
   * @param {Object} dados - Dados do produto no agendamento.
   * @param {number} dados.id_agendamento - ID do agendamento.
   * @param {number} dados.id_produto_grade - ID da grade do produto.
   * @param {string} [dados.des_ajuste_produto] - Descrição do ajuste (opcional).
   * @param {string} [dados.ind_status='pendente'] - Status inicial.
   * @returns {Promise<number>} ID do registro inserido.
   */
  async adicionarProdutoAgendamento(dados) {
    const sql = `
      INSERT INTO tab_produto_agendamento (
        id_agendamento, id_produto_grade, des_ajuste_produto, ind_status
      ) VALUES (?, ?, ?, ?)
    `;

    const valores = [
      dados.id_agendamento,
      dados.id_produto_grade,
      dados.des_ajuste_produto || null,
      dados.ind_status || 'pendente'
    ];

    const resultado = await database.query(sql, valores);
    return resultado.insertId;
  }

  /**
   * Lista os produtos de um agendamento.
   * 
   * @method listarProdutosAgendamento
   * @param {number} id_agendamento - ID do agendamento.
   * @returns {Promise<Array>} Lista de produtos com detalhes (nome, SKU, tamanho, cor).
   */
  async listarProdutosAgendamento(id_agendamento) {
    const sql = `
      SELECT 
        pa.*,
        p.nom_produto,
        p.ref_produto,
        pg.num_sku,
        t.cod_tamanho,
        vce.nom_cor_estampa
      FROM tab_produto_agendamento pa
      INNER JOIN tab_produto_grade pg ON pa.id_produto_grade = pg.id
      INNER JOIN tab_produtos p ON pg.id_produto = p.id
      LEFT JOIN tab_tamanhos t ON pg.id_tamanho = t.id
      LEFT JOIN tab_variacoes_cor_estampa vce ON pg.id_variacao_cor_estampa = vce.id
      WHERE pa.id_agendamento = ? AND pa.deleted_at IS NULL
    `;

    return await database.query(sql, [id_agendamento]);
  }

  /**
   * Atualiza o status de um produto de agendamento.
   * 
   * @method atualizarStatusProduto
   * @param {number} id - ID do produto de agendamento.
   * @param {string} status - Novo status.
   * @returns {Promise<boolean>} `true` se atualizado, `false` caso contrário.
   */
  async atualizarStatusProduto(id, status) {
    const sql = `
      UPDATE tab_produto_agendamento 
      SET ind_status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [status, id]);
    return resultado.affectedRows > 0;
  }



  // ==============================
  // FOTOS DE AJUSTE
  // ==============================

  /**
   * Adiciona uma foto de ajuste.
   * 
   * @method adicionarFotoAjuste
   * @param {Object} dados - Dados da foto.
   * @param {number} dados.id_produto_agendamento - ID do produto de agendamento.
   * @param {string} dados.des_caminho_arquivo - Caminho do arquivo.
   * @param {string} dados.nom_original - Nome original.
   * @param {number} dados.num_tamanho_bytes - Tamanho em bytes.
   * @returns {Promise<number>} ID da foto inserida.
   */
  async adicionarFotoAjuste(dados) {
    const sql = `
      INSERT INTO tab_fotos_ajustes (
        id_produto_agendamento, des_caminho_arquivo, 
        nom_original, num_tamanho_bytes
      ) VALUES (?, ?, ?, ?)
    `;

    const valores = [
      dados.id_produto_agendamento,
      dados.des_caminho_arquivo,
      dados.nom_original,
      dados.num_tamanho_bytes
    ];

    const resultado = await database.query(sql, valores);
    return resultado.insertId;
  }

  /**
   * Lista fotos de ajuste de um produto de agendamento.
   * 
   * @method listarFotosAjuste
   * @param {number} id_produto_agendamento - ID do produto de agendamento.
   * @returns {Promise<Array>} Lista de fotos (ordem decrescente de criação).
   */
  async listarFotosAjuste(id_produto_agendamento) {
    const sql = `
      SELECT * FROM tab_fotos_ajustes
      WHERE id_produto_agendamento = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    return await database.query(sql, [id_produto_agendamento]);
  }

  /**
   * Deleta (soft delete) uma foto de ajuste.
   * 
   * @method deletarFoto
   * @param {number} id - ID da foto.
   * @returns {Promise<boolean>} `true` se deletado.
   */
  async deletarFoto(id) {
    const sql = `
      UPDATE tab_fotos_ajustes 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado.affectedRows > 0;
  }

  /**
   * Busca uma foto por ID.
   * 
   * @method buscarFotoPorId
   * @param {number} id - ID da foto.
   * @returns {Promise<Object|null>} Dados da foto ou `null`.
   */
  async buscarFotoPorId(id) {
    const sql = `
      SELECT * FROM tab_fotos_ajustes
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }



  // ==============================
  // CATEGORIAS
  // ==============================





  // ==============================
  // TAMANHOS
  // ==============================





  // ==============================
  // CORES E ESTAMPAS
  // ==============================





  // ==============================
  // GRADES DE PRODUTOS
  // ==============================





  // ==============================
  // PRODUTOS
  // ==============================

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



  // ==============================
  // IMAGENS DE PRODUTOS
  // ==============================





  // ==============================
  // TIPOS DE SERVIÇO
  // ==============================





  // ==============================
  // PRODUTO-SERVIÇO
  // ==============================





  // ==============================
  // PREÇOS DE PRODUTO-SERVIÇO
  // ==============================


}



module.exports = new ProdutoModel();
