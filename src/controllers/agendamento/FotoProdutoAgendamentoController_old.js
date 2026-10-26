// src/controllers/agendamento/fotoProdutoAgendamentoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/fotoProdutoAgendamentoController.js
 * @description Controller HTTP para fotos de ajuste (antes/depois).
 * A rota de upload deve usar `uploadMiddleware.js` (já existente) antes deste
 * controller, populando `req.file` com os metadados do arquivo salvo.
 * 
 * @requires ../../services/agendamento/fotoProdutoAgendamentoService
 */
const fotoProdutoAgendamentoService = require('../../services/agendamento/FotoProdutoAgendamentoService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class FotoProdutoAgendamentoController {
    /**
     * Lista fotos de um item de agendamento.
     * @example GET /api/agendamentos/itens/:idItem/fotos
     */
    listarPorItem = asyncHandler(async (req, res) => {
        const dados = await fotoProdutoAgendamentoService.listarPorItem(req.params.idItem);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Registra os metadados de uma foto já processada pelo uploadMiddleware.
     * @example POST /api/agendamentos/itens/:idItem/fotos { ind_tipo_foto: "antes" }
     */
    adicionarFoto = asyncHandler(async (req, res) => {
        const dados = await fotoProdutoAgendamentoService.adicionarFoto(
            req.params.idItem, req.file, req.body.ind_tipo_foto, req.usuario
        );
        res.status(201).json({ sucesso: true, mensagem: 'Foto registrada', dados });
    });

    /**
     * Remove (soft delete) uma foto.
     * @example DELETE /api/agendamentos/itens/fotos/:id
     */
    remover = asyncHandler(async (req, res) => {
        await fotoProdutoAgendamentoService.remover(req.params.id, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: 'Foto removida' });
    });
}

module.exports = new FotoProdutoAgendamentoController();
