// src/models/EmpresaModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/EmpresaModel.js
 * @description Modelo de dados para empresas.
 * Gerencia operações CRUD, ativação/desativação e soft delete na tabela `tab_empresa`.
 * 
 * @requires ../config/database
 */
const database = require('../../config/database');
/**
 * Classe EmpresaModel.
 * @class EmpresaModel
 */
class EmpresaModel {

    /**
     * Cria uma nova empresa.
     * 
     * @method criar
     * @memberof EmpresaModel
     * @async
     * @param {Object} dados - Dados da empresa (todos os campos da tabela).
     * @param {number} dados.id_cidade - ID da cidade (obrigatório).
     * @param {string} dados.nom_fantasia - Nome fantasia (obrigatório).
     * @param {string} dados.nom_razao_social - Razão social (obrigatório).
     * @param {string} dados.num_cnpj - CNPJ (14 dígitos, obrigatório).
     * @param {string} dados.num_inscricao_estadual - Inscrição estadual (opcional).
     * @param {string} dados.dta_abertura - Data de abertura (obrigatória).
     * @param {string} dados.des_logradouro - Logradouro (obrigatório).
     * @param {string} dados.num_endereco - Número do endereço (opcional).
     * @param {string} dados.des_complemento - Complemento (opcional).
     * @param {string} dados.num_cep - CEP (8 dígitos, obrigatório).
     * @param {string} dados.nom_bairro - Bairro (obrigatório).
     * @param {string} dados.num_celular_1 - Celular principal (obrigatório).
     * @param {boolean} dados.ind_whatsapp_1 - WhatsApp do celular 1 (padrão: true).
     * @param {string} dados.num_celular_2 - Celular secundário (opcional).
     * @param {boolean} dados.ind_whatsapp_2 - WhatsApp do celular 2 (padrão: true).
     * @param {string} dados.des_email_1 - E-mail principal (obrigatório).
     * @param {string} dados.des_email_2 - E-mail secundário (opcional).
     * @param {string} dados.val_cor_principal - Cor principal (hex, padrão: 'FFFFFF').
     * @param {boolean} dados.ind_ativo - Indicador de ativo.
     * @param {string} dados.des_url_logo_vertical - URL da logo vertical (opcional).
     * @param {string} dados.des_url_logo_horizontal - URL da logo horizontal (opcional).
     * @param {string} dados.des_url_logo_vertical_negativa - URL da logo vertical negativa (opcional).
     * @param {string} dados.des_url_logo_horizontal_negativa - URL da logo horizontal negativa (opcional).
     * @returns {Promise<number>} ID da empresa inserida.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const id = await empresaModel.criar({
     *   id_cidade: 1,
     *   nom_fantasia: 'Minha Empresa',
     *   nom_razao_social: 'Empresa Ltda',
     *   num_cnpj: '11444777000161',
     *   dta_abertura: '2025-01-01',
     *   des_logradouro: 'Rua A',
     *   num_endereco: '100',
     *   num_cep: '12345678',
     *   nom_bairro: 'Centro',
     *   num_celular_1: '11988887777',
     *   des_email_1: 'contato@empresa.com',
     *   ind_ativo: true
     * });
     */
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

    /**
     * Lista todas as empresas (incluindo deletadas).
     * 
     * @method listar
     * @memberof EmpresaModel
     * @async
     * @returns {Promise<Array<Object>>} Lista de todas as empresas.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * ⚠️ **Atenção:** Esta consulta não filtra registros com `deleted_at IS NOT NULL`,
     * retornando também empresas deletadas.
     * 
     * @example
     * const empresas = await empresaModel.listar();
     */
    async listar() {
        const sql = `
          SELECT id, id_cidade, ind_ativo, nom_fantasia, nom_razao_social, num_cnpj, num_inscricao_estadual, dta_abertura, des_logradouro, num_endereco, des_complemento, num_cep, nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2, des_email_1, des_email_2, val_cor_principal, des_url_logo_vertical, des_url_logo_horizontal, des_url_logo_vertical_negativa, des_url_logo_horizontal_negativa, created_at, updated_at, deleted_at
          FROM tab_empresa p
        `;

        const resultado = await database.query(sql);
        return resultado || null;
    }

