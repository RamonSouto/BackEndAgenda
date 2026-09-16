//src/models/sistema/CidadeModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/sistema/CidadeModel.js
 * @description Modelo de dados para cidade.
 * 
 * @requires ../../config/database
 * @requires ../../utils/constants
 */

const database = require('../../config/database');
const { COLUNAS_PAPEIS_PESSOA } = require('../../utils/constants');

/**
 * Classe CidadeModel.
 * @class CidadeModel
 */
class CidadeModel {
    /**
         * Lista cidades com dados dos estados.
         * 
         * @method listarCidades
         * @memberof PessoaModel
         * @async
         * @returns {Promise<Array<Object>>} Lista de cidades com informações do estado.
         * @throws {Error} Se a query falhar.
         * 
         * @example
         * const cidades = await pessoaModel.listarCidades();
         */
    async listarCidades() {
        const sql = `
            SELECT c.id as id, 
                   c.nom_cidade as nom_cidade,
                   c.cod_municipio_ibge as cod_municipio_ibge, 
                   c.id_estado as id_estado,
                   e.nom_estado as nom_estado,
                   e.sgl_estado as sgl_estado
            FROM tab_cidade c
            INNER JOIN tab_estado e ON (c.id_estado = e.id)
        `;
        const resultado = await database.query(sql);

        return resultado || null;
    }

    /**
     * Busca uma cidade por ID.
     * 
     * @method buscarCidadeId
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID da cidade.
     * @returns {Promise<Array<Object>>} Dados da cidade (array, pois pode não existir).
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const cidade = await pessoaModel.buscarCidadeId(1);
     */
    async buscarCidadeId(id) {
        const sql = `
            SELECT *
            FROM tab_cidade
            WHERE id = ?
        `;
        const resultado = await database.query(sql, [id]);
        return resultado || null;
    }

    /**
     * Busca cidades por nome (LIKE, parcial).
     * 
     * @method buscarCidadeNome
     * @memberof PessoaModel
     * @async
     * @param {string} nome - Nome da cidade.
     * @returns {Promise<Array<Object>>} Lista de cidades.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const cidades = await pessoaModel.buscarCidadeNome('São');
     */
    async buscarCidadeNome(nome) {
        const sql = `
            SELECT *
            FROM tab_cidade
            WHERE nom_cidade LIKE ?
        `;
        const resultado = await database.query(sql, [`%${nome}%`]);
        return resultado || null;
    }

    /**
     * Busca cidades por ID do estado.
     * 
     * @method buscarCidadeEstadoId
     * @memberof PessoaModel
     * @async
     * @param {number} id - ID do estado.
     * @returns {Promise<Array<Object>>} Lista de cidades do estado.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const cidades = await pessoaModel.buscarCidadeEstadoId(1);
     */
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
}

module.exports = new CidadeModel();