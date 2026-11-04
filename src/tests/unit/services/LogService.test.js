// /src/tests/unit/services/LogService.test.js

jest.mock('../../../models/LogModel', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarPorUsuario: jest.fn(),
    buscarPorTabela: jest.fn(), estatisticasAcoes: jest.fn(), estatisticasUsuarios: jest.fn()
}));

const LogModel = require('../../../models/LogModel');
const Service = require('../../../services/LogService');

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => jest.restoreAllMocks());

describe('LogService.registrar', () => {
    it('retorna id do log', async () => {
        LogModel.criar.mockResolvedValue(9);
        await expect(Service.registrar({ des_acao: 'x' })).resolves.toBe(9);
    });
    it('erro NÃO é propagado: retorna null e loga', async () => {
        LogModel.criar.mockRejectedValue(new Error('db down'));
        await expect(Service.registrar({})).resolves.toBeNull();
        expect(console.error).toHaveBeenCalledWith('Erro ao registrar log:', 'db down');
    });
});

describe('LogService – delegações', () => {
    it.each([
        ['listar', 'listar', [{ des_acao: 'x' }], [{ des_acao: 'x' }]],
        ['listar', 'listar', [], [{}]],
        ['buscarPorUsuario', 'buscarPorUsuario', [1], [1, 50]],
        ['buscarPorUsuario', 'buscarPorUsuario', [1, 5], [1, 5]],
        ['buscarPorTabela', 'buscarPorTabela', ['tab_x'], ['tab_x', null]],
        ['buscarPorTabela', 'buscarPorTabela', ['tab_x', 7], ['tab_x', 7]],
        ['obterEstatisticasAcoes', 'estatisticasAcoes', ['a', 'b'], ['a', 'b']],
        ['obterEstatisticasUsuarios', 'estatisticasUsuarios', ['a', 'b'], ['a', 'b']]
    ])('%s(%j) → LogModel.%s', async (metodo, modelo, args, esperado) => {
        LogModel[modelo].mockResolvedValue(['ok']);
        await expect(Service[metodo](...args)).resolves.toEqual(['ok']);
        expect(LogModel[modelo]).toHaveBeenCalledWith(...esperado);
    });
    it.each(['listar', 'buscarPorUsuario', 'buscarPorTabela', 'obterEstatisticasAcoes', 'obterEstatisticasUsuarios'])
        ('%s propaga erro', async (metodo) => {
            Object.values(LogModel).forEach((fn) => fn.mockRejectedValue(new Error('db down')));
            await expect(Service[metodo](1)).rejects.toThrow('db down');
        });
});

describe('LogService.gerarRelatorioAuditoria', () => {
    const logs = [
        { des_acao: 'criar', des_tabela: 'tab_a', usuario_nome: 'Ana' },
        { des_acao: 'criar', des_tabela: 'tab_b', usuario_nome: 'Bia' },
        { des_acao: 'editar', des_tabela: 'tab_a', usuario_nome: 'Bia' },
        { des_acao: 'login', des_tabela: 'tab_a', usuario_nome: null }
    ];

    it('agrega por ação, usuário (ordenado) e tabela', async () => {
        LogModel.listar.mockResolvedValue(logs);
        const r = await Service.gerarRelatorioAuditoria({ data_inicio: '2026-01-01', data_fim: '2026-01-31' });
        expect(r.total_logs).toBe(4);
        expect(r.periodo).toEqual({ inicio: '2026-01-01', fim: '2026-01-31' });
        expect(r.por_acao).toEqual({ criar: 2, editar: 1, login: 1 });
        expect(r.por_tabela).toEqual({ tab_a: 3, tab_b: 1 });
        expect(r.por_usuario.map((u) => [u.nome, u.total])).toEqual([['Bia', 2], ['Ana', 1]]);
        expect(r.logs_detalhados).toBe(logs);
    });
    it('remove filtros null/undefined', async () => {
        LogModel.listar.mockResolvedValue([]);
        await Service.gerarRelatorioAuditoria({ des_acao: 'x', id_usuario: null, des_tabela: undefined, limite: 0 });
        expect(LogModel.listar).toHaveBeenCalledWith({ des_acao: 'x', limite: 0 });
    });
    it('lista vazia', async () => {
        LogModel.listar.mockResolvedValue([]);
        const r = await Service.gerarRelatorioAuditoria();
        expect(r).toMatchObject({ total_logs: 0, por_acao: {}, por_usuario: [], por_tabela: {} });
    });
    it('propaga erro', async () => {
        LogModel.listar.mockRejectedValue(new Error('db down'));
        await expect(Service.gerarRelatorioAuditoria()).rejects.toThrow('db down');
    });
    it.failing('tipo do usuário deve ser preenchido (listar não retorna usuario_tipo)', async () => {
        LogModel.listar.mockResolvedValue([{ des_acao: 'x', des_tabela: 't', usuario_nome: 'Ana', usuario_administrador: 1 }]);
        const r = await Service.gerarRelatorioAuditoria();
        expect(r.por_usuario[0].tipo).toBeDefined();
    });
    it.failing('não deve fazer console.log de debug', async () => {
        LogModel.listar.mockResolvedValue([]);
        await Service.gerarRelatorioAuditoria({ des_acao: 'x' });
        expect(console.log).not.toHaveBeenCalled();
    });
});
