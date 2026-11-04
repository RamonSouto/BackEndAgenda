// src/controllers/agendamento/AgendamentoProdutoController.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/controllers/agendamento/AgendamentoProdutoController.js
 * @description Controller HTTP para itens de produto/serviço de um agendamento.
 * Apenas traduz HTTP ↔ Service; nenhuma regra de negócio aqui.
 * 
 * @requires ../../services/agendamento/AgendamentoProdutoService
 * @requires ../../middlewares/errorMiddleware
 */


const AgendamentoProdutoService = require('../../services/agendamento/AgendamentoProdutoService');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

class AgendamentoProdutoController {

    /**
     * Adiciona um item a um agendamento.
     * 
     * @name adicionarItem
     * @function
     * @memberof AgendamentoProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idAgendamento - ID do agendamento.
     * @param {Object} req.body - Dados do item.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - 201 com o item criado.
     * 
     * @example     * POST /api/agendamentos/1/itens
     */
    adicionarItem = asyncHandler(async (req, res) => {
        const dados = await AgendamentoProdutoService.adicionarItem(
            { ...req.body, id_agendamento: req.params.idAgendamento },
            req.usuario
        );

        res.status(201).json({ sucesso: true, mensagem: 'Item adicionado ao agendamento', dados });
    });

    /**
     * Lista os itens de um agendamento.
     * 
     * @name listarPorAgendamento
     * @function
     * @memberof AgendamentoProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idAgendamento - ID do agendamento.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista com total.
     * 
     * @example
     * GET /api/agendamentos/1/itens
     */
    listarPorAgendamento = asyncHandler(async (req, res) => {
        const dados = await AgendamentoProdutoService.listarPorAgendamento(req.params.idAgendamento, req.usuario);
        res.status(200).json({ sucesso: true, total: dados.length, dados });
    });

    /**     
     * Busca um item do agendamento.
     * 
     * @name buscarPorId
     * @function
     * @memberof AgendamentoProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idAgendamento - ID do agendamento.
     * @param {number} req.params.idItem - ID do item.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do item.
     * 
     * @example     * GET /api/agendamentos/1/itens/3
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const dados = await AgendamentoProdutoService.buscarPorId(req.params.idAgendamento, req.params.idItem, req.usuario);
        res.status(200).json({ sucesso: true, dados });
    });

    /**     
     * Atualiza parcialmente um item.
     * 
     * @name atualizar
     * @function
     * @memberof AgendamentoProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idAgendamento - ID do agendamento.
     * @param {number} req.params.idItem - ID do item.
     * @param {Object} req.body - Campos a alterar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Item atualizado.
     * 
     * @example     * PATCH /api/agendamentos/1/itens/3
     * Body: { "ind_status": "producao" }
     */
    atualizar = asyncHandler(async (req, res) => {
        const dados = await AgendamentoProdutoService.atualizar(
            req.params.idAgendamento, req.params.idItem, req.body, req.usuario
        );
        res.status(200).json({ sucesso: true, mensagem: 'Item atualizado', dados });
    });

    /**     
     * Remove (soft delete) um item.
     * 
     * @name deletar
     * @function
     * @memberof AgendamentoProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idAgendamento - ID do agendamento.
     * @param {number} req.params.idItem - ID do item.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example     * DELETE /api/agendamentos/1/itens/3
     */
    deletar = asyncHandler(async (req, res) => {
        await AgendamentoProdutoService.deletarItem(req.params.idAgendamento, req.params.idItem, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: 'Item removido' });
    });
}

module.exports = new AgendamentoProdutoController();