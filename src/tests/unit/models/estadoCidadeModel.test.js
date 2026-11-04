jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const EstadoModel = require('../../../models/sistema/EstadoModel');
const CidadeModel = require('../../../models/sistema/CidadeModel');

beforeEach(() => jest.clearAllMocks());

describe.each([
    [EstadoModel, 'listarEstados', [], undefined],
    [EstadoModel, 'buscarEstadoId', [1], [1]],
    [EstadoModel, 'buscarEstadoNome', ['Goi'], ['%Goi%']],
    [EstadoModel, 'buscarEstadoSgl', ['GO'], ['%GO%']],
    [CidadeModel, 'listarCidades', [], undefined],
    [CidadeModel, 'buscarCidadeId', [1], [1]],
    [CidadeModel, 'buscarCidadeNome', ['Goi'], ['%Goi%']],
    [CidadeModel, 'buscarCidadeEstadoId', [9], [9]]
])('%#', (model, metodo, args, params) => {
    it(`${metodo} retorna resultado`, async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(model[metodo](...args)).resolves.toEqual([{ id: 1 }]);
        if (params) expect(database.query).toHaveBeenCalledWith(expect.any(String), params);
    });
    it(`${metodo} retorna null se vazio`, async () => {
        database.query.mockResolvedValue(undefined);
        await expect(model[metodo](...args)).resolves.toBeNull();
    });
});
