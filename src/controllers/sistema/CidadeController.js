// src/controllers/sistema/CidadeController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/sistema/CidadeController.js
 * @description Controlador de operações de cidades.
 * 
 * @requires ../../services/sistema/CidadeService
 * @requires ../../middlewares/errorMiddleware
 */

const { asyncHandler } = require("../../middlewares/errorMiddleware");
const CidadeService = require("../../services/sistema/CidadeService");

/**
 * Classe CidadeController.
 * @class CidadeController
 */
class CidadeController {

    /**
     * Lista cidades.
     * 
     * @name listarCidades
     * @function
     * @memberof CidadeController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de cidades.
     * 
     * @example
     * GET /api/pessoas/cidades
     */
    listarCidades = asyncHandler(async (req, res) => {

        const cidades = await CidadeService.listarCidades(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            cidades: cidades.length,
            dados: cidades
        });

    });

    /**
     * Busca cidade por ID.
     * 
     * @name buscarCidadeId
     * @function
     * @memberof CidadeController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da cidade.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia dados da cidade.
     * 
     * @example
     * GET /api/pessoas/cidade/1
     */
    buscarCidadeId = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const cidade = await CidadeService.buscarCidadeId(id, req.usuario.id);


        return res.status(200).json({
            sucesso: true,
            dados: cidade
        });


    });

    /**
     * Busca cidades por nome.
     * 
     * @name buscarCidadeNome
     * @function
     * @memberof CidadeController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {string} req.params.nome - Nome da cidade.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de cidades.
     * 
     * @example
     * GET /api/pessoas/cidades/nome/Rio
     */
    buscarCidadeNome = asyncHandler(async (req, res) => {
        const { nome } = req.params;

        const cidades = await CidadeService.buscarCidadeNome(nome, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            cidades: cidades.length,
            dados: cidades
        });

    });

    /**
     * Busca cidades por ID do estado.
     * 
     * @name buscarCidadeEstadoId
     * @function
     * @memberof CidadeController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID do estado.
     * @param {Object} req - Objeto completo (passado diretamente ao service).
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de cidades.
     * 
     * @example
     * GET /api/pessoas/cidades/estado/1
     * 
     * @note O parâmetro `req` é passado diretamente para o service, o que é incomum.
     */
    buscarCidadeEstadoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const cidades = await CidadeService.buscarCidadeEstadoId(id, req.usuario.id);


        return res.status(200).json({
            sucesso: true,
            cidades: cidades.length,
            dados: cidades
        });


    });
}

module.exports = new CidadeController();