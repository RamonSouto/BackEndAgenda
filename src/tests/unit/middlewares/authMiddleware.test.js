// src/tests/unit/middlewares/authMiddleware.test.js
const jwt = require('jsonwebtoken');
const authMiddleware = require('../../../middlewares/authMiddleware');
const { mockRes, token, usuarios } = require('../../helpers/factories');

const req = (authorization, extra = {}) => ({
    headers: { authorization }, get: () => 'jest-agent', ip: '127.0.0.1', ...extra
});

afterEach(() => jest.restoreAllMocks());

describe('authMiddleware', () => {
    let res, next;
    beforeEach(() => { res = mockRes(); next = jest.fn(); });

    it('injeta req.usuario com token válido', async () => {
        const r = req(`Bearer ${token(usuarios.admin)}`);
        await authMiddleware(r, res, next);
        expect(next).toHaveBeenCalled();
        expect(r.usuario).toEqual({ id: 1, cpf: '11144477735', papeis: ['administrador'] });
        expect(r.ipAddress).toBe('127.0.0.1');
        expect(r.userAgent).toBe('jest-agent');
    });

    it('aceita esquema "bearer" minúsculo', async () => {
        await authMiddleware(req(`bearer ${token(usuarios.admin)}`), res, next);
        expect(next).toHaveBeenCalled();
    });

    it('papeis não-array vira []', async () => {
        const t = jwt.sign({ id: 1, papeis: 'admin' }, process.env.JWT_SECRET);
        const r = req(`Bearer ${t}`);
        await authMiddleware(r, res, next);
        expect(r.usuario.papeis).toEqual([]);
    });

    it('fallbacks: remoteAddress e user-agent "Desconhecido"', async () => {
        const r = req(`Bearer ${token(usuarios.admin)}`, {
            ip: undefined, get: () => undefined, connection: { remoteAddress: '10.0.0.1' }
        });
        await authMiddleware(r, res, next);
        expect(r.ipAddress).toBe('10.0.0.1');
        expect(r.userAgent).toBe('Desconhecido');
        expect(next).toHaveBeenCalled();
    });

    it.each([
        [undefined, 'Token não fornecido'],
        ['Bearer', 'Formato de token inválido'],
        ['Bearer a b', 'Formato de token inválido'],
        ['Basic abc', 'Token mal formatado'],
        ['Bearer abc.def.ghi', 'Token inválido']
    ])('401 para header %p', async (h, erro) => {
        await authMiddleware(req(h), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro }));
        expect(next).not.toHaveBeenCalled();
    });

    it('401 para token expirado', async () => {
        const t = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
        await authMiddleware(req(`Bearer ${t}`), res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'Token expirado' }));
    });

    it('rejeita algoritmo diferente de HS256 (alg confusion)', async () => {
        const t = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { algorithm: 'HS512' });
        await authMiddleware(req(`Bearer ${t}`), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejeita token assinado com outro segredo', async () => {
        const t = jwt.sign({ id: 1 }, 'outro');
        await authMiddleware(req(`Bearer ${t}`), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('erro inesperado no verify → 500', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(jwt, 'verify').mockImplementation(() => { throw Object.assign(new Error('boom'), { name: 'Outro' }); });
        await authMiddleware(req('Bearer x'), res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'Erro interno ao processar autenticação' }));
        expect(next).not.toHaveBeenCalled();
    });
});
