// src/tests/unit/models/AgendamentoModel.test.js
jest.mock('../../../utils/sqlUtils', () => ({
    ...jest.requireActual('../../../utils/sqlUtils'),
    executar: jest.fn()
}));
jest.mock('../../../config/database', () => ({ query: jest.fn() }));
const { executar } = require('../../../utils/sqlUtils');
const Model = require('../../../models/agendamento/AgendamentoModel');

describe('AgendamentoModel', () => {
    describe('_montarFiltros', () => {
        it('sem filtros → apenas soft delete', () => {
            expect(Model._montarFiltros({})).toEqual({ where: 'a.deleted_at IS NULL', valores: [] });
        });
        it('com todos os filtros (datas com hora de borda)', () => {
            const { where, valores } = Model._montarFiltros({
                id_costureira: 3, dta_inicio: '2030-01-01', dta_fim: '2030-01-31', ind_status: 'agendado'
            });
            expect(where.split(' AND ')).toHaveLength(5);
            expect(valores).toEqual([3, '2030-01-01 00:00:00', '2030-01-31 23:59:59', 'agendado']);
        });
    });

    describe('listar — paginação (valores-limite)', () => {
        beforeEach(() => executar.mockResolvedValue([]));
        it.each([
            [{}, 20, 0],
            [{ limite: '1', pagina: '1' }, 1, 0],
            [{ limite: '100', pagina: '2' }, 100, 100],
            [{ limite: '101' }, 100, 0],
            [{ limite: '-5', pagina: '-3' }, 1, 0],
            [{ limite: 'abc', pagina: 'x' }, 20, 0],
            [{ limite: '10', pagina: '3' }, 10, 20]
        ])('%p → LIMIT %i OFFSET %i', async (f, limite, offset) => {
            await Model.listar(f);
            expect(executar.mock.calls[0][0]).toContain(`LIMIT ${limite} OFFSET ${offset}`);
        });
    });

    it('contar retorna número', async () => {
        executar.mockResolvedValue([{ total: '7' }]);
        await expect(Model.contar({})).resolves.toBe(7);
    });

    describe('verificarConflito', () => {
        it('true quando há registro', async () => {
            executar.mockResolvedValue([{ id: 1 }]);
            await expect(Model.verificarConflito(3, '2030-01-07 10:00:00')).resolves.toBe(true);
        });
        it('ignora o próprio id na edição', async () => {
            executar.mockResolvedValue([]);
            await expect(Model.verificarConflito(3, 'd', 10)).resolves.toBe(false);
            expect(executar.mock.calls[0][0]).toContain('AND id != ?');
            expect(executar.mock.calls[0][1]).toEqual([3, 'd', 10]);
        });
    });

    describe('atualizarStatus (lock otimista)', () => {
        it.each([
            ['confirmado', 'dta_confirmacao', undefined],
            ['concluido', 'dta_conclusao', 1],
            ['cancelado', 'dta_cancelamento', undefined],
            ['falta', null, 0]
        ])('%s', async (status, coluna, compareceu) => {
            executar.mockResolvedValue({ affectedRows: 1 });
            await expect(Model.atualizarStatus(10, 'agendado', status)).resolves.toBe(true);
            const [sql, valores] = executar.mock.calls[0];
            if (coluna) expect(sql).toContain(`${coluna} = CURRENT_TIMESTAMP`);
            if (compareceu !== undefined) expect(valores).toContain(compareceu);
            expect(sql).toContain('AND ind_status = ?');
            expect(valores.slice(-2)).toEqual([10, 'agendado']);
        });
        it('false quando outro processo alterou', async () => {
            executar.mockResolvedValue({ affectedRows: 0 });
            await expect(Model.atualizarStatus(10, 'agendado', 'confirmado')).resolves.toBe(false);
        });
    });

    it('criar usa null para opcionais e retorna insertId', async () => {
        executar.mockResolvedValue({ insertId: 99 });
        await expect(Model.criar({ id_paciente: 1, id_costureira: 2, dta_agendamento: 'd', des_url_externa: 'u' })).resolves.toBe(99);
        expect(executar.mock.calls[0][1]).toEqual([1, 2, null, 'd', null, null, 'u']);
    });

    it('buscarPorId retorna null quando vazio', async () => {
        executar.mockResolvedValue([]);
        await expect(Model.buscarPorId(1)).resolves.toBeNull();
    });

    it('atualizar ignora campos fora da whitelist', async () => {
        executar.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizar(1, { des_observacoes_geral: 'x', ind_status: 'concluido' });
        expect(executar.mock.calls[0][0]).not.toContain('ind_status');
    });
});
