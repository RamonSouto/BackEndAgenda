// src/controllers/agendamento/agendamentoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/agendamentoController.js
 * @description Controller HTTP para agendamentos (acesso interno/privado).
 * O fluxo público reutiliza `criarAgendamento` e `buscarPorUuidPublico`,
 * mas via publicAgendamentoRoutes/Controller próprio (sem exigir auth).
 * 
 * @requires ../../services/agendamento/agendamentoService
 */
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const agendamentoService = require('../../services/agendamento/AgendamentoService');
const { MENSAGENS } = require('../../utils/constants');


class AgendamentoController {

    /**
     * Cria um novo agendamento (via canal interno/privado).
     * @example POST /api/agendamentos
     */
    criar = asyncHandler(async (req, res) => {

        const agendamento = await agendamentoService.criar(req.body, req.usuario.id);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Agendamento criado com sucesso',
            dados: agendamento
        });
    });

    /**
     * Lista agendamentos com filtros e paginação.
     * @example GET /api/agendamentos?status=agendado&idCostureira=3&pagina=1&limite=20
     */
    listar = asyncHandler(async (req, res) => {

        const body = req.body;

        const agendamento = await agendamentoService.listarAgendamentos(body, req.usuario.id);

        res.status(200).json({
            sucesso: true,
            mensagem: agendamento.length,
            dados: agendamento
        });
    });

    /**
     * Busca um agendamento por ID.
     * @example GET /api/agendamentos/:id
     */
    buscarPorId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const agendamento = await agendamentoService.buscarAgendamentoCompleto(id, req.usuario.id);

        res.status(200).json({
            sucesso: true,
            mensagem: agendamento.length,
            dados: agendamento
        });
    });

    /**
     * Atualiza dados gerais de um agendamento.
     * @example PUT /api/agendamentos/:id
     */
    atualizar = asyncHandler(async (req, res) => {

        const { id } = req.params

        const dados = await agendamentoService.atualizar(id, req.body, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Agendamento atualizado',
            dados
        });
    });

    /**
     * Troca a costureira responsável pelo agendamento.
     * @example PATCH /api/agendamentos/:id/costureira { "id_costureira": 5, "motivo": "férias" }
     */
    trocarCostureira = asyncHandler(async (req, res) => {

        const { id_costureira, des_motivo } = req.body;

        const dados = await agendamentoService.trocarCostureira(req.params.id, id_costureira, des_motivo, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Costureira alterada com sucesso',
            dados
        });
    });

    /**
     * Atualiza o status do agendamento (máquina de estados).
     * @example PATCH /api/agendamentos/:id/status { "status": "confirmado" }
     */
    atualizarStatus = asyncHandler(async (req, res) => {
        const dados = await agendamentoService.atualizarStatus(req.params.id, req.body.status, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: 'Status atualizado', dados });
    });

    /**
     * Remove (soft delete) um agendamento.
     * @example DELETE /api/agendamentos/:id
     */
    deletar = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await agendamentoService.deletarAgendamento(id, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });

    /**
     * Verifica disponibilidade de horário para uma costureira.
     * @example GET /api/agendamentos/disponibilidade?idCostureira=3&data=2026-09-20 14:00:00
     */
    verificarDisponibilidade = asyncHandler(async (req, res) => {

        const { id_costureira, data } = req.body;

        const disponivel = await agendamentoService.verificarDisponibilidade(id_costureira, data);

        res.status(200).json({
            sucesso: true,
            dados: {
                disponivel
            }
        });
    });

    /**
 * Cria um agendamento via fluxo público (sem autenticação).
 * 
 * @name criarPublico
 * @function
 * @memberof AgendamentoController
 * @async
 * 
 * @example
 * POST /api/publico/agendamentos
 * Body: { num_cpf: '11144477735', id_costureira: 2, dta_agendamento: '...', item: {...} }
 */
    criarPublico = asyncHandler(async (req, res) => {
        const agendamento = await AgendamentoService.criarAgendamentoPublico(req.body);
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Agendamento realizado com sucesso',
            dados: agendamento
        });
    });

    /**
     * Consulta um agendamento pelo UUID público (des_url_externa).
     * 
     * @name buscarPorUuidPublico
     * @function
     * @memberof AgendamentoController
     * @async
     * 
     * @example
     * GET /api/publico/agendamentos/a1b2c3d4-...
     */
    buscarPorUuidPublico = asyncHandler(async (req, res) => {

        const { uuid } = req.params;

        const agendamento = await AgendamentoService.buscarPorUuidPublico(uuid);

        return res.status(200).json({
            sucesso: true,
            dados: agendamento
        });
    });

}

module.exports = new AgendamentoController();
