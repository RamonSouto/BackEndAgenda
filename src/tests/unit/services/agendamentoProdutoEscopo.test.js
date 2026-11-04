// src/tests/unit/services/agendamentoProdutoEscopo.test.js
jest.mock('../../../models/agendamento/AgendamentoModel', () => ({ buscarPorId: jest.fn() }));
jest.mock('../../../models/agendamento/AgendamentoProdutoModel', () => ({
    buscarPorId: jest.fn(), listarPorAgendamento: jest.fn(), criar: jest.fn(),
    atualizar: jest.fn(), deletar: jest.fn(), buscarPrecoVigente: jest.fn()
}));
jest.mock('../../../services/produto/ProdutoServicoService', () => ({ buscarServicoPorIdEIdGrade: jest.fn() }));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));

const AgendamentoModel = require('../../../models/agendamento/AgendamentoModel');
const ItemModel = require('../../../models/agendamento/AgendamentoProdutoModel');
const ProdutoServicoService = require('../../../services/produto/ProdutoServicoService');
const LogService = require('../../../services/LogService');
const Service = require('../../../services/agendamento/AgendamentoProdutoService');
const { ForbiddenError, NotFoundError, ValidationError, BadRequestError } = require('../../../utils/ApiError');
const { ACOES_LOG } = require('../../../utils/constants');

const DONA = 2;
const U = {
    costureiraDona: { id: DONA, papeis: ['costureira'] },
    costureiraOutra: { id: 7, papeis: ['costureira'] },
    administrador: { id: 1, papeis: ['administrador'] },
    secretaria: { id: 3, papeis: ['secretaria'] },
    medico: { id: 4, papeis: ['medico'] },
    costureiraSecretaria: { id: 7, papeis: ['costureira', 'secretaria'] }
};
const AMPLOS = ['administrador', 'secretaria', 'medico', 'costureiraSecretaria'];

const agendamento = (over = {}) => ({ id: 1, id_costureira: DONA, ind_status: 'agendado', ...over });
const item = (over = {}) => ({
    id: 3, id_agendamento: 1, ind_status: 'pendente', id_produto_grade: 5, id_produto_servico: 9,
    val_preco_servico: '50.00', val_desconto_servico: '0.00', des_ajuste_produto: null, ...over
});
const novo = { id_agendamento: 1, id_produto_grade: 5, id_produto_servico: 9, id_tipo_agendamento: 1 };

beforeEach(() => {
    AgendamentoModel.buscarPorId.mockResolvedValue(agendamento());
    ItemModel.buscarPorId.mockResolvedValue(item());
    ItemModel.listarPorAgendamento.mockResolvedValue([item()]);
    ItemModel.criar.mockResolvedValue(3);
    ItemModel.atualizar.mockResolvedValue(true);
    ItemModel.deletar.mockResolvedValue(true);
    ItemModel.buscarPrecoVigente.mockResolvedValue({ val_preco: '50.00' });
    ProdutoServicoService.buscarServicoPorIdEIdGrade.mockResolvedValue({ id: 9 });
    LogService.registrar.mockResolvedValue();
});

