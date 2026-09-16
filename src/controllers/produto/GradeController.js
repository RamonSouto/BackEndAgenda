// /src/controllers/produto/GradeController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/GradeController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/GradeService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const GradeService = require('../../services/produto/GradeService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe GradeController.
 * @class GradeController
 */
class GradeController {
    /**
         * Adiciona uma grade de produto.
         * 
         * @name adicionarGradeProduto
         * @function
         * @memberof ProdutoController
         * @async
         * 
         * @param {Object} req - Objeto de requisição.
         * @param {Object} req.body - Dados da grade.
         * @param {Object} req.usuario - Usuário autenticado.
         * @param {number} req.usuario.id - ID do usuário.
         * @param {Object} res - Objeto de resposta.
         * 
         * @returns {Promise<void>} - Resposta 201 com ID.
         * 
         * @example
         * POST /api/produtos/grade_produto
         * Body: { id_produto: 1, id_variacao_cor_estampa: 2, id_tamanho: 3, ... }
         */
    adicionarGradeProduto = asyncHandler(async (req, res) => {
        const gradeProdutoId = await GradeService.adicionarGradeProduto(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: gradeProdutoId }
        })
    });


    /**
     * Lista todas as grades de produtos.
     * 
     * @name listarGradesProdutos
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de grades com total.
     * 
     * @example
     * GET /api/produtos/grade_produto
     */
    listarGradesProdutos = asyncHandler(async (req, res) => {

        const gradesProdutos = await GradeService.listarGradesProdutos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: gradesProdutos.length,
            dados: gradesProdutos
        });
    });

    /**
     * Busca uma grade por ID.
     * 
     * @name listarGradeProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da grade.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados da grade.
     * 
     * @example
     * GET /api/produtos/grade_produto/1
     */
    listarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const gradeProduto = await GradeService.listarGradeProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: gradeProduto
        });
    });

    /**
     * Atualiza uma grade de produto.
     * 
     * @name atualizarGradeProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da grade.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Grade atualizada.
     * 
     * @example
     * PUT /api/produtos/grade_produto/1
     * Body: { val_preco_variacao: 79.90 }
     */
    atualizarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const gradeProduto = await GradeService.atualizarGradeProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: gradeProduto
        });
    });

    /**
     * Deleta (soft delete) uma grade de produto.
     * 
     * @name deletarGradeProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da grade.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/grade_produto/1
     */
    deletarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await GradeService.deletarGradeProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new GradeController();