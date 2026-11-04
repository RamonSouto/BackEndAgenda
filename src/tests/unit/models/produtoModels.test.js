// src/tests/unit/models/produtoModels.test.js
jest.mock('../../../config/database', () => ({ query: jest.fn() }));
const database = require('../../../config/database');
const { BadRequestError } = require('../../../utils/ApiError');

const CASOS = [
    {
        nome: 'CategoriaModel', mod: 'produto/CategoriaModel', tabela: 'tab_categorias_produtos',
        m: { criar: 'criarCategoriaProduto', buscar: 'buscarCategoriaPorId', listar: 'listarCategorias', atualizar: 'atualizarCategoria', deletar: 'deletarCategoria' },
        criar: { nom_categoria: 'Camisas', id_pai: null }, permitido: 'nom_categoria', proibido: 'deleted_at'
    },
    {
        nome: 'CorEstampaModel', mod: 'produto/CorEstampaModel', tabela: 'tab_variacoes_cor_estampa',
        m: { criar: 'criarCorEstampaProduto', buscar: 'buscarCorEstampaPorId', listar: 'listarCoresEstampas', atualizar: 'atualizarCorEstampa', deletar: 'deletarCorEstampa' },
        criar: { nom_cor_estampa: 'Azul', ind_tipo: 'cor', val_codigo_hex: '#0000ff', des_imagem_url: null, num_ordem_exibicao: 1 },
        permitido: 'val_codigo_hex', proibido: 'id'
    },
    {
        nome: 'GradeModel', mod: 'produto/GradeModel', tabela: 'tab_produto_grade',
        m: { criar: 'criarGradeProduto', buscar: 'buscarGradeProdutoPorId', listar: 'listarGradesProdutos', atualizar: 'atualizarGradeProduto', deletar: 'deletarGradeProduto' },
        criar: { id_produto: 1, id_variacao_cor_estampa: null, id_tamanho: 2, num_sku: 'SKU1', val_preco_variacao: 10, ind_ativo: true, num_codigo_barras: null },
        permitido: 'val_preco_variacao', proibido: 'id_produto'   // id_produto não é atualizável
    },
    {
        nome: 'ImagemModel', mod: 'produto/ImagemModel', tabela: 'tab_produto_imagens',
        m: { criar: 'criarImagemProduto', buscar: 'buscarImagemProdutoId', listar: 'listarImagemProdutos', atualizar: 'atualizarImagemProduto', deletar: 'deletarImagemProduto' },
        criar: { id_produto_grade: null, id_produto: 1, des_titulo_imagem: 't', des_imagem: 'd', des_url_imagem: 'u', num_ordem: 0, ind_principal: false },
        permitido: 'ind_principal', proibido: 'id_produto'
    },
    {
        nome: 'PrecoProdutoServicoModel', mod: 'produto/PrecoProdutoServicoModel', tabela: 'tab_preco_produto_servico',
        m: { criar: 'criarPrecoProdutoServico', buscar: 'buscarPrecoProdutoServicoPorId', listar: 'listarPrecoProdutoServico', atualizar: 'atualizarPrecoProdutoServico', deletar: 'deletarPrecoProdutoServico' },
        criar: { id_produto_servico: 1, val_preco: 49.9, dta_inicio: '2030-01-01' },
        permitido: 'val_preco', proibido: 'id_produto_servico'
    },
    {
        nome: 'ProdutoModel', mod: 'produto/ProdutoModel', tabela: 'tab_produtos',
        m: { criar: 'criarProduto', buscar: 'buscarProdutoPorId', listar: 'listarProdutos', atualizar: 'atualizarProduto', deletar: 'deletarProduto' },
        criar: { id_categoria: 1, nom_produto: 'Cinta', num_sku: 'S', des_produto: 'd', ref_produto: 'R', val_preco_base: 10, ind_ativo: true },
        permitido: 'nom_produto', proibido: 'created_at'
    },
    {
        nome: 'TipoAgendamentoModel (static)', mod: 'agendamento/TipoAgendamentoModel', tabela: 'tab_tipo_agendamento',
        m: { criar: 'criar', buscar: 'buscarPorId', listar: 'listar', atualizar: 'atualizar', deletar: 'deletar' },
        criar: { des_tipo_agendamento: 'Retorno', ind_ativo: true }, permitido: 'ind_ativo', proibido: 'id'
    }
];