    /**
     * Busca uma empresa por ID (excluindo registros deletados).
     * 
     * @method buscarEmpresaPorId
     * @memberof EmpresaModel
     * @async
     * @param {number} id - ID da empresa.
     * @returns {Promise<Object|null>} Dados da empresa ou `null` se não encontrada ou deletada.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const empresa = await empresaModel.buscarEmpresaPorId(1);
     */
    async buscarEmpresaPorId(id) {
        const sql = `
          SELECT id, id_cidade, ind_ativo, nom_fantasia, nom_razao_social, num_cnpj, num_inscricao_estadual, dta_abertura, des_logradouro, num_endereco, des_complemento, num_cep, nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2, des_email_1, des_email_2, val_cor_principal, des_url_logo_vertical, des_url_logo_horizontal, des_url_logo_vertical_negativa, des_url_logo_horizontal_negativa, created_at, updated_at, deleted_at
          FROM tab_empresa p
          WHERE p.id = ? AND p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Conta quantas empresas ativas existem, excluindo um ID específico.
     * 
     * @method contarEmpresasAtivas
     * @memberof EmpresaModel
     * @async
     * @param {number} id - ID da empresa a ser excluída da contagem.
     * @returns {Promise<number>} Número de empresas ativas (excluindo a informada).
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * Útil para verificar se uma empresa é a única ativa, antes de desativá-la ou deletá-la.
     * 
     * @example
     * const total = await empresaModel.contarEmpresasAtivas(1);
     */
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

    /**
    * Desativa uma empresa (define `ind_ativo = FALSE`).
    * 
    * @method desativarEmpresa
    * @memberof EmpresaModel
    * @async
    * @param {number} id - ID da empresa.
    * @returns {Promise<boolean>} `true` se a empresa foi desativada, `false` caso contrário.
    * @throws {Error} Se a query falhar.
    * 
    * @example
    * const sucesso = await empresaModel.desativarEmpresa(1);
    */
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

    /**
     * Ativa uma empresa (define `ind_ativo = TRUE`).
     * 
     * @method ativarEmpresa
     * @memberof EmpresaModel
     * @async
     * @param {number} id - ID da empresa.
     * @returns {Promise<boolean>} `true` se a empresa foi ativada, `false` caso contrário.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const sucesso = await empresaModel.ativarEmpresa(1);
     */
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

    /**
     * Atualiza campos específicos de uma empresa (sem atualizar `id`).
     * 
     * @method atualizar
     * @memberof EmpresaModel
     * @async
     * @param {number} id - ID da empresa.
     * @param {Object} dados - Objeto com os campos a serem atualizados.
     * @returns {Promise<boolean>} `true` se a atualização foi bem-sucedida.
     * @throws {Error} Se nenhum campo for fornecido ou se a query falhar.
     * 
     * @description
     * - Monta dinamicamente a cláusula SET com base nas chaves do objeto `dados`.
     * - Ignora o campo `id` se presente.
     * - Só atualiza registros com `deleted_at IS NULL`.
     * 
     * @example
     * const sucesso = await empresaModel.atualizar(1, { nom_fantasia: 'Novo Nome' });
     */
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

    /**
     * Realiza soft delete (marca `deleted_at` com timestamp atual).
     * 
     * @method deletar
     * @memberof EmpresaModel
     * @async
     * @param {number} id - ID da empresa.
     * @returns {Promise<boolean>} `true` se a empresa foi deletada logicamente.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * - Define `deleted_at = CURRENT_TIMESTAMP`.
     * - Não remove fisicamente o registro.
     * 
     * @example
     * const sucesso = await empresaModel.deletar(1);
     */
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