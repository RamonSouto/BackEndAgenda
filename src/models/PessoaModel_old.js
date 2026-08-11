const database = require('../config/database');

class PessoaModel {
    async criar(dados) {

        const sql = `
      INSERT INTO tab_pessoas (
        id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
        dta_nascimento, des_logradouro, num_endereco, des_complemento, num_cep,
        nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2,
        des_email_1, des_email_2, des_senha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const valores = [
            dados.id_cidade,
            dados.ind_status || 'ativo',
            dados.ind_tipo_pessoa,
            dados.nom_completo,
            dados.num_cpf,
            dados.num_rg,
            dados.dta_nascimento,
            dados.des_logradouro,
            dados.num_endereco,
            dados.des_complemento || null,
            dados.num_cep,
            dados.nom_bairro,
            dados.num_celular_1,
            dados.ind_whatsapp_1 ?? true,
            dados.num_celular_2 || null,
            dados.ind_whatsapp_2 ?? true,
            dados.des_email_1,
            dados.des_email_2 || null,
            dados.des_senha || null
        ];

        const resultado = await database.query(sql, valores);



        return resultado.insertId;
    }

    async buscarPorId(id) {
        const sql = `
      SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
      FROM tab_pessoas p
      LEFT JOIN tab_cidade c ON c.id = p.id_cidade
      LEFT JOIN tab_estado e ON e.id = c.id_estado
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    async buscarPorCPF(cpf) {
        const sql = `
      SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
      FROM tab_pessoas p
      LEFT JOIN tab_cidade c ON c.id = p.id_cidade
      LEFT JOIN tab_estado e ON e.id = c.id_estado
      WHERE p.num_cpf = ? AND p.deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [cpf]);
        return resultado[0] || null;
    }

    async buscarPorTipo(tipo) {
        const sql = `
      SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
      FROM tab_pessoas p
      LEFT JOIN tab_cidade c ON c.id = p.id_cidade
      LEFT JOIN tab_estado e ON e.id = c.id_estado
      WHERE p.ind_tipo_pessoa = ? AND p.deleted_at IS NULL
      ORDER BY p.nom_completo
    `;

        return await database.query(sql, [tipo]);
    }

    async listar(filtros = {}) {
        let sql = `
      SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
      FROM tab_pessoas p
      LEFT JOIN tab_cidade c ON c.id = p.id_cidade
      LEFT JOIN tab_estado e ON e.id = c.id_estado
      WHERE p.deleted_at IS NULL
    `;

        const valores = [];

        if (filtros.ind_tipo_pessoa) {
            sql += ' AND p.ind_tipo_pessoa = ?';
            valores.push(filtros.ind_tipo_pessoa);
        }

        if (filtros.ind_status) {
            sql += ' AND p.ind_status = ?';
            valores.push(filtros.ind_status);
        }

        if (filtros.busca) {
            sql += ' AND (p.nom_completo LIKE ? OR p.num_cpf LIKE ?)';
            valores.push(`%${filtros.busca}%`, `%${filtros.busca}%`);
        }

        sql += ' ORDER BY p.nom_completo';

        return await database.query(sql, valores);
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
            UPDATE tab_pessoas 
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    async deletar(id) {
        const sql = `
      UPDATE tab_pessoas 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async incrementarTentativasLogin(id) {
        const sql = `
      UPDATE tab_pessoas 
      SET num_tentativas_login = num_tentativas_login + 1
      WHERE id = ?
    `;

        await database.query(sql, [id]);
    }

    async bloquearLogin(id) {
        const sql = `
      UPDATE tab_pessoas 
      SET dta_bloqueio_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        await database.query(sql, [id]);
    }

    async resetarTentativasLogin(id) {
        const sql = `
      UPDATE tab_pessoas 
      SET num_tentativas_login = 0, 
          dta_bloqueio_login = NULL,
          dta_ultimo_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        await database.query(sql, [id]);
    }

    async verificarBloqueio(id) {
        const sql = `
      SELECT num_tentativas_login, dta_bloqueio_login
      FROM tab_pessoas
      WHERE id = ?
    `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    async listarCidades() {
        const sql = `
        SELECT *
        FROM tab_cidade
        `;
        const resultado = await database.query(sql);
        return resultado || null;
    }

    async buscarCidadeId(id) {
        const sql = `
        SELECT *
        FROM tab_cidade
        WHERE id = ?
        `;
        const resultado = await database.query(sql, [id]);

        return resultado || null;
    }

    async buscarCidadeNome(nome) {
        const sql = `
        SELECT *
        FROM tab_cidade
        WHERE nom_cidade like ?
        `;
        const resultado = await database.query(sql, [`%${nome}%`]);

        return resultado || null;
    }

    async buscarCidadeEstadoId(id) {
        const sql = `
        SELECT c.*
        FROM tab_cidade c
        INNER JOIN tab_estado e ON (c.id_estado = e.id)
        WHERE e.id = ?
        `;
        const resultado = await database.query(sql, [id]);

        return resultado || null;
    }

    async listarEstados() {
        const sql = `
        SELECT *
        FROM tab_estado
        `;
        const resultado = await database.query(sql);

        return resultado || null;
    }

    async buscarEstadoId(id) {
        const sql = `
        SELECT *
        FROM tab_estado
        WHERE id = ?
        `;

        const resultado = await database.query(sql, [id]);

        return resultado || null;
    }

    async buscarEstadoNome(nome) {
        const sql = `
        SELECT *
        FROM tab_estado
        WHERE nom_estado like ?
        `;

        const resultado = await database.query(sql, [`%${nome}%`]);

        return resultado || null;
    }

    async buscarEstadoSgl(sgl) {
        const sql = `
        SELECT *
        FROM tab_estado
        WHERE sgl_estado like ?
        `;

        const resultado = await database.query(sql, [`%${sgl}%`]);

        return resultado || null;
    }

}

module.exports = new PessoaModel();
