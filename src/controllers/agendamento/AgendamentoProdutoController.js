// src/controllers/agendamento/AgendamentoProdutoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/produtoAgendadoController.js
 * @description Controller HTTP para itens de produto/serviço de um agendamento.
 * 
 * @requires ../../services/agendamento/produtoAgendadoService
 */
const agendamentoProdutoService = require('../../services/agendamento/AgendamentoProdutoService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class AgendamentoProdutoController {

    /**
     * Adiciona um item de produto/serviço a um agendamento.
     * @example POST /api/agendamentos/:idAgendamento/itens
     */
    adicionarItem = asyncHandler(async (req, res) => {

        const dados = { ...req.body, id_agendamento: req.params.idAgendamento }

        const items = await agendamentoProdutoService.adicionarItem(dados, req.usuario.id);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Item adicionado ao agendamento',
            items
        });
    });

    /**
     * Lista os itens de um agendamento.
     * @example GET /api/agendamentos/:idAgendamento/itens
     */
    listarPorAgendamento = asyncHandler(async (req, res) => {

        const dados = await agendamentoProdutoService.listarPorAgendamento(req.params.idAgendamento);

        res.status(200).json({
            sucesso: true,
            dados
        });

    });



    /**
     * Busca um item por ID.
     * @example GET /api/agendamentos/itens/:id
     */
    buscarPorId = asyncHandler(async (req, res) => {

        const dados = await agendamentoProdutoService.buscarPorId(req.params.id);

        res.status(200).json({
            sucesso: true,
            dados
        });
    });

    /**
     * Atualiza um item de agendamento.
     * @example PUT /api/agendamentos/itens/:id
     */
    atualizar = asyncHandler(async (req, res) => {

        const dados = await agendamentoProdutoService.atualizar(req.params.idAgendamento, req.params.idProdutoAgendado, req.body, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Item atualizado',
            dados
        });
    });

    /**
     * Remove (soft delete) um item de agendamento.
     * @example DELETE /api/agendamentos/itens/:id
     */
    removerdetelarItemAgendamentoer = asyncHandler(async (req, res) => {

        await agendamentoProdutoService.detelarItemAgendamento(req.params.idAgendamento, req.params.idAgendadoProduto, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Item removido'
        });

    });
}

module.exports = new AgendamentoProdutoController();
