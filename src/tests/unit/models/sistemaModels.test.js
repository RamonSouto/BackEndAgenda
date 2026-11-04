// /src/tests/unit/models/sistemaModels.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({
    montarUpdate: jest.fn(() => ({ set: 'x = ?', valores: ['v'] }))
}));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
const CidadeModel = require('../../../models/sistema/CidadeModel');
const EstadoModel = require('../../../models/sistema/EstadoModel');
const EmpresaModel = require('../../../models/sistema/EmpresaModel');

const q = () => database.query.mock.calls[0];

beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue([]);
});

describe('CidadeModel', () => {
    it('listarCidades faz JOIN com estado', async () => {
        database.query.mockResolvedValue([{ id: 1, sgl_estado: 'GO' }]);
        await expect(CidadeModel.listarCidades()).resolves.toEqual([{ id: 1, sgl_estado: 'GO' }]);
        expect(q()[0]).toMatch(/INNER JOIN tab_estado e ON \(c\.id_estado = e\.id\)/);
    });
    it('buscarCidadeId', async () => {
        await CidadeModel.buscarCidadeId(5);
        expect(q()[1]).toEqual([5]);
    });
    it('buscarCidadeNome usa LIKE parcial', async () => {
        await CidadeModel.buscarCidadeNome('Goi');
        expect(q()[1]).toEqual(['%Goi%']);
    });
    it('buscarCidadeEstadoId filtra pelo estado', async () => {
        await CidadeModel.buscarCidadeEstadoId(9);
        expect(q()[0]).toMatch(/WHERE e\.id = \?/);
        expect(q()[1]).toEqual([9]);
    });
    it('retorna null quando o driver não devolve nada', async () => {
        database.query.mockResolvedValue(undefined);
        await expect(CidadeModel.listarCidades()).resolves.toBeNull();
    });
    it.failing('buscarCidadeId deveria retornar objeto, não array', async () => {
        database.query.mockResolvedValue([{ id: 5 }]);
        await expect(CidadeModel.buscarCidadeId(5)).resolves.toEqual({ id: 5 });
    });
    it.failing('LIKE deveria escapar curingas (% e _)', async () => {
        await CidadeModel.buscarCidadeNome('%');
        expect(q()[1]).toEqual(['%\\%%']);
    });
});

describe('EstadoModel', () => {
    it('listarEstados', async () => {
        database.query.mockResolvedValue([{ id: 9 }]);
        await expect(EstadoModel.listarEstados()).resolves.toEqual([{ id: 9 }]);
    });
    it('buscarEstadoId', async () => {
        await EstadoModel.buscarEstadoId(9);
        expect(q()[1]).toEqual([9]);
    });
    it.each([['buscarEstadoNome', 'Goiás'], ['buscarEstadoSgl', 'GO']])('%s usa LIKE parcial', async (m, v) => {
        await EstadoModel[m](v);
        expect(q()[1]).toEqual([`%${v}%`]);
    });
    it.failing('buscarEstadoSgl deveria ser busca exata (sigla "G" retorna GO, MG...)', async () => {
        await EstadoModel.buscarEstadoSgl('GO');
        expect(q()[1]).toEqual(['GO']);
    });
});

