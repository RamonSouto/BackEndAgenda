// /src/controllers/produto/CategoriaController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/CategoriaController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/CategoriaService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const CategoriaService = require('../../services/produto/CategoriaService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe CategoriaController.
 * @class CategoriaController
 */
class CategoriaController {
    /**
         * Adiciona uma categoria de produto.
         * 
         * @name adicionarCategoria
         * @function
         * @memberof ProdutoController
         * @async
         * 
         * @param {Object} req - Objeto de requisição.
         * @param {Object} req.body - Dados da categoria.
         * @param {Object} req.usuario - Usuário autenticado.
         * @param {number} req.usuario.id - ID do usuário.
         * @param {Object} res - Objeto de resposta.
         * 
         * @returns {Promise<void>} - Resposta 201 com ID.
         * 
         * @example
         * POST /api/produtos/categoria
         * Body: { nom_categoria: 'Camisas', id_pai: null }
         */
    adicionarCategoria = asyncHandler(async (req, res) => {
        const categoriaId = await CategoriaService.adicionarCategoria(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: categoriaId }
        })
    });


    /**
     * Lista todas as categorias.
     * 
     * @name listarCategorias
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de categorias com total.
     * 
     * @example
     * GET /api/produtos/categoria
     */
    listarCategorias = asyncHandler(async (req, res) => {

        const categorias = await CategoriaService.listarCategorias(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: categorias.length,
            dados: categorias
        });
    });

    /**
     * Busca uma categoria por ID.
     * 
     * @name listarCategoria
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da categoria.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados da categoria.
     * 
     * @example
     * GET /api/produtos/categoria/1
     */
    listarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const categoria = await CategoriaService.listarCategoria(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: categoria
        });
    });

    /**
     * Atualiza uma categoria.
     * 
     * @name atualizarCategoria
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da categoria.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Categoria atualizada.
     * 
     * @example
     * PUT /api/produtos/categoria/1
     * Body: { nom_categoria: 'Novo Nome' }
     */
    atualizarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const categoria = await CategoriaService.atualizarCategoria(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: categoria
        });
    });

    /**
     * Deleta (soft delete) uma categoria.
     * 
     * @name deletarCategoria
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da categoria.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/categoria/1
     */
    deletarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await CategoriaService.deletarCategoria(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new CategoriaController();