// src/tests/unit/services/TipoAgendamentoService.test.js
jest.mock('../../../models/agendamento/TipoAgendamentoModel', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarPorId: jest.fn(), atualizar: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));

const Model = require('../../../models/agendamento/TipoAgendamentoModel');
const LogService = require('../../../services/LogService');
const { NotFoundError } = require('../../../utils/ApiError');
const Service = require('../../../services/agendamento/TipoAgendamentoService');

const tipo = { id: 1, des_tipo_agendamento: 'Ajuste', ind_ativo: 1 };

beforeEach(() => {
    jest.clearAllMocks();
    Model.criar.mockResolvedValue(5);
    Model.listar.mockResolvedValue([tipo]);
    Model.buscarPorId.mockResolvedValue(tipo);
    Model.atualizar.mockResolvedValue(true);
    Model.deletar.mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe('TipoAgendamentoService.criar', () => {
    it('valida, aplica default e cria', async () => {
        await expect(Service.criar({ des_tipo_agendamento: 'Ajuste' }, 9)).resolves.toBe(5);
        expect(Model.criar).toHaveBeenCalledWith({ des_tipo_agendamento: 'Ajuste', ind_ativo: true });
    });
    it('validação', async () => {
        await expect(Service.criar({ des_tipo_agendamento: 'ab' }, 9)).rejects.toThrow(/^Erro de validação/);
        expect(Model.criar).not.toHaveBeenCalled();
    });
    it.failing('validação deveria ser BadRequestError (400)', async () => {
        await expect(Service.criar({}, 9)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.failing('log deveria ter num_registro_id (usa tipo.id, mas Model retorna número)', async () => {
        await Service.criar({ des_tipo_agendamento: 'Ajuste' }, 9);
        expect(LogService.registrar.mock.calls[0][0].num_registro_id).toBe(5);
    });
    it.failing('des_acao deveria ser ACOES_LOG.CRIAR', async () => {
        await Service.criar({ des_tipo_agendamento: 'Ajuste' }, 9);
        expect(LogService.registrar.mock.calls[0][0].des_acao).toBe('criar');
    });
});

describe('TipoAgendamentoService – consultas', () => {
    it('listar resolve a lista', async () => {
        await expect(Service.listar(9)).resolves.toEqual([tipo]);
    });
    // Falta await no Model: os casos abaixo usam retorno síncrono para cobrir os ramos
    it('listar: retorno falsy → NotFoundError', async () => {
        Model.listar.mockReturnValue(null);
        await expect(Service.listar(9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('listar: loga quando há registros (retorno síncrono)', async () => {
        Model.listar.mockReturnValue([tipo]);
        await Service.listar(9);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.total_registros).toBe(1);
    });
    it('listar: lista vazia não loga', async () => {
        Model.listar.mockReturnValue([]);
        await Service.listar(9);
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
    it.failing('listar deveria registrar log (falta await no Model)', async () => {
        await Service.listar(9);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'listar' }));
    });
    it('buscarPorId encontrado loga', async () => {
        await expect(Service.buscarPorId(1, 9)).resolves.toEqual(tipo);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'consultar', id_usuario: 9 }));
    });
    it('buscarPorId não encontrado → 404', async () => {
        Model.buscarPorId.mockResolvedValue(null);
        await expect(Service.buscarPorId(1, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('TipoAgendamentoService.atualizar', () => {
    it('atualiza e retorna registro', async () => {
        await expect(Service.atualizar(1, { ind_ativo: false }, 9)).resolves.toEqual(tipo);
        expect(Model.atualizar).toHaveBeenCalledWith(1, { ind_ativo: false });
    });
    it('inexistente → 404', async () => {
        Model.buscarPorId.mockResolvedValue(null);
        await expect(Service.atualizar(1, {}, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('guarda interna: buscarPorId resolve falsy → 404', async () => {
        jest.spyOn(Service, 'buscarPorId').mockResolvedValueOnce(null);
        await expect(Service.atualizar(1, {}, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('falha na persistência', async () => {
        Model.atualizar.mockResolvedValue(false);
        await expect(Service.atualizar(1, { ind_ativo: false }, 9)).rejects.toThrow('Erro ao atualizar');
    });
    it.failing('des_acao deveria ser "editar" (ACOES_LOG.atualizar é undefined)', async () => {
        await Service.atualizar(1, { ind_ativo: false }, 9);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'editar' }));
    });
    it.failing('deveria validar dados com Joi', async () => {
        await expect(Service.atualizar(1, { des_tipo_agendamento: 'ab' }, 9)).rejects.toThrow();
    });
    it.failing('todos os logs deveriam ter id_usuario (buscarPorId interno sem usuário)', async () => {
        await Service.atualizar(1, { ind_ativo: false }, 9);
        LogService.registrar.mock.calls.forEach(([d]) => expect(d.id_usuario).toBe(9));
    });
});

describe('TipoAgendamentoService.deletar', () => {
    it('deleta (recebe objeto usuario)', async () => {
        await expect(Service.deletar(1, { id: 9 })).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'deletar', id_usuario: 9 }));
    });
    it('deleta sem usuário (id_usuario undefined)', async () => {
        await expect(Service.deletar(1)).resolves.toBe(true);
        expect(LogService.registrar.mock.calls.at(-1)[0].id_usuario).toBeUndefined();
    });
    it('inexistente / falha', async () => {
        Model.buscarPorId.mockResolvedValueOnce(null);
        await expect(Service.deletar(1, { id: 9 })).rejects.toBeInstanceOf(NotFoundError);
        Model.deletar.mockResolvedValue(false);
        await expect(Service.deletar(1, { id: 9 })).rejects.toThrow('Erro ao deletar');
    });
    it('guarda interna: buscarPorId resolve falsy → 404', async () => {
        jest.spyOn(Service, 'buscarPorId').mockResolvedValueOnce(null);
        await expect(Service.deletar(1, { id: 9 })).rejects.toBeInstanceOf(NotFoundError);
    });
    it.failing('assinatura deveria ser consistente (usuarioLogadoId como nos demais)', async () => {
        await Service.deletar(1, 9);
        expect(LogService.registrar.mock.calls.at(-1)[0].id_usuario).toBe(9);
    });
});
