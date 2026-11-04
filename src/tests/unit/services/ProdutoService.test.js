jest.mock('../../../models/produto/GradeModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/validators', () => ({ gradeProdutoSchema: { validate: jest.fn() } }));

const Model = require('../../../models/produto/GradeModel');
const LogService = require('../../../services/LogService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/GradeService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const grade = (o) => ({
    id: 1, id_produto: 2, id_variacao_cor_estampa: 3, id_tamanho: 4, num_sku: 'G1',
    val_preco_variacao: 79.9, ind_ativo: 1, num_codigo_barras: '789', ...o
});

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    LogService.registrar.mockReset().mockResolvedValue();
    validators.gradeProdutoSchema.validate.mockReset().mockImplementation((d) => ({ value: { ...d } }));

    Model.listarGradesProdutos = jest.fn().mockResolvedValue([grade(), grade({ id: 2 })]);
    Model.criarGradeProduto = jest.fn().mockResolvedValue(1);
    Model.buscarGradeProdutoPorId = jest.fn().mockResolvedValue(grade());
    Model.atualizarGradeProduto = jest.fn().mockResolvedValue(true);
    Model.deletarGradeProduto = jest.fn().mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('GradeService.listarGradesProdutos', () => {
    it('retorna lista e audita total', async () => {
        await expect(Service.listarGradesProdutos(7)).resolves.toHaveLength(2);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'listar', total_registros: 2 });
    });
    it('erro é propagado', async () => {
        Model.listarGradesProdutos.mockRejectedValue(new Error('db down'));
        await expect(Service.listarGradesProdutos(7)).rejects.toThrow('db down');
    });
});

describe('GradeService.adicionarGradeProduto', () => {
    const { id, ...dados } = grade();

    it('happy path', async () => {
        await expect(Service.adicionarGradeProduto(dados, 7)).resolves.toEqual(grade());
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 7, des_acao: ACOES_LOG.CRIAR, des_tabela: 'tab_produto_grade', num_registro_id: 1, des_detalhes: dados
        });
    });
    it('erro de validação → não cria', async () => {
        validators.gradeProdutoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarGradeProduto({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarGradeProduto).not.toHaveBeenCalled();
    });
    it('erro de infraestrutura é propagado', async () => {
        Model.criarGradeProduto.mockRejectedValue(new Error('db down'));
        await expect(Service.adicionarGradeProduto(dados, 7)).rejects.toThrow('db down');
    });
});

describe('GradeService.listarGradeProduto', () => {
    it('encontrada → retorna e audita', async () => {
        await expect(Service.listarGradeProduto(1, 7)).resolves.toEqual(grade());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({ tipo_consulta: 'busca_por_id', num_sku: 'G1' });
    });
    it('não encontrada → 404', async () => {
        Model.buscarGradeProdutoPorId.mockResolvedValue(null);
        await expect(Service.listarGradeProduto(99, 7)).rejects.toThrow(NotFoundError);
    });
});

describe('GradeService.atualizarGradeProduto', () => {
    it('happy path', async () => {
        Model.buscarGradeProdutoPorId.mockResolvedValueOnce(grade()).mockResolvedValueOnce(grade({ val_preco_variacao: 99 }));
        const r = await Service.atualizarGradeProduto(1, { val_preco_variacao: 99 }, 7);
        expect(Model.atualizarGradeProduto).toHaveBeenCalledWith(1, { val_preco_variacao: 99 });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.campos_alterados).toEqual(['val_preco_variacao']);
        expect(r.val_preco_variacao).toBe(99);
    });
    it('não encontrada → 404', async () => {
        Model.buscarGradeProdutoPorId.mockResolvedValue(null);
        await expect(Service.atualizarGradeProduto(99, {}, 7)).rejects.toThrow(NotFoundError);
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarGradeProduto.mockResolvedValue(false);
        await expect(Service.atualizarGradeProduto(1, { num_sku: 'X' }, 7)).rejects.toThrow('Erro ao atualizar grade');
    });
});

describe('GradeService.deletarGradeProduto', () => {
    it('happy path', async () => {
        await expect(Service.deletarGradeProduto(1, 7)).resolves.toBe(true);
        expect(Model.deletarGradeProduto).toHaveBeenCalledWith(1);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.DELETAR }));
    });
    it('não encontrada → erro', async () => {
        Model.buscarGradeProdutoPorId.mockResolvedValue(null);
        await expect(Service.deletarGradeProduto(99, 7)).rejects.toThrow(MENSAGENS.ERRO.NAO_ENCONTRADO);
        expect(Model.deletarGradeProduto).not.toHaveBeenCalled();
    });
    it('falha no soft delete → erro', async () => {
        Model.deletarGradeProduto.mockResolvedValue(false);
        await expect(Service.deletarGradeProduto(1, 7)).rejects.toThrow(/Erro ao deletar/);
    });
    it.failing('não encontrada deve ser NotFoundError (404)', async () => {
        Model.buscarGradeProdutoPorId.mockResolvedValue(null);
        await expect(Service.deletarGradeProduto(99, 7)).rejects.toThrow(NotFoundError);
    });
    it.failing('log contém os dados da grade (usa `deletado` boolean)', async () => {
        await Service.deletarGradeProduto(1, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.num_sku).toBe('G1');
    });
});
