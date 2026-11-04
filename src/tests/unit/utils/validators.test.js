// src/tests/unit/utils/validators.test.js
const v = require('../../../utils/validators');

describe('validarCPF', () => {
    it.each(['11144477735', '111.444.777-35'])('válido: %s', (c) => expect(v.validarCPF(c)).toBe(true));
    it.each(['11111111111', '11144477736', '123', '', null, undefined, {}])('inválido: %p', (c) => expect(v.validarCPF(c)).toBe(false));
});

describe('validarCPF - dígitos verificadores', () => {
    it('falha no 1º DV', () => expect(v.validarCPF('11144477715')).toBe(false));
    it('falha no 2º DV', () => expect(v.validarCPF('11144477736')).toBe(false));
    it('aceita número', () => expect(v.validarCPF(11144477735)).toBe(true));
    it('rejeita tipo inválido', () => expect(v.validarCPF(null)).toBe(false));
});

describe('validarCNPJ', () => {
    it.each(['11444777000161', '11.444.777/0001-61'])('válido: %s', (c) => expect(v.validarCNPJ(c)).toBe(true));
    it.each(['11444777000162', '00000000000000', '123', null, 11444777000161])('inválido: %p', (c) => expect(v.validarCNPJ(c)).toBe(false));
});

describe('valoresIguais', () => {
    it.each([
        [null, undefined, true],
        ['10', 10, true],
        ['10.50', 10.5, true],
        [new Date('2026-01-01'), '2026-01-01T00:00:00.000Z', true],
        [{ a: 1 }, { a: 1 }, true],
        ['abc', 'abc', true],
        ['', null, false],
        [0, null, false],
        ['a', 'b', false]
    ])('(%p, %p) → %p', (a, b, esperado) => expect(v.valoresIguais(a, b)).toBe(esperado));
});

describe('valoresIguais - ramos', () => {
    it.each([
        [undefined, null, true],
        [new Date('2026-01-01'), '2026-01-01T00:00:00.000Z', true],
        [new Date('2026-01-01'), null, false],
        ['10', 10, true],
        [true, 'x', true],
        [false, 'x', false],
        [{ a: 1 }, { a: 1 }, true],
        [[1], [2], false],
        ['abc', 'abd', false]
    ])('valoresIguais(%p, %p) → %p', (a, b, esperado) => {
        expect(v.valoresIguais(a, b)).toBe(esperado);
    });
});

