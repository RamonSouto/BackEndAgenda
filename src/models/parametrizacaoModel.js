const database = require('../config/database');

class ParametrizacaoModel {

    async criar(dados) {
        const sql = `
        INSERT INTO tab_parametrizacao (
            des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo
        ) VALUES (?, ?, ?, ?, ?)
        `;
        const valores = [
            dados.des_tipo_dia,
            dados.hra_inicio,
            dados.hra_fim,
            dados.qtd_minutos_intervalo,
            dados.ind_ativo
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    async listar() {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.ind_ativo = 1
        `;

        const resultado = await database.query(sql);
        return resultado || null;
    }

    async buscarParametrizacaoPorId(id) {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.id = ? AND p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    async buscarParametrizacaoPorTipoAtivo(tipo) {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.des_tipo_dia = ?
          AND   p.ind_ativo = TRUE
          AND   p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [tipo]);
        return resultado[0] || null;
    }

    async contarAtivosPorTipo(tipo, idExcluir = null) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM tab_parametrizacao
            WHERE des_tipo_dia = ?
              AND ind_ativo = TRUE
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado[0]?.total || 0;
    }

    async contarDesativadoPorTipo(tipo, idExcluir = null) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM tab_parametrizacao
            WHERE des_tipo_dia = ?
              AND ind_ativo = FALSE
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado[0]?.total || 0;
    }

    async buscarTipoDesativadoMaisRecente(tipo, id) {
        let sql = `SELECT id
            FROM tab_parametrizacao tp 
            WHERE tp.des_tipo_dia  = ?
            AND   tp.ind_ativo = 0
            AND   tp.deleted_at IS NULL
            AND   tp.created_at = (SELECT MAX(tp2.created_at )
                                FROM tab_parametrizacao tp2
                                WHERE tp2.des_tipo_dia  = ?
                                AND   tp2.ind_ativo = 0
                                AND   tp2.deleted_at IS NULL
                                AND   tp2.id != ?)
        ;`

        const resultado = await database.query(sql, [tipo, tipo, id]);
        return resultado[0].id;
    }

    async desativarPorTipo(tipo, idExcluir = null) {
        let sql = `
            UPDATE tab_parametrizacao 
            SET ind_ativo = FALSE 
            WHERE des_tipo_dia = ? 
              AND ind_ativo = TRUE 
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado.affectedRows > 0;
    }

    async desativarParametrizacao(id) {
        const sql = `
          UPDATE tab_parametrizacao
          SET ind_ativo = FALSE
          WHERE id = ?
          AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async ativarParametrizacao(id) {
        const sql = `
          UPDATE tab_parametrizacao
          SET ind_ativo = TRUE
          WHERE id = ?
          AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async atualizar(id, dados) {
        const campos = [];
        const valores = [];

        Object.keys(dados).forEach(campo => {
            if (dados[campo] !== undefined && campo !== 'id') {
                campos.push(`${campo} = ?`);
                valores.push(dados[campo]);
            }
        });

        if (campos.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }

        valores.push(id);

        const sql = `
            UPDATE tab_parametrizacao 
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    async deletar(id) {
        const sql = `
            UPDATE tab_parametrizacao 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }

}

module.exports = new ParametrizacaoModel();