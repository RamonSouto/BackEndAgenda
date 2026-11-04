// /src/tests/unit/services/CidadeEstadoService.test.js

jest.mock('../../../models/sistema/CidadeModel', () => ({
    listarCidades: jest.fn(), buscarCidadeId: jest.fn(), buscarCidadeNome: jest.fn(), buscarCidadeEstadoId: jest.fn()
}));
jest.mock('../../../models/sistema/EstadoModel', () => ({
    listarEstados: jest.fn(), buscarEstadoId: jest.fn(), buscarEstadoNome: jest.fn(), buscarEstadoSgl: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const CidadeModel = require('../../../models/sistema/CidadeModel');
const EstadoModel = require('../../../models/sistema/EstadoModel');
const LogService = require('../../../services/LogService');
const { NotFoundError } = require('../../../utils/ApiError');
const CidadeService = require('../../../services/sistema/CidadeService');
const EstadoService = require('../../../services/sistema/EstadoService');

const registros = [{ id: 1 }, { id: 2 }];

beforeEach(() => jest.clearAllMocks());

// [service, model, método, args, ação, tipo_consulta, tabela]
const casos = [
    [CidadeService, CidadeModel, 'listarCidades', [9], 'listar', 'listar_cidades', 'tab_cidades'],
    [CidadeService, CidadeModel, 'buscarCidadeId', [1, 9], 'consultar', 'buscar_cidade_id', 'tab_cidades'],
    [CidadeService, CidadeModel, 'buscarCidadeNome', ['Goi', 9], 'consultar', 'buscar_cidade_nome', 'tab_cidades'],
    [CidadeService, CidadeModel, 'buscarCidadeEstadoId', [9, 9], 'consultar', 'buscar_cidades_estado_id', 'tab_cidades'],
    [EstadoService, EstadoModel, 'listarEstados', [9], 'listar', 'listar_estados', 'tab_estados'],
    [EstadoService, EstadoModel, 'buscarEstadoId', [1, 9], 'consultar', 'buscar_estado_id', 'tab_estados'],
    [EstadoService, EstadoModel, 'buscarEstadoNome', ['Goi', 9], 'consultar', 'buscar_estado_nome', 'tab_estados'],
    [EstadoService, EstadoModel, 'buscarEstadoSgl', ['GO', 9], 'consultar', 'buscar_estado_sigla', 'tab_estados']
];

describe.each(casos)('%#', (Service, Model, m, args, acao, tipo, tabela) => {
    it(`${m}: retorna dados e audita`, async () => {
        Model[m].mockResolvedValue(registros);
        await expect(Service[m](...args)).resolves.toEqual(registros);
        expect(Model[m]).toHaveBeenCalledWith(...args.slice(0, -1));
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            id_usuario: 9, des_acao: acao, des_tabela: tabela,
            des_detalhes: { tipo_consulta: tipo, total_registros: 2 }
        }));
    });

    if (m !== 'listarCidades') {
        it(`${m}: vazio → NotFoundError sem log`, async () => {
            Model[m].mockResolvedValue([]);
            await expect(Service[m](...args)).rejects.toBeInstanceOf(NotFoundError);
            expect(LogService.registrar).not.toHaveBeenCalled();
        });
    }

    it.failing(`${m}: Model retornando null deveria virar 404, não TypeError`, async () => {
        Model[m].mockResolvedValue(null);
        await expect(Service[m](...args)).rejects.toBeInstanceOf(NotFoundError);
    });

    it.failing(`${m}: des_tabela deveria ser a tabela real (tab_cidade/tab_estado)`, async () => {
        Model[m].mockResolvedValue(registros);
        await Service[m](...args);
        expect(LogService.registrar.mock.calls[0][0].des_tabela).toBe(tabela.replace(/s$/, ''));
    });
});

describe('específicos', () => {
    it('buscarCidadeEstadoId registra num_registro_id do estado', async () => {
        CidadeModel.buscarCidadeEstadoId.mockResolvedValue(registros);
        await CidadeService.buscarCidadeEstadoId(9, 3);
        expect(LogService.registrar.mock.calls[0][0]).toMatchObject({ num_registro_id: 9, id_usuario: 3 });
    });
    it.failing('listarCidades vazio deveria LANÇAR NotFoundError (hoje retorna a instância)', async () => {
        CidadeModel.listarCidades.mockResolvedValue([]);
        await expect(CidadeService.listarCidades(9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it.failing.each([
        [CidadeService, CidadeModel, 'buscarCidadeId'],
        [EstadoService, EstadoModel, 'buscarEstadoId']
    ])('%#: busca por ID deveria retornar objeto único', async (Service, Model, m) => {
        Model[m].mockResolvedValue([{ id: 1 }]);
        await expect(Service[m](1, 9)).resolves.toEqual({ id: 1 });
    });
    it.failing('busca por ID deveria registrar num_registro_id', async () => {
        EstadoModel.buscarEstadoId.mockResolvedValue([{ id: 1 }]);
        await EstadoService.buscarEstadoId(1, 9);
        expect(LogService.registrar.mock.calls[0][0].num_registro_id).toBe(1);
    });
});
