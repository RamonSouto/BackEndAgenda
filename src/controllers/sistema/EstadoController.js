// src/controllers/sistema/EstadoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/sistema/EstadoController.js
 * @description Controlador de operações de estado.
 * 
 * @requires ../../services/sistema/EstadoService
 * @requires ../../middlewares/errorMiddleware
 */

const { asyncHandler } = require("../../middlewares/errorMiddleware");
const EstadoService = require("../../services/sistema/EstadoService");

/**
 * Classe EstadoController.
 * @class EstadoController
 */
class EstadoController {

    /**
     * Lista estados.
     * 
     * @name listarEstados
     * @function
     * @memberof EstadoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de estados.
     * 
     * @example
     * GET /api/sistema/estados
     */
    listarEstados = asyncHandler(async (req, res) => {

        const estados = await EstadoService.listarEstados(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            estados: estados.length,
            dados: estados
        });

    });

    /**
     * Busca estado por ID.
     * 
     * @name buscarEstadoId
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID do estado.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia dados do estado.
     * 
     * @example
     * GET /api/sistema/estado/id/1
     */
    buscarEstadoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const estado = await EstadoService.buscarEstadoId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            estados: estado.length,
            dados: estado
        });


    });

    /**
     * Busca estado por nome.
     * 
     * @name buscarEstadoNome
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {string} req.params.nome - Nome do estado.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia dados do estado.
     * 
     * @example
     * GET /api/sistema/estado/nome/São Paulo
     */
    buscarEstadoNome = asyncHandler(async (req, res) => {

        const { nome } = req.params;

        const estados = await EstadoService.buscarEstadoNome(nome, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            estados: estados.length,
            dados: estados
        });


    });

    /**
     * Busca estado por sigla.
     * 
     * @name buscarEstadoSgl
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {string} req.params.sgl - Sigla do estado (2 caracteres).
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia dados do estado.
     * 
     * @example
     * GET /api/sistema/estado/sgl/SP
     */
    buscarEstadoSgl = asyncHandler(async (req, res) => {

        const { sgl } = req.params;

        const estados = await EstadoService.buscarEstadoSgl(sgl, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            estados: estados.length,
            dados: estados
        });


    });
}

module.exports = new EstadoController();