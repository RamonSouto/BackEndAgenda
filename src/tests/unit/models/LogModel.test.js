// /src/tests/unit/models/LogModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/LogModel');

beforeEach(() => {
    database.query.mockReset().mockResolvedValue([]);
    jest.spyOn(console, 'log').mockImplementation(() => { });
});
afterEach(() => jest.restoreAllMocks());

const ultimaQuery = () => database.query.mock.calls[0];

describe('LogModel.criar', () => {
    it('serializa detalhes e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 10 });
        await expect(Model.criar({
            id_usuario: 1, des_acao: 'criar', des_tabela: 'tab_x', num_registro_id: 5,
            des_detalhes: { a: 1 }, num_ip_address: '1.1.1.1', des_user_agent: 'jest'
        })).resolves.toBe(10);
        expect(ultimaQuery()[1]).toEqual([1, 'criar', 'tab_x', 5, '{"a":1}', '1.1.1.1', 'jest']);
    });
    it('opcionais ausentes viram null e detalhes "{}"', async () => {
        database.query.mockResolvedValue({ insertId: 1 });
        await Model.criar({ des_acao: 'login', des_tabela: 'tab_pessoas' });
        expect(ultimaQuery()[1]).toEqual([null, 'login', 'tab_pessoas', null, '{}', null, null]);
    });
});

describe('LogModel.listar', () => {
    it('sem filtros: apenas ORDER BY', async () => {
        await Model.listar();
        const [sql, valores] = ultimaQuery();
        expect(sql).toMatch(/WHERE 1=1\s+ORDER BY l\.created_at DESC$/);
        expect(valores).toEqual([]);
    });
    it('aplica todos os filtros na ordem', async () => {
        await Model.listar({
            id_usuario: '3', des_acao: 'criar', des_tabela: 'tab_x',
            data_inicio: '2026-01-01T00:00:00Z', data_fim: '2026-01-31T23:59:59Z', limite: '20'
        });
        const [sql, valores] = ultimaQuery();
        expect(sql).toMatch(/l\.id_usuario = \? AND l\.des_acao = \? AND l\.des_tabela = \? AND l\.created_at BETWEEN \? AND \? ORDER BY l\.created_at DESC LIMIT \?/);
        expect(valores).toEqual([3, 'criar', 'tab_x', '2026-01-01 00:00:00', '2026-01-31 23:59:59', 20]);
    });
    it('id_usuario = 0 é aplicado', async () => {
        await Model.listar({ id_usuario: 0 });
        expect(ultimaQuery()[1]).toEqual([0]);
    });
    it.each(['abc', '0', '-5'])('limite inválido (%s) é ignorado', async (limite) => {
        await Model.listar({ limite });
        expect(ultimaQuery()[0]).not.toMatch(/LIMIT/);
    });
    it('só data_inicio não filtra período', async () => {
        await Model.listar({ data_inicio: '2026-01-01' });
        expect(ultimaQuery()[0]).not.toMatch(/BETWEEN/);
    });
    it.failing('não deve fazer console.log de debug', async () => {
        await Model.listar({});
        expect(console.log).not.toHaveBeenCalled();
    });
});

describe('LogModel.buscarPorUsuario', () => {
    it.each([[[7, 10], [7, 10]], [[7], [7, 50]]])('args %j → valores %j', async (args, esperado) => {
        await Model.buscarPorUsuario(...args);
        expect(ultimaQuery()[1]).toEqual(esperado);
    });
});

describe('LogModel.buscarPorTabela', () => {
    it('com registro_id', async () => {
        await Model.buscarPorTabela('tab_x', 42);
        const [sql, valores] = ultimaQuery();
        expect(sql).toMatch(/AND l\.num_registro_id = \?/);
        expect(valores).toEqual(['tab_x', 42]);
    });
    it('sem registro_id', async () => {
        await Model.buscarPorTabela('tab_x');
        expect(ultimaQuery()[0]).not.toMatch(/num_registro_id = \?/);
        expect(ultimaQuery()[1]).toEqual(['tab_x']);
    });
});

describe('LogModel – estatísticas', () => {
    it('estatisticasAcoes agrupa por ação', async () => {
        await Model.estatisticasAcoes('2026-01-01', '2026-01-31');
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/GROUP BY des_acao/), ['2026-01-01', '2026-01-31']);
    });
    it('estatisticasUsuarios agrupa por usuário', async () => {
        await Model.estatisticasUsuarios('2026-01-01', '2026-01-31');
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/GROUP BY p\.id/), ['2026-01-01', '2026-01-31']);
    });
    it.failing('não deve usar p.ind_tipo_pessoa (papéis são colunas ind_*)', async () => {
        await Model.estatisticasUsuarios('2026-01-01', '2026-01-31');
        expect(ultimaQuery()[0]).not.toMatch(/ind_tipo_pessoa/);
    });
});

describe('LogModel – erros', () => {
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.criar({ des_acao: 'x', des_tabela: 'y' })).rejects.toThrow('db down');
    });
});
