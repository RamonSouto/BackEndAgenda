//src/models/sistema/EstadoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/sistema/EstadoModel.js
 * @description Modelo de dados para Estado.
 * 
 * @requires ../../config/database
 * @requires ../../utils/constants
 */

const database = require('../../config/database');
const { COLUNAS_PAPEIS_PESSOA } = require('../../utils/constants');

/**
 * Classe EstadoModel.
 * @class EstadoModel
 */
class EstadoModel {

    /**
     * Lista estados.
     * 
     * @method listarEstados
     * @memberof EstadoModel
     * @async
     * @returns {Promise<Array<Object>>} Lista de estados.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const estados = await pessoaModel.listarEstados();
     */
    async listarEstados() {
        const sql = `
            SELECT *
            FROM tab_estado
        `;
        const resultado = await database.query(sql);
        return resultado || null;
    }

    /**
     * Busca um estado por ID.
     * 
     * @method buscarEstadoId
     * @memberof EstadoModel
     * @async
     * @param {number} id - ID do estado.
     * @returns {Promise<Array<Object>>} Dados do estado.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const estado = await pessoaModel.buscarEstadoId(1);
     */
    async buscarEstadoId(id) {
        const sql = `
            SELECT *
            FROM tab_estado
            WHERE id = ?
        `;

        const resultado = await database.query(sql, [id]);
        return resultado || null;
    }

    /**
     * Busca estados por nome (LIKE, parcial).
     * 
     * @method buscarEstadoNome
     * @memberof EstadoModel
     * @async
     * @param {string} nome - Nome do estado.
     * @returns {Promise<Array<Object>>} Lista de estados.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const estados = await pessoaModel.buscarEstadoNome('Paulo');
     */
    async buscarEstadoNome(nome) {
        const sql = `
            SELECT *
            FROM tab_estado
            WHERE nom_estado LIKE ?
        `;

        const resultado = await database.query(sql, [`%${nome}%`]);
        return resultado || null;
    }

    /**
     * Busca estados por sigla (LIKE, parcial).
     * 
     * @method buscarEstadoSgl
     * @memberof EstadoModel
     * @async
     * @param {string} sgl - Sigla do estado.
     * @returns {Promise<Array<Object>>} Lista de estados.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const estados = await pessoaModel.buscarEstadoSgl('SP');
     */
    async buscarEstadoSgl(sgl) {
        const sql = `
            SELECT *
            FROM tab_estado
            WHERE sgl_estado LIKE ?
        `;

        const resultado = await database.query(sql, [`%${sgl}%`]);
        return resultado || null;
    }
}

module.exports = new EstadoModel();