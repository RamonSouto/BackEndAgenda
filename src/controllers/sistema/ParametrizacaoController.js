// /src/controllers/sistema/ParametrizacaoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/sistema/ParametrizacaoController.js
 * @description Controlador de operações de parametrização.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de parametrizações (configurações de horários e dias).
 * 
 * @requires ../services/ParametrizacaoService
 * @requires ../utils/constants
 * @requires ../middlewares/errorMiddleware
 */
const ParametrizacaoService = require('../../services/sistema/ParametrizacaoService');
const { MENSAGENS, TIPO_PESSOA } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe ParametrizacaoController.
 * @class ParametrizacaoController
 */
class ParametrizacaoController {

    /**
     * Cria uma nova parametrização.
     * 
     * @name criar
     * @function
     * @memberof ParametrizacaoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.body - Dados da parametrização.
     * @param {string} req.body.des_tipo_dia - Tipo do dia (UTIL, SABADO).
     * @param {string} req.body.hra_inicio - Horário de início (HH:MM:SS).
     * @param {string} req.body.hra_fim - Horário de fim (HH:MM:SS).
     * @param {number} req.body.qtd_minutos_intervalo - Duração do intervalo (minutos).
     * @param {boolean} req.body.ind_ativo - Indicador de ativo.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com a parametrização criada.
     * 
     * @throws {Error} - Repassa erros para o middleware de erros via asyncHandler.
     * 
     * @example
     * POST /api/parametrizacao
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "des_tipo_dia": "UTIL", "hra_inicio": "08:00:00", "hra_fim": "18:00:00", "qtd_minutos_intervalo": 60, "ind_ativo": true }
     * // Resposta 201:
     * { "sucesso": true, "mensagem": "Registro criado com sucesso", "dados": { ... } }
     */
    criar = asyncHandler(async (req, res) => {

        const parametrizacao = await ParametrizacaoService.criar(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: parametrizacao
        });
    });

    /**
     * Lista todas as parametrizações.
     * 
     * @name listarParametrizacao
     * @function
     * @memberof ParametrizacaoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com a lista de parametrizações.
     * 
     * @description
     * - ⚠️ **BUG:** A mensagem de resposta retorna `parametrizacao.length` (número) em vez de uma string descritiva.
     * - Chama `ParametrizacaoService.listar` para obter todas as parametrizações.
     * 
     * @example
     * GET /api/parametrizacao
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": 5, "dados": [...] }
     */
    listarParametrizacao = asyncHandler(async (req, res) => {

        const parametrizacao = await ParametrizacaoService.listar(req.usuario.id)

        return res.status(200).json({
            sucesso: true,
            parametro: parametrizacao.length,
            dados: parametrizacao
        })
    });

    /**
     * Busca uma parametrização por ID.
     * 
     * @name buscarParametrizacaoPorId
     * @function
     * @memberof ParametrizacaoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da parametrização.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com os dados da parametrização.
     * 
     * @throws {Error} - Se a parametrização não for encontrada ou não houver permissão.
     * 
     * @example
     * GET /api/parametrizacao/1
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "dados": { "id": 1, "des_tipo_dia": "UTIL", ... } }
     */
    buscarParametrizacaoPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const parametrizacao = await ParametrizacaoService.buscarParametrizacaoPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            parametro: parametrizacao.length,
            dados: parametrizacao
        });
    });

    /**
     * Atualiza uma parametrização existente.
     * 
     * @name atualizar
     * @function
     * @memberof ParametrizacaoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da parametrização.
     * @param {Object} req.body - Dados a serem atualizados.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com os dados atualizados.
     * 
     * @throws {Error} - Se a parametrização não for encontrada, dados inválidos ou sem permissão.
     * 
     * @description
     * - ⚠️ **BUG:** O comentário da rota está incorreto (diz "GET /api/parametrizacao/:id" em vez de "PUT").
     * 
     * @example
     * PUT /api/parametrizacao/1
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "qtd_minutos_intervalo": 90 }
     * // Resposta 200:
     * { "sucesso": true, "dados": { ... } }
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const parametrizacao = await ParametrizacaoService.atualizar(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            parametro: parametrizacao.length,
            dados: parametrizacao
        });
    });

    /**
     * Deleta uma parametrização (soft delete).
     * 
     * @name deletar
     * @function
     * @memberof ParametrizacaoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da parametrização.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @throws {Error} - Se a parametrização não for encontrada ou sem permissão.
     * 
     * @description
     * - Realiza soft delete (marca `deleted_at` com timestamp).
     * - A exclusão física não é realizada.
     * 
     * @example
     * DELETE /api/parametrizacao/1
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": "Registro deletado com sucesso" }
     */
    deletar = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ParametrizacaoService.deletar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });
}

module.exports = new ParametrizacaoController();