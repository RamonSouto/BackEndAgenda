// src/tests/unit/utils/cryptoUtils.test.js
const crypto = require('crypto');
const config = require('../../../config/env');
const { criptografar, descriptografar, validarChave } = require('../../../utils/cryptoUtils');

const CHAVE = crypto.randomBytes(32).toString('base64');

describe('cryptoUtils (AES-256-GCM)', () => {
    let original;
    beforeEach(() => { original = config.email.encryptionKey; config.email.encryptionKey = CHAVE; });
    afterEach(() => { config.email.encryptionKey = original; });

    describe('validarChave', () => {
        it('aceita chave de 32 bytes', () => expect(() => validarChave()).not.toThrow());
        it.each([
            ['ausente', undefined],
            ['vazia', ''],
            ['16 bytes', Buffer.alloc(16).toString('base64')],
            ['33 bytes', Buffer.alloc(33).toString('base64')]
        ])('rejeita chave %s', (_, k) => {
            config.email.encryptionKey = k;
            expect(() => validarChave()).toThrow('EMAIL_ENCRYPTION_KEY inválida: esperado 32 bytes em base64');
        });
    });

    describe('criptografar/descriptografar', () => {
        it.each(['senhaSMTP', 'çãé 🔐 ção', 'a:b:c'])('ida e volta %p', (t) => {
            expect(descriptografar(criptografar(t))).toBe(t);
        });

        // Bug: ct vazio é rejeitado pelo `!ct` em descriptografar.
        it.failing('ida e volta com string vazia', () => {
            expect(descriptografar(criptografar(''))).toBe('');
        });

        it('formato v1:iv:tag:ct com IV de 12 bytes e tag de 16 bytes', () => {
            const partes = criptografar('x').split(':');
            expect(partes).toHaveLength(4);
            expect(partes[0]).toBe('v1');
            expect(Buffer.from(partes[1], 'base64')).toHaveLength(12);
            expect(Buffer.from(partes[2], 'base64')).toHaveLength(16);
        });

        it('converte a entrada com String()', () => {
            expect(descriptografar(criptografar(123))).toBe('123');
        });

        it('IV aleatório gera payloads distintos', () => {
            expect(criptografar('x')).not.toBe(criptografar('x'));
        });

        it('criptografar falha sem chave válida', () => {
            config.email.encryptionKey = undefined;
            expect(() => criptografar('x')).toThrow(/32 bytes/);
        });

        it('descriptografar falha sem chave válida', () => {
            const enc = criptografar('x');
            config.email.encryptionKey = 'curta';
            expect(() => descriptografar(enc)).toThrow(/32 bytes/);
        });
    });

    describe('integridade', () => {
        const adulterar = (payload, idx) => {
            const partes = payload.split(':');
            const buf = Buffer.from(partes[idx], 'base64');
            buf[0] ^= 1;
            partes[idx] = buf.toString('base64');
            return partes.join(':');
        };

        it.each([[1, 'iv'], [2, 'tag'], [3, 'ct']])('detecta adulteração do índice %i (%s)', (idx) => {
            expect(() => descriptografar(adulterar(criptografar('segredo'), idx))).toThrow();
        });

        it('falha com chave errada', () => {
            const enc = criptografar('segredo');
            config.email.encryptionKey = crypto.randomBytes(32).toString('base64');
            expect(() => descriptografar(enc)).toThrow();
        });

        it.each([null, undefined, '', 'v2:a:b:c', 'v1:a:b', 'v1::b:c', 'v1:a::c'])('formato inválido %p', (p) => {
            expect(() => descriptografar(p)).toThrow('Formato de segredo criptografado inválido');
        });
    });
});
