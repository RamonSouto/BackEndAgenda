/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/AgendamentoController.js
 * @description Controlador de agendamentos: criação completa, consulta,
 * listagem, troca de costureira, alteração de status e exclusão.
 * 
 * @requires ../../services/agendamento/AgendamentoService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */
const AgendamentoService = require('../../services/agendamento/AgendamentoService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

class AgendamentoController {
    /**
     * Cria um agendamento completo (cabeçalho + itens).
     * 
     * @name criar
     * @function
     * @memberof AgendamentoController
     * @async
     * @param {Object} req
     * @param {Object} req.body - Dados validados por `agendamentoSchema`.
     * @param {Object} req.usuario
     * @param {Object} res
     * @returns {Promise<void>} 201 com o agendamento criado.
     * 
     * @example
     * POST /api/agendamentos
     * Body: { id_paciente: 1, id_costureira: 2, dta_agendamento: '2025-12-01 10:00:00', itens: [...] }
     */
    criar = asyncHandler(async (req, res) => {
        const agendamento = await AgendamentoService.criarAgendamentoCompleto(req.body, req.usuario.id);
        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: agendamento
        });
    });

    /**
     * Lista agendamentos com filtros opcionais via query string.
     * 
     * @name listar
     * @function
     * @memberof AgendamentoController
     * @async
     * 
     * @example
     * GET /api/agendamentos?id_costureira=2&dta_inicio=2025-12-01&dta_fim=2025-12-31
     */
    listar = asyncHandler(async (req, res) => {
        const agendamentos = await AgendamentoService.listarAgendamentos(req.query, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            total: agendamentos.length,
            dados: agendamentos
        });
    });

    /**
     * Busca um agendamento (com itens) por ID.
     * 
     * @example
     * GET /api/agendamentos/1
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const agendamento = await AgendamentoService.buscarAgendamentoCompleto(id, req.usuario.id);
        return res.status(200).json({ sucesso: true, dados: agendamento });
    });

    /**
     * Verifica disponibilidade de horário para uma costureira.
     * Usado pela UI para exibir grade de horários livres.
     * 
     * @example
     * GET /api/agendamentos/disponibilidade?id_costureira=2&dta_agendamento=2025-12-01 10:00:00
     */
    verificarDisponibilidade = asyncHandler(async (req, res) => {
        const { id_costureira, dta_agendamento } = req.query;
        const resultado = await AgendamentoService.verificarDisponibilidade(id_costureira, dta_agendamento);
        return res.status(200).json({ sucesso: true, dados: resultado });
    });

    /**
     * Troca a costureira de um agendamento.
     * 
     * @example
     * PATCH /api/agendamentos/1/costureira
     * Body: { id_costureira: 5 }
     */
    trocarCostureira = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { id_costureira } = req.body;
        const agendamento = await AgendamentoService.trocarCostureira(id, id_costureira, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: agendamento
        });
    });

    /**
     * Altera o status do agendamento (confirmar, concluir, cancelar, falta).
     * 
     * @example
     * PATCH /api/agendamentos/1/status
     * Body: { ind_status: 'confirmado' }
     */
    alterarStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { ind_status } = req.body;
        const agendamento = await AgendamentoService.alterarStatus(id, ind_status, req.usuario.id);
        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: agendamento
        });
    });

    /**
     * Deleta (soft delete) um agendamento.
     * 
     * @example
     * DELETE /api/agendamentos/1
     */
    deletar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await AgendamentoService.deletarAgendamento(id, req.usuario.id);
        return res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.DELETADO });
    });
}

module.exports = new AgendamentoController();