describe('AgendamentoProdutoService – escopo (leitura)', () => {
    describe.each([
        ['listarPorAgendamento', (u) => Service.listarPorAgendamento(1, u)],
        ['buscarPorId', (u) => Service.buscarPorId(1, 3, u)]
    ])('%s', (_, chamar) => {
        it('costureira dona acessa', async () => {
            await expect(chamar(U.costureiraDona)).resolves.toBeDefined();
        });
        it('costureira de outro agendamento → 403', async () => {
            await expect(chamar(U.costureiraOutra)).rejects.toThrow(ForbiddenError);
        });
        it.each(AMPLOS)('%s tem acesso amplo', async (p) => {
            await expect(chamar(U[p])).resolves.toBeDefined();
        });
        it('agendamento inexistente → 404', async () => {
            AgendamentoModel.buscarPorId.mockResolvedValue(null);
            await expect(chamar(U.administrador)).rejects.toThrow('Agendamento não encontrado');
        });
    });

    it('buscarPorId: item de outro agendamento → 404 (anti-IDOR)', async () => {
        ItemModel.buscarPorId.mockResolvedValue(item({ id_agendamento: 99 }));
        await expect(Service.buscarPorId(1, 3, U.administrador)).rejects.toThrow('Item não encontrado neste agendamento');
    });

    it('buscarPorId: item inexistente → 404', async () => {
        ItemModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.buscarPorId(1, 3, U.administrador)).rejects.toThrow(NotFoundError);
    });

    it('buscarPorId: o 403 é checado antes de consultar o item', async () => {
        await expect(Service.buscarPorId(1, 3, U.costureiraOutra)).rejects.toThrow(ForbiddenError);
        expect(ItemModel.buscarPorId).not.toHaveBeenCalled();
    });

    it('listar não consulta itens quando o acesso é negado', async () => {
        await expect(Service.listarPorAgendamento(1, U.costureiraOutra)).rejects.toThrow(ForbiddenError);
        expect(ItemModel.listarPorAgendamento).not.toHaveBeenCalled();
    });
});

describe('AgendamentoProdutoService – atualizar', () => {
    const atualizar = (u, dados = { des_ajuste_produto: 'barra' }) => Service.atualizar(1, 3, dados, u);

    it('payload vazio → 400 (schema .min(1))', async () => {
        await expect(atualizar(U.administrador, {})).rejects.toThrow(BadRequestError);
        expect(AgendamentoModel.buscarPorId).not.toHaveBeenCalled();
    });
    it('val_preco_servico do cliente é descartado (stripUnknown)', async () => {
        await atualizar(U.administrador, { des_ajuste_produto: 'x', val_preco_servico: 0.01 });
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { des_ajuste_produto: 'x' });
    });
    it('costureira dona atualiza e a auditoria registra antes/depois', async () => {
        await atualizar(U.costureiraDona);
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { des_ajuste_produto: 'barra' });
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            id_usuario: DONA, des_acao: ACOES_LOG.EDITAR, num_registro_id: 3,
            des_detalhes: { antes: { des_ajuste_produto: null }, depois: { des_ajuste_produto: 'barra' } }
        }));
    });
    it('costureira de outro agendamento → 403 sem gravar', async () => {
        await expect(atualizar(U.costureiraOutra)).rejects.toThrow(ForbiddenError);
        expect(ItemModel.atualizar).not.toHaveBeenCalled();
    });
    it.each(AMPLOS)('%s atualiza', async (p) => {
        await expect(atualizar(U[p])).resolves.toBeDefined();
    });
    it.each(['concluido', 'cancelado', 'falta'])('agendamento %s → 422', async (s) => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: s }));
        await expect(atualizar(U.administrador)).rejects.toThrow(ValidationError);
    });
    it.each(['concluido', 'cancelado'])('item %s → 422', async (s) => {
        ItemModel.buscarPorId.mockResolvedValue(item({ ind_status: s }));
        await expect(atualizar(U.administrador)).rejects.toThrow('Item finalizado ou cancelado não pode ser alterado');
    });
    it('item de outro agendamento → 404', async () => {
        ItemModel.buscarPorId.mockResolvedValue(item({ id_agendamento: 99 }));
        await expect(atualizar(U.administrador)).rejects.toThrow(NotFoundError);
    });
    it('sem alterações retorna o item atual sem gravar', async () => {
        await expect(atualizar(U.administrador, { des_ajuste_produto: null })).resolves.toEqual(item());
        expect(ItemModel.atualizar).not.toHaveBeenCalled();
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
    it('desconto maior que o preço congelado → 422', async () => {
        await expect(atualizar(U.administrador, { val_desconto_servico: 60 })).rejects.toThrow(/Desconto/);
    });
    it('desconto válido não recalcula o preço', async () => {
        await atualizar(U.administrador, { val_desconto_servico: 10 });
        expect(ProdutoServicoService.buscarServicoPorIdEIdGrade).not.toHaveBeenCalled();
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { val_desconto_servico: 10 });
    });
    it('troca de serviço recalcula o preço vigente passando usuario.id', async () => {
        await atualizar(U.secretaria, { id_produto_servico: 10 });
        expect(ProdutoServicoService.buscarServicoPorIdEIdGrade).toHaveBeenCalledWith(10, 5, U.secretaria.id);
        expect(ItemModel.atualizar).toHaveBeenCalledWith(3, { id_produto_servico: 10, val_preco_servico: 50 });
    });
    it('serviço fora do produto da grade → 422', async () => {
        ProdutoServicoService.buscarServicoPorIdEIdGrade.mockResolvedValue(null);
        await expect(atualizar(U.secretaria, { id_produto_grade: 6 })).rejects.toThrow('Serviço não disponível para o produto desta grade');
    });
    it('serviço sem preço vigente → 422', async () => {
        ItemModel.buscarPrecoVigente.mockResolvedValue(null);
        await expect(atualizar(U.secretaria, { id_produto_servico: 10 })).rejects.toThrow('Serviço sem preço vigente cadastrado');
    });
});

