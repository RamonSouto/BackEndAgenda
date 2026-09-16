// /src/controllers/produto/TamanhoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/TamanhoController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/TamanhoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const TamanhoService = require('../../services/produto/TamanhoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe TamanhoController.
 * @class TamanhoController
 */
class TamanhoController {
    /**
         * Adiciona um tamanho.
         * 
         * @name adicionarTamanho
         * @function
         * @memberof TamanhoController
         * @async
         * 
         * @param {Object} req - Objeto de requisição.
         * @param {Object} req.body - Dados do tamanho.
         * @param {Object} req.usuario - Usuário autenticado.
         * @param {number} req.usuario.id - ID do usuário.
         * @param {Object} res - Objeto de resposta.
         * 
         * @returns {Promise<void>} - Resposta 201 com ID.
         * 
         * @example
         * POST /api/produtos/tamanho
         * Body: { cod_tamanho: 'M', des_tamanho: 'Médio' }
         */
    adicionarTamanho = asyncHandler(async (req, res) => {
        const tamanhoId = await TamanhoService.adicionarTamanho(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: tamanhoId }
        })
    });


    /**
     * Lista todos os tamanhos.
     * 
     * @name listarTamanhos
     * @function
     * @memberof TamanhoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de tamanhos com total.
     * 
     * @example
     * GET /api/produtos/tamanho
     */
    listarTamanhos = asyncHandler(async (req, res) => {

        const tamanhos = await TamanhoService.listarTamanhos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            tamanho: tamanhos.length,
            dados: tamanhos
        });
    });

    /**
     * Busca um tamanho por ID.
     * 
     * @name listarTamanho
     * @function
     * @memberof TamanhoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tamanho.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do tamanho.
     * 
     * @example
     * GET /api/produtos/tamanho/1
     */
    buscarTamanho = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await TamanhoService.buscarTamanho(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: tamanho
        });
    });

    /**
     * Atualiza um tamanho.
     * 
     * @name atualizarTamanhos
     * @function
     * @memberof TamanhoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tamanho.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Tamanho atualizado.
     * 
     * @example
     * PUT /api/produtos/tamanho/1
     * Body: { des_tamanho: 'Médio Grande' }
     */
    atualizarTamanhos = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await TamanhoService.atualizarTamanhos(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: tamanho
        });
    });

    /**
     * Deleta (soft delete) um tamanho.
     * 
     * @name deletarTamanhos
     * @function
     * @memberof TamanhoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do tamanho.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/tamanho/1
     */
    deletarTamanhos = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await TamanhoService.deletarTamanhos(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new TamanhoController();