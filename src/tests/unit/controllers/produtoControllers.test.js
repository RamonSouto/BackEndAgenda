// src/tests/unit/controllers/produtoControllers.test.js
const SERVICES = ['produto/CategoriaService', 'produto/CorEstampaService', 'produto/GradeService',
    'produto/ImagemService', 'produto/PrecoProdutoServicoService', 'agendamento/TipoAgendamentoService'];
SERVICES.forEach((s) => jest.mock(`../../../services/${s}`, () => new Proxy({}, {
    get: (alvo, p) => (alvo[p] ??= jest.fn())
})));
jest.mock('../../../services/UploadService', () => ({}));

const { chamar } = require('../../helpers/chamar');
const { NotFoundError } = require('../../../utils/ApiError');
const svc = (s) => require(`../../../services/${s}`);
const ctrl = (c) => require(`../../../controllers/${c}`);

const U = { id: 1, papeis: ['administrador'] };
const CRIADO = 'Registro criado com sucesso';
const ATUALIZADO = 'Registro atualizado com sucesso';
const DELETADO = 'Registro deletado com sucesso';

/** [controller, service, fnCtrl, fnService, req, retornoService, status, argsService, corpoEsperado] */
const CASOS = [
    // Categoria
    ['produto/CategoriaController', 'produto/CategoriaService', 'adicionarCategoria', 'adicionarCategoria',
        { body: { nom_categoria: 'X' } }, 5, 201, [{ nom_categoria: 'X' }, 1], { mensagem: CRIADO, dados: { id: 5 } }],
    ['produto/CategoriaController', 'produto/CategoriaService', 'listarCategorias', 'listarCategorias',
        {}, [{ id: 1 }, { id: 2 }], 200, [1], { total: 2 }],
    ['produto/CategoriaController', 'produto/CategoriaService', 'listarCategoria', 'listarCategoria',
        { params: { id: 3 } }, { id: 3 }, 200, [3, 1], { dados: { id: 3 } }],
    ['produto/CategoriaController', 'produto/CategoriaService', 'atualizarCategoria', 'atualizarCategoria',
        { params: { id: 3 }, body: { nom_categoria: 'Y' } }, { id: 3 }, 200, [3, { nom_categoria: 'Y' }, 1], { mensagem: ATUALIZADO }],
    ['produto/CategoriaController', 'produto/CategoriaService', 'deletarCategoria', 'deletarCategoria',
        { params: { id: 3 } }, true, 200, [3, 1], { mensagem: DELETADO }],
    // Cor/Estampa (sem arquivo)
    ['produto/CorEstampaController', 'produto/CorEstampaService', 'listarCoresEstampas', 'listarCoresEstampas',
        {}, [], 200, [1], { total: 0 }],
    ['produto/CorEstampaController', 'produto/CorEstampaService', 'listarCorEstampa', 'listarCorEstampa',
        { params: { id: 2 } }, { id: 2 }, 200, [2, 1], { dados: { id: 2 } }],
    ['produto/CorEstampaController', 'produto/CorEstampaService', 'deletarCorEstampa', 'deletarCorEstampa',
        { params: { id: 2 } }, true, 200, [2, 1], { mensagem: DELETADO }],
    // Grade
    ['produto/GradeController', 'produto/GradeService', 'adicionarGradeProduto', 'adicionarGradeProduto',
        { body: { id_produto: 1 } }, 9, 201, [{ id_produto: 1 }, 1], { dados: { id: 9 } }],
    ['produto/GradeController', 'produto/GradeService', 'listarGradesProdutos', 'listarGradesProdutos',
        {}, [{}], 200, [1], { total: 1 }],
    ['produto/GradeController', 'produto/GradeService', 'listarGradeProduto', 'listarGradeProduto',
        { params: { id: 4 } }, { id: 4 }, 200, [4, 1], { dados: { id: 4 } }],
    ['produto/GradeController', 'produto/GradeService', 'atualizarGradeProduto', 'atualizarGradeProduto',
        { params: { id: 4 }, body: { val_preco_variacao: 79.9 } }, { id: 4 }, 200, [4, { val_preco_variacao: 79.9 }, 1], { mensagem: ATUALIZADO }],
    ['produto/GradeController', 'produto/GradeService', 'deletarGradeProduto', 'deletarGradeProduto',
        { params: { id: 4 } }, true, 200, [4, 1], { mensagem: DELETADO }],
    // Imagem (leitura/exclusão)
    ['produto/ImagemController', 'produto/ImagemService', 'listarImagemProdutos', 'listarImagemProdutos',
        {}, [{}, {}], 200, [1], { total: 2 }],
    ['produto/ImagemController', 'produto/ImagemService', 'buscarImagemProdutoId', 'buscarImagemProdutoID',
        { params: { id: 1 } }, { id: 1 }, 200, [1, 1], { dados: { id: 1 } }],
    ['produto/ImagemController', 'produto/ImagemService', 'buscarImagemProdutoGradeId', 'buscarImagemProdutoGradeID',
        { params: { id: 6 } }, [{ id: 1 }], 200, [6, 1], { dados: [{ id: 1 }] }],
    ['produto/ImagemController', 'produto/ImagemService', 'deletarImagemProduto', 'deletarImagemProduto',
        { params: { id: 1 } }, true, 200, [1, 1], { mensagem: DELETADO }],
    // Preço produto-serviço
    ['produto/PrecoProdutoServicoController', 'produto/PrecoProdutoServicoService', 'adicionarPrecoProdutoServico', 'adicionarPrecoProdutoServico',
        { body: { val_preco: 10 } }, 3, 201, [{ val_preco: 10 }, 1], { dados: { id: 3 } }],
    ['produto/PrecoProdutoServicoController', 'produto/PrecoProdutoServicoService', 'listarPrecoProdutoServico', 'listarPrecoProdutoServico',
        {}, [], 200, [1], { total: 0 }],
    ['produto/PrecoProdutoServicoController', 'produto/PrecoProdutoServicoService', 'buscarPrecoProdutoServicoId', 'buscarPrecoProdutoServicoPorId',
        { params: { id: 3 } }, { id: 3 }, 200, [3, 1], { dados: { id: 3 } }],
    // Tipo de agendamento
    ['agendamento/TipoAgendamentoController', 'agendamento/TipoAgendamentoService', 'criar', 'criar',
        { body: { des_tipo_agendamento: 'Retorno' } }, { id: 1 }, 201, [{ des_tipo_agendamento: 'Retorno' }, 1], { mensagem: 'Tipo de agendamento criado' }],
    ['agendamento/TipoAgendamentoController', 'agendamento/TipoAgendamentoService', 'listar', 'listar',
        {}, [{}, {}, {}], 200, [1], { total: 3 }],
    ['agendamento/TipoAgendamentoController', 'agendamento/TipoAgendamentoService', 'buscarPorId', 'buscarPorId',
        { params: { id: 1 } }, { id: 1 }, 200, [1, 1], { dados: { id: 1 } }],
    ['agendamento/TipoAgendamentoController', 'agendamento/TipoAgendamentoService', 'atualizar', 'atualizar',
        { params: { id: 1 }, body: { ind_ativo: false } }, { id: 1 }, 200, [1, { ind_ativo: false }, 1], { mensagem: 'Tipo de agendamento atualizado' }],
    ['agendamento/TipoAgendamentoController', 'agendamento/TipoAgendamentoService', 'deletar', 'deletar',
        { params: { id: 1 } }, true, 200, [1, 1], { mensagem: 'Tipo de agendamento removido' }]
];

describe.each(CASOS)('%s.%s', (c, s, fn, fnSvc, req, ret, status, args, corpo) => {
    const montarReq = () => ({ params: {}, body: {}, ...req, usuario: U });

    it(`happy path → ${status}`, async () => {
        svc(s)[fnSvc].mockResolvedValue(ret);
        const { res, next } = await chamar(ctrl(c)[fn], montarReq());
        expect(svc(s)[fnSvc]).toHaveBeenCalledWith(...args);
        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sucesso: true, ...corpo }));
        expect(next).not.toHaveBeenCalled();
    });

    it('erro do Service é repassado ao next (errorMiddleware)', async () => {
        const erro = new NotFoundError();
        svc(s)[fnSvc].mockRejectedValue(erro);
        const { res, next } = await chamar(ctrl(c)[fn], montarReq());
        expect(next).toHaveBeenCalledWith(erro);
        expect(res.status).not.toHaveBeenCalled();
    });
});
