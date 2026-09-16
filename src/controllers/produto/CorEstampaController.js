// /src/controllers/produto/CorEstampaController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/CorEstampaController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/CorEstampaService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const CorEstampaService = require('../../services/produto/CorEstampaService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe CorEstampaController.
 * @class CorEstampaController
 */
class CorEstampaController {

    /**
     * Adiciona uma cor/estampa.
     * 
     * @name adicionarCorEstampa
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados da cor/estampa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com ID.
     * 
     * @example
     * POST /api/produtos/cor_estampa
     * Body: { nom_cor_estampa: 'Vermelho', ind_tipo: 'cor' }
     */
    adicionarCorEstampa = asyncHandler(async (req, res) => {

        if (req.file) {
            req.body.des_imagem_url = req.file.path
        }

        const corEstampaId = await CorEstampaService.adicionarCorEstampa(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: corEstampaId }
        })
    });


    /**
     * Lista todas as cores/estampas.
     * 
     * @name listarCoresEstampas
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de cores/estampas com total.
     * 
     * @example
     * GET /api/produtos/cor_estampa
     */
    listarCoresEstampas = asyncHandler(async (req, res) => {

        const corEstampa = await CorEstampaService.listarCoresEstampas(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: corEstampa.length,
            dados: corEstampa
        });
    });

    /**
     * Busca uma cor/estampa por ID.
     * 
     * @name listarCorEstampa
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da cor/estampa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados da cor/estampa.
     * 
     * @example
     * GET /api/produtos/cor_estampa/1
     */
    listarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await CorEstampaService.listarCorEstampa(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: tamanho
        });
    });

    /**
     * Atualiza uma cor/estampa.
     * 
     * @name atualizarCorEstampa
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da cor/estampa.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Cor/estampa atualizada.
     * 
     * @example
     * PUT /api/produtos/cor_estampa/1
     * Body: { nom_cor_estampa: 'Azul' }
     */
    atualizarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        if (req.file) {
            req.body.des_imagem_url = req.file.path
        }

        const corEstampa = await CorEstampaService.atualizarCorEstampa(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: corEstampa
        });
    });

    /**
     * Deleta (soft delete) uma cor/estampa.
     * 
     * @name deletarCorEstampa
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da cor/estampa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/cor_estampa/1
     */
    deletarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await CorEstampaService.deletarCorEstampa(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new CorEstampaController();