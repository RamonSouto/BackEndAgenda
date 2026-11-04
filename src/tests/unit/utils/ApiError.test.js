// src/tests/unit/utils/ApiError.test.js
const E = require('../../../utils/ApiError');

describe('ApiError', () => {
    it('base guarda statusCode, isOperational e stack', () => {
        const e = new E.ApiError('x', 418);
        expect(e).toBeInstanceOf(Error);
        expect(e).toMatchObject({ message: 'x', statusCode: 418, isOperational: true });
        expect(e.stack).toBeDefined();
    });

    it.each([
        ['NotFoundError', 404, 'Recurso não encontrado'],
        ['BadRequestError', 400, 'Requisição inválida'],
        ['UnauthorizedError', 401, 'Não autorizado'],
        ['ForbiddenError', 403, 'Acesso proibido'],
        ['ConflictError', 409, 'Conflito de dados'],
        ['ValidationError', 422, 'Dados de validação inválidos']
    ])('%s → %i com mensagem padrão', (cls, status, msg) => {
        const e = new E[cls]();
        expect(e).toBeInstanceOf(E.ApiError);
        expect(e).toMatchObject({ statusCode: status, message: msg });
        expect(new E[cls]('custom').message).toBe('custom');
    });
});

