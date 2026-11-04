jest.mock('../../../models/produto/CorEstampaModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../services/UploadService', () => ({ deletarArquivo: jest.fn() }));
jest.mock('../../../utils/validators', () => ({ corEstampaProdutoSchema: { validate: jest.fn() } }));

const Model = require('../../../models/produto/CorEstampaModel');
const LogService = require('../../../services/LogService');
const UploadService = require('../../../services/UploadService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/CorEstampaService');
const { NotFoundError, ConflictError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const cor = (o) => ({ id: 1, nom_cor_estampa: 'Vermelho', ind_tipo: 'cor', val_codigo_hex: '#FF0000', des_imagem_url: null, num_ordem_exibicao: 1, ...o });
const estampa = (o) => cor({ nom_cor_estampa: 'Floral', ind_tipo: 'estampa', val_codigo_hex: null, des_imagem_url: '/u/floral.jpg', ...o });

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    UploadService.deletarArquivo.mockReset().mockResolvedValue();
    LogService.registrar.mockReset().mockResolvedValue();
    validators.corEstampaProdutoSchema.validate.mockReset().mockImplementation((d) => ({ value: { ...d } }));

    Model.listarCoresEstampas = jest.fn().mockResolvedValue([cor()]);
    Model.criarCorEstampaProduto = jest.fn().mockResolvedValue(1);
    Model.buscarCorEstampaPorId = jest.fn().mockResolvedValue(cor());
    Model.atualizarCorEstampa = jest.fn().mockResolvedValue(true);
    Model.deletarCorEstampa = jest.fn().mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('CorEstampaService.listarCoresEstampas', () => {
    it('retorna lista e audita', async () => {
        await expect(Service.listarCoresEstampas(7)).resolves.toHaveLength(1);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.total_registros).toBe(1);
    });
    it('erro é propagado', async () => {
        Model.listarCoresEstampas.mockRejectedValue(new Error('db down'));
        await expect(Service.listarCoresEstampas(7)).rejects.toThrow('db down');
    });
});

describe('CorEstampaService.adicionarCorEstampa', () => {
    it('cor (hex) → des_imagem_url null', async () => {
        await Service.adicionarCorEstampa({ nom_cor_estampa: 'Azul', ind_tipo: 'cor', val_codigo_hex: '#00F' }, 7);
        expect(Model.criarCorEstampaProduto).toHaveBeenCalledWith(expect.objectContaining({ val_codigo_hex: '#00F', des_imagem_url: null }));
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.CRIAR, num_registro_id: 1 }));
    });
    it('estampa (imagem) → val_codigo_hex null', async () => {
        await Service.adicionarCorEstampa({ nom_cor_estampa: 'Floral', ind_tipo: 'estampa', des_imagem_url: '/u/f.jpg' }, 7);
        expect(Model.criarCorEstampaProduto).toHaveBeenCalledWith(expect.objectContaining({ val_codigo_hex: null, des_imagem_url: '/u/f.jpg' }));
    });
    it('hex + imagem → apaga upload e 409', async () => {
        await expect(Service.adicionarCorEstampa({ val_codigo_hex: '#000', des_imagem_url: '/u/x.jpg' }, 7)).rejects.toThrow(ConflictError);
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/u/x.jpg');
        expect(Model.criarCorEstampaProduto).not.toHaveBeenCalled();
    });
    it('erro de validação → não cria', async () => {
        validators.corEstampaProdutoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarCorEstampa({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarCorEstampaProduto).not.toHaveBeenCalled();
    });
});

describe('CorEstampaService.listarCorEstampa', () => {
    it('encontrada → retorna e audita', async () => {
        await expect(Service.listarCorEstampa(1, 7)).resolves.toEqual(cor());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({ tipo_consulta: 'busca_por_id', ind_tipo: 'cor' });
    });
    it('não encontrada → 404', async () => {
        Model.buscarCorEstampaPorId.mockResolvedValue(null);
        await expect(Service.listarCorEstampa(99, 7)).rejects.toThrow(NotFoundError);
    });
});

describe('CorEstampaService.atualizarCorEstampa', () => {
    it('hex + imagem → apaga upload e 409 antes de consultar', async () => {
        await expect(Service.atualizarCorEstampa(1, { val_codigo_hex: '#000', des_imagem_url: '/u/x.jpg' }, 7)).rejects.toThrow(ConflictError);
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/u/x.jpg');
        expect(Model.buscarCorEstampaPorId).not.toHaveBeenCalled();
    });
    it('não encontrada → 404', async () => {
        Model.buscarCorEstampaPorId.mockResolvedValue(null);
        await expect(Service.atualizarCorEstampa(99, {}, 7)).rejects.toThrow(NotFoundError);
    });
    it('estampa → cor: limpa imagem e apaga arquivo antigo', async () => {
        Model.buscarCorEstampaPorId.mockResolvedValue(estampa());
        await Service.atualizarCorEstampa(1, { ind_tipo: 'cor', val_codigo_hex: '#111' }, 7);
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/u/floral.jpg');
        expect(Model.atualizarCorEstampa).toHaveBeenCalledWith(1, { ind_tipo: 'cor', val_codigo_hex: '#111', des_imagem_url: null });
    });
    it('demais casos: zera val_codigo_hex e audita', async () => {
        Model.buscarCorEstampaPorId.mockResolvedValue(estampa());
        await Service.atualizarCorEstampa(1, { des_imagem_url: '/u/novo.jpg' }, 7);
        expect(Model.atualizarCorEstampa).toHaveBeenCalledWith(1, { des_imagem_url: '/u/novo.jpg', val_codigo_hex: null });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({
            nom_cor_estampa: 'Floral', ind_tipo: 'estampa', campos_alterados: ['des_imagem_url', 'val_codigo_hex']
        });
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarCorEstampa.mockResolvedValue(false);
        await expect(Service.atualizarCorEstampa(1, { nom_cor_estampa: 'X' }, 7)).rejects.toThrow(/Erro ao atualizar/);
    });
    it.failing('renomear uma cor não deve apagar o hex', async () => {
        await Service.atualizarCorEstampa(1, { nom_cor_estampa: 'Vermelho Escuro' }, 7);
        expect(Model.atualizarCorEstampa).toHaveBeenCalledWith(1, { nom_cor_estampa: 'Vermelho Escuro' });
    });
});

describe('CorEstampaService.deletarCorEstampa', () => {
    it('happy path', async () => {
        await expect(Service.deletarCorEstampa(1, 7)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.DELETAR, num_registro_id: 1 }));
    });
    it('não encontrada → 404', async () => {
        Model.buscarCorEstampaPorId.mockResolvedValue(null);
        await expect(Service.deletarCorEstampa(99, 7)).rejects.toThrow(NotFoundError);
    });
    it('falha no soft delete → erro', async () => {
        Model.deletarCorEstampa.mockResolvedValue(false);
        await expect(Service.deletarCorEstampa(1, 7)).rejects.toThrow(/Erro ao deletar/);
    });
    it.failing('log contém os dados (usa `deletado` boolean)', async () => {
        await Service.deletarCorEstampa(1, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.nom_cor_estampa).toBe('Vermelho');
    });
});
