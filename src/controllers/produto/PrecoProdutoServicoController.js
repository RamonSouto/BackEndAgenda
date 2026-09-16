// /src/controllers/produto/PrecoProdutoServicoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/PrecoProdutoServicoController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/TipoServicoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const PrecoProdutoServicoService = require('../../services/produto/PrecoProdutoServicoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe PrecoProdutoServicoController.
 * @class PrecoProdutoServicoController
 */
class PrecoProdutoServicoController {
    /**
     * Adiciona um preço a uma associação produto-serviço.
     * 
     * @name adicionarPrecoProdutoServico
     * @function
     * @memberof PrecoProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados do preço.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com ID.
     * 
     * @example
     * POST /api/produtos/precoProdutoServico
     * Body: { id_produto_servico: 1, val_preco: 49.90, dta_inicio: '2025-01-01' }
     */
    adicionarPrecoProdutoServico = asyncHandler(async (req, res) => {

        const precoProdutoServicoId = await PrecoProdutoServicoService.adicionarPrecoProdutoServico(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: precoProdutoServicoId }
        })
    });


    /**
     * Lista todos os preços de produto-serviço.
     * 
     * @name listarPrecoProdutoServico
     * @function
     * @memberof PrecoProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de preços com total.
     * 
     * @example
     * GET /api/produtos/precoProdutoServico
     */
    listarPrecoProdutoServico = asyncHandler(async (req, res) => {

        const precoProdutoServico = await PrecoProdutoServicoService.listarPrecoProdutoServico(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: precoProdutoServico.length,
            dados: precoProdutoServico
        });
    });

    /**
     * Busca um preço por ID.
     * 
     * @name buscarPrecoProdutoServicoId
     * @function
     * @memberof PrecoProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do preço.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do preço.
     * 
     * @example
     * GET /api/produtos/precoProdutoServico/1
     */
    buscarPrecoProdutoServicoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const precoProdutoServico = await PrecoProdutoServicoService.buscarPrecoProdutoServicoPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: precoProdutoServico
        });
    });

    /**
     * Atualiza um preço de produto-serviço.
     * 
     * @name atualizarPrecoProdutoServico
     * @function
     * @memberof PrecoProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do preço.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Preço atualizado.
     * 
     * @example
     * PUT /api/produtos/precoProdutoServico/1
     * Body: { val_preco: 59.90 }
     */
    atualizarPrecoProdutoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const precoProdutoServico = await PrecoProdutoServicoService.atualizarPrecoProdutoServico(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: precoProdutoServico
        });
    });

    /**
     * Deleta (soft delete) um preço de produto-serviço.
     * 
     * @name deletarPrecoProdutoServico
     * @function
     * @memberof PrecoProdutoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do preço.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/precoProdutoServico/1
     */
    deletarPrecoProdutoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await PrecoProdutoServicoService.deletarPrecoProdutoServico(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new PrecoProdutoServicoController();