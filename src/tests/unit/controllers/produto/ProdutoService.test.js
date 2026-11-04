// /src/tests/unit/services/produto/ProdutoService.test.js

jest.mock('../../../../models/produto/ProdutoModel', () => ({
    criarProduto: jest.fn(), listarProdutos: jest.fn(), buscarProdutoPorId: jest.fn(),
    atualizarProduto: jest.fn(), deletarProduto: jest.fn()
}));
jest.mock('../../../../models/agendamento/AgendamentoModel', () => ({}));
jest.mock('../../../../services/UploadService', () => ({}));
jest.mock('../../../../services/LogService', () => ({ registrar: jest.fn() }));

const ProdutoModel = require('../../../../models/produto/ProdutoModel');
const LogService = require('../../../../services/LogService');
const service = require('../../../../services/produto/ProdutoService');
const { NotFoundError } = require('../../../../utils/ApiError');
const { MENSAGENS, ACOES_LOG } = require('../../../../utils/constants');

const valido = { id_categoria: 1, nom_produto: 'Camisa', ind_ativo: true };
const produto = { id: 10, ...valido };

beforeEach(() => jest.clearAllMocks());

describe('adicionarProduto', () => {
    it('cria, registra log e retorna o produto', async () => {
        ProdutoModel.criarProduto.mockResolvedValue(10);
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(produto);

        await expect(service.adicionarProduto(valido, 1)).resolves.toEqual(produto);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            id_usuario: 1, des_acao: ACOES_LOG.CRIAR, num_registro_id: 10, des_tabela: 'tab_produtos'
        }));
    });

    it('lança erro de validação', async () => {
        await expect(service.adicionarProduto({ nom_produto: 'x' }, 1))
            .rejects.toThrow(MENSAGENS.ERRO.VALIDACAO);
        expect(ProdutoModel.criarProduto).not.toHaveBeenCalled();
    });
});

describe('listarProdutos', () => {
    it('retorna lista e loga total', async () => {
        ProdutoModel.listarProdutos.mockResolvedValue([produto, produto]);
        await expect(service.listarProdutos(1)).resolves.toHaveLength(2);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.total_registros).toBe(2);
    });

    it('propaga erro do model', async () => {
        ProdutoModel.listarProdutos.mockRejectedValue(new Error('db'));
        await expect(service.listarProdutos(1)).rejects.toThrow('db');
    });
});

describe('listarProduto', () => {
    it('retorna produto', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(produto);
        await expect(service.listarProduto(10, 1)).resolves.toEqual(produto);
        expect(LogService.registrar).toHaveBeenCalled();
    });

    it('lança NotFoundError', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(null);
        await expect(service.listarProduto(10, 1)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('atualizarProduto', () => {
    it('atualiza e retorna o registro novo', async () => {
        const novo = { ...produto, nom_produto: 'Polo' };
        ProdutoModel.buscarProdutoPorId.mockResolvedValueOnce(produto).mockResolvedValueOnce(novo);
        ProdutoModel.atualizarProduto.mockResolvedValue(true);

        await expect(service.atualizarProduto(10, { nom_produto: 'Polo' }, 1)).resolves.toEqual(novo);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.campos_alterados).toEqual(['nom_produto']);
    });

    it('lança erro se não encontrado', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(null);
        await expect(service.atualizarProduto(10, {}, 1)).rejects.toThrow(MENSAGENS.ERRO.NAO_ENCONTRADO);
    });

    it('lança erro se update falhar', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(produto);
        ProdutoModel.atualizarProduto.mockResolvedValue(false);
        await expect(service.atualizarProduto(10, {}, 1)).rejects.toThrow('Erro ao atualizar');
    });
});

describe('deletarProduto', () => {
    it('deleta e retorna true', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(produto);
        ProdutoModel.deletarProduto.mockResolvedValue(produto);
        await expect(service.deletarProduto(10, 1)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.DELETAR, num_registro_id: 10
        }));
    });

    it('lança erro se não encontrado', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(null);
        await expect(service.deletarProduto(10, 1)).rejects.toThrow(MENSAGENS.ERRO.NAO_ENCONTRADO);
    });

    it('lança erro se delete falhar', async () => {
        ProdutoModel.buscarProdutoPorId.mockResolvedValue(produto);
        ProdutoModel.deletarProduto.mockResolvedValue(null);
        await expect(service.deletarProduto(10, 1)).rejects.toThrow('Erro ao deletar');
    });
});
