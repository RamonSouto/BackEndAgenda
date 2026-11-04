// /src/tests/unit/services/produto/ProdutoServicoService.test.js

jest.mock('../../../../models/produto/ProdutoServicoModel', () => ({
    criarProdutoTipoServico: jest.fn(), listarProdutoServico: jest.fn(),
    buscarProdutoServicoPorId: jest.fn(), buscarServicoPorIdEIdGrade: jest.fn(),
    atualizarProdutoServico: jest.fn(), deletarProdutoServico: jest.fn()
}));
jest.mock('../../../../services/LogService', () => ({ registrar: jest.fn() }));

const Model = require('../../../../models/produto/ProdutoServicoModel');
const LogService = require('../../../../services/LogService');
const service = require('../../../../services/produto/ProdutoServicoService');
const { NotFoundError } = require('../../../../utils/ApiError');
const { MENSAGENS, ACOES_LOG } = require('../../../../utils/constants');

const valido = { id_produto: 1, id_tipo_servico: 2, ind_ativo: true };
const assoc = { id: 3, ...valido, des_tipo_ajuste: 'Bainha' };

beforeEach(() => jest.clearAllMocks());

describe('adicionarProdutoServico', () => {
    it('cria e retorna a associação', async () => {
        Model.criarProdutoTipoServico.mockResolvedValue(3);
        Model.buscarProdutoServicoPorId.mockResolvedValue(assoc);
        await expect(service.adicionarProdutoServico(valido, 1)).resolves.toEqual(assoc);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.CRIAR, num_registro_id: 3
        }));
    });

    it('lança erro de validação', async () => {
        await expect(service.adicionarProdutoServico({ id_produto: 'x' }, 1))
            .rejects.toThrow(MENSAGENS.ERRO.VALIDACAO);
    });
});

describe('listarProdutoServico', () => {
    it('retorna lista', async () => {
        Model.listarProdutoServico.mockResolvedValue([assoc]);
        await expect(service.listarProdutoServico(1)).resolves.toEqual([assoc]);
    });

    it('propaga erro', async () => {
        Model.listarProdutoServico.mockRejectedValue(new Error('db'));
        await expect(service.listarProdutoServico(1)).rejects.toThrow('db');
    });
});

describe.each([
    ['buscarProdutoServicoId', 'buscarProdutoServicoPorId', [3, 1]],
    ['buscarServicoPorIdEIdGrade', 'buscarServicoPorIdEIdGrade', [3, 8, 1]]
])('%s', (metodo, modelFn, args) => {
    it('retorna registro', async () => {
        Model[modelFn].mockResolvedValue(assoc);
        await expect(service[metodo](...args)).resolves.toEqual(assoc);
        expect(LogService.registrar).toHaveBeenCalled();
    });

    it('lança NotFoundError', async () => {
        Model[modelFn].mockResolvedValue(null);
        await expect(service[metodo](...args)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('atualizarProdutoServico', () => {
    it('atualiza e retorna o novo registro', async () => {
        const novo = { ...assoc, ind_ativo: false };
        Model.buscarProdutoServicoPorId.mockResolvedValueOnce(assoc).mockResolvedValueOnce(novo);
        Model.atualizarProdutoServico.mockResolvedValue(true);
        await expect(service.atualizarProdutoServico(3, { ind_ativo: false }, 1)).resolves.toEqual(novo);
    });

    it('lança NotFoundError', async () => {
        Model.buscarProdutoServicoPorId.mockResolvedValue(null);
        await expect(service.atualizarProdutoServico(3, {}, 1)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lança erro se update falhar', async () => {
        Model.buscarProdutoServicoPorId.mockResolvedValue(assoc);
        Model.atualizarProdutoServico.mockResolvedValue(false);
        await expect(service.atualizarProdutoServico(3, {}, 1)).rejects.toThrow('Erro ao atualizar');
    });
});

describe('deletarProdutoServico', () => {
    it('deleta e retorna true', async () => {
        Model.buscarProdutoServicoPorId.mockResolvedValue(assoc);
        Model.deletarProdutoServico.mockResolvedValue(assoc);
        await expect(service.deletarProdutoServico(3, 1)).resolves.toBe(true);
    });

    it('lança NotFoundError', async () => {
        Model.buscarProdutoServicoPorId.mockResolvedValue(null);
        await expect(service.deletarProdutoServico(3, 1)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lança erro se delete falhar', async () => {
        Model.buscarProdutoServicoPorId.mockResolvedValue(assoc);
        Model.deletarProdutoServico.mockResolvedValue(null);
        await expect(service.deletarProdutoServico(3, 1)).rejects.toThrow('Erro ao deletar');
    });
});
