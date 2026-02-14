const database = require('../config/database');

class LogModel {
    async criar(dados) {
        const sql = `
      INSERT INTO tab_logs (
        id_usuario, des_acao, des_tabela, num_registro_id,
        des_detalhes, num_ip_address, des_user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        const valores = [
            dados.id_usuario || null,
            dados.des_acao,
            dados.des_tabela,
            dados.num_registro_id || null,
            JSON.stringify(dados.des_detalhes || {}),
            dados.num_ip_address || null,
            dados.des_user_agent || null
        ];

        const resultado = await database.query(sql, valores);
        return resultado.insertId;
    }

    async listar(filtros = {}) {
        let sql = `
      SELECT 
        l.*,
        p.nom_completo as usuario_nome,
        p.ind_tipo_pessoa as usuario_tipo
      FROM tab_logs l
      LEFT JOIN tab_pessoas p ON l.id_usuario = p.id
      WHERE 1=1
    `;

        const valores = [];

        if (filtros.id_usuario) {
            sql += ' AND l.id_usuario = ?';
            valores.push(filtros.id_usuario);
        }

        if (filtros.des_acao) {
            sql += ' AND l.des_acao = ?';
            valores.push(filtros.des_acao);
        }

        if (filtros.des_tabela) {
            sql += ' AND l.des_tabela = ?';
            valores.push(filtros.des_tabela);
        }

        if (filtros.data_inicio && filtros.data_fim) {
            sql += ' AND l.created_at BETWEEN ? AND ?';
            valores.push(filtros.data_inicio, filtros.data_fim);
        }

        sql += ' ORDER BY l.created_at DESC';

        if (filtros.limite) {
            sql += ' LIMIT ?';
            valores.push(parseInt(filtros.limite));
        }

        return await database.query(sql, valores);
    }

    async buscarPorUsuario(id_usuario, limite = 50) {
        const sql = `
      SELECT * FROM tab_logs
      WHERE id_usuario = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

        return await database.query(sql, [id_usuario, limite]);
    }

    async buscarPorTabela(tabela, registro_id = null) {
        let sql = `
      SELECT 
        l.*,
        p.nom_completo as usuario_nome
      FROM tab_logs l
      LEFT JOIN tab_pessoas p ON l.id_usuario = p.id
      WHERE l.des_tabela = ?
    `;

        const valores = [tabela];

        if (registro_id) {
            sql += ' AND l.num_registro_id = ?';
            valores.push(registro_id);
        }

        sql += ' ORDER BY l.created_at DESC';

        return await database.query(sql, valores);
    }

    async estatisticasAcoes(data_inicio, data_fim) {
        const sql = `
      SELECT 
        des_acao,
        COUNT(*) as total,
        COUNT(DISTINCT id_usuario) as usuarios_unicos
      FROM tab_logs
      WHERE created_at BETWEEN ? AND ?
      GROUP BY des_acao
      ORDER BY total DESC
    `;

        return await database.query(sql, [data_inicio, data_fim]);
    }

    async estatisticasUsuarios(data_inicio, data_fim) {
        const sql = `
      SELECT 
        p.id,
        p.nom_completo,
        p.ind_tipo_pessoa,
        COUNT(l.id) as total_acoes
      FROM tab_pessoas p
      INNER JOIN tab_logs l ON p.id = l.id_usuario
      WHERE l.created_at BETWEEN ? AND ?
      GROUP BY p.id, p.nom_completo, p.ind_tipo_pessoa
      ORDER BY total_acoes DESC
    `;

        return await database.query(sql, [data_inicio, data_fim]);
    }
}

module.exports = new LogModel();
