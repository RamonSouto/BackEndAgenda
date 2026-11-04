// /src/tests/unit/services/TamanhoService.test.js

jest.mock('../../../models/produto/TamanhoModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/validators', () => ({
    tamanhoProdutoSchema: { validate: jest.fn((d) => ({ value: { ...d } })) }
}));

const Model = require('../../../models/produto/TamanhoModel');
const LogService = require('../../../services/LogService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/TamanhoService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const tamanho = (o) => ({ id: 1, cod_tamanho: 'M', des_tamanho: 'Médio', des_categoria_tamanho: 'vestuario', num_ordem_exibicao: 2, ...o });

beforeEach(() => {
    Model.listarTamanhos = jest.fn().mockResolvedValue([tamanho()]);
    Model.criarTamanhoProduto = jest.fn().mockResolvedValue(1);
    Model.buscarTamanhoPorId = jest.fn().mockResolvedValue(tamanho());
    Model.atualizarTamanho = jest.fn().mockResolvedValue(true);
    Model.deletarTamanho = jest.fn().mockResolvedValue(true);
});

describe('TamanhoService.listarTamanhos', () => {
    it('retorna lista e audita total', async () => {
        await expect(Service.listarTamanhos(7)).resolves.toHaveLength(1);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_tabela: 'tab_tamanhos', des_detalhes: { tipo_consulta: 'listar', total_registros: 1 }
        }));
    });
    it('erro é propagado', async () => {
        Model.listarTamanhos.mockRejectedValue(new Error('db down'));
        await expect(Service.listarTamanhos(7)).rejects.toThrow('db down');
    });
});

describe('TamanhoService.adicionarTamanho', () => {
    const { id, ...dados } = tamanho();

    it('happy path: cria, audita e retorna', async () => {
        await expect(Service.adicionarTamanho(dados, 7)).resolves.toEqual(tamanho());
        expect(Model.criarTamanhoProduto).toHaveBeenCalledWith(dados);
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 7, des_acao: ACOES_LOG.CRIAR, des_tabela: 'tab_tamanhos', num_registro_id: 1, des_detalhes: dados
        });
    });
    it('erro de validação → não cria', async () => {
        validators.tamanhoProdutoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarTamanho({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarTamanhoProduto).not.toHaveBeenCalled();
    });
    it('erro de infraestrutura é propagado', async () => {
        Model.criarTamanhoProduto.mockRejectedValue(new Error('db down'));
        await expect(Service.adicionarTamanho(dados, 7)).rejects.toThrow('db down');
    });
});

describe('TamanhoService.buscarTamanho', () => {
    it('encontrado → retorna e audita', async () => {
        await expect(Service.buscarTamanho(1, 7)).resolves.toEqual(tamanho());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({ tipo_consulta: 'busca_por_id', cod_tamanho: 'M' });
    });
    it('não encontrado → 404 sem log', async () => {
        Model.buscarTamanhoPorId.mockResolvedValue(null);
        await expect(Service.buscarTamanho(99, 7)).rejects.toThrow(NotFoundError);
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});

describe('TamanhoService.atualizarTamanhos', () => {
    it('happy path', async () => {
        Model.buscarTamanhoPorId.mockResolvedValueOnce(tamanho()).mockResolvedValueOnce(tamanho({ des_tamanho: 'Novo' }));
        const r = await Service.atualizarTamanhos(1, { des_tamanho: 'Novo' }, 7);
        expect(Model.atualizarTamanho).toHaveBeenCalledWith(1, { des_tamanho: 'Novo' });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ cod_tamanho: 'M', des_tamanho: 'Médio', campos_alterados: ['des_tamanho'] });
        expect(r.des_tamanho).toBe('Novo');
    });
    it('não encontrado → 404', async () => {
        Model.buscarTamanhoPorId.mockResolvedValue(null);
        await expect(Service.atualizarTamanhos(99, {}, 7)).rejects.toThrow(NotFoundError);
        expect(Model.atualizarTamanho).not.toHaveBeenCalled();
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarTamanho.mockResolvedValue(false);
        await expect(Service.atualizarTamanhos(1, { des_tamanho: 'X' }, 7)).rejects.toThrow('Erro ao atualizar tamanho');
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});

describe('TamanhoService.deletarTamanhos', () => {
    it('happy path', async () => {
        await expect(Service.deletarTamanhos(1, 7)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.DELETAR, num_registro_id: 1 }));
    });
    it('não encontrado → 404', async () => {
        Model.buscarTamanhoPorId.mockResolvedValue(null);
        await expect(Service.deletarTamanhos(99, 7)).rejects.toThrow(NotFoundError);
        expect(Model.deletarTamanho).not.toHaveBeenCalled();
    });
    it('falha no soft delete → erro', async () => {
        Model.deletarTamanho.mockResolvedValue(false);
        await expect(Service.deletarTamanhos(1, 7)).rejects.toThrow('Erro ao deletar tamanho');
    });
    it.failing('log contém os dados do tamanho (usa `deletado` boolean)', async () => {
        await Service.deletarTamanhos(1, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.tamanho).toBe('M');
    });
});
