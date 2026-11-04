// src/tests/unit/models/EmpresaModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({ montarUpdate: jest.fn(() => ({ set: 'nom_fantasia = ?', valores: ['X'] })) }));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
const Model = require('../../../models/sistema/EmpresaModel');

const empresa = (o = {}) => ({
    id_cidade: 1, nom_fantasia: 'Minha Empresa', nom_razao_social: 'Empresa Ltda', num_cnpj: '11444777000161',
    num_inscricao_estadual: '123', dta_abertura: '2025-01-01', des_logradouro: 'Rua A', num_cep: '12345678',
    nom_bairro: 'Centro', num_celular_1: '11988887777', des_email_1: 'contato@empresa.com', ind_ativo: true, ...o
});

beforeEach(() => jest.clearAllMocks());

describe('EmpresaModel.criar', () => {
    it('aplica defaults (?? null / true / FFFFFF) e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 3 });
        await expect(Model.criar(empresa())).resolves.toBe(3);
        const [sql, v] = database.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO tab_empresa/);
        expect(v).toHaveLength(23);
        expect(v).toEqual([
            1, 'Minha Empresa', 'Empresa Ltda', '11444777000161', '123', '2025-01-01', 'Rua A',
            null, null, '12345678', 'Centro', '11988887777', true, null, true,
            'contato@empresa.com', null, 'FFFFFF', true, null, null, null, null
        ]);
    });
    it('usa valores informados quando presentes', async () => {
        database.query.mockResolvedValue({ insertId: 4 });
        await Model.criar(empresa({
            num_endereco: '10', des_complemento: 'Sala 1', ind_whatsapp_1: false, num_celular_2: '1133334444',
            ind_whatsapp_2: false, des_email_2: 'b@e.com', val_cor_principal: '000000',
            des_url_logo_vertical: 'v', des_url_logo_horizontal: 'h',
            des_url_logo_vertical_negativa: 'vn', des_url_logo_horizontal_negativa: 'hn'
        }));
        const v = database.query.mock.calls[0][1];
        expect(v.slice(7, 9)).toEqual(['10', 'Sala 1']);
        expect(v.slice(12, 15)).toEqual([false, '1133334444', false]);
        expect(v.slice(16)).toEqual(['b@e.com', '000000', true, 'v', 'h', 'vn', 'hn']);
    });
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db'));
        await expect(Model.criar(empresa())).rejects.toThrow('db');
    });
});

describe('EmpresaModel – consultas', () => {
    it('listar retorna linhas ou null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(undefined);
        await expect(Model.listar()).resolves.toEqual([{ id: 1 }]);
        await expect(Model.listar()).resolves.toBeNull();
    });
    it.failing('listar deveria ignorar deletadas', async () => {
        database.query.mockResolvedValue([]);
        await Model.listar();
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });
    it('buscarEmpresaPorId encontrado/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(Model.buscarEmpresaPorId(1)).resolves.toEqual({ id: 1 });
        await expect(Model.buscarEmpresaPorId(2)).resolves.toBeNull();
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });
    it.each([[[{ total: 2 }], 2], [[], 0], [[{ total: 0 }], 0]])('contarEmpresasAtivas %j → %i', async (ret, esperado) => {
        database.query.mockResolvedValue(ret);
        await expect(Model.contarEmpresasAtivas(1)).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });
    it.each([[[{ id: 2 }], 2], [[], null]])('buscarIdEmpresaPadrao %j → %p', async (ret, esperado) => {
        database.query.mockResolvedValue(ret);
        await expect(Model.buscarIdEmpresaPadrao()).resolves.toBe(esperado);
    });
    it('buscarConfigSmtp encontrado/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1, des_smtp_host: 'smtp.x' }]).mockResolvedValueOnce([]);
        await expect(Model.buscarConfigSmtp(1)).resolves.toMatchObject({ des_smtp_host: 'smtp.x' });
        await expect(Model.buscarConfigSmtp(1)).resolves.toBeNull();
    });
    it.failing('buscarConfigSmtp deveria selecionar updated_at (typo updated_ad)', async () => {
        database.query.mockResolvedValue([]);
        await Model.buscarConfigSmtp(1);
        expect(database.query.mock.calls[0][0]).not.toMatch(/updated_ad/);
    });
});

describe('EmpresaModel – escrita', () => {
    it.each([
        ['desativarEmpresa', /SET ind_ativo = FALSE/],
        ['ativarEmpresa', /SET ind_ativo = TRUE/],
        ['deletar', /deleted_at = CURRENT_TIMESTAMP/]
    ])('%s true/false', async (m, regex) => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(Model[m](1)).resolves.toBe(true);
        await expect(Model[m](1)).resolves.toBe(false);
        expect(database.query.mock.calls[0][0]).toMatch(regex);
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });
    it('atualizar monta SET e retorna true/false (linha 135)', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(Model.atualizar(1, { nom_fantasia: 'X' })).resolves.toBe(true);
        await expect(Model.atualizar(1, { nom_fantasia: 'X' })).resolves.toBe(false);
        expect(montarUpdate).toHaveBeenCalled();
        expect(database.query.mock.calls[0][1]).toEqual(['X', 1]);
    });
    it.failing('atualizar deveria usar tab_empresa e campos de empresa', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizar(1, { nom_fantasia: 'X' });
        expect(database.query.mock.calls[0][0]).toMatch(/UPDATE tab_empresa/);
        expect(montarUpdate.mock.calls[0][1]).toContain('nom_fantasia');
    });
    it('atualizarSmtp envia parâmetros na ordem com COALESCE da senha', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        const d = {
            ind_smtp_ativo: true, des_smtp_host: 'smtp.x', num_smtp_porta: 587, ind_smtp_seguro: false,
            des_smtp_usuario: 'u', des_smtp_email_remetente: 'r@x.com', nom_smtp_remetente: 'Loja'
        };
        await expect(Model.atualizarSmtp(1, d, 'enc')).resolves.toBe(true);
        const [sql, p] = database.query.mock.calls[0];
        expect(sql).toMatch(/COALESCE\(\?, des_smtp_senha_enc\)/);
        expect(p).toEqual([true, 'smtp.x', 587, false, 'u', 'r@x.com', 'Loja', 'enc', 1]);
        await expect(Model.atualizarSmtp(1, d, null)).resolves.toBe(false);
        expect(database.query.mock.calls[1][1][7]).toBeNull();
    });
});
