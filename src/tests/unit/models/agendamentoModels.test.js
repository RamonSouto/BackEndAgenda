// /src/tests/unit/models/agendamentoModels.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({
    montarUpdate: jest.fn(() => ({ set: 'x = ?', valores: ['v'] })),
    executar: jest.fn()
}));

const database = require('../../../config/database');
const { montarUpdate, executar } = require('../../../utils/sqlUtils');
const TipoModel = require('../../../models/agendamento/TipoAgendamentoModel');
const ItemModel = require('../../../models/agendamento/AgendamentoProdutoModel');
const FotoModel = require('../../../models/agendamento/FotoProdutoAgendamentoModel');

beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue([]);
    executar.mockResolvedValue([]);
});

const q = () => database.query.mock.calls[0];
const novaConn = (rows = []) => ({ execute: jest.fn().mockResolvedValue([rows]) });

describe('TipoAgendamentoModel', () => {
    it('criar retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 4 });
        await expect(TipoModel.criar({ des_tipo_agendamento: 'Ajuste', ind_ativo: true })).resolves.toBe(4);
        expect(q()[1]).toEqual(['Ajuste', true]);
    });
    it('listar ignora deletados', async () => {
        await TipoModel.listar();
        expect(q()[0]).toMatch(/deleted_at IS NULL\s+ORDER BY des_tipo_agendamento/);
    });
    it('buscarPorId registro/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(TipoModel.buscarPorId(1)).resolves.toEqual({ id: 1 });
        await expect(TipoModel.buscarPorId(2)).resolves.toBeNull();
    });
    it('atualizar usa whitelist', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(TipoModel.atualizar(1, { des_tipo_agendamento: 'X' })).resolves.toBe(true);
        expect(montarUpdate.mock.calls[0][1]).toEqual(['des_tipo_agendamento', 'ind_ativo']);
        expect(q()).toEqual(['UPDATE tab_tipo_agendamento SET x = ? WHERE id = ? AND deleted_at IS NULL', ['v', 1]]);
    });
    it('deletar soft / sem linhas', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(TipoModel.deletar(1)).resolves.toBe(true);
        expect(q()[0]).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
        await expect(TipoModel.deletar(1)).resolves.toBe(false);
    });
});

describe('AgendamentoProdutoModel', () => {
    it('buscarPrecoVigente pelo pool', async () => {
        database.query.mockResolvedValueOnce([{ val_preco: '50.00' }]).mockResolvedValueOnce([]);
        await expect(ItemModel.buscarPrecoVigente(7)).resolves.toEqual({ val_preco: '50.00' });
        expect(q()[0]).toMatch(/dta_inicio <= CURDATE\(\)[\s\S]+ORDER BY dta_inicio DESC\s+LIMIT 1/);
        await expect(ItemModel.buscarPrecoVigente(7)).resolves.toBeNull();
    });
    it('buscarPrecoVigente na transação usa connection.execute', async () => {
        const conn = novaConn([{ val_preco: '10' }]);
        await expect(ItemModel.buscarPrecoVigente(7, conn)).resolves.toEqual({ val_preco: '10' });
        expect(database.query).not.toHaveBeenCalled();
    });
    it('criar aplica defaults e status pendente', async () => {
        database.query.mockResolvedValue({ insertId: 3 });
        await expect(ItemModel.criar({
            id_agendamento: 1, id_tipo_agendamento: 2, id_produto_grade: 5, id_produto_servico: 7, val_preco_servico: 100
        })).resolves.toBe(3);
        expect(q()[0]).toMatch(/'pendente'\)/);
        expect(q()[1]).toEqual([1, 2, 5, 7, null, 100, 0]);
    });
    it.each(['buscarPorId', 'listarPorAgendamento'])('%s filtra deletados', async (m) => {
        await ItemModel[m](1);
        expect(q()[0]).toMatch(/pa\.deleted_at IS NULL/);
    });
    it('atualizar: whitelist não permite trocar id_agendamento', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await ItemModel.atualizar(3, {});
        expect(montarUpdate.mock.calls[0][1]).toContain('val_preco_servico');
        expect(montarUpdate.mock.calls[0][1]).not.toContain('id_agendamento');
    });
    it('deletar respeita ordem dos parâmetros (anti-IDOR)', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(ItemModel.deletar(1, 3)).resolves.toBe(true);
        expect(q()[1]).toEqual([3, 1]);
    });
});

describe('FotoProdutoAgendamentoModel', () => {
    it('buscarContextoItem com lock usa conexão e FOR UPDATE', async () => {
        const conn = novaConn([{ id_item: 3 }]);
        await expect(FotoModel.buscarContextoItem(3, conn, true)).resolves.toEqual({ id_item: 3 });
        expect(conn.execute.mock.calls[0][0]).toMatch(/FOR UPDATE/);
    });
    it('buscarContextoItem sem lock', async () => {
        await expect(FotoModel.buscarContextoItem(3)).resolves.toBeNull();
        expect(q()[0]).not.toMatch(/FOR UPDATE/);
    });
    it('contarPorItem converte para Number', async () => {
        database.query.mockResolvedValue([{ total: '3' }]);
        await expect(FotoModel.contarPorItem(3)).resolves.toBe(3);
    });
    it('criar', async () => {
        const conn = { execute: jest.fn().mockResolvedValue([{ insertId: 11 }]) };
        await expect(FotoModel.criar({
            id_produto_agendamento: 3, des_caminho_arquivo: 'ajustes/a.jpg', nom_original: 'a.jpg', num_tamanho_bytes: 10, ind_tipo_foto: 'antes'
        }, conn)).resolves.toBe(11);
        expect(conn.execute.mock.calls[0][1]).toEqual([3, 'ajustes/a.jpg', 'a.jpg', 10, 'antes']);
    });
    it('listarPorItem não expõe caminho físico', async () => {
        await FotoModel.listarPorItem(3);
        expect(q()[0]).not.toMatch(/des_caminho_arquivo/);
    });
    it('buscarPorId com lock repassa conexão', async () => {
        const conn = {};
        executar.mockResolvedValue([{ id: 10 }]);
        await expect(FotoModel.buscarPorId(10, conn, true)).resolves.toEqual({ id: 10 });
        expect(executar).toHaveBeenCalledWith(expect.stringMatching(/FOR UPDATE/), [10], conn);
    });
    it('deletar usa COALESCE para o novo caminho', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(FotoModel.deletar(10, null)).resolves.toBe(true);
        expect(q()[0]).toMatch(/COALESCE\(\?, des_caminho_arquivo\)/);
        expect(q()[1]).toEqual([null, 10]);
    });
});
