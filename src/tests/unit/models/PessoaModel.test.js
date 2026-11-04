// /src/tests/unit/models/PessoaModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({
    montarUpdate: jest.fn(() => ({ set: 'nom_completo = ?', valores: ['Ana'] }))
}));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
const Model = require('../../../models/PessoaModel');

beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue([]);
});

const ultimaQuery = () => database.query.mock.calls[0];

describe('PessoaModel.criar', () => {
    it('aplica defaults e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 7 });
        await expect(Model.criar({
            id_cidade: 1, ind_paciente: true, nom_completo: 'Ana', num_cpf: '111', num_rg: '1',
            dta_nascimento: '1990-01-01', des_logradouro: 'Rua', num_endereco: '10', num_cep: '74000000',
            nom_bairro: 'Centro', num_celular_1: '62988887777', des_email_1: 'a@x.com'
        })).resolves.toBe(7);

        const [sql, valores] = ultimaQuery();
        expect(sql.match(/\?/g)).toHaveLength(24);
        expect(valores).toEqual([
            1, 'ativo', false, false, false, true, false, 'Ana', '111', '1', '1990-01-01', 'Rua', '10',
            null, '74000000', 'Centro', '62988887777', true, null, true, 'a@x.com', null, null, null
        ]);
    });
    it('preserva false explícito em ind_whatsapp (uso de ??)', async () => {
        database.query.mockResolvedValue({ insertId: 1 });
        await Model.criar({ ind_whatsapp_1: false, ind_whatsapp_2: false });
        const v = ultimaQuery()[1];
        expect([v[17], v[19]]).toEqual([false, false]);
    });
});

describe('PessoaModel – buscas', () => {
    it.each(['buscarPorId', 'buscarPorCPF'])('%s retorna 1º registro ou null', async (metodo) => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(Model[metodo](1)).resolves.toEqual({ id: 1 });
        await expect(Model[metodo](2)).resolves.toBeNull();
        expect(ultimaQuery()[0]).toMatch(/deleted_at IS NULL/);
    });
    it('buscarPorPapel usa coluna mapeada', async () => {
        await Model.buscarPorPapel('costureira');
        expect(ultimaQuery()[0]).toMatch(/p\.ind_costureira = 1/);
    });
    it('buscarPorPapel inválido lança sem consultar (bloqueia SQL injection)', async () => {
        await expect(Model.buscarPorPapel('1=1; DROP')).rejects.toThrow('Papel inválido');
        expect(database.query).not.toHaveBeenCalled();
    });
});

describe('PessoaModel.listar', () => {
    it('sem filtros', async () => {
        await Model.listar();
        expect(ultimaQuery()[0]).toMatch(/deleted_at IS NULL\s+ORDER BY p\.nom_completo$/);
        expect(ultimaQuery()[1]).toEqual([]);
    });
    it('todos os filtros', async () => {
        await Model.listar({ papel: 'paciente', ind_status: 'ativo', busca: 'Ana' });
        const [sql, valores] = ultimaQuery();
        expect(sql).toMatch(/p\.ind_paciente = 1 AND p\.ind_status = \? AND \(p\.nom_completo LIKE \? OR p\.num_cpf LIKE \?\)/);
        expect(valores).toEqual(['ativo', '%Ana%', '%Ana%']);
    });
    it('papel inválido lança', async () => {
        await expect(Model.listar({ papel: 'hacker' })).rejects.toThrow('Papel inválido');
    });
});

describe('PessoaModel – escrita', () => {
    it('atualizar usa whitelist do montarUpdate', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(Model.atualizar(5, { nom_completo: 'Ana' })).resolves.toBe(true);
        expect(montarUpdate).toHaveBeenCalledWith({ nom_completo: 'Ana' }, expect.arrayContaining(['des_senha', 'ind_status']));
        expect(montarUpdate.mock.calls[0][1]).not.toContain('id');
        expect(ultimaQuery()).toEqual(['UPDATE tab_pessoas SET nom_completo = ? WHERE id = ? AND deleted_at IS NULL', ['Ana', 5]]);
    });
    it.each([['atualizar', [5, {}]], ['deletar', [5]]])('%s retorna false sem linhas afetadas', async (metodo, args) => {
        database.query.mockResolvedValue({ affectedRows: 0 });
        await expect(Model[metodo](...args)).resolves.toBe(false);
    });
    it('deletar é soft delete', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(Model.deletar(5)).resolves.toBe(true);
        expect(ultimaQuery()[0]).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
    });
});

describe('PessoaModel – controle de login', () => {
    it.each([
        ['incrementarTentativasLogin', /num_tentativas_login = num_tentativas_login \+ 1/],
        ['bloquearLogin', /dta_bloqueio_login = CURRENT_TIMESTAMP/],
        ['resetarTentativasLogin', /num_tentativas_login = 0,\s+dta_bloqueio_login = NULL,\s+dta_ultimo_login = CURRENT_TIMESTAMP/]
    ])('%s', async (metodo, regex) => {
        await expect(Model[metodo](3)).resolves.toBeUndefined();
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(regex), [3]);
    });
    it('verificarBloqueio', async () => {
        database.query.mockResolvedValueOnce([{ num_tentativas_login: 2 }]).mockResolvedValueOnce([]);
        await expect(Model.verificarBloqueio(3)).resolves.toEqual({ num_tentativas_login: 2 });
        await expect(Model.verificarBloqueio(4)).resolves.toBeNull();
    });
});
