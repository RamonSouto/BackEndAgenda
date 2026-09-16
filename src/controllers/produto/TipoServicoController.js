// /src/controllers/produto/TipoServicoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/TipoServicoController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/TipoServicoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const TipoServicoService = require('../../services/produto/TipoServicoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe TipoServicoController.
 * @class TipoServicoController
 */
class TipoServicoController {
    /**
         * Adiciona um tipo de serviço.
         * 
         * @name adicionarTipoServico
         * @function
         * @memberof TipoServicoController
         * @async
         * 
         * @param {Object} req - Objeto de requisição.
         * @param {Object} req.body - Dados do tipo de serviço.
         * @param {Object} req.usuario - Usuário autenticado.
         * @param {number} req.usuario.id - ID do usuário.
         * @param {Object} res - Objeto de resposta.
         * 
         * @returns {Promise<void>} - Resposta 201 com ID.
         * 
         * @example
         * POST /api/produtos/tipoServico
         * Body: { des_tipo_ajuste: 'Costura', ind_ativo: true }
         */
    adicionarTipoServico = asyncHandler(async (req, res) => {

        const tipoServicoId = await TipoServicoService.adicionarTipoServico(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: tipoServicoId }
        })
    });


    /**
     * Lista todos os tipos de serviço.
     * 
     * @name listarTipoServico
     * @function
     * @memberof TipoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de tipos com total.
     * 
     * @example
     * GET /api/produtos/tipoServico
     */
    listarTipoServico = asyncHandler(async (req, res) => {

        const tipoServico = await TipoServicoService.listarTipoServico(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: tipoServico.length,
            dados: tipoServico
        });
    });

    /**
     * Busca um tipo de serviço por ID.
     * 
     * @name buscarTipoServicoId
     * @function
     * @memberof TipoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tipo.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do tipo.
     * 
     * @example
     * GET /api/produtos/tipoServico/1
     */
    buscarTipoServicoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tipoServico = await TipoServicoService.buscarTipoServicoId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: tipoServico
        });
    });

    /**
     * Atualiza um tipo de serviço.
     * 
     * @name atualizarTipoServico
     * @function
     * @memberof TipoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tipo.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Tipo atualizado.
     * 
     * @example
     * PUT /api/produtos/tipoServico/1
     * Body: { des_tipo_ajuste: 'Costura Fina' }
     */
    atualizarTipoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tipoServico = await TipoServicoService.atualizarTipoServico(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: tipoServico
        });
    });

    /**
     * Deleta (soft delete) um tipo de serviço.
     * 
     * @name deletarTipoServico
     * @function
     * @memberof TipoServicoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tipo.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/tipoServico/1
     */
    deletarTipoServico = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await TipoServicoService.deletarTipoServico(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new TipoServicoController();