describe.each(CASOS)('$nome', ({ mod, tabela, m, criar, permitido, proibido }) => {
    const Model = require(`../../../models/${mod}`);
    const sql = () => database.query.mock.calls[0][0];
    const params = () => database.query.mock.calls[0][1];

    it('criar: INSERT na tabela correta, valores na ordem e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 42 });
        await expect(Model[m.criar](criar)).resolves.toBe(42);
        expect(sql()).toContain(`INSERT INTO ${tabela}`);
        expect(params()).toEqual(Object.values(criar));
    });

    it('buscar: retorna o primeiro registro e filtra soft delete', async () => {
        database.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        await expect(Model[m.buscar](1)).resolves.toEqual({ id: 1 });
        expect(sql()).toMatch(/deleted_at IS NULL/);
        expect(params()).toEqual([1]);
    });

    it('buscar: retorna null quando não existe', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model[m.buscar](999)).resolves.toBeNull();
    });

    it('listar: ignora registros deletados', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model[m.listar]()).resolves.toEqual([{ id: 1 }]);
        expect(sql()).toMatch(new RegExp(`FROM ${tabela}[\\s\\S]*deleted_at IS NULL`));
    });

    it.each([[1, true], [0, false]])('atualizar: affectedRows=%i → %p', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model[m.atualizar](7, { [permitido]: 'x' })).resolves.toBe(esperado);
        expect(params()).toEqual(['x', 7]);
    });

    it('atualizar: whitelist bloqueia campo proibido (mass assignment)', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model[m.atualizar](7, { [permitido]: 'x', [proibido]: 'hack' });
        expect(sql()).not.toContain(`\`${proibido}\``);
    });

    it('atualizar: nenhum campo válido → BadRequest sem tocar no banco', async () => {
        await expect(Model[m.atualizar](7, { [proibido]: 'hack' })).rejects.toThrow(BadRequestError);
        expect(database.query).not.toHaveBeenCalled();
    });

    it.each([[1, true], [0, false]])('deletar: soft delete, affectedRows=%i → %p', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model[m.deletar](7)).resolves.toBe(esperado);
        expect(sql()).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
        expect(sql()).not.toMatch(/DELETE FROM/);
    });
});

describe('CategoriaModel.buscarCategoriaFilho', () => {
    const Model = require('../../../models/produto/CategoriaModel');
    it('busca subcategorias ativas pelo id_pai', async () => {
        database.query.mockResolvedValue([{ id: 2, id_pai: 1 }]);
        await expect(Model.buscarCategoriaFilho(1)).resolves.toHaveLength(1);
        expect(database.query.mock.calls[0][0]).toMatch(/id_pai = \?/);
    });
});

describe('ImagemModel – específicos', () => {
    const Model = require('../../../models/produto/ImagemModel');

    it.each([
        ['desmarcarImagemPrincipalPorProduto', 'id_produto'],
        ['desmarcarImagemPrincipalPorGrade', 'id_produto_grade']
    ])('%s desmarca apenas principais ativas', async (metodo, coluna) => {
        database.query.mockResolvedValue({ affectedRows: 2 });
        await expect(Model[metodo](1)).resolves.toBe(true);
        expect(database.query.mock.calls[0][0]).toMatch(new RegExp(`${coluna} = \\? AND ind_principal = true`));
    });

    // Inconsistência #3: [] || null === [] → nunca retorna null.
    it.failing('buscarImagemProdutoGradeID retorna null quando não há imagens', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model.buscarImagemProdutoGradeID(1)).resolves.toBeNull();
    });
});
