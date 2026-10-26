// /src/controllers/ProdutoController.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/ProdutoController.js
 * @description Controlador de operações relacionadas a produtos,
 * incluindo gerenciamento de produtos em agendamentos, upload de fotos,
 * CRUD de categorias, tamanhos, cores/estampas, grades, imagens,
 * tipos de serviço, associações produto-serviço e preços.
 * 
 * @requires ../services/produto/ProdutoService
 * @requires ../services/UploadService
 * @requires ../utils/constants
 * @requires ../middlewares/errorMiddleware
 * @requires path
 */
const ProdutoService = require('../../services/produto/ProdutoService.js');
const UploadService = require('../../services/UploadService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const path = require('path');

/**
 * Classe ProdutoController.
 * @class ProdutoController
 */
class ProdutoController {

    /**
     * Adiciona um produto.
     * 
     * @name adicionarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com ID.
     * 
     * @example
     * POST /api/produtos/produto
     * Body: { id_categoria: 1, nom_produto: 'Camisa Polo', ... }
     */
    adicionarProduto = asyncHandler(async (req, res) => {

        const produtoId = await ProdutoService.adicionarProduto(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: produtoId }
        })
    });


    /**
     * Lista todos os produtos.
     * 
     * @name listarProdutos
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de produtos com total.
     * 
     * @example
     * GET /api/produtos/produto
     */
    listarProdutos = asyncHandler(async (req, res) => {

        const produtos = await ProdutoService.listarProdutos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: produtos.length,
            dados: produtos
        });
    });

    /**
     * Busca um produto por ID.
     * 
     * @name listarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do produto.
     * 
     * @example
     * GET /api/produtos/produto/1
     */
    listarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.listarProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: produto
        });
    });

    /**
     * Atualiza um produto.
     * 
     * @name atualizarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Produto atualizado.
     * 
     * @example
     * PUT /api/produtos/produto/1
     * Body: { nom_produto: 'Camisa Polo Azul' }
     */
    atualizarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.atualizarProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produto
        });
    });

    /**
     * Deleta (soft delete) um produto.
     * 
     * @name deletarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/produto/1
     */
    deletarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new ProdutoController();
