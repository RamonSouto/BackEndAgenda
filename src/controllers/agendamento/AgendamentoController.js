// src/controllers/agendamento/AgendamentoController.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/controllers/agendamento/AgendamentoController.js
 * @description Controller HTTP de agendamentos (canal interno e público).
 * GET lê de req.query; mutações de req.body. Sempre repassa `req.usuario.id`
 * (ou o objeto quando a regra depende de papel) ao Service.
 *
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../services/agendamento/AgendamentoService
 * @requires ../../utils/constants
 */
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const AgendamentoService = require('../../services/agendamento/AgendamentoService');
const { MENSAGENS } = require('../../utils/constants');

class AgendamentoController {

    /**
     * Cria um agendamento (canal interno).
     *
     * @name criar
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados do agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - 201 com o agendamento.
     *
     * @example
     * POST /api/agendamentos
     */
    criar = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.criar(req.body, req.usuario.id);
        res.status(201).json({ sucesso: true, mensagem: 'Agendamento criado com sucesso', dados });
    });

    /**
     * Lista agendamentos paginados (filtros via query string).
     *
     * @name listar
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.query - Filtros e paginação.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Página de dados + total real.
     *
     * @example
     * GET /api/agendamentos?pagina=1&limite=20
     */
    listar = asyncHandler(async (req, res) => {
        const { dados, total } = await AgendamentoService.listarAgendamentos(req.query, req.usuario);
        res.status(200).json({ sucesso: true, total, dados });
    });

    /**
     * Busca agendamento completo por ID.
     *
     * @name buscarPorId
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID do agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Agendamento com itens.
     *
     * @example
     * GET /api/agendamentos/10
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.buscarAgendamentoCompleto(req.params.id, req.usuario);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Atualiza dados gerais do agendamento.
     *
     * @name atualizar
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID do agendamento.
     * @param {Object} req.body - Campos editáveis.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Agendamento atualizado.
     *
     * @example
     * PUT /api/agendamentos/10
     */
    atualizar = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.atualizar(req.params.id, req.body, req.usuario.id);
        res.status(200).json({ sucesso: true, mensagem: 'Agendamento atualizado', dados });
    });

    /**
     * Troca a costureira responsável.
     *
     * @name trocarCostureira
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID do agendamento.
     * @param {Object} req.body - { id_costureira, des_motivo? }.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Agendamento atualizado.
     *
     * @example
     * PATCH /api/agendamentos/10/costureira
     */
    trocarCostureira = asyncHandler(async (req, res) => {
        const { id_costureira, des_motivo } = req.body;
        const dados = await AgendamentoService.trocarCostureira(req.params.id, id_costureira, des_motivo, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: 'Costureira alterada com sucesso', dados });
    });

    /**
     * Altera o status (repassa o usuário completo para checagem de escopo).
     *
     * @name atualizarStatus
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID do agendamento.
     * @param {string} req.body.status - Novo status.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Agendamento atualizado.
     *
     * @example
     * PATCH /api/agendamentos/10/status
     */
    atualizarStatus = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.alterarStatus(req.params.id, req.body.status, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: 'Status atualizado', dados });
    });

    /**
     * Remove (soft delete) um agendamento.
     *
     * @name deletar
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID do agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Mensagem de sucesso.
     *
     * @example
     * DELETE /api/agendamentos/10
     */
    deletar = asyncHandler(async (req, res) => {
        await AgendamentoService.deletarAgendamento(req.params.id, req.usuario.id);
        res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.DELETADO });
    });

    /**
     * Verifica disponibilidade (canal interno e público — mesma regra).
     *
     * @name verificarDisponibilidade
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.query.id_costureira - ID da costureira.
     * @param {string} req.query.data - 'YYYY-MM-DD HH:MM:SS'.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - { disponivel, motivo? }.
     *
     * @example
     * GET /api/agendamentos/disponibilidade?id_costureira=3&data=2026-11-20 14:00:00
     */
    verificarDisponibilidade = asyncHandler(async (req, res) => {
        const idCostureira = Number(req.query.id_costureira);
        const { data } = req.query;

        if (!Number.isInteger(idCostureira) || idCostureira <= 0 || typeof data !== 'string') {
            return res.status(400).json({ sucesso: false, mensagem: 'id_costureira e data são obrigatórios' });
        }

        const dados = await AgendamentoService.verificarDisponibilidade(idCostureira, data);
        res.status(200).json({ sucesso: true, dados });
    });

    /** Alias mantido para a rota pública (mesma implementação — DRY). */
    verificarDisponibilidadePublica = this.verificarDisponibilidade;

    /**
     * Cria agendamento pelo fluxo público (sem autenticação).
     *
     * @name criarPublico
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - { num_cpf, id_costureira, dta_agendamento, des_observacoes_geral? }.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - 201 com dados mínimos + UUID.
     *
     * @example
     * POST /api/public/agendamentos
     */
    criarPublico = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.criarAgendamentoPublico(req.body);
        res.status(201).json({ sucesso: true, mensagem: 'Agendamento realizado com sucesso', dados });
    });

    /**
     * Consulta pública por UUID.
     *
     * @name buscarPorUuidPublico
     * @function
     * @memberof AgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {string} req.params.uuid - UUID v4 público.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Dados mínimos do agendamento.
     *
     * @example
     * GET /api/public/agendamentos/3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d
     */
    buscarPorUuidPublico = asyncHandler(async (req, res) => {
        const dados = await AgendamentoService.buscarPorUuidPublico(req.params.uuid);
        res.status(200).json({ sucesso: true, dados });
    });
}

module.exports = new AgendamentoController();
