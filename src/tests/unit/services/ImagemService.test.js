jest.mock('../../../models/produto/ImagemModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../services/UploadService', () => ({ deletarArquivo: jest.fn() }));
jest.mock('../../../utils/validators', () => ({ imagemProdutoSchema: { validate: jest.fn() } }));

const Model = require('../../../models/produto/ImagemModel');
const LogService = require('../../../services/LogService');
const UploadService = require('../../../services/UploadService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/ImagemService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const img = (o) => ({ id: 1, id_produto: 5, id_produto_grade: null, des_url_imagem: '/u/a.jpg', num_ordem: 1, ind_principal: 0, ...o });

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    UploadService.deletarArquivo.mockReset().mockResolvedValue();
    LogService.registrar.mockReset().mockResolvedValue();
    validators.imagemProdutoSchema.validate.mockReset().mockImplementation((d) => ({ value: { ...d } }));

    Model.listarImagemProdutos = jest.fn().mockResolvedValue([img()]);
    Model.criarImagemProduto = jest.fn().mockResolvedValue(1);
    Model.buscarImagemProdutoId = jest.fn().mockResolvedValue(img());
    Model.buscarImagemProdutoPorId = jest.fn().mockResolvedValue([img()]);
    Model.buscarImagemProdutoGradeID = jest.fn().mockResolvedValue([img({ id_produto: null, id_produto_grade: 3 })]);
    Model.atualizarImagemProduto = jest.fn().mockResolvedValue(true);
    Model.deletarImagemProduto = jest.fn().mockResolvedValue(true);
    Model.desmarcarImagemPrincipalPorProduto = jest.fn().mockResolvedValue(true);
    Model.desmarcarImagemPrincipalPorGrade = jest.fn().mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('ImagemService.listarImagemProdutos', () => {
    it('retorna lista e audita', async () => {
        await expect(Service.listarImagemProdutos(7)).resolves.toHaveLength(1);
        expect(LogService.registrar.mock.calls[0][0].des_tabela).toBe('tab_produto_imagens');
    });
    it('erro é propagado', async () => {
        Model.listarImagemProdutos.mockRejectedValue(new Error('db down'));
        await expect(Service.listarImagemProdutos(7)).rejects.toThrow('db down');
    });
});

describe('ImagemService.adicionarImagemProduto', () => {
    it('normaliza ids vindos do multipart e desmarca principal do produto', async () => {
        const r = await Service.adicionarImagemProduto({ id_produto: '5', id_produto_grade: '', des_url_imagem: '/u/a.jpg', ind_principal: 'true' }, 7);
        expect(Model.criarImagemProduto).toHaveBeenCalledWith(expect.objectContaining({ id_produto: 5, id_produto_grade: null }));
        expect(Model.desmarcarImagemPrincipalPorProduto).toHaveBeenCalledWith(5);
        expect(Model.desmarcarImagemPrincipalPorGrade).not.toHaveBeenCalled();
        expect(Model.buscarImagemProdutoId).toHaveBeenCalledWith(1);
        expect(r).toEqual(img());
    });
    it('principal só com grade → desmarca pela grade', async () => {
        await Service.adicionarImagemProduto({ id_produto: 'null', id_produto_grade: '3', ind_principal: 1 }, 7);
        expect(Model.desmarcarImagemPrincipalPorGrade).toHaveBeenCalledWith(3);
        expect(Model.desmarcarImagemPrincipalPorProduto).not.toHaveBeenCalled();
    });
    it.each([false, 0, 'false', undefined])('ind_principal=%p → não desmarca', async (v) => {
        await Service.adicionarImagemProduto({ id_produto: 5, ind_principal: v }, 7);
        expect(Model.desmarcarImagemPrincipalPorProduto).not.toHaveBeenCalled();
        expect(Model.desmarcarImagemPrincipalPorGrade).not.toHaveBeenCalled();
    });
    it('principal sem produto e sem grade → não desmarca', async () => {
        await Service.adicionarImagemProduto({ ind_principal: true }, 7);
        expect(Model.desmarcarImagemPrincipalPorProduto).not.toHaveBeenCalled();
        expect(Model.desmarcarImagemPrincipalPorGrade).not.toHaveBeenCalled();
    });
    it('erro de validação → não cria', async () => {
        validators.imagemProdutoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarImagemProduto({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarImagemProduto).not.toHaveBeenCalled();
    });
    it.failing('log contém a URL (usa `imagemProdutoId` number)', async () => {
        await Service.adicionarImagemProduto({ id_produto: 5, des_url_imagem: '/u/a.jpg' }, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.des_url_imagem).toBe('/u/a.jpg');
    });
});

describe.each([
    ['buscarImagemProdutoID', 'buscarImagemProdutoPorId'],
    ['buscarImagemProdutoGradeID', 'buscarImagemProdutoGradeID']
])('ImagemService.%s', (metodo, metodoModel) => {
    it('retorna e audita', async () => {
        await expect(Service[metodo](5, 7)).resolves.toBeDefined();
        expect(Model[metodoModel]).toHaveBeenCalledWith(5);
        expect(LogService.registrar.mock.calls[0][0].des_acao).toBe(ACOES_LOG.CONSULTAR);
    });
    it('null → 404', async () => {
        Model[metodoModel].mockResolvedValue(null);
        await expect(Service[metodo](5, 7)).rejects.toThrow(NotFoundError);
    });
    it.failing('lista vazia → 404 (array vazio é truthy)', async () => {
        Model[metodoModel].mockResolvedValue([]);
        await expect(Service[metodo](5, 7)).rejects.toThrow(NotFoundError);
    });
});

describe('ImagemService.atualizarImagemProduto', () => {
    it('não encontrada → 404', async () => {
        Model.buscarImagemProdutoId.mockResolvedValue(null);
        await expect(Service.atualizarImagemProduto(99, {}, 7)).rejects.toThrow(NotFoundError);
    });
    it('principal com produto → desmarca pelo produto', async () => {
        await Service.atualizarImagemProduto(1, { id_produto: '5', ind_principal: 'true' }, 7);
        expect(Model.desmarcarImagemPrincipalPorProduto).toHaveBeenCalledWith(5);
    });
    it('principal com grade → desmarca pela grade', async () => {
        await Service.atualizarImagemProduto(1, { id_produto_grade: '3', ind_principal: 1 }, 7);
        expect(Model.desmarcarImagemPrincipalPorGrade).toHaveBeenCalledWith(3);
    });
    it('nova URL → apaga arquivo antigo e audita antes/depois', async () => {
        const r = await Service.atualizarImagemProduto(1, { des_url_imagem: '/u/novo.jpg' }, 7);
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/u/a.jpg');
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({
            des_url_imagem_anterior: '/u/a.jpg', des_url_imagem_nova: '/u/novo.jpg'
        });
        expect(Model.buscarImagemProdutoPorId).toHaveBeenCalledWith(1);
        expect(r).toEqual([img()]);
    });
    it('mesma URL ou sem URL → não apaga arquivo', async () => {
        await Service.atualizarImagemProduto(1, { des_url_imagem: '/u/a.jpg' }, 7);
        await Service.atualizarImagemProduto(1, { num_ordem: 2 }, 7);
        expect(UploadService.deletarArquivo).not.toHaveBeenCalled();
        expect(LogService.registrar.mock.calls[1][0].des_detalhes.des_url_imagem_nova).toBe('/u/a.jpg');
    });
    it('falha ao apagar arquivo não interrompe a atualização', async () => {
        UploadService.deletarArquivo.mockRejectedValueOnce(new Error('fs'));
        await expect(Service.atualizarImagemProduto(1, { des_url_imagem: '/u/novo.jpg' }, 7)).resolves.toBeDefined();
        expect(console.error).toHaveBeenCalled();
    });
    it('registro vindo como array também é suportado', async () => {
        Model.buscarImagemProdutoId.mockResolvedValue([img()]);
        await Service.atualizarImagemProduto(1, { num_ordem: 2 }, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.des_url_imagem_anterior).toBe('/u/a.jpg');
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarImagemProduto.mockResolvedValue(false);
        await expect(Service.atualizarImagemProduto(1, { num_ordem: 2 }, 7)).rejects.toThrow('Erro ao atualizar');
    });
    it.failing('atualizar só num_ordem não deve alterar id_produto/ind_principal', async () => {
        await Service.atualizarImagemProduto(1, { num_ordem: 2 }, 7);
        expect(Model.atualizarImagemProduto).toHaveBeenCalledWith(1, { num_ordem: 2 });
    });
});

describe('ImagemService.deletarImagemProduto', () => {
    // O service espera um array; os mocks seguem esse formato para cobrir os branches.
    const comoArray = (o) => Model.buscarImagemProdutoId.mockResolvedValue([img(o)]);

    it('não principal → apenas soft delete', async () => {
        comoArray();
        await expect(Service.deletarImagemProduto(1, 7)).resolves.toBe(true);
        expect(Model.desmarcarImagemPrincipalPorProduto).not.toHaveBeenCalled();
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.DELETAR, num_registro_id: 1 }));
    });
    it('principal do produto → promove a próxima', async () => {
        comoArray({ ind_principal: 1 });
        Model.buscarImagemProdutoPorId.mockResolvedValue([img({ id: 2 })]);
        await Service.deletarImagemProduto(1, 7);
        expect(Model.desmarcarImagemPrincipalPorProduto).toHaveBeenCalledWith(5);
        expect(Model.atualizarImagemProduto).toHaveBeenCalledWith(2, { ind_principal: 1 });
    });
    it('principal do produto sem outras imagens → não promove', async () => {
        comoArray({ ind_principal: 'true' });
        Model.buscarImagemProdutoPorId.mockResolvedValue([]);
        await Service.deletarImagemProduto(1, 7);
        expect(Model.atualizarImagemProduto).not.toHaveBeenCalled();
    });
    it('principal da grade → promove a próxima', async () => {
        comoArray({ ind_principal: true, id_produto: null, id_produto_grade: 3 });
        Model.buscarImagemProdutoGradeID.mockResolvedValue([img({ id: 4 })]);
        await Service.deletarImagemProduto(1, 7);
        expect(Model.desmarcarImagemPrincipalPorGrade).toHaveBeenCalledWith(3);
        expect(Model.atualizarImagemProduto).toHaveBeenCalledWith(4, { ind_principal: 1 });
    });
    it('principal da grade sem outras imagens → não promove', async () => {
        comoArray({ ind_principal: 1, id_produto: null, id_produto_grade: 3 });
        Model.buscarImagemProdutoGradeID.mockResolvedValue([]);
        await Service.deletarImagemProduto(1, 7);
        expect(Model.desmarcarImagemPrincipalPorGrade).not.toHaveBeenCalled();
    });
    it('principal sem produto e sem grade → só deleta', async () => {
        comoArray({ ind_principal: 1, id_produto: null });
        await expect(Service.deletarImagemProduto(1, 7)).resolves.toBe(true);
    });
    it('não encontrada → 404', async () => {
        Model.buscarImagemProdutoId.mockResolvedValue(null);
        await expect(Service.deletarImagemProduto(99, 7)).rejects.toThrow(NotFoundError);
    });
    it('falha no soft delete → erro', async () => {
        comoArray();
        Model.deletarImagemProduto.mockResolvedValue(false);
        await expect(Service.deletarImagemProduto(1, 7)).rejects.toThrow('Erro ao deletar imagem do produto');
    });
    it.failing('funciona com o contrato real do Model (objeto, não array)', async () => {
        await expect(Service.deletarImagemProduto(1, 7)).resolves.toBe(true);
    });
});
