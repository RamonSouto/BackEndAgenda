// src/tests/unit/middlewares/errorMiddleware.test.js
jest.mock('../../../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
const {
    errorMiddleware, notFoundMiddleware, asyncHandler,
    validarIdMiddleware, validarBodyMiddleware, sanitizarInputMiddleware
} = require('../../../middlewares/errorMiddleware');
const { NotFoundError, ConflictError } = require('../../../utils/ApiError');
const { mockRes } = require('../../helpers/factories');

const req = (over = {}) => ({ method: 'GET', path: '/x', originalUrl: '/x', id: 'rid', params: {}, ...over });
const erroDb = (code, sqlMessage) => Object.assign(new Error('db'), { code, sqlMessage });

const carregarEm = (nodeEnv) => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = nodeEnv;
    let mod;
    jest.isolateModules(() => { mod = require('../../../middlewares/errorMiddleware'); });
    process.env.NODE_ENV = original;
    return mod;
};

describe('errorMiddleware', () => {
    const exec = (err) => { const res = mockRes(); errorMiddleware(err, req(), res, jest.fn()); return res; };

    it('Joi → 400', () => {
        const res = exec({ isJoi: true, details: [{ message: 'campo x' }] });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'campo x' }));
    });

    it.each([
        ['ER_DUP_ENTRY', 'Duplicate', 409, 'Registro duplicado'],
        ['ER_DUP_ENTRY', undefined, 409, 'Registro duplicado'],
        ['ER_DUP_ENTRY', "for key 'uq_agenda_costureira_slot'", 409, 'Costureira já possui um agendamento ativo neste horario'],
        ['ER_NO_REFERENCED_ROW_2', '', 400, 'Referência inválida'],
        ['ER_ROW_IS_REFERENCED_2', '', 400, 'Não é possível deletar. Existem registros relacionados'],
        ['ER_SIGNAL_EXCEPTION', 'Regra X', 400, 'Regra X'],
        ['ER_SIGNAL_EXCEPTION', undefined, 400, 'Erro de validação do banco'],
        ['ER_PARSE_ERROR', '', 500, 'Erro no banco de dados']
    ])('MySQL %s (%p) → %i', (code, sqlMessage, status, mensagem) => {
        const res = exec({ code, sqlMessage, message: 'm' });
        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensagem, requestId: 'rid' }));
    });

    it('Multer → 400', () => {
        expect(exec({ name: 'MulterError', message: 'x' }).status).toHaveBeenCalledWith(400);
    });

    it('JSON malformado → 400', () => {
        const err = new SyntaxError('bad'); err.status = 400; err.body = '{';
        expect(exec(err).json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'JSON inválido' }));
    });

    it('SyntaxError sem body cai no genérico', () => {
        const err = new SyntaxError('bad'); err.status = 400;
        expect(exec(err).json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: 'bad' }));
    });

    it.each([[new NotFoundError('nada'), 404], [new ConflictError(), 409]])('ApiError → statusCode', (err, s) => {
        const res = exec(err);
        expect(res.status).toHaveBeenCalledWith(s);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: err.message }));
    });

    it('usa err.status quando não há statusCode', () => {
        expect(exec(Object.assign(new Error('x'), { status: 418 })).status).toHaveBeenCalledWith(418);
    });

    it('erro genérico → 500 com mensagem neutra e stack fora de produção', () => {
        const res = exec(new Error('stack interno'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            mensagem: 'Erro interno do servidor', erro: 'stack interno', stack: expect.any(String)
        }));
    });
});

