const mysql = require('mysql2/promise');
const config = require('./env');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = mysql.createPool(config.database);

            console.log('✅ Conectado com sucesso ao MySQL!');

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

    getPool() {
        if (!this.pool) {
            throw new Error('Database pool não inicializado. Chame connect() primeiro.');
        }
        return this.pool;
    }

    async query(sql, params = []) {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } finally {
            connection.release();
        }
    }

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

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Conexão com banco de dados encerrada');
        }
    }
}

module.exports = new Database();
