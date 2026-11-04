// /src/tests/unit/services/TipoServicoService.test.js

jest.mock('../../../models/produto/TipoServicoModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/validators', () => ({ tipoServicoSchema: { validate: jest.fn() } }));

const Model = require('../../../models/produto/TipoServicoModel');
const LogService = require('../../../services/LogService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/TipoServicoService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const tipo = (o) => ({ id: 1, des_tipo_ajuste: 'Costura', ind_ativo: 1, ...o });

beforeEach(() => {
    LogService.registrar.mockReset().mockResolvedValue();
    validators.tipoServicoSchema.validate.mockReset().mockImplementation((d) => ({ value: { ...d } }));

    Model.criarTipoServico = jest.fn().mockResolvedValue(1);
    Model.listarTipoServico = jest.fn().mockResolvedValue([tipo(), tipo({ id: 2 })]);
    Model.buscarTipoServicoPorId = jest.fn().mockResolvedValue(tipo());
    Model.atualizarTipoServico = jest.fn().mockResolvedValue(true);
    Model.deletarTipoServico = jest.fn().mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('TipoServicoService.adicionarTipoServico', () => {
    it('happy path: cria, audita e retorna registro', async () => {
        await expect(Service.adicionarTipoServico({ des_tipo_ajuste: 'Costura', ind_ativo: 1 }, 7)).resolves.toEqual(tipo());
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 7, des_acao: ACOES_LOG.CRIAR, des_tabela: 'tab_tipo_servico', num_registro_id: 1,
            des_detalhes: { des_tipo_ajuste: 'Costura', ind_ativo: 1 }
        });
        expect(Model.buscarTipoServicoPorId).toHaveBeenCalledWith(1);
    });
    it('erro de validação → não cria', async () => {
        validators.tipoServicoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: 'x' }] } });
        await expect(Service.adicionarTipoServico({}, 7)).rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: x`);
        expect(Model.criarTipoServico).not.toHaveBeenCalled();
    });
});

describe('TipoServicoService.listarTipoServico', () => {
    it('retorna lista e audita total', async () => {
        await expect(Service.listarTipoServico(7)).resolves.toHaveLength(2);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'listar', total_registros: 2 });
    });
    it('erro é propagado', async () => {
        Model.listarTipoServico.mockRejectedValue(new Error('db down'));
        await expect(Service.listarTipoServico(7)).rejects.toThrow('db down');
    });
});

describe('TipoServicoService.buscarTipoServicoId', () => {
    it('encontrado → retorna e audita', async () => {
        await expect(Service.buscarTipoServicoId(1, 7)).resolves.toEqual(tipo());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'busca_por_id', id: 1, des_tipo_ajuste: 'Costura', ind_ativo: 1 });
    });
    it('não encontrado → 404', async () => {
        Model.buscarTipoServicoPorId.mockResolvedValue(null);
        await expect(Service.buscarTipoServicoId(99, 7)).rejects.toThrow(NotFoundError);
    });
});

describe('TipoServicoService.atualizarTipoServico', () => {
    it('happy path', async () => {
        Model.buscarTipoServicoPorId.mockResolvedValueOnce(tipo()).mockResolvedValueOnce(tipo({ des_tipo_ajuste: 'Bainha' }));
        const r = await Service.atualizarTipoServico(1, { des_tipo_ajuste: 'Bainha' }, 7);
        expect(Model.atualizarTipoServico).toHaveBeenCalledWith(1, { des_tipo_ajuste: 'Bainha' });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.campos_alterados).toEqual(['des_tipo_ajuste']);
        expect(r.des_tipo_ajuste).toBe('Bainha');
    });
    it('não encontrado → 404', async () => {
        Model.buscarTipoServicoPorId.mockResolvedValue(null);
        await expect(Service.atualizarTipoServico(99, {}, 7)).rejects.toThrow(NotFoundError);
    });
    it('sem linhas afetadas → erro', async () => {
        Model.atualizarTipoServico.mockResolvedValue(false);
        await expect(Service.atualizarTipoServico(1, { ind_ativo: 0 }, 7)).rejects.toThrow('Erro ao atualizar tipo de Serviço');
    });
    it.failing('log usa campos do tipo de serviço (hoje: id_categoria/nom_produto/num_sku)', async () => {
        await Service.atualizarTipoServico(1, { ind_ativo: 0 }, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({ id: 1, des_tipo_ajuste: 'Costura', ind_ativo: 1 });
    });
    it.failing('log deve conter num_registro_id', async () => {
        await Service.atualizarTipoServico(1, { ind_ativo: 0 }, 7);
        expect(LogService.registrar.mock.calls[0][0].num_registro_id).toBe(1);
    });
});

describe('TipoServicoService.deletarTipoServico', () => {
    it('happy path', async () => {
        await expect(Service.deletarTipoServico(1, 7)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: ACOES_LOG.DELETAR, num_registro_id: 1 }));
    });
    it('não encontrado → 404', async () => {
        Model.buscarTipoServicoPorId.mockResolvedValue(null);
        await expect(Service.deletarTipoServico(99, 7)).rejects.toThrow(NotFoundError);
        expect(Model.deletarTipoServico).not.toHaveBeenCalled();
    });
    it('falha no soft delete → erro', async () => {
        Model.deletarTipoServico.mockResolvedValue(false);
        await expect(Service.deletarTipoServico(1, 7)).rejects.toThrow(/Erro ao deletar/);
    });
    it.failing('mensagem de erro deve citar tipo de serviço (hoje: "pessoa")', async () => {
        Model.deletarTipoServico.mockResolvedValue(false);
        await expect(Service.deletarTipoServico(1, 7)).rejects.toThrow(/tipo de servi/i);
    });
    it.failing('log contém os dados (usa `deletado` boolean)', async () => {
        await Service.deletarTipoServico(1, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.des_tipo_ajuste).toBe('Costura');
    });
});