describe('schemas', () => {
    const ok = (schema, dado) => expect(schema.validate(dado).error).toBeUndefined();
    const erro = (schema, dado) => expect(schema.validate(dado).error).toBeDefined();

    const pessoaBase = {
        id_cidade: 1, nom_completo: 'Ana', num_cpf: '11144477735', num_rg: '123',
        dta_nascimento: '1990-01-01', des_logradouro: 'Rua', num_endereco: '1', num_cep: '74000000',
        nom_bairro: 'Centro', num_celular_1: '62999999999', des_email_1: 'a@a.com'
    };

    it('pessoa exige papel', () => erro(v.pessoaSchema, pessoaBase));
    it('paciente sem senha é válido', () => ok(v.pessoaSchema, { ...pessoaBase, ind_paciente: true }));
    it('secretaria exige senha', () => erro(v.pessoaSchema, { ...pessoaBase, ind_secretaria: true }));
    it('costureira exige cor', () => erro(v.pessoaSchema, { ...pessoaBase, ind_costureira: true, des_senha: '123456' }));
    it('pessoa com CPF inválido', () => erro(v.pessoaSchema, { ...pessoaBase, ind_paciente: true, num_cpf: '11144477736' }));

    it('imagemProduto exige exatamente um vínculo', () => {
        const base = { des_url_imagem: '/img.png', ind_principal: false };
        erro(v.imagemProdutoSchema, base);
        erro(v.imagemProdutoSchema, { ...base, id_produto: 1, id_produto_grade: 2 });
        ok(v.imagemProdutoSchema, { ...base, id_produto: 1 });
    });

    it('smtp bloqueia header injection no nome do remetente', () => {
        const smtp = {
            ind_smtp_ativo: true, des_smtp_host: 'smtp.gmail.com', num_smtp_porta: 587, ind_smtp_seguro: false,
            des_smtp_usuario: 'u', des_smtp_email_remetente: 'a@a.com', nom_smtp_remetente: 'Loja'
        };
        ok(v.smtpSchema, smtp);
        erro(v.smtpSchema, { ...smtp, nom_smtp_remetente: 'Loja\r\nBcc: x@x.com' });
        erro(v.smtpSchema, { ...smtp, num_smtp_porta: 8080 });
    });

    it('agendamento exige data futura', () => {
        erro(v.agendamentoSchema, { id_paciente: 1, id_costureira: 1, dta_agendamento: '2020-01-01' });
    });

    it('agendamentoUpdate rejeita corpo vazio e campos proibidos', () => {
        erro(v.agendamentoUpdateSchema, {});
        erro(v.agendamentoUpdateSchema, { ind_status: 'cancelado' });
        erro(v.agendamentoUpdateSchema, { id_costureira: 2 });
    });

    it('produtoAgendadoUpdate não aceita preço do cliente', () => {
        erro(v.produtoAgendadoUpdateSchema, { val_preco_servico: 10 });
    });

    it('filtro rejeita dta_fim anterior a dta_inicio e limite > 100', () => {
        erro(v.filtroAgendamentoSchema, { dta_inicio: '2026-05-10', dta_fim: '2026-05-01' });
        erro(v.filtroAgendamentoSchema, { limite: 101 });
        expect(v.filtroAgendamentoSchema.validate({}).value).toEqual({ pagina: 1, limite: 20 });
    });

    it('fotoProdutoAgendamento normaliza ind_tipo_foto', () => {
        expect(v.fotoProdutoAgendamentoSchema.validate({ id_agendamento: 1, id_item: 1, ind_tipo_foto: ' ANTES ' }).value.ind_tipo_foto).toBe('antes');
    });

    it('eventoEmail aceita somente eventos conhecidos', () => {
        ok(v.eventoEmailSchema, 'agendamento_concluido');
        erro(v.eventoEmailSchema, 'outro');
    });
});

describe('schemas com validação custom', () => {
    it('publicAgendamentoSchema rejeita CPF inválido', () => {
        const { error } = v.publicAgendamentoSchema.validate({
            num_cpf: '11111111112', id_costureira: 1,
            dta_agendamento: new Date(Date.now() + 864e5)
        });
        expect(error).toBeDefined();
    });

    it('empresaSchema converte ind_ativo "1" e rejeita CNPJ inválido', () => {
        const { error, value } = v.empresaSchema.validate(
            { ind_ativo: '1', num_cnpj: '11444777000162' },
            { abortEarly: false }
        );
        expect(value.ind_ativo).toBe(true);
        expect(error.details.some(d => d.path[0] === 'num_cnpj')).toBe(true);
    });

    it.each([
        [{ des_url_imagem: 'abc', ind_principal: false }],
        [{ des_url_imagem: 'abc', ind_principal: false, id_produto: 1, id_produto_grade: 2 }]
    ])('imagemProdutoSchema exige exatamente um vínculo', (dados) => {
        expect(v.imagemProdutoSchema.validate(dados).error).toBeDefined();
    });

    it.each([
        [{}, 'pelo menos um papel'],
        [{ ind_medico: true }, 'Senha é obrigatória'],
        [{ ind_costureira: true, des_senha: '123456' }, 'cor para a costureira']
    ])('pessoaSchema: regra condicional %#', (extra, msg) => {
        const base = {
            id_cidade: 1, nom_completo: 'Fulano', num_cpf: '11144477735', num_rg: '123',
            dta_nascimento: '1990-01-01', des_logradouro: 'Rua A', num_endereco: '1',
            num_cep: '74000000', nom_bairro: 'Centro', num_celular_1: '62999999999',
            des_email_1: 'a@b.com'
        };
        const { error } = v.pessoaSchema.validate({ ...base, ...extra });
        expect(error.message).toContain(msg);
    });
});