// /src/config/database.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file database.js
 * @description Configuração e gerenciamento da conexão com o banco de dados MySQL.
 * Fornece um pool de conexões, execução de queries, suporte a transações
 * e encerramento gracioso.
 * 
 * @requires mysql2/promise
 * @requires ./env
 */

const mysql = require('mysql2/promise');
const config = require('./env');

/**
 * Classe Database para gerenciar conexões MySQL.
 * 
 * @class Database
 */
class Database {
    /**
     * Construtor – inicializa o pool como null.
     */
    constructor() {
        this.pool = null;
    }

    /**
     * Estabelece a conexão com o banco de dados.
     * 
     * @method connect
     * @memberof Database
     * @async
     * @returns {Promise<mysql.Pool>} O pool de conexões.
     * @throws {Error} Se a conexão falhar.
     * 
     * @description
     * - Cria um pool de conexões usando as configurações do arquivo `env`.
     * - Testa a conexão obtendo e liberando uma conexão.
     * - Loga sucesso ou erro no console.
     * 
     * @example
     * await database.connect();
     */
    async connect() {
        try {
            this.pool = mysql.createPool(config.database);

            //console.log('✅ Conectado com sucesso ao MySQL!');

            // Testar conexão
            const connection = await this.pool.getConnection();
            console.log('✅ Conectado ao banco de dados MySQL');
            connection.release();

            return this.pool;
        } catch (error) {
            console.error('❌ Erro ao conectar ao banco de dados:', error.message);
            throw error;
        }
    }

    /**
     * Retorna o pool de conexões.
     * 
     * @method getPool
     * @memberof Database
     * @returns {mysql.Pool} O pool de conexões.
     * @throws {Error} Se o pool não foi inicializado.
     * 
     * @example
     * const pool = database.getPool();
     */

    getPool() {
        if (!this.pool) {
            throw new Error('Database pool não inicializado. Chame connect() primeiro.');
        }
        return this.pool;
    }

    /**
     * Executa query parametrizada (prepared statement) direto no pool.
     * `pool.execute` já adquire e libera a conexão — sem gerenciamento manual.
     *
     * @method query
     * @memberof Database
     * @async
     * @param {string} sql
     * @param {Array} [params=[]]
     * @returns {Promise<Array|Object>}
     */
    async query(sql, params = []) {
        const [rows] = await this.getPool().execute(sql, params);
        return rows;
    }

    /**
     * Executa uma função dentro de uma transação.
     * 
     * @method transaction
     * @memberof Database
     * @async
     * @param {Function} callback - Função que recebe a conexão e executa as operações.
     * @returns {Promise<any>} O resultado do callback.
     * @throws {Error} Se qualquer operação falhar, a transação é desfeita.
     * 
     * @description
     * - Obtém uma conexão do pool.
     * - Inicia uma transação (`BEGIN TRANSACTION`).
     * - Executa o callback com a conexão.
     * - Se o callback for bem-sucedido, faz `COMMIT`.
     * - Se lançar erro, faz `ROLLBACK`.
     * - Libera a conexão ao final.
     * 
     * @example
     * await database.transaction(async (conn) => {
     *   await conn.execute('INSERT INTO tab_pessoas ...');
     *   await conn.execute('UPDATE tab_agendamento ...');
     * });
     */
    async transaction(callback) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Encerra o pool de conexões.
     * 
     * @method close
     * @memberof Database
     * @async
     * @returns {Promise<void>}
     * @description Fecha todas as conexões do pool e libera recursos.
     * 
     * @example
     * await database.close();
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Conexão com banco de dados encerrada');
        }
    }
}

module.exports = new Database();
