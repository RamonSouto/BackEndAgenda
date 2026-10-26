// src/controllers/agendamento/TipoAgendamentoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/TipoAgendamentoController.js
 * @description Controller HTTP para tipos de agendamento.
 * 
 * @requires ../../services/agendamento/tipoAgendamentoService
 */
const TipoAgendamentoService = require('../../services/agendamento/TipoAgendamentoService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class TipoAgendamentoController {

    /**
     * Cria um novo tipo de agendamento.
     * @example POST /api/agendamento/tipos
     */
    criar = asyncHandler(async (req, res) => {

        const tipoAgendamento = await TipoAgendamentoService.criar(req.body, req.usuario.id);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Tipo de agendamento criado',
            dados: tipoAgendamento
        });
    });

    /**
     * Lista tipos de agendamento.
     * @name listar
     * @function
     * @async
     * @example GET /api/agendamento/tipos?apenasAtivos=true
     */
    listar = asyncHandler(async (req, res) => {

        const tipoAgendamento = await TipoAgendamentoService.listar(req.usuario.id);

        res.status(200).json({
            sucesso: true,
            total: tipoAgendamento.length,
            dados: tipoAgendamento
        });
    });

    /**
     * Busca um tipo de agendamento por ID.
     * @example GET /api/agendamento/tipos/:id
     */
    buscarPorId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tipoAgendamento = await TipoAgendamentoService.buscarPorId(id, req.usuario.id);

        res.status(200).json({
            sucesso: true,
            mensagem: tipoAgendamento.length,
            dados: tipoAgendamento
        });
    });

    /**
     * Atualiza um tipo de agendamento.
     * @example PUT /api/agendamento/tipos/:id
     */
    atualizar = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tipoAgendamento = await TipoAgendamentoService.atualizar(id, req.body, req.usuario);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Tipo de agendamento atualizado',
            dados: tipoAgendamento
        });
    });

    /**
     * Remove (soft delete) um tipo de agendamento.
     * @example DELETE /api/agendamento/tipos/:id
     */
    deletar = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await TipoAgendamentoService.deletar(id, req.usuario.id);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Tipo de agendamento removido'
        });
    });
}

module.exports = new TipoAgendamentoController();
