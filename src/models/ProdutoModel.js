const database = require('../config/database');

class ProdutoModel {
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

  async atualizarStatusProduto(id, status) {
    const sql = `
      UPDATE tab_produto_agendamento 
      SET ind_status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [status, id]);
    return resultado.affectedRows > 0;
  }

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

  async listarFotosAjuste(id_produto_agendamento) {
    const sql = `
      SELECT * FROM tab_fotos_ajustes
      WHERE id_produto_agendamento = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    return await database.query(sql, [id_produto_agendamento]);
  }

  async deletarFoto(id) {
    const sql = `
      UPDATE tab_fotos_ajustes 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado.affectedRows > 0;
  }

  async buscarFotoPorId(id) {
    const sql = `
      SELECT * FROM tab_fotos_ajustes
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async criarCategoriaProduto(dados) {

    const sql = `INSERT INTO tab_categorias_produtos(nom_categoria, id_pai) VALUES(?,?)`;

    const valores = [
      dados.nom_categoria,
      dados.id_pai
    ];

    const resultado = await database.query(sql, valores);

    return resultado.insertId;
  }

  async buscarCategoriaPorId(id) {
    const sql = `
      SELECT id, nom_categoria, id_pai, created_at, updated_at, deleted_at
      FROM tab_categorias_produtos
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarCategorias() {
    const sql = `
      SELECT id, nom_categoria, id_pai, created_at, updated_at, deleted_at
      FROM tab_categorias_produtos
    `;

    return await database.query(sql);
  }

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


  async deletarCategoria(id) {
    const sql = `
      UPDATE tab_categorias_produtos 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }


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

  async buscarTamanhoPorId(id) {
    const sql = `
      SELECT id, cod_tamanho, des_tamanho, des_categoria_tamanho, num_ordem_exibicao, created_at, updated_at, deleted_at
      FROM tab_tamanhos
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarTamanhos() {
    const sql = `
      SELECT id, cod_tamanho, des_tamanho, des_categoria_tamanho, num_ordem_exibicao, created_at, updated_at, deleted_at
      FROM tab_tamanhos
    `;

    return await database.query(sql);
  }

  async atualizarTamanho(id, dados) {
    console.log()
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

  async deletarTamanho(id) {
    const sql = `
      UPDATE tab_tamanhos 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }





  async criarCorEstampaProduto(dados) {

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

  async buscarCorEstampaPorId(id) {
    const sql = `
      SELECT id, nom_cor_estampa, ind_tipo, val_codigo_hex, des_imagem_url, num_ordem_exibicao, created_at, updated_at, deleted_at
      FROM tab_variacoes_cor_estampa
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarCoresEstampas() {
    const sql = `
      SELECT id, nom_cor_estampa, ind_tipo, val_codigo_hex, des_imagem_url, num_ordem_exibicao, created_at, updated_at, deleted_at
      FROM tab_variacoes_cor_estampa
    `;

    return await database.query(sql);
  }

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

  async deletarCorEstampa(id) {
    const sql = `
      UPDATE tab_variacoes_cor_estampa 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }





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

  async buscarGradeProdutoPorId(id) {
    const sql = `
      SELECT id, id_produto, id_variacao_cor_estampa, id_tamanho, num_sku, val_preco_variacao, ind_ativo, num_codigo_barras, created_at, updated_at, deleted_at
      FROM tab_produto_grade
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarGradesProdutos() {
    const sql = `
      SELECT id, id_produto, id_variacao_cor_estampa, id_tamanho, num_sku, val_preco_variacao, ind_ativo, num_codigo_barras, created_at, updated_at, deleted_at
      FROM tab_produto_grade
    `;

    return await database.query(sql);
  }

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

  async deletarGradeProduto(id) {
    const sql = `
      UPDATE tab_produto_grade 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }





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

  async buscarProdutoPorId(id) {
    const sql = `
      SELECT id, id_categoria, nom_produto, num_sku, des_produto, ref_produto, val_preco_base, ind_ativo, created_at, updated_at, deleted_at
      FROM tab_produtos
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarProdutos() {
    const sql = `
      SELECT id, id_categoria, nom_produto, num_sku, des_produto, ref_produto, val_preco_base, ind_ativo, created_at, updated_at, deleted_at
      FROM tab_produtos
    `;

    return await database.query(sql);
  }

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

  async deletarProduto(id) {
    const sql = `
      UPDATE tab_produtos 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }





  async criarProduto(dados) {

    const sql = `INSERT INTO tab_produto_imagens(id_produto_grade, id_produto, des_url_imagem, num_ordem, ind_principal) VALUES(?,?,?,?,?)`;

    const valores = [
      dados.id_produto_grade,
      dados.id_produto,
      dados.des_url_imagem,
      dados.num_ordem,
      dados.ind_principal,
    ];

    const resultado = await database.query(sql, valores);

    return resultado.insertId;
  }

  async buscarImagemProdutoPorId(id) {
    const sql = `
      SELECT id, id_produto_grade, id_produto, des_url_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
      FROM tab_produto_imagens
      WHERE id= ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);
    return resultado[0] || null;
  }

  async listarImagemProdutos() {
    const sql = `
      SELECT id, id_produto_grade, id_produto, des_url_imagem, num_ordem, ind_principal, created_at, updated_at, deleted_at
      FROM tab_produto_imagens
    `;

    return await database.query(sql);
  }

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

  async deletarImagemProduto(id) {
    const sql = `
      UPDATE tab_produto_imagens 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

    const resultado = await database.query(sql, [id]);

    return resultado.affectedRows > 0;
  }
}



module.exports = new ProdutoModel();
