// /src/tests/unit/services/ParametrizacaoService.test.js

jest.mock('../../../models/sistema/ParametrizacaoModel', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarParametrizacaoPorId: jest.fn(), buscarParametrizacaoPorTipoAtivo: jest.fn(),
    contarAtivosPorTipo: jest.fn(), contarDesativadoPorTipo: jest.fn(), buscarTipoDesativadoMaisRecente: jest.fn(),
    desativarPorTipo: jest.fn(), desativarParametrizacao: jest.fn(), ativarParametrizacao: jest.fn(),
    atualizar: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('winston/lib/winston/transports', () => ({ Console: jest.fn() }), { virtual: true });

const Model = require('../../../models/sistema/ParametrizacaoModel');
const LogService = require('../../../services/LogService');
const { NotFoundError } = require('../../../utils/ApiError');
const Service = require('../../../services/sistema/ParametrizacaoService');

const payload = (extra = {}) => ({
    des_tipo_dia: 'util', hra_inicio: '08:00:00', hra_fim: '18:00:00', qtd_minutos_intervalo: 60, ind_ativo: true, ...extra
});
const registro = (extra = {}) => ({ id: 1, des_tipo_dia: 'UTIL', hra_inicio: '08:00:00', hra_fim: '18:00:00', qtd_minutos_intervalo: 60, ind_ativo: 1, ...extra });

beforeEach(() => {
    jest.clearAllMocks();
    Model.criar.mockResolvedValue(5);
    Model.listar.mockResolvedValue([registro()]);
    Model.buscarParametrizacaoPorId.mockResolvedValue(registro());
    Model.buscarParametrizacaoPorTipoAtivo.mockResolvedValue(registro());
    Model.contarAtivosPorTipo.mockResolvedValue(1);
    Model.contarDesativadoPorTipo.mockResolvedValue(1);
    Model.buscarTipoDesativadoMaisRecente.mockResolvedValue(2);
    Model.atualizar.mockResolvedValue(true);
    Model.deletar.mockResolvedValue(true);
});

describe('criar', () => {
    it('normaliza tipo, desativa ativos do tipo ANTES de criar e audita', async () => {
        await expect(Service.criar(payload(), 9)).resolves.toBe(5);
        expect(Model.desativarPorTipo).toHaveBeenCalledWith('UTIL');
        expect(Model.desativarPorTipo.mock.invocationCallOrder[0]).toBeLessThan(Model.criar.mock.invocationCallOrder[0]);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'criar', des_tabela: 'tab_parametrizacao', num_registro_id: 5, id_usuario: 9
        }));
    });
    it('ind_ativo=false é forçado para true', async () => {
        await Service.criar(payload({ ind_ativo: false }), 9);
        expect(Model.criar.mock.calls[0][0].ind_ativo).toBe(true);
    });
    it.each([
        ['tipo inválido', { des_tipo_dia: 'DOMINGO' }],
        ['hora sem segundos', { hra_inicio: '08:00' }],
        ['hora 24h', { hra_fim: '24:00:00' }],
        ['intervalo decimal', { qtd_minutos_intervalo: 1.5 }],
        ['ind_ativo ausente', { ind_ativo: undefined }]
    ])('%s → erro de validação', async (_, extra) => {
        await expect(Service.criar(payload(extra), 9)).rejects.toThrow(/^Erro de validação/);
        expect(Model.desativarPorTipo).not.toHaveBeenCalled();
    });
    // NOVO
    it('erro do Model é propagado', async () => {
        Model.criar.mockRejectedValue(new Error('db'));
        await expect(Service.criar(payload(), 9)).rejects.toThrow('db');
    });
    it.failing('validação deveria ser BadRequestError (400)', async () => {
        await expect(Service.criar({}, 9)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.failing('hra_fim <= hra_inicio deveria ser rejeitado', async () => {
        await expect(Service.criar(payload({ hra_inicio: '18:00:00', hra_fim: '08:00:00' }), 9)).rejects.toThrow();
    });
    it.failing('intervalo <= 0 deveria ser rejeitado', async () => {
        await expect(Service.criar(payload({ qtd_minutos_intervalo: 0 }), 9)).rejects.toThrow();
    });
    it.failing('ind_ativo ausente deveria cair no fallback do service (hoje schema exige)', async () => {
        const { ind_ativo, ...sem } = payload();
        await expect(Service.criar(sem, 9)).resolves.toBe(5);
    });
});

describe('listar / buscas', () => {
    it('listar audita', async () => {
        await expect(Service.listar(9)).resolves.toHaveLength(1);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'listar', des_detalhes: { tipo_consulta: 'listar_parametrizacao', total_registros: 1 }
        }));
    });
    it('listar vazio → 404', async () => {
        Model.listar.mockResolvedValue([]);
        await expect(Service.listar(9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it.failing('listar com Model retornando null deveria virar 404', async () => {
        Model.listar.mockResolvedValue(null);
        await expect(Service.listar(9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('buscarParametrizacaoPorId encontrado/404', async () => {
        await expect(Service.buscarParametrizacaoPorId(1, 9)).resolves.toEqual(registro());
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'consultar', num_registro_id: 1 }));
        Model.buscarParametrizacaoPorId.mockResolvedValue(null);
        await expect(Service.buscarParametrizacaoPorId(1, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('buscarParametrizacaoPorTipoAtivo encontrado/erro', async () => {
        await expect(Service.buscarParametrizacaoPorTipoAtivo('UTIL', 9)).resolves.toEqual(registro());
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.tipo_consulta).toBe('buscar_por_tipo');
        Model.buscarParametrizacaoPorTipoAtivo.mockResolvedValue(null);
        await expect(Service.buscarParametrizacaoPorTipoAtivo('UTIL', 9)).rejects.toThrow('Recurso não encontrado');
    });
    it.failing('tipo sem ativo deveria ser NotFoundError (404)', async () => {
        Model.buscarParametrizacaoPorTipoAtivo.mockResolvedValue(null);
        await expect(Service.buscarParametrizacaoPorTipoAtivo('UTIL', 9)).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('atualizar', () => {
    it('não único: atualiza, audita e recarrega', async () => {
        await expect(Service.atualizar(1, { qtd_minutos_intervalo: 90 }, 9)).resolves.toEqual(registro());
        expect(Model.atualizar).toHaveBeenCalledWith(1, { qtd_minutos_intervalo: 90 });
        expect(Model.desativarParametrizacao).not.toHaveBeenCalled();
        expect(Model.buscarParametrizacaoPorId).toHaveBeenCalledTimes(2);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'editar', num_registro_id: 1,
            des_detalhes: expect.objectContaining({ campos_alterados: ['qtd_minutos_intervalo'] })
        }));
    });
    it('inexistente → 404', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(null);
        await expect(Service.atualizar(1, {}, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('único ativo sem desativado: bloqueia desativar e trocar tipo', async () => {
        Model.contarAtivosPorTipo.mockResolvedValue(0);
        Model.buscarTipoDesativadoMaisRecente.mockResolvedValue(0);
        await expect(Service.atualizar(1, { ind_ativo: false }, 9)).rejects.toThrow(/desativar o único/);
        await expect(Service.atualizar(1, { des_tipo_dia: 'SABADO' }, 9)).rejects.toThrow(/alterar o tipo/);
        expect(Model.atualizar).not.toHaveBeenCalled();
    });
    // NOVO
    it('único ativo sem desativado: edição simples é permitida', async () => {
        Model.contarAtivosPorTipo.mockResolvedValue(0);
        Model.buscarTipoDesativadoMaisRecente.mockResolvedValue(0);
        await expect(Service.atualizar(1, { qtd_minutos_intervalo: 30 }, 9)).resolves.toEqual(registro());
    });
    // NOVO (comportamento atual)
    it('único ativo com desativado: troca o ativo (comportamento atual)', async () => {
        Model.contarAtivosPorTipo.mockResolvedValue(0);
        await Service.atualizar(1, { ind_ativo: false }, 9);
        expect(Model.desativarParametrizacao).toHaveBeenCalledWith(1);
        expect(Model.ativarParametrizacao).toHaveBeenCalledWith(2);
    });
    // NOVO
    it('ativando registro inativo (boolean false) desativa os outros do tipo', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: false }));
        await Service.atualizar(1, { ind_ativo: true }, 9);
        expect(Model.desativarPorTipo).toHaveBeenCalledWith('UTIL', 1);
    });
    it('trocar tipo desativando → erro', async () => {
        await expect(Service.atualizar(1, { des_tipo_dia: 'SABADO', ind_ativo: false }, 9)).rejects.toThrow(/deve permanecer ativo/);
    });
    it('trocar tipo desativa ativos do novo tipo', async () => {
        await Service.atualizar(1, { des_tipo_dia: 'SABADO' }, 9);
        expect(Model.desativarPorTipo).toHaveBeenCalledWith('SABADO', null);
    });
    it('falha na persistência', async () => {
        Model.atualizar.mockResolvedValue(false);
        await expect(Service.atualizar(1, { qtd_minutos_intervalo: 90 }, 9)).rejects.toThrow('Erro ao atualizar parametrização');
    });
    it.failing('único ativo com desativado: edição simples NÃO deveria trocar o ativo', async () => {
        Model.contarAtivosPorTipo.mockResolvedValue(0);
        await Service.atualizar(1, { qtd_minutos_intervalo: 90 }, 9);
        expect(Model.desativarParametrizacao).not.toHaveBeenCalled();
        expect(Model.ativarParametrizacao).not.toHaveBeenCalled();
    });
    it.failing('ativar registro inativo (ind_ativo=0 do banco) deveria desativar os outros do tipo', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: 0 }));
        await Service.atualizar(1, { ind_ativo: true }, 9);
        expect(Model.desativarPorTipo).toHaveBeenCalledWith('UTIL', 1);
    });
    it.failing('sem desativado (null) deveria continuar protegendo o único ativo', async () => {
        Model.contarAtivosPorTipo.mockResolvedValue(0);
        Model.buscarTipoDesativadoMaisRecente.mockResolvedValue(null);
        await expect(Service.atualizar(1, { ind_ativo: false }, 9)).rejects.toThrow();
    });
    it.failing('deveria validar dados (hora inválida → 400)', async () => {
        await expect(Service.atualizar(1, { hra_inicio: 'xx' }, 9)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.failing('log deveria usar chave "parametrizacao" (typo parametriazcao)', async () => {
        await Service.atualizar(1, { qtd_minutos_intervalo: 90 }, 9);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toHaveProperty('parametrizacao');
    });
});

describe('deletar', () => {
    it('ativo com inativo disponível: troca ativo, soft delete e audita', async () => {
        await expect(Service.deletar(1, 9)).resolves.toBe(true);
        expect(Model.desativarParametrizacao).toHaveBeenCalledWith(1);
        expect(Model.ativarParametrizacao).toHaveBeenCalledWith(2);
        expect(Model.deletar).toHaveBeenCalledWith(1);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'deletar', num_registro_id: 1 }));
    });
    // NOVO (linha 316 – comportamento atual)
    it('inativo (ind_ativo=0) com inativos: troca, deleta e audita', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: 0 }));
        await expect(Service.deletar(1, 9)).resolves.toBe(true);
        expect(Model.buscarTipoDesativadoMaisRecente).toHaveBeenCalledWith('UTIL', 1);
        expect(Model.desativarParametrizacao).toHaveBeenCalledWith(1);
        expect(Model.ativarParametrizacao).toHaveBeenCalledWith(2);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.parametrizacao).toEqual(registro({ ind_ativo: 0 }));
    });
    it('inexistente → erro', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(null);
        await expect(Service.deletar(1, 9)).rejects.toThrow('Recurso não encontrado');
    });
    it('sem inativos → bloqueia', async () => {
        Model.contarDesativadoPorTipo.mockResolvedValue(0);
        await expect(Service.deletar(1, 9)).rejects.toThrow(/único registro ativo/);
        expect(Model.deletar).not.toHaveBeenCalled();
    });
    it('falha na persistência', async () => {
        Model.deletar.mockResolvedValue(false);
        await expect(Service.deletar(1, 9)).rejects.toThrow('Erro ao deletar parametrização');
    });
    it.failing('inexistente deveria ser NotFoundError', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(null);
        await expect(Service.deletar(1, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it.failing('deletar registro INATIVO não deveria ativar outro (geraria 2 ativos)', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: 0 }));
        await Service.deletar(1, 9);
        expect(Model.ativarParametrizacao).not.toHaveBeenCalled();
    });
    it.failing('deletar registro inativo sem outros inativos deveria ser permitido', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: 0 }));
        Model.contarDesativadoPorTipo.mockResolvedValue(0);
        await expect(Service.deletar(1, 9)).resolves.toBe(true);
    });
    it.failing('ind_ativo boolean (true) do driver também deveria trocar o ativo', async () => {
        Model.buscarParametrizacaoPorId.mockResolvedValue(registro({ ind_ativo: true }));
        await Service.deletar(1, 9);
        expect(Model.ativarParametrizacao).toHaveBeenCalledWith(2);
    });
});
