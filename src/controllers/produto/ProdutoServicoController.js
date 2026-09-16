// /src/controllers/produto/ProdutoServicoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/ProdutoServicoController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/TipoServicoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const ProdutoServicoService = require('../../services/produto/ProdutoServicoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe ProdutoServicoController.
 * @class ProdutoServicoController
 */
class ProdutoServicoController {
    /**
         * Adiciona uma associação produto-serviço.
         * 
         * @name adicionarProdutoServico
         * @function
         * @memberof ProdutoServicoController
         * @async
         * 
         * @param {Object} req - Objeto de requisição.
         * @param {Object} req.body - Dados da associação.
         * @param {Object} req.usuario - Usuário autenticado.
         * @param {number} req.usuario.id - ID do usuário.
         * @param {Object} res - Objeto de resposta.
         * 
         * @returns {Promise<void>} - Resposta 201 com ID.
         * 
         * @example
         * POST /api/produtos/produtoServico
         * Body: { id_produto: 1, id_tipo_servico: 2 }
         */
    adicionarProdutoServico = asyncHandler(async (req, res) => {

        const produtoTipoServicoId = await ProdutoServicoService.adicionarProdutoServico(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: produtoTipoServicoId
        })
    });


    /**
     * Lista todas as associações produto-serviço.
     * 
     * @name listarProdutoServico
     * @function
     * @memberof ProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de associações com total.
     * 
     * @example
     * GET /api/produtos/produtoServico
     */
    listarProdutoServico = asyncHandler(async (req, res) => {

        const produtoTipoServico = await ProdutoServicoService.listarProdutoServico(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: produtoTipoServico.length,
            dados: produtoTipoServico
        });
    });

    /**
     * Busca uma associação produto-serviço por ID.
     * 
     * @name buscarProdutoServicoId
     * @function
     * @memberof ProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da associação.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados da associação.
     * 
     * @example
     * GET /api/produtos/produtoServico/1
     */
    buscarProdutoServicoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produtoTipoServico = await ProdutoServicoService.buscarProdutoServicoId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: produtoTipoServico
        });
    });

    /**
     * Atualiza uma associação produto-serviço.
     * 
     * @name atualizarProdutoServico
     * @function
     * @memberof ProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da associação.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Associação atualizada.
     * 
     * @example
     * PUT /api/produtos/produtoServico/1
     * Body: { ind_ativo: false }
     */
    atualizarProdutoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produtoTipoServico = await ProdutoServicoService.atualizarProdutoServico(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produtoTipoServico
        });
    });

    /**
     * Deleta (soft delete) uma associação produto-serviço.
     * 
     * @name deletarProdutoServico
     * @function
     * @memberof ProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da associação.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/produtoServico/1
     */
    deletarProdutoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoServicoService.deletarProdutoServico(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new ProdutoServicoController();