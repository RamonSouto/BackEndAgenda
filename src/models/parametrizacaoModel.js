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
        `;

        const resultado = await database.query(sql);
        return resultado[0] || null;
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