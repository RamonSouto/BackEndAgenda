//src/models/PessoaModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/PessoaModel.js
 * @description Modelo de dados para pessoas.
 * Gerencia operações CRUD, busca por papéis, listagem com filtros,
 * controle de tentativas de login e bloqueio, além de consultas auxiliares
 * a cidades e estados.
 * 
 * @requires ../config/database
 * @requires ../utils/constants
 */
const database = require('../config/database');
const { COLUNAS_PAPEIS_PESSOA } = require('../utils/constants');

/**
 * Classe PessoaModel.
 * @class PessoaModel
 */
class PessoaModel {

    /**
     * Cria uma nova pessoa.
     * 
     * @method criar
     * @memberof PessoaModel
     * @async
     * @param {Object} dados - Dados da pessoa (todos os campos da tabela).
     * @param {number} dados.id_cidade - ID da cidade.
     * @param {string} [dados.ind_status='ativo'] - Status (ativo/inativo).
     * @param {boolean} dados.ind_medico - Indica se é médico.
     * @param {boolean} dados.ind_secretaria - Indica se é secretária.
     * @param {boolean} dados.ind_costureira - Indica se é costureira.
     * @param {boolean} dados.ind_paciente - Indica se é paciente.
     * @param {boolean} dados.ind_administrador - Indica se é administrador.
     * @param {string} dados.nom_completo - Nome completo.
     * @param {string} dados.num_cpf - CPF (apenas números).
     * @param {string} dados.num_rg - RG.
     * @param {string} dados.dta_nascimento - Data de nascimento.
     * @param {string} dados.des_logradouro - Logradouro.
     * @param {string} dados.num_endereco - Número do endereço.
     * @param {string} [dados.des_complemento] - Complemento.
     * @param {string} dados.num_cep - CEP (apenas números).
     * @param {string} dados.nom_bairro - Bairro.
     * @param {string} dados.num_celular_1 - Celular principal.
     * @param {boolean} [dados.ind_whatsapp_1=true] - WhatsApp do celular 1.
     * @param {string} [dados.num_celular_2] - Celular secundário.
     * @param {boolean} [dados.ind_whatsapp_2=true] - WhatsApp do celular 2.
     * @param {string} dados.des_email_1 - E-mail principal.
     * @param {string} [dados.des_email_2] - E-mail secundário.
     * @param {string} [dados.des_senha] - Senha (hash).
     * @param {string} [dados.val_cor_hex] - Cor hexadecimal.
     * @returns {Promise<number>} ID da pessoa inserida.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const id = await pessoaModel.criar({
     *   id_cidade: 1,
     *   nom_completo: 'João Silva',
     *   num_cpf: '11144477735',
     *   num_rg: '12345678',
     *   dta_nascimento: '1990-01-01',
     *   des_logradouro: 'Rua A',
     *   num_endereco: '100',
     *   num_cep: '12345678',
     *   nom_bairro: 'Centro',
     *   num_celular_1: '11988887777',
     *   des_email_1: 'joao@email.com',
     *   ind_paciente: true
     * });
     */
    async criar(dados) {
        const sql = `
            INSERT INTO tab_pessoas (
                id_cidade, ind_status, ind_medico, ind_secretaria, ind_costureira,
                ind_paciente, ind_administrador, nom_completo, num_cpf, num_rg,
                dta_nascimento, des_logradouro, num_endereco, des_complemento, num_cep,
                nom_bairro, num_celular_1, ind_whatsapp_1, num_celular_2, ind_whatsapp_2,
                des_email_1, des_email_2, des_senha,val_cor_hex
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
        `;

        const valores = [
            dados.id_cidade,
            dados.ind_status || 'ativo',
            dados.ind_medico ?? false,
            dados.ind_secretaria ?? false,
            dados.ind_costureira ?? false,
            dados.ind_paciente ?? false,
            dados.ind_administrador ?? false,
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
            dados.des_senha || null,
            dados.val_cor_hex || null
        ];

        const resultado = await database.query(sql, valores);
        return resultado.insertId;
    }

    /**
     * Busca uma pessoa por ID (incluindo dados da cidade/estado).
     * 
     * @method buscarPorId
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<Object|null>} Dados da pessoa com cidade/estado, ou `null` se não encontrada ou deletada.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const pessoa = await pessoaModel.buscarPorId(1);
     */
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

    /**
     * Busca uma pessoa por CPF (incluindo dados da cidade/estado).
     * 
     * @method buscarPorCPF
     * @memberof PessoaModel
     * @async
     * @param {string} cpf - CPF (apenas números).
     * @returns {Promise<Object|null>} Dados da pessoa, ou `null` se não encontrada ou deletada.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const pessoa = await pessoaModel.buscarPorCPF('11144477735');
     */
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

