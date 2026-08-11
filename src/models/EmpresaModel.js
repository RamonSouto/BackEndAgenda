const database = require('../config/database');

class EmpresaModel {

    async criar(dados) {
        const sql = `
        INSERT INTO tab_empresa (
            id_cidade, nom_fantasia, nom_razao_social, num_cnpj, num_inscricao_estadual,
            dta_abertura, des_logradouro, num_endereco, des_complemento, num_cep,
            nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2,
            des_email_1, des_email_2, val_cor_principal, ind_ativo, des_url_logo_vertical,
            des_url_logo_horizontal, des_url_logo_vertical_negativa, des_url_logo_horizontal_negativa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const valores = [
            dados.id_cidade,
            dados.nom_fantasia,
            dados.nom_razao_social,
            dados.num_cnpj,
            dados.num_inscricao_estadual,
            dados.dta_abertura,
            dados.des_logradouro,
            dados.num_endereco ?? null,
            dados.des_complemento ?? null,
            dados.num_cep,
            dados.nom_bairro,
            dados.num_celular_1,
            dados.ind_whatsapp_1 ?? true,
            dados.num_celular_2 ?? null,
            dados.ind_whatsapp_2 ?? true,
            dados.des_email_1,
            dados.des_email_2 ?? null,
            dados.val_cor_principal ?? 'FFFFFF',
            dados.ind_ativo,
            dados.des_url_logo_vertical ?? null,
            dados.des_url_logo_horizontal ?? null,
            dados.des_url_logo_vertical_negativa ?? null,
            dados.des_url_logo_horizontal_negativa ?? null
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    async listar() {
        const sql = `
          SELECT id, id_cidade, ind_ativo, nom_fantasia, nom_razao_social, num_cnpj, num_inscricao_estadual, dta_abertura, des_logradouro, num_endereco, des_complemento, num_cep, nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2, des_email_1, des_email_2, val_cor_principal, des_url_logo_vertical, des_url_logo_horizontal, des_url_logo_vertical_negativa, des_url_logo_horizontal_negativa, created_at, updated_ad, deleted_at
          FROM tab_empresa p
        `;

        const resultado = await database.query(sql);
        return resultado || null;
    }

    async buscarEmpresaPorId(id) {
        const sql = `
          SELECT id, id_cidade, ind_ativo, nom_fantasia, nom_razao_social, num_cnpj, num_inscricao_estadual, dta_abertura, des_logradouro, num_endereco, des_complemento, num_cep, nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2, des_email_1, des_email_2, val_cor_principal, des_url_logo_vertical, des_url_logo_horizontal, des_url_logo_vertical_negativa, des_url_logo_horizontal_negativa, created_at, updated_ad, deleted_at
          FROM tab_empresa p
          WHERE p.id = ? AND p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }


    async contarEmpresasAtivas(id) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM tab_empresa
            WHERE id != ?
            AND ind_ativo = TRUE
            AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado[0]?.total || 0;
    }

    async desativarEmpresa(id) {
        const sql = `
          UPDATE tab_empresa
          SET ind_ativo = FALSE
          WHERE id = ?
          AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async ativarEmpresa(id) {
        const sql = `
          UPDATE tab_empresa
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
            UPDATE tab_empresa 
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    async deletar(id) {
        const sql = `
            UPDATE tab_empresa 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }

}

module.exports = new EmpresaModel();