describe('errorMiddleware (produção)', () => {
    const { errorMiddleware: emProd } = carregarEm('production');
    const exec = (err) => { const res = mockRes(); emProd(err, req(), res, jest.fn()); return res; };
    const body = (res) => res.json.mock.calls[0][0];

    it('MySQL desconhecido oculta detalhe', () => {
        const res = exec(erroDb('ER_LOCK_DEADLOCK'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(body(res)).not.toHaveProperty('erro');
    });

    it('ER_SIGNAL_EXCEPTION expõe sqlMessage mesmo em produção', () => {
        expect(body(exec(erroDb('ER_SIGNAL_EXCEPTION', 'regra X')))).toMatchObject({ erro: 'regra X' });
    });

    it('ER_SIGNAL_EXCEPTION sem sqlMessage usa err.message', () => {
        expect(body(exec(erroDb('ER_SIGNAL_EXCEPTION')))).toMatchObject({ erro: 'db' });
    });

    it('500 oculta mensagem e stack', () => {
        const b = body(exec(new Error('segredo')));
        expect(b.erro).toBeUndefined();
        expect(b.stack).toBeUndefined();
    });

    it('4xx mantém mensagem sem stack', () => {
        const b = body(exec(new NotFoundError('nada')));
        expect(b).toMatchObject({ mensagem: 'nada', erro: 'nada' });
        expect(b.stack).toBeUndefined();
    });
});

describe('notFoundMiddleware', () => {
    it('retorna 404 com método e rota', () => {
        const res = mockRes();
        notFoundMiddleware(req({ method: 'POST', path: '/nada' }), res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'Rota POST /nada não encontrada' }));
    });
});

describe('asyncHandler', () => {
    it('repassa rejeição para next', async () => {
        const next = jest.fn(); const erro = new Error('x');
        await asyncHandler(async () => { throw erro; })(req(), mockRes(), next);
        expect(next).toHaveBeenCalledWith(erro);
    });
});

describe('validarIdMiddleware', () => {
    it.each(['1', '42', String(Number.MAX_SAFE_INTEGER)])('aceita %s e converte para number', (id) => {
        const r = req({ params: { id } }); const next = jest.fn();
        validarIdMiddleware()(r, mockRes(), next);
        expect(next).toHaveBeenCalled();
        expect(r.params.id).toBe(Number(id));
    });
    it.each(['0', '-1', '1.5', '1e3', '12abc', ' 5', '', '9007199254740992'])('rejeita %p', (id) => {
        const res = mockRes(); const next = jest.fn();
        validarIdMiddleware('id')(req({ params: { id } }), res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });
    it('parâmetro ausente → 400', () => {
        const res = mockRes(); const next = jest.fn();
        validarIdMiddleware('idItem')(req({ params: {} }), res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('validarBodyMiddleware', () => {
    it.each(['POST', 'PUT', 'PATCH'])('%s com body vazio → 400', (method) => {
        const res = mockRes();
        validarBodyMiddleware(req({ method, body: {} }), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });
    it('POST sem body → 400', () => {
        const res = mockRes();
        validarBodyMiddleware(req({ method: 'POST', body: undefined }), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });
    it('POST com body passa', () => {
        const next = jest.fn();
        validarBodyMiddleware(req({ method: 'POST', body: { a: 1 } }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
    it('GET sem body passa', () => {
        const next = jest.fn();
        validarBodyMiddleware(req({ method: 'GET' }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('sanitizarInputMiddleware', () => {
    it('trim recursivo e remoção de chaves de prototype pollution', () => {
        const body = JSON.parse('{"a":"  x  ","n":{"b":[" y ",null]},"__proto__":{"admin":true},"constructor":1,"k":5}');
        const r = req({ body, query: { q: ' z ' } });
        sanitizarInputMiddleware(r, mockRes(), jest.fn());
        expect(r.body).toEqual({ a: 'x', n: { b: ['y', null] }, k: 5 });
        expect(r.query).toEqual({ q: 'z' });
        expect({}.admin).toBeUndefined();
    });
    it('sem body/query apenas chama next', () => {
        const r = req({ body: undefined, query: undefined }); const next = jest.fn();
        sanitizarInputMiddleware(r, mockRes(), next);
        expect(r.body).toBeUndefined();
        expect(r.query).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});
