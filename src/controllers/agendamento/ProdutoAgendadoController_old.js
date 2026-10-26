// src/controllers/agendamento/ProdutoAgendadoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/ProdutoAgendadoController.js
 * @description Controlador de itens de agendamento (produto + serviço).
 * 
 * @requires ../../services/agendamento/ProdutoAgendadoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */
const ProdutoAgendadoService = require('../../services/agendamento/ProdutoAgendadoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

class ProdutoAgendadoController {
    /**
     * Adiciona um item (produto/serviço) a um agendamento existente.
     * 
     * @name adicionar
     * @function
     * @memberof ProdutoAgendadoController
     * @async
     * @param {Object} req.body - Dados validados por `produtoAgendadoSchema`.
     * @param {Object} req.usuario
     * @returns {Promise<void>} 201 com o item criado.
     * 
     * @example
     * POST /api/agendamentos/itens
     * Body: { id_agendamento: 1, id_produto_grade: 5, id_produto_servico: 3, id_tipo_agendamento: 1 }
     */
    adicionar = asyncHandler(async (req, res) => {
        const item = await ProdutoAgendadoService.adicionarItem(req.body, req.usuario.id);
        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: item
        });
    });

    /**
     * Lista todos os itens de um agendamento.
     * 
     * @example
     * GET /api/agendamentos/1/itens
     */
    listarPorAgendamento = asyncHandler(async (req, res) => {
        const { id } = req.params; // id do agendamento
        const itens = await ProdutoAgendadoService.listarPorAgendamento(id, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            total: itens.length,
            dados: itens
        });
    });

    /**
     * Busca um item por ID.
     * 
     * @example
     * GET /api/agendamentos/itens/1
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const item = await ProdutoAgendadoService.buscarPorId(id, req.usuario.id);
        return res.status(200).json({ sucesso: true, dados: item });
    });

    /**
     * Atualiza dados livres do item (desconto, descrição do ajuste).
     * 
     * @example
     * PUT /api/agendamentos/itens/1
     * Body: { val_desconto_servico: 10.00, des_ajuste_produto: 'Ajuste na cintura' }
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const item = await ProdutoAgendadoService.atualizarItem(id, req.body, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: item
        });
    });

    /**
     * Altera o status individual do item (pendente/producao/concluido/cancelado).
     * 
     * @example
     * PATCH /api/agendamentos/itens/1/status
     * Body: { ind_status: 'producao' }
     */
    alterarStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { ind_status } = req.body;
        const item = await ProdutoAgendadoService.alterarStatusItem(id, ind_status, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: item
        });
    });

    /**
     * Deleta (soft delete) um item de agendamento.
     * 
     * @example
     * DELETE /api/agendamentos/itens/1
     */
    deletar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await ProdutoAgendadoService.deletarItem(id, req.usuario.id);
        return res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.DELETADO });
    });
}

module.exports = new ProdutoAgendadoController();
