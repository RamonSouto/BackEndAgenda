jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/ImagemModel');

const dados = {
    id_produto_grade: null, id_produto: 5, des_titulo_imagem: 'Frente',
    des_imagem: 'Foto frontal', des_url_imagem: '/u/a.jpg', num_ordem: 1, ind_principal: true
};

beforeEach(() => database.query.mockReset());

describe('ImagemModel.criarImagemProduto', () => {
    it('retorna insertId e envia valores na ordem das colunas', async () => {
        database.query.mockResolvedValue({ insertId: 9 });
        await expect(Model.criarImagemProduto(dados)).resolves.toBe(9);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO tab_produto_imagens/);
        expect(valores).toEqual([null, 5, 'Frente', 'Foto frontal', '/u/a.jpg', 1, true]);
    });
});

describe('ImagemModel.listarImagemProdutos', () => {
    it('ignora deletadas e ordena por num_ordem', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarImagemProdutos()).resolves.toEqual([{ id: 1 }]);
        const [sql] = database.query.mock.calls[0];
        expect(sql).toMatch(/WHERE deleted_at IS NULL/);
        expect(sql).toMatch(/ORDER BY num_ordem/);
    });
});

describe('ImagemModel.buscarImagemProdutoId', () => {
    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('%j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarImagemProdutoId(1)).resolves.toEqual(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id = \? AND deleted_at IS NULL/), [1]);
    });
});

describe.each([
    ['buscarImagemProdutoPorId', /WHERE id_produto = \? AND deleted_at IS NULL/],
    ['buscarImagemProdutoGradeID', /WHERE id_produto_grade = \? AND deleted_at IS NULL/]
])('ImagemModel.%s', (metodo, regex) => {
    it('retorna lista filtrada', async () => {
        database.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        await expect(Model[metodo](5)).resolves.toHaveLength(2);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(regex), [5]);
    });
    it('lista vazia → []', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model[metodo](5)).resolves.toEqual([]);
    });
    it('resultado nulo do driver → null', async () => {
        database.query.mockResolvedValue(undefined);
        await expect(Model[metodo](5)).resolves.toBeNull();
    });
});

describe('ImagemModel.atualizarImagemProduto', () => {
    it.each([[1, true], [0, false]])('affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarImagemProduto(3, { num_ordem: 2, ind_principal: 1 })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_produto_imagens SET .+ WHERE id = \? AND deleted_at IS NULL$/);
        expect(valores).toEqual([2, 1, 3]);
    });

    it('ignora campos fora da whitelist (id_produto, id_produto_grade)', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizarImagemProduto(3, { num_ordem: 2, id_produto: 9, id_produto_grade: 8 });
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).not.toMatch(/id_produto/);
        expect(valores).toEqual([2, 3]);
    });
});

describe('ImagemModel.deletarImagemProduto', () => {
    it.each([[1, true], [0, false]])('soft delete affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarImagemProduto(1)).resolves.toBe(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/SET deleted_at = CURRENT_TIMESTAMP/), [1]);
    });
});

describe.each([
    ['desmarcarImagemPrincipalPorProduto', /WHERE id_produto = \? AND ind_principal = true/],
    ['desmarcarImagemPrincipalPorGrade', /WHERE id_produto_grade = \? AND ind_principal = true/]
])('ImagemModel.%s', (metodo, regex) => {
    it.each([[2, true], [0, false]])('affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model[metodo](5)).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/SET ind_principal = false/);
        expect(sql).toMatch(regex);
        expect(valores).toEqual([5]);
    });
});

describe('ImagemModel – erros', () => {
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.listarImagemProdutos()).rejects.toThrow('db down');
    });
});