describe('AgendamentoProdutoService – adicionarItem / deletarItem', () => {
    it('adicionarItem: payload inválido → 400', async () => {
        await expect(Service.adicionarItem({ id_agendamento: 1 }, U.secretaria)).rejects.toThrow(BadRequestError);
        expect(ItemModel.criar).not.toHaveBeenCalled();
    });
    it('adicionarItem: o preço vem do banco, nunca do cliente', async () => {
        await Service.adicionarItem({ ...novo, val_preco_servico: 0.01 }, U.secretaria);
        expect(ItemModel.criar).toHaveBeenCalledWith({ ...novo, val_desconto_servico: 0, val_preco_servico: 50 });
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            id_usuario: U.secretaria.id, des_acao: ACOES_LOG.CRIAR, num_registro_id: 3
        }));
    });
    it('adicionarItem: desconto maior que o preço → 422', async () => {
        await expect(Service.adicionarItem({ ...novo, val_desconto_servico: 60 }, U.secretaria)).rejects.toThrow(/Desconto/);
    });
    it('adicionarItem: agendamento finalizado → 422', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: 'cancelado' }));
        await expect(Service.adicionarItem(novo, U.secretaria)).rejects.toThrow(ValidationError);
    });
    it('deletarItem: sucesso audita e retorna true', async () => {
        await expect(Service.deletarItem(1, 3, U.administrador)).resolves.toBe(true);
        expect(ItemModel.deletar).toHaveBeenCalledWith(1, 3);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.DELETAR, des_detalhes: { id_agendamento: 1 }
        }));
    });
    it('deletarItem: item de outro agendamento → 404 e não deleta', async () => {
        ItemModel.buscarPorId.mockResolvedValue(item({ id_agendamento: 99 }));
        await expect(Service.deletarItem(1, 3, U.administrador)).rejects.toThrow(NotFoundError);
        expect(ItemModel.deletar).not.toHaveBeenCalled();
    });
    it('deletarItem: agendamento inexistente → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.deletarItem(1, 3, U.administrador)).rejects.toThrow(NotFoundError);
    });
    it('deletarItem: agendamento finalizado → 422', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: 'concluido' }));
        await expect(Service.deletarItem(1, 3, U.administrador)).rejects.toThrow(ValidationError);
    });

    // ---- BUGS ATUAIS: troque it.failing → it após a correção ----
    it.failing('adicionarItem bloqueia costureira de outro agendamento (usuario não repassado)', async () => {
        await expect(Service.adicionarItem(novo, U.costureiraOutra)).rejects.toThrow(ForbiddenError);
    });
    it.failing('deletarItem bloqueia costureira de outro agendamento (usuario não repassado)', async () => {
        await expect(Service.deletarItem(1, 3, U.costureiraOutra)).rejects.toThrow(ForbiddenError);
    });
    it.failing('adicionarItem passa usuario.id (e não o objeto) ao _resolverPreco', async () => {
        await Service.adicionarItem(novo, U.secretaria);
        expect(ProdutoServicoService.buscarServicoPorIdEIdGrade).toHaveBeenCalledWith(9, 5, U.secretaria.id);
    });
});
