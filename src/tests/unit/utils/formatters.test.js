// /src/tests/unit/utils/formatters.test.js

const f = require('../../../utils/formatters');

describe('formatters – máscaras', () => {
    it.each([['12345678901', '123.456.789-01'], ['123.456.789-01', '123.456.789-01']])
        ('formatarCPF(%s)', (e, s) => expect(f.formatarCPF(e)).toBe(s));
    it.each([['74000000', '74000-000'], ['74000-000', '74000-000']])
        ('formatarCEP(%s)', (e, s) => expect(f.formatarCEP(e)).toBe(s));
    it.each([['6233334444', '(62) 3333-4444'], ['62988887777', '(62) 98888-7777'], ['(62) 98888-7777', '(62) 98888-7777']])
        ('formatarTelefone(%s)', (e, s) => expect(f.formatarTelefone(e)).toBe(s));
    it.each([['limparCPF', '123.456.789-01', '12345678901'], ['limparCEP', '74000-000', '74000000'], ['limparTelefone', '(62) 9888-7777', '6298887777']])
        ('%s', (fn, e, s) => expect(f[fn](e)).toBe(s));
    it.failing('limparCPF não deve quebrar com null', () => {
        expect(() => f.limparCPF(null)).not.toThrow();
    });
});

describe('formatters – datas', () => {
    const data = new Date(2026, 10, 3, 14, 5, 9);
    it.each([
        ['formatarData', '2026-11-03', '03/11/2026'],
        ['formatarData', data, '03/11/2026'],
        ['formatarDataHora', '2026-11-03T14:05:09', '03/11/2026 14:05:09'],
        ['formatarDataHora', data, '03/11/2026 14:05:09'],
        ['formatarDataHoraDB', '2026-11-03T14:05:09', '2026-11-03 14:05:09'],
        ['formatarDataHoraDB', data, '2026-11-03 14:05:09']
    ])('%s(%s) → %s', (fn, e, s) => expect(f[fn](e)).toBe(s));
    it('formato customizado', () => expect(f.formatarData(data, 'yyyy-MM-dd')).toBe('2026-11-03'));
    it.each(['formatarData', 'formatarDataHora', 'formatarDataHoraDB'])('%s(null) → null', (fn) => expect(f[fn](null)).toBeNull());
    it('data inválida lança RangeError', () => expect(() => f.formatarData('xx')).toThrow(RangeError));
});

describe('formatters.ocultarDadosSensiveis', () => {
    it('remove campos padrão em qualquer nível e não muta o original', () => {
        const orig = { id: 1, des_senha: 'x', num_cpf: '1', filhos: [{ cpf: '2', nome: 'A', senha_hash: 'h' }] };
        expect(f.ocultarDadosSensiveis(orig)).toEqual({ id: 1, filhos: [{ nome: 'A' }] });
        expect(orig.des_senha).toBe('x');
    });
    it('aceita lista customizada', () => {
        expect(f.ocultarDadosSensiveis({ a: 1, b: 2, des_senha: 'x' }, ['b'])).toEqual({ a: 1, des_senha: 'x' });
    });
    it.failing('não deve quebrar com undefined', () => {
        expect(() => f.ocultarDadosSensiveis(undefined)).not.toThrow();
    });
});
