// src/tests/unit/controllers/produto/CorEstampaController.test.js
const path = require('path');

jest.mock('../../../../services/produto/CorEstampaService', () => ({
    adicionarCorEstampa: jest.fn(), atualizarCorEstampa: jest.fn()
}));
jest.mock('../../../../config/env', () => ({ upload: { directory: './uploads' } }));
jest.mock('../../../../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const Service = require('../../../../services/produto/CorEstampaService');
const controller = require('../../../../controllers/produto/CorEstampaController');

const flush = () => new Promise(setImmediate);
const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const arquivo = { path: path.resolve('./uploads/cores/a.png') };

beforeEach(() => {
    jest.clearAllMocks();
    Service.adicionarCorEstampa.mockResolvedValue(1);
    Service.atualizarCorEstampa.mockResolvedValue({ id: 1 });
});

describe.each([
    ['adicionarCorEstampa', 201, (body) => [body, 2]],
    ['atualizarCorEstampa', 200, (body) => [1, body, 2]]
])('%s', (metodo, status, argsEsperados) => {
    it.each([
        ['com arquivo', arquivo, { des_imagem_url: 'cores/a.png' }],
        ['sem arquivo', undefined, {}]
    ])('%s', async (_, file, bodyEsperado) => {
        const res = mockRes();
        controller[metodo]({ params: { id: 1 }, usuario: { id: 2 }, body: {}, file }, res, jest.fn());
        await flush();
        expect(Service[metodo]).toHaveBeenCalledWith(...argsEsperados(bodyEsperado));
        expect(res.status).toHaveBeenCalledWith(status);
    });
});
