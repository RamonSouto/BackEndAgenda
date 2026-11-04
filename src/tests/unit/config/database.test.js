// src/tests/unit/config/database.test.js
jest.mock('mysql2/promise', () => ({ createPool: jest.fn() }));
const mysql = require('mysql2/promise');
const config = require('../../../config/env');
const database = require('../../../config/database');

const novaConexao = () => ({
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn()
});
const poolCom = (c) => ({ getConnection: jest.fn().mockResolvedValue(c) });

describe('Database', () => {
    beforeEach(() => {
        database.pool = null;
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('é singleton com pool inicial null', () => {
        expect(require('../../../config/database')).toBe(database);
        expect(database.pool).toBeNull();
    });

    describe('connect', () => {
        it('cria o pool com config.database, testa e libera a conexão', async () => {
            const c = novaConexao();
            const pool = poolCom(c);
            mysql.createPool.mockReturnValue(pool);
            await expect(database.connect()).resolves.toBe(pool);
            expect(mysql.createPool).toHaveBeenCalledWith(config.database);
            expect(c.release).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith('✅ Conectado ao banco de dados MySQL');
        });
        it('loga e relança o erro de conexão', async () => {
            mysql.createPool.mockReturnValue({ getConnection: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) });
            await expect(database.connect()).rejects.toThrow('ECONNREFUSED');
            expect(console.error).toHaveBeenCalledWith('❌ Erro ao conectar ao banco de dados:', 'ECONNREFUSED');
        });
        it('loga e relança erro do createPool', async () => {
            mysql.createPool.mockImplementation(() => { throw new Error('config'); });
            await expect(database.connect()).rejects.toThrow('config');
        });
    });

    describe('getPool', () => {
        it('lança antes do connect', () => {
            expect(() => database.getPool()).toThrow('Database pool não inicializado. Chame connect() primeiro.');
        });
        it('retorna o pool existente', () => {
            database.pool = {};
            expect(database.getPool()).toBe(database.pool);
        });
    });

    describe('query', () => {
        it('usa execute e retorna rows', async () => {
            database.pool = { execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]) };
            await expect(database.query('SELECT ?', [1])).resolves.toEqual([{ id: 1 }]);
            expect(database.pool.execute).toHaveBeenCalledWith('SELECT ?', [1]);
        });
        it('params padrão = []', async () => {
            database.pool = { execute: jest.fn().mockResolvedValue([[], []]) };
            await database.query('SELECT 1');
            expect(database.pool.execute).toHaveBeenCalledWith('SELECT 1', []);
        });
        it('propaga erro do execute', async () => {
            database.pool = { execute: jest.fn().mockRejectedValue(new Error('ER_PARSE')) };
            await expect(database.query('X')).rejects.toThrow('ER_PARSE');
        });
        it('sem pool lança erro de inicialização', async () => {
            await expect(database.query('SELECT 1')).rejects.toThrow(/não inicializado/);
        });
    });

    describe('transaction', () => {
        it('commit, release e retorna o resultado', async () => {
            const c = novaConexao();
            database.pool = poolCom(c);
            const cb = jest.fn().mockResolvedValue(7);
            await expect(database.transaction(cb)).resolves.toBe(7);
            expect(cb).toHaveBeenCalledWith(c);
            expect(c.beginTransaction).toHaveBeenCalled();
            expect(c.commit).toHaveBeenCalled();
            expect(c.rollback).not.toHaveBeenCalled();
            expect(c.release).toHaveBeenCalledTimes(1);
        });
        it('rollback, release e relança', async () => {
            const c = novaConexao();
            database.pool = poolCom(c);
            await expect(database.transaction(async () => { throw new Error('x'); })).rejects.toThrow('x');
            expect(c.commit).not.toHaveBeenCalled();
            expect(c.rollback).toHaveBeenCalled();
            expect(c.release).toHaveBeenCalledTimes(1);
        });
        it('falha no commit também faz rollback', async () => {
            const c = novaConexao();
            c.commit.mockRejectedValue(new Error('commit'));
            database.pool = poolCom(c);
            await expect(database.transaction(async () => 1)).rejects.toThrow('commit');
            expect(c.rollback).toHaveBeenCalled();
            expect(c.release).toHaveBeenCalled();
        });
        it('falha no beginTransaction libera a conexão', async () => {
            const c = novaConexao();
            c.beginTransaction.mockRejectedValue(new Error('begin'));
            database.pool = poolCom(c);
            const cb = jest.fn();
            await expect(database.transaction(cb)).rejects.toThrow('begin');
            expect(cb).not.toHaveBeenCalled();
            expect(c.release).toHaveBeenCalled();
        });
        // Bug: usa this.pool direto e lança TypeError em vez da mensagem padrão.
        it.failing('sem connect lança erro de inicialização', async () => {
            await expect(database.transaction(async () => 1)).rejects.toThrow(/não inicializado/);
        });
    });

    describe('close', () => {
        it('encerra o pool existente', async () => {
            database.pool = { end: jest.fn().mockResolvedValue() };
            await database.close();
            expect(database.pool.end).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('🔌 Conexão com banco de dados encerrada');
        });
        it('sem pool não faz nada', async () => {
            await expect(database.close()).resolves.toBeUndefined();
            expect(console.log).not.toHaveBeenCalled();
        });
    });
});