describe('EmpresaModel', () => {
    const dadosMin = {
        id_cidade: 1, nom_fantasia: 'A', nom_razao_social: 'A Ltda', num_cnpj: '11444777000161',
        num_inscricao_estadual: null, dta_abertura: '2020-01-01', des_logradouro: 'Rua', num_cep: '74000000',
        nom_bairro: 'Centro', num_celular_1: '62999999999', des_email_1: 'a@b.com', ind_ativo: true
    };

    it('criar aplica defaults e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 7 });
        await expect(EmpresaModel.criar(dadosMin)).resolves.toBe(7);
        const v = q()[1];
        expect(v).toHaveLength(23);
        expect(v[7]).toBeNull();          // num_endereco
        expect(v[12]).toBe(true);         // ind_whatsapp_1
        expect(v[17]).toBe('FFFFFF');     // val_cor_principal
        expect(v[18]).toBe(true);         // ind_ativo
    });
    it('buscarEmpresaPorId filtra deletadas e retorna objeto/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(EmpresaModel.buscarEmpresaPorId(1)).resolves.toEqual({ id: 1 });
        expect(q()[0]).toMatch(/deleted_at IS NULL/);
        await expect(EmpresaModel.buscarEmpresaPorId(2)).resolves.toBeNull();
    });
    it.failing('listar deveria ignorar deletadas', async () => {
        await EmpresaModel.listar();
        expect(q()[0]).toMatch(/deleted_at IS NULL/);
    });
    it('contarEmpresasAtivas exclui o próprio id', async () => {
        database.query.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([]);
        await expect(EmpresaModel.contarEmpresasAtivas(1)).resolves.toBe(2);
        expect(q()[0]).toMatch(/id != \?[\s\S]+ind_ativo = TRUE/);
        await expect(EmpresaModel.contarEmpresasAtivas(1)).resolves.toBe(0);
    });
    it.failing('contarEmpresasAtivas deveria retornar Number (COUNT pode vir string/BigInt)', async () => {
        database.query.mockResolvedValue([{ total: '0' }]);
        await expect(EmpresaModel.contarEmpresasAtivas(1)).resolves.toBe(0);
    });
    it.each([['ativarEmpresa', 'TRUE'], ['desativarEmpresa', 'FALSE']])('%s', async (m, val) => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(EmpresaModel[m](1)).resolves.toBe(true);
        expect(q()[0]).toMatch(new RegExp(`ind_ativo = ${val}`));
        await expect(EmpresaModel[m](1)).resolves.toBe(false);
    });
    it('deletar faz soft delete', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(EmpresaModel.deletar(1)).resolves.toBe(true);
        expect(q()[0]).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
    });
    it.failing('atualizar deveria gravar em tab_empresa', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await EmpresaModel.atualizar(1, { nom_fantasia: 'X' });
        expect(q()[0]).toMatch(/^UPDATE tab_empresa /);
    });
    it.failing('atualizar deveria usar whitelist de campos da empresa', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await EmpresaModel.atualizar(1, { nom_fantasia: 'X' });
        expect(montarUpdate.mock.calls[0][1]).toContain('nom_fantasia');
        expect(montarUpdate.mock.calls[0][1]).not.toContain('nom_categoria');
    });
    it('buscarIdEmpresaPadrao', async () => {
        database.query.mockResolvedValueOnce([{ id: 3 }]).mockResolvedValueOnce([]);
        await expect(EmpresaModel.buscarIdEmpresaPadrao()).resolves.toBe(3);
        expect(q()[0]).toMatch(/ind_ativo = 1 AND deleted_at IS NULL ORDER BY id LIMIT 1/);
        await expect(EmpresaModel.buscarIdEmpresaPadrao()).resolves.toBeNull();
    });
    it('atualizarSmtp preserva senha com COALESCE quando null', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        const smtp = {
            ind_smtp_ativo: true, des_smtp_host: 'smtp.x.com', num_smtp_porta: 587, ind_smtp_seguro: false,
            des_smtp_usuario: 'u', des_smtp_email_remetente: 'a@b.com', nom_smtp_remetente: 'Ateliê'
        };
        await expect(EmpresaModel.atualizarSmtp(1, smtp, null)).resolves.toBe(true);
        expect(q()[0]).toMatch(/des_smtp_senha_enc = COALESCE\(\?, des_smtp_senha_enc\)/);
        expect(q()[1]).toEqual([true, 'smtp.x.com', 587, false, 'u', 'a@b.com', 'Ateliê', null, 1]);
    });
    it('buscarConfigSmtp retorna objeto/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(EmpresaModel.buscarConfigSmtp(1)).resolves.toEqual({ id: 1 });
        await expect(EmpresaModel.buscarConfigSmtp(1)).resolves.toBeNull();
    });
    it.failing('buscarConfigSmtp deveria selecionar updated_at (typo updated_ad)', async () => {
        await EmpresaModel.buscarConfigSmtp(1);
        expect(q()[0]).toMatch(/updated_at/);
    });
});
