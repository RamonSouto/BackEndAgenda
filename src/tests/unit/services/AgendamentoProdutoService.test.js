// src/tests/unit/services/AgendamentoProdutoService.test.js

jest.mock('../../../models/agendamento/AgendamentoProdutoModel', () => ({
    buscarPrecoVigente: jest.fn(), criar: jest.fn(), buscarPorId: jest.fn(),
    listarPorAgendamento: jest.fn(), atualizar: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../models/agendamento/AgendamentoModel', () => ({ buscarPorId: jest.fn() }));
jest.mock('../../../services/produto/ProdutoServicoService', () => ({ buscarServicoPorIdEIdGrade: jest.fn() }));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/acessoAgendamento', () => ({ garantirAcessoAgendamento: jest.fn() }));

const ItemModel = require('../../../models/agendamento/AgendamentoProdutoModel');
const AgendamentoModel = require('../../../models/agendamento/AgendamentoModel');
const ProdutoServicoService = require('../../../services/produto/ProdutoServicoService');
const LogService = require('../../../services/LogService');
const { garantirAcessoAgendamento } = require('../../../utils/acessoAgendamento');
const { ForbiddenError } = require('../../../utils/ApiError');
const Service = require('../../../services/agendamento/AgendamentoProdutoService');

const usuario = { id: 9, papeis: ['secretaria'] };
const agendamento = { id: 1, ind_status: 'agendado' };
const item = (extra = {}) => ({
    id: 3, id_agendamento: 1, ind_status: 'pendente', id_tipo_agendamento: 1, id_produto_grade: 5,
    id_produto_servico: 7, val_preco_servico: '100.00', val_desconto_servico: '0.00', ...extra
});
const novoItem = (extra = {}) => ({ id_agendamento: 1, id_produto_grade: 5, id_produto_servico: 7, id_tipo_agendamento: 1, ...extra });

beforeEach(() => {
    jest.clearAllMocks();
    garantirAcessoAgendamento.mockImplementation(() => { });
    AgendamentoModel.buscarPorId.mockResolvedValue(agendamento);
    ItemModel.buscarPorId.mockResolvedValue(item());
    ItemModel.buscarPrecoVigente.mockResolvedValue({ val_preco: '120.00' });
    ItemModel.criar.mockResolvedValue(3);
    ItemModel.atualizar.mockResolvedValue(true);
    ItemModel.deletar.mockResolvedValue(true);
    ProdutoServicoService.buscarServicoPorIdEIdGrade.mockResolvedValue({ id: 7 });
});

describe('adicionarItem', () => {
    it('preço vem do banco, nunca do cliente', async () => {
        await Service.adicionarItem(novoItem({ val_preco_servico: 1 }), usuario);
        expect(ItemModel.criar).toHaveBeenCalledWith(expect.objectContaining({ val_preco_servico: 120, val_desconto_servico: 0 }));
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'criar', id_usuario: 9, num_registro_id: 3 }));
    });
    it('validação → 400', async () => {
        await expect(Service.adicionarItem({}, usuario)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.each([
        ['agendamento inexistente', () => AgendamentoModel.buscarPorId.mockResolvedValue(null), 404],
        ['agendamento finalizado', () => AgendamentoModel.buscarPorId.mockResolvedValue({ ...agendamento, ind_status: 'concluido' }), 422],
        ['serviço não pertence à grade', () => ProdutoServicoService.buscarServicoPorIdEIdGrade.mockResolvedValue(null), 422],
        ['sem preço vigente', () => ItemModel.buscarPrecoVigente.mockResolvedValue(null), 422]
    ])('%s', async (_, setup, status) => {
        setup();
        await expect(Service.adicionarItem(novoItem(), usuario)).rejects.toMatchObject({ statusCode: status });
        expect(ItemModel.criar).not.toHaveBeenCalled();
    });
    it('desconto maior que preço → 422', async () => {
        await expect(Service.adicionarItem(novoItem({ val_desconto_servico: 121 }), usuario)).rejects.toMatchObject({ statusCode: 422 });
    });
    it.failing('deveria validar acesso com o usuário', async () => {
        await Service.adicionarItem(novoItem(), usuario);
        expect(garantirAcessoAgendamento).toHaveBeenCalledWith(usuario, agendamento);
    });
    it.failing('_resolverPreco deveria receber usuario.id, não o objeto', async () => {
        await Service.adicionarItem(novoItem(), usuario);
        expect(ProdutoServicoService.buscarServicoPorIdEIdGrade).toHaveBeenCalledWith(7, 5, 9);
    });
});

describe('consultas', () => {
    it('listarPorAgendamento valida escopo', async () => {
        await Service.listarPorAgendamento(1, usuario);
        expect(garantirAcessoAgendamento).toHaveBeenCalledWith(usuario, agendamento);
        expect(ItemModel.listarPorAgendamento).toHaveBeenCalledWith(1);
    });
    it('acesso negado propaga', async () => {
        garantirAcessoAgendamento.mockImplementation(() => { throw new ForbiddenError(); });
        await expect(Service.listarPorAgendamento(1, usuario)).rejects.toMatchObject({ statusCode: 403 });
    });
    it('buscarPorId: item de outro agendamento → 404 (anti-IDOR)', async () => {
        ItemModel.buscarPorId.mockResolvedValue(item({ id_agendamento: 2 }));
        await expect(Service.buscarPorId(1, 3, usuario)).rejects.toMatchObject({ statusCode: 404 });
    });
    it('buscarPorId aceita id como string', async () => {
        await expect(Service.buscarPorId('1', '3', usuario)).resolves.toMatchObject({ id: 3 });
    });
});

describe('atualizar', () => {
    it('sem alterações reais retorna item atual', async () => {
        await expect(Service.atualizar(1, 3, { val_desconto_servico: 0 }, usuario)).resolves.toMatchObject({ id: 3 });
        expect(ItemModel.atualizar).not.toHaveBeenCalled();
    });
    it('desconto isolado valida contra preço congelado', async () => {
        await Service.atualizar(1, 3, { val_desconto_servico: 10 }, usuario);
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { val_desconto_servico: 10 });
        expect(ItemModel.buscarPrecoVigente).not.toHaveBeenCalled();
        await expect(Service.atualizar(1, 3, { val_desconto_servico: 101 }, usuario)).rejects.toMatchObject({ statusCode: 422 });
    });
    it('trocar grade recalcula preço vigente', async () => {
        await Service.atualizar(1, 3, { id_produto_grade: 6 }, usuario);
        expect(ProdutoServicoService.buscarServicoPorIdEIdGrade).toHaveBeenCalledWith(7, 6, 9);
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { id_produto_grade: 6, val_preco_servico: 120 });
    });
    it('log antes/depois', async () => {
        await Service.atualizar(1, 3, { des_ajuste_produto: 'Barra' }, usuario);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({
            antes: { des_ajuste_produto: undefined }, depois: { des_ajuste_produto: 'Barra' }
        });
    });
    it.each(['concluido', 'cancelado'])('item %s não pode ser alterado', async (status) => {
        ItemModel.buscarPorId.mockResolvedValue(item({ ind_status: status }));
        await expect(Service.atualizar(1, 3, { des_ajuste_produto: 'x' }, usuario)).rejects.toMatchObject({ statusCode: 422 });
    });
    it('preço do cliente é descartado', async () => {
        await expect(Service.atualizar(1, 3, { val_preco_servico: 1 }, usuario)).rejects.toMatchObject({ statusCode: 400 });
    });
});

describe('deletarItem', () => {
    it('soft delete e log', async () => {
        await expect(Service.deletarItem(1, 3, usuario)).resolves.toBe(true);
        expect(ItemModel.deletar).toHaveBeenCalledWith(1, 3);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'deletar', num_registro_id: 3 }));
    });
    it.failing('deveria validar acesso com o usuário', async () => {
        await Service.deletarItem(1, 3, usuario);
        expect(garantirAcessoAgendamento).toHaveBeenCalledWith(usuario, agendamento);
    });
    it.failing('item concluído não deveria ser excluído', async () => {
        ItemModel.buscarPorId.mockResolvedValue(item({ ind_status: 'concluido' }));
        await expect(Service.deletarItem(1, 3, usuario)).rejects.toMatchObject({ statusCode: 422 });
    });
});
