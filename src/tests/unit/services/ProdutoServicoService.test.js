// /src/tests/unit/services/ProdutoServicoService.test.js

jest.mock('../../../models/produto/PrecoProdutoServicoModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/validators', () => ({ precoProdutoServicoSchema: { validate: jest.fn() } }));

const Model = require('../../../models/produto/PrecoProdutoServicoModel');
const LogService = require('../../../services/LogService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/PrecoProdutoServicoService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const preco = (o) => ({ id: 1, id_produto_servico: 3, val_preco: 49.9, dta_inicio: '2026-01-01', ...o });
const { id, ...dados } = preco();

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    LogService.registrar.mockReset().mockResolvedValue();
    validators.precoProdutoServicoSchema.validate.mockReset().mockImplementation((d) => ({ value: { ...d } }));

    Model.criarPrecoProdutoServico = jest.fn().mockResolvedValue(1);
    Model.listarPrecoProdutoServico = jest.fn().mockResolvedValue([preco()]);
    Model.buscarPrecoProdutoServicoPorId = jest.fn().mockResolvedValue(preco());
    Model.atualizarPrecoProdutoServico = jest.fn().mockResolvedValue(true);
    Model.deletarPrecoProdutoServico = jest.fn().mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('PrecoProdutoServicoService.adicionarPrecoProdutoServico', () => {
    it('happy path: cria, audita e retorna registro', async () => {
        await expect(Service.adicionarPrecoProdutoServico(dados, 7)).resolves.toEqual(preco());
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 7, des_acao: ACOES_LOG.CRIAR, des_tabela: 'tab_preco_produto_servico', num_registro_id: 1, des_detalhes: dados
        });
    });
    it('erro de validação → não cria', async () => {
        validators.precoProdutoServicoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarPrecoProdutoServico({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarPrecoProdutoServico).not.toHaveBeenCalled();
    });
    it.failing('não deve logar payload no console (console.log de debug)', async () => {
        await Service.adicionarPrecoProdutoServico(dados, 7);
        expect(console.log).not.toHaveBeenCalled();
    });
});

describe('PrecoProdutoServicoService.listarPrecoProdutoServico', () => {
    it('retorna lista e audita total', async () => {
        await expect(Service.listarPrecoProdutoServico(7)).resolves.toHaveLength(1);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'listar', total_registros: 1 });
    });
    it('erro é propagado', async () => {
        Model.listarPrecoProdutoServico.mockRejectedValue(new Error('db down'));
        await expect(Service.listarPrecoProdutoServico(7)).rejects.toThrow('db down');
    });
});

describe('PrecoProdutoServicoService.buscarPrecoProdutoServicoPorId', () => {
    it('encontrado → retorna e audita', async () => {
        await expect(Service.buscarPrecoProdutoServicoPorId(1, 7)).resolves.toEqual(preco());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'busca_por_id', ...preco() });
    });
    it('não encontrado → 404', async () => {
        Model.buscarPrecoProdutoServicoPorId.mockResolvedValue(null);
        await expect(Service.buscarPrecoProdutoServicoPorId(99, 7)).rejects.toThrow(NotFoundError);
    });
});

describe('PrecoProdutoServicoService.atualizarPrecoProdutoServico', () => {
    it('happy path: log guarda valores anteriores', async () => {
        Model.buscarPrecoProdutoServicoPorId.mockResolvedValueOnce(preco()).mockResolvedValueOnce(preco({ val_preco: 59.9 }));
        const r = await Service.atualizarPrecoProdutoServico(1, { val_preco: 59.9 }, 7);
        expect(Model.atualizarPrecoProdutoServico).toHaveBeenCalledWith(1, { val_preco: 59.9 });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ ...preco(), campos_alterados: ['val_preco'] });
        expect(r.val_preco).toBe(59.9);
    });
    it('não encontrado → 404', async () => {
        Model.buscarPrecoProdutoServicoPorId.mockResolvedValue(null);
        await expect(Service.atualizarPrecoProdutoServico(99, {}, 7)).rejects.toThrow(NotFoundError);
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarPrecoProdutoServico.mockResolvedValue(false);
        await expect(Service.atualizarPrecoProdutoServico(1, { val_preco: 1 }, 7)).rejects.toThrow(/Erro ao atualizar/);
    });
    it.failing('mensagem de erro deve citar preço (hoje: "tipo de Serviço")', async () => {
        Model.atualizarPrecoProdutoServico.mockResolvedValue(false);
        await expect(Service.atualizarPrecoProdutoServico(1, { val_preco: 1 }, 7)).rejects.toThrow(/preço/i);
    });
});

describe('PrecoProdutoServicoService.deletarPrecoProdutoServico', () => {
    it('happy path: log com dados do registro', async () => {
        await expect(Service.deletarPrecoProdutoServico(1, 7)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.DELETAR, num_registro_id: 1, des_detalhes: preco()
        }));
    });
    it('não encontrado → 404', async () => {
        Model.buscarPrecoProdutoServicoPorId.mockResolvedValue(null);
        await expect(Service.deletarPrecoProdutoServico(99, 7)).rejects.toThrow(NotFoundError);
        expect(Model.deletarPrecoProdutoServico).not.toHaveBeenCalled();
    });
    it('falha no soft delete → erro', async () => {
        Model.deletarPrecoProdutoServico.mockResolvedValue(false);
        await expect(Service.deletarPrecoProdutoServico(1, 7)).rejects.toThrow(/Erro ao deletar/);
    });
    it.failing('mensagem de erro deve citar preço (hoje: "pessoa")', async () => {
        Model.deletarPrecoProdutoServico.mockResolvedValue(false);
        await expect(Service.deletarPrecoProdutoServico(1, 7)).rejects.toThrow(/preço/i);
    });
});