    /**
     * Busca pessoas por papel (coluna específica = 1).
     * 
     * @method buscarPorPapel
     * @memberof PessoaModel
     * @async
     * @param {string} papel - Nome do papel (ex: 'paciente', 'costureira').
     * @returns {Promise<Array<Object>>} Lista de pessoas com o papel.
     * @throws {Error} Se o papel for inválido (não mapeado em COLUNAS_PAPEIS_PESSOA).
     * 
     * @example
     * const pacientes = await pessoaModel.buscarPorPapel('paciente');
     */
    async buscarPorPapel(papel) {
        const coluna = COLUNAS_PAPEIS_PESSOA[papel];

        if (!coluna) {
            throw new Error('Papel inválido');
        }

        const sql = `
            SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
            FROM tab_pessoas p
            LEFT JOIN tab_cidade c ON c.id = p.id_cidade
            LEFT JOIN tab_estado e ON e.id = c.id_estado
            WHERE p.${coluna} = 1 AND p.deleted_at IS NULL
            ORDER BY p.nom_completo
        `;

        return await database.query(sql);
    }

    /**
     * Lista pessoas com filtros opcionais (papel, status, busca textual).
     * 
     * @method listar
     * @memberof PessoaModel
     * @async
     * @param {Object} [filtros={}] - Filtros.
     * @param {string} [filtros.papel] - Filtrar por papel.
     * @param {string} [filtros.ind_status] - Filtrar por status ('ativo'/'inativo').
     * @param {string} [filtros.busca] - Buscar por nome ou CPF (LIKE).
     * @returns {Promise<Array<Object>>} Lista de pessoas (com cidade/estado).
     * @throws {Error} Se o papel for inválido ou a query falhar.
     * 
     * @example
     * const pessoas = await pessoaModel.listar({ papel: 'paciente', ind_status: 'ativo' });
     */
    async listar(filtros = {}) {
        let sql = `
            SELECT p.*, c.nom_cidade, e.nom_estado, e.sgl_estado
            FROM tab_pessoas p
            LEFT JOIN tab_cidade c ON c.id = p.id_cidade
            LEFT JOIN tab_estado e ON e.id = c.id_estado
            WHERE p.deleted_at IS NULL
        `;

        const valores = [];

        if (filtros.papel) {
            const coluna = COLUNAS_PAPEIS_PESSOA[filtros.papel];

            if (!coluna) {
                throw new Error('Papel inválido');
            }

            sql += ` AND p.${coluna} = 1`;
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

    /**
     * Atualiza campos específicos de uma pessoa.
     * 
     * @method atualizar
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @param {Object} dados - Objeto com campos a serem atualizados.
     * @returns {Promise<boolean>} `true` se a atualização foi bem-sucedida.
     * @throws {Error} Se nenhum campo for fornecido ou a query falhar.
     * 
     * @description
     * - Monta dinamicamente a cláusula SET.
     * - Ignora o campo `id` se presente.
     * - Só atualiza registros com `deleted_at IS NULL`.
     * 
     * @example
     * await pessoaModel.atualizar(1, { ind_status: 'inativo' });
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
            UPDATE tab_pessoas
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
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<boolean>} `true` se a exclusão lógica foi bem-sucedida.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await pessoaModel.deletar(1);
     */
    async deletar(id) {
        const sql = `
            UPDATE tab_pessoas
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Incrementa o contador de tentativas de login.
     * 
     * @method incrementarTentativasLogin
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<void>}
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await pessoaModel.incrementarTentativasLogin(1);
     */
    async incrementarTentativasLogin(id) {
        const sql = `
            UPDATE tab_pessoas
            SET num_tentativas_login = num_tentativas_login + 1
            WHERE id = ?
        `;

        await database.query(sql, [id]);
    }

    /**
     * Bloqueia o login (define `dta_bloqueio_login` com timestamp atual).
     * 
     * @method bloquearLogin
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<void>}
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await pessoaModel.bloquearLogin(1);
     */
    async bloquearLogin(id) {
        const sql = `
            UPDATE tab_pessoas
            SET dta_bloqueio_login = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await database.query(sql, [id]);
    }

    /**
     * Reseta as tentativas de login, remove bloqueio e atualiza `dta_ultimo_login`.
     * 
     * @method resetarTentativasLogin
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<void>}
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await pessoaModel.resetarTentativasLogin(1);
     */
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

    /**
     * Verifica o bloqueio e o número de tentativas de login.
     * 
     * @method verificarBloqueio
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da pessoa.
     * @returns {Promise<Object|null>} Objeto com `num_tentativas_login` e `dta_bloqueio_login`, ou `null`.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const bloqueio = await pessoaModel.verificarBloqueio(1);
     */
    async verificarBloqueio(id) {
        const sql = `
            SELECT num_tentativas_login, dta_bloqueio_login
            FROM tab_pessoas
            WHERE id = ?
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }








}

module.exports = new PessoaModel();
