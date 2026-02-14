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
}

module.exports = new ProdutoModel();
