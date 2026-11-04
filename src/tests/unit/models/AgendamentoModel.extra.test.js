jest.mock('../../../utils/sqlUtils', () => ({ executar: jest.fn(), montarUpdate: jest.fn() }));

const { executar, montarUpdate } = require('../../../utils/sqlUtils');
const model = require('../../../models/agendamento/AgendamentoModel');

beforeEach(() => jest.clearAllMocks());

describe('_montarFiltros', () => {
    it('sem filtros', () => expect(model._montarFiltros({})).toEqual({ where: 'a.deleted_at IS NULL', valores: [] }));
    it('todos os filtros', () => {
        const r = model._montarFiltros({ id_costureira: 2, dta_inicio: '2026-01-01', dta_fim: '2026-01-31', ind_status: 'agendado' });
        expect(r.valores).toEqual([2, '2026-01-01 00:00:00', '2026-01-31 23:59:59', 'agendado']);
    });
});

it('criar usa null nos opcionais', async () => {
    executar.mockResolvedValue({ insertId: 5 });
    await expect(model.criar({ id_paciente: 1, id_costureira: 2, dta_agendamento: 'd', des_url_externa: 'u' })).resolves.toBe(5);
    expect(executar.mock.calls[0][1]).toEqual([1, 2, null, 'd', null, null, 'u']);
});

describe.each([
    ['buscarPorId', [1]],
    ['buscarPorUuid', ['uuid']],
    ['buscarDadosNotificacao', [1]]
])('%s', (metodo, args) => {
    it('retorna o registro', async () => {
        executar.mockResolvedValue([{ id: 1 }]);
        await expect(model[metodo](...args)).resolves.toEqual({ id: 1 });
    });
    it('retorna null', async () => {
        executar.mockResolvedValue([]);
        await expect(model[metodo](...args)).resolves.toBeNull();
    });
});

describe('listar', () => {
    it.each([
        [{}, 'LIMIT 20 OFFSET 0'],
        [{ limite: '500', pagina: '3' }, 'LIMIT 100 OFFSET 200'],
        [{ limite: '-5', pagina: '-1' }, 'LIMIT 1 OFFSET 0'],
        [{ limite: 'abc', pagina: 'x' }, 'LIMIT 20 OFFSET 0']
    ])('paginação %p', async (filtros, esperado) => {
        executar.mockResolvedValue([]);
        await model.listar(filtros);
        expect(executar.mock.calls[0][0]).toContain(esperado);
    });
    it('padrão sem argumento', async () => {
        executar.mockResolvedValue([]);
        await expect(model.listar()).resolves.toEqual([]);
    });
});

it('contar', async () => {
    executar.mockResolvedValue([{ total: '7' }]);
    await expect(model.contar()).resolves.toBe(7);
});

describe('verificarConflito', () => {
    it('sem ignorarId', async () => {
        executar.mockResolvedValue([{ id: 1 }]);
        await expect(model.verificarConflito(2, 'd')).resolves.toBe(true);
        expect(executar.mock.calls[0][1]).toEqual([2, 'd']);
    });
    it('com ignorarId', async () => {
        executar.mockResolvedValue([]);
        await expect(model.verificarConflito(2, 'd', 9)).resolves.toBe(false);
        expect(executar.mock.calls[0][0]).toContain('id != ?');
    });
});

describe('atualizarStatus', () => {
    it.each([
        ['confirmado', 'dta_confirmacao', undefined],
        ['concluido', 'dta_conclusao', 1],
        ['cancelado', 'dta_cancelamento', undefined],
        ['falta', null, 0],
        ['agendado', null, undefined]
    ])('%s', async (status, coluna, compareceu) => {
        executar.mockResolvedValue({ affectedRows: 1 });
        await expect(model.atualizarStatus(1, 'agendado', status)).resolves.toBe(true);
        const [sql, valores] = executar.mock.calls[0];
        if (coluna) expect(sql).toContain(coluna);
        if (compareceu !== undefined) expect(valores).toEqual([status, compareceu, 1, 'agendado']);
        else expect(valores).toEqual([status, 1, 'agendado']);
    });
    it('false com lock otimista', async () => {
        executar.mockResolvedValue({ affectedRows: 0 });
        await expect(model.atualizarStatus(1, 'agendado', 'confirmado')).resolves.toBe(false);
    });
});

describe.each([
    ['trocarCostureira', [1, 3], [3, 1]],
    ['deletar', [1], [1]]
])('%s', (metodo, args, valores) => {
    it.each([[1, true], [0, false]])('affectedRows=%i', async (rows, esperado) => {
        executar.mockResolvedValue({ affectedRows: rows });
        await expect(model[metodo](...args)).resolves.toBe(esperado);
        expect(executar.mock.calls[0][1]).toEqual(valores);
    });
});

it('atualizar usa a whitelist', async () => {
    montarUpdate.mockReturnValue({ set: 'id_secretaria = ?', valores: [4] });
    executar.mockResolvedValue({ affectedRows: 1 });
    await expect(model.atualizar(1, { id_secretaria: 4 })).resolves.toBe(true);
    expect(montarUpdate).toHaveBeenCalledWith({ id_secretaria: 4 }, expect.arrayContaining(['dta_agendamento']));
    expect(executar.mock.calls[0][1]).toEqual([4, 1]);
});
