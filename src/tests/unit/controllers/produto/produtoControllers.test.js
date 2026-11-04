// /src/tests/unit/controllers/produto/produtoControllers.test.js

const { MENSAGENS } = require('../../../../utils/constants');

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}));

const mockCrud = (...nomes) => Object.fromEntries(nomes.map(n => [n, jest.fn()]));

jest.mock('../../../../services/produto/ProdutoService.js', () => mockCrud(
    'adicionarProduto', 'listarProdutos', 'listarProduto', 'atualizarProduto', 'deletarProduto'));
jest.mock('../../../../services/produto/ProdutoServicoService', () => mockCrud(
    'adicionarProdutoServico', 'listarProdutoServico', 'buscarProdutoServicoId',
    'atualizarProdutoServico', 'deletarProdutoServico'));
jest.mock('../../../../services/produto/TamanhoService', () => mockCrud(
    'adicionarTamanho', 'listarTamanhos', 'buscarTamanho', 'atualizarTamanhos', 'deletarTamanhos'));
jest.mock('../../../../services/produto/TipoServicoService', () => mockCrud(
    'adicionarTipoServico', 'listarTipoServico', 'buscarTipoServicoId',
    'atualizarTipoServico', 'deletarTipoServico'));
jest.mock('../../../../services/produto/PrecoProdutoServicoService', () => mockCrud(
    'adicionarPrecoProdutoServico', 'listarPrecoProdutoServico', 'buscarPrecoProdutoServicoPorId',
    'atualizarPrecoProdutoServico', 'deletarPrecoProdutoServico'));

const C = '../../../../controllers/produto/';
const S = '../../../../services/produto/';

// [controller, service, wrapId na criação, chave de contagem, {tipo: [metodoController, metodoService]}]
const casos = [
    ['ProdutoController', 'ProdutoService.js', true, 'total', {
        criar: ['adicionarProduto', 'adicionarProduto'],
        listar: ['listarProdutos', 'listarProdutos'],
        buscar: ['listarProduto', 'listarProduto'],
        atualizar: ['atualizarProduto', 'atualizarProduto'],
        deletar: ['deletarProduto', 'deletarProduto']
    }],
    ['ProdutoServicoController', 'ProdutoServicoService', false, 'total', {
        criar: ['adicionarProdutoServico', 'adicionarProdutoServico'],
        listar: ['listarProdutoServico', 'listarProdutoServico'],
        buscar: ['buscarProdutoServicoId', 'buscarProdutoServicoId'],
        atualizar: ['atualizarProdutoServico', 'atualizarProdutoServico'],
        deletar: ['deletarProdutoServico', 'deletarProdutoServico']
    }],
    ['TamanhoController', 'TamanhoService', true, 'tamanho', {
        criar: ['adicionarTamanho', 'adicionarTamanho'],
        listar: ['listarTamanhos', 'listarTamanhos'],
        buscar: ['buscarTamanho', 'buscarTamanho'],
        atualizar: ['atualizarTamanhos', 'atualizarTamanhos'],
        deletar: ['deletarTamanhos', 'deletarTamanhos']
    }],
    ['TipoServicoController', 'TipoServicoService', true, 'total', {
        criar: ['adicionarTipoServico', 'adicionarTipoServico'],
        listar: ['listarTipoServico', 'listarTipoServico'],
        buscar: ['buscarTipoServicoId', 'buscarTipoServicoId'],
        atualizar: ['atualizarTipoServico', 'atualizarTipoServico'],
        deletar: ['deletarTipoServico', 'deletarTipoServico']
    }],
    ['PrecoProdutoServicoController', 'PrecoProdutoServicoService', true, 'total', {
        criar: ['adicionarPrecoProdutoServico', 'adicionarPrecoProdutoServico'],
        listar: ['listarPrecoProdutoServico', 'listarPrecoProdutoServico'],
        buscar: ['buscarPrecoProdutoServicoId', 'buscarPrecoProdutoServicoPorId'],
        atualizar: ['atualizarPrecoProdutoServico', 'atualizarPrecoProdutoServico'],
        deletar: ['deletarPrecoProdutoServico', 'deletarPrecoProdutoServico']
    }]
];

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe.each(casos)('%s', (ctrlNome, svcNome, wrapId, chaveTotal, metodos) => {
    const controller = require(C + ctrlNome);
    const service = require(S + svcNome);
    const body = { campo: 'valor' };
    const req = { body, params: { id: '7' }, usuario: { id: 99 } };
    let res, next;

    beforeEach(() => { jest.clearAllMocks(); res = mockRes(); next = jest.fn(); });

    const cenarios = {
        criar: {
            args: [body, 99], ret: 5, status: 201,
            json: (r) => ({ sucesso: true, mensagem: MENSAGENS.SUCESSO.CRIADO, dados: wrapId ? { id: r } : r })
        },
        listar: {
            args: [99], ret: [{ id: 1 }, { id: 2 }], status: 200,
            json: (r) => ({ sucesso: true, [chaveTotal]: r.length, dados: r })
        },
        buscar: {
            args: ['7', 99], ret: { id: 7 }, status: 200,
            json: (r) => ({ sucesso: true, dados: r })
        },
        atualizar: {
            args: ['7', body, 99], ret: { id: 7 }, status: 200,
            json: (r) => ({ sucesso: true, mensagem: MENSAGENS.SUCESSO.ATUALIZADO, dados: r })
        },
        deletar: {
            args: ['7', 99], ret: true, status: 200,
            json: () => ({ sucesso: true, mensagem: MENSAGENS.SUCESSO.DELETADO })
        }
    };

    describe.each(Object.keys(cenarios))('%s', (tipo) => {
        const [mCtrl, mSvc] = metodos[tipo];
        const c = cenarios[tipo];

        it(`${mCtrl} responde ${c.status}`, async () => {
            service[mSvc].mockResolvedValue(c.ret);
            await controller[mCtrl](req, res, next);
            expect(service[mSvc]).toHaveBeenCalledWith(...c.args);
            expect(res.status).toHaveBeenCalledWith(c.status);
            expect(res.json).toHaveBeenCalledWith(c.json(c.ret));
            expect(next).not.toHaveBeenCalled();
        });

        it(`${mCtrl} repassa erro ao next`, async () => {
            const erro = new Error('falha');
            service[mSvc].mockRejectedValue(erro);
            await controller[mCtrl](req, res, next);
            expect(next).toHaveBeenCalledWith(erro);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});
