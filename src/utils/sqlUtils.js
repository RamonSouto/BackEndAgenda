// src/utils/sqlUtils.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/sqlUtils.js
 * @description Helpers de persistência compartilhados pelos Models:
 * - `montarUpdate`: monta a cláusula SET a partir de uma WHITELIST de colunas,
 *   eliminando SQL injection via nome de coluna e mass assignment.
 * - `executar`: roda a query na conexão de transação (se houver) ou no pool.
 *
 * @requires ../config/database
 * @requires ./ApiError
 */
const database = require('../config/database');
const { BadRequestError } = require('./ApiError');

/**
 * Monta a cláusula SET de um UPDATE considerando apenas colunas permitidas.
 * Chaves fora da whitelist são ignoradas silenciosamente (nunca chegam ao SQL).
 *
 * @function montarUpdate
 * @param {Object} dados - Campos recebidos (normalmente já validados pelo Joi).
 * @param {string[]} camposPermitidos - Whitelist de colunas atualizáveis.
 * @returns {{set: string, valores: Array}} Cláusula SET e valores posicionais.
 * @throws {BadRequestError} Se nenhum campo permitido for informado.
 *
 * @example
 * const { set, valores } = montarUpdate(req.body, ['nom_categoria', 'id_pai']);
 * // set = '`nom_categoria` = ?', valores = ['Camisas']
 */
function montarUpdate(dados, camposPermitidos) {
    const campos = [];
    const valores = [];

    for (const campo of camposPermitidos) {
        if (dados[campo] !== undefined) {
            campos.push(`\`${campo}\` = ?`);
            valores.push(dados[campo]);
        }
    }

    if (campos.length === 0) {
        throw new BadRequestError('Nenhum campo válido para atualizar');
    }

    return { set: campos.join(', '), valores };
}

/**
 * Executa SQL na conexão de transação (se fornecida) ou no pool padrão.
 *
 * @function executar
 * @async
 * @param {string} sql - Query parametrizada.
 * @param {Array} [params=[]] - Valores posicionais.
 * @param {Object|null} [connection=null] - PoolConnection do mysql2 (transação).
 * @returns {Promise<Array|Object>} Linhas ou ResultSetHeader.
 *
 * @example
 * await executar('SELECT 1', [], conn);
 */
async function executar(sql, params = [], connection = null) {
    if (connection) {
        const [rows] = await connection.execute(sql, params);
        return rows;
    }
    return database.query(sql, params);
}

module.exports = { montarUpdate, executar };
