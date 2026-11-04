// /src/tests/unit/services/CategoriaService.test.js

jest.mock('../../../models/produto/CategoriaModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/validators', () => ({
    categoriaProdutoSchema: { validate: jest.fn((d) => ({ value: { ...d } })) }
}));

const CategoriaModel = require('../../../models/produto/CategoriaModel');
const LogService = require('../../../services/LogService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/produto/CategoriaService');
const { NotFoundError } = require('../../../utils/ApiError');
const { ACOES_LOG, MENSAGENS } = require('../../../utils/constants');

const categoria = (over) => ({ id: 1, nom_categoria: 'Camisas', id_pai: null, ...over });

beforeEach(() => {
    CategoriaModel.buscarCategoriaPorId = jest.fn().mockResolvedValue(categoria());
    CategoriaModel.criarCategoriaProduto = jest.fn().mockResolvedValue(1);
    CategoriaModel.listarCategorias = jest.fn().mockResolvedValue([categoria(), categoria({ id: 2 })]);
    CategoriaModel.atualizarCategoria = jest.fn().mockResolvedValue(true);
    CategoriaModel.buscarCategoriaFilho = jest.fn().mockResolvedValue([]);
    CategoriaModel.deletarCategoria = jest.fn().mockResolvedValue(true);
});

describe('CategoriaService.adicionarCategoria', () => {
    it('happy path sem pai: cria, audita e retorna', async () => {
        const r = await Service.adicionarCategoria({ nom_categoria: 'Camisas' }, 7);
        expect(CategoriaModel.buscarCategoriaPorId).toHaveBeenCalledTimes(1); // só o retorno final
        expect(CategoriaModel.criarCategoriaProduto).toHaveBeenCalledWith({ nom_categoria: 'Camisas' });
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 7, des_acao: ACOES_LOG.CRIAR, des_tabela: 'tab_categorias_produtos',
            num_registro_id: 1, des_detalhes: { nom_categoria: 'Camisas', id_pai: undefined }
        });
        expect(r).toEqual(categoria());
    });

    it('com pai existente: valida o pai antes de criar', async () => {
        await Service.adicionarCategoria({ nom_categoria: 'Polo', id_pai: 1 }, 7);
        expect(CategoriaModel.buscarCategoriaPorId).toHaveBeenNthCalledWith(1, 1);
        expect(CategoriaModel.criarCategoriaProduto).toHaveBeenCalled();
    });

    it('pai inexistente → erro e não cria', async () => {
        CategoriaModel.buscarCategoriaPorId.mockResolvedValueOnce(null);
        await expect(Service.adicionarCategoria({ nom_categoria: 'Polo', id_pai: 99 }, 7))
            .rejects.toThrow(MENSAGENS.ERRO.CATEGORIA_PAI);
        expect(CategoriaModel.criarCategoriaProduto).not.toHaveBeenCalled();
        expect(LogService.registrar).not.toHaveBeenCalled();
    });

    it('erro de validação Joi → mensagem com detalhe', async () => {
        validators.categoriaProdutoSchema.validate.mockReturnValueOnce({ error: { details: [{ message: '"nom_categoria" is required' }] } });
        await expect(Service.adicionarCategoria({}, 7))
            .rejects.toThrow(`${MENSAGENS.ERRO.VALIDACAO}: "nom_categoria" is required`);
        expect(CategoriaModel.criarCategoriaProduto).not.toHaveBeenCalled();
    });

    it('erro de infraestrutura é propagado', async () => {
        CategoriaModel.criarCategoriaProduto.mockRejectedValue(new Error('db down'));
        await expect(Service.adicionarCategoria({ nom_categoria: 'X' }, 7)).rejects.toThrow('db down');
    });
});

describe('CategoriaService.listarCategorias', () => {
    it('retorna lista e audita total', async () => {
        await expect(Service.listarCategorias(7)).resolves.toHaveLength(2);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.CONSULTAR, des_detalhes: { tipo_consulta: 'listar', total_registros: 2 }
        }));
    });

    it('lista vazia → total 0', async () => {
        CategoriaModel.listarCategorias.mockResolvedValue([]);
        await Service.listarCategorias(7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.total_registros).toBe(0);
    });

    it('erro é propagado', async () => {
        CategoriaModel.listarCategorias.mockRejectedValue(new Error('db down'));
        await expect(Service.listarCategorias(7)).rejects.toThrow('db down');
    });
});

describe('CategoriaService.listarCategoria', () => {
    it('encontrada → retorna e audita', async () => {
        await expect(Service.listarCategoria(1, 7)).resolves.toEqual(categoria());
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_detalhes: { tipo_consulta: 'busca_por_id', categoria_consultada: 'Camisas' }
        }));
    });

    it('não encontrada → 404 sem log', async () => {
        CategoriaModel.buscarCategoriaPorId.mockResolvedValue(null);
        await expect(Service.listarCategoria(99, 7)).rejects.toThrow(NotFoundError);
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});

describe('CategoriaService.atualizarCategoria', () => {
    it('happy path: atualiza, audita campos e retorna atualizada', async () => {
        CategoriaModel.buscarCategoriaPorId
            .mockResolvedValueOnce(categoria())
            .mockResolvedValueOnce(categoria({ nom_categoria: 'Novo' }));
        const r = await Service.atualizarCategoria(1, { nom_categoria: 'Novo' }, 7);
        expect(CategoriaModel.atualizarCategoria).toHaveBeenCalledWith(1, { nom_categoria: 'Novo' });
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.EDITAR,
            des_detalhes: { categoria: 'Camisas', campos_alterados: ['nom_categoria'] }
        }));
        expect(r.nom_categoria).toBe('Novo');
    });

    it('não encontrada → 404', async () => {
        CategoriaModel.buscarCategoriaPorId.mockResolvedValue(null);
        await expect(Service.atualizarCategoria(99, {}, 7)).rejects.toThrow(NotFoundError);
        expect(CategoriaModel.atualizarCategoria).not.toHaveBeenCalled();
    });

    it('update sem linhas afetadas → erro e sem log', async () => {
        CategoriaModel.atualizarCategoria.mockResolvedValue(false);
        await expect(Service.atualizarCategoria(1, { nom_categoria: 'X' }, 7)).rejects.toThrow('Erro ao atualizar categoria');
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});

describe('CategoriaService.deletarCategoria', () => {
    it('happy path: soft delete e audita', async () => {
        await expect(Service.deletarCategoria(1, 7)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: ACOES_LOG.DELETAR, num_registro_id: 1, des_detalhes: { categoria: 'Camisas' }
        }));
    });

    it('não encontrada → 404', async () => {
        CategoriaModel.buscarCategoriaPorId.mockResolvedValue(null);
        await expect(Service.deletarCategoria(99, 7)).rejects.toThrow(NotFoundError);
    });

    it('com subcategorias → bloqueia', async () => {
        CategoriaModel.buscarCategoriaFilho.mockResolvedValue([categoria({ id: 2, id_pai: 1 })]);
        await expect(Service.deletarCategoria(1, 7)).rejects.toThrow(MENSAGENS.ERRO.CATEGORIA_FILHO);
        expect(CategoriaModel.deletarCategoria).not.toHaveBeenCalled();
    });

    it('falha no soft delete → erro', async () => {
        CategoriaModel.deletarCategoria.mockResolvedValue(false);
        await expect(Service.deletarCategoria(1, 7)).rejects.toThrow('Erro ao deletar Categoria');
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});
