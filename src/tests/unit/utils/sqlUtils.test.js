// src/tests/unit/utils/sqlUtils.test.js
jest.mock('../../../config/database', () => ({ query: jest.fn() }));
const database = require('../../../config/database');
const { montarUpdate, executar } = require('../../../utils/sqlUtils');
const { BadRequestError } = require('../../../utils/ApiError');

describe('sqlUtils', () => {
    describe('montarUpdate', () => {
        it('monta SET apenas com campos da whitelist', () => {
            expect(montarUpdate({ a: 1, b: null, hack: 'x; DROP' }, ['a', 'b']))
                .toEqual({ set: '`a` = ?, `b` = ?', valores: [1, null] });
        });
        it('ignora undefined', () => {
            expect(montarUpdate({ a: undefined, b: 0 }, ['a', 'b'])).toEqual({ set: '`b` = ?', valores: [0] });
        });
        it('lança BadRequest quando nenhum campo válido', () => {
            expect(() => montarUpdate({ hack: 1 }, ['a'])).toThrow(BadRequestError);
        });
    });

    describe('executar', () => {
        it('usa a conexão de transação quando fornecida', async () => {
            const conn = { execute: jest.fn().mockResolvedValue([[{ id: 1 }]]) };
            await expect(executar('SELECT 1', [1], conn)).resolves.toEqual([{ id: 1 }]);
            expect(database.query).not.toHaveBeenCalled();
        });
        it('usa o pool sem conexão', async () => {
            database.query.mockResolvedValue([{ id: 2 }]);
            await expect(executar('SELECT 2')).resolves.toEqual([{ id: 2 }]);
            expect(database.query).toHaveBeenCalledWith('SELECT 2', []);
        });
    });
});
