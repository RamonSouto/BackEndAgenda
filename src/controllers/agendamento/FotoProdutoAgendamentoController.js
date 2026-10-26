// src/controllers/agendamento/FotoProdutoAgendamentoController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/agendamento/FotoProdutoAgendamentoController.js
 * @description Controller HTTP das fotos de ajuste dos itens agendados.
 *
 * @requires path
 * @requires ../../services/agendamento/FotoProdutoAgendamentoService
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../utils/constants
 */
const path = require('path');
const FotoService = require('../../services/agendamento/FotoProdutoAgendamentoService');
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const { MENSAGENS } = require('../../utils/constants');

class FotoProdutoAgendamentoController {

    /**
     * Pré-checagem (middleware) de acesso ao item, antes do Multer gravar arquivos.
     *
     * @name validarAcessoUpload
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - idAgendamento e idItem.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     * @param {Function} next - Próximo middleware.
     *
     * @returns {Promise<void>}
     */
    validarAcessoUpload = asyncHandler(async (req, res, next) => {
        await FotoService.validarAcessoItem(req.params.idAgendamento, req.params.idItem, req.usuario);
        next();
    });

    /**
     * Anexa múltiplas fotos a um item agendado.
     *
     * @name adicionar
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - idAgendamento e idItem.
     * @param {Object} req.body - ind_tipo_foto ('antes' | 'depois').
     * @param {Array} req.files - Arquivos (campo 'fotos').
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - 201 com IDs criados.
     *
     * @example
     * POST /api/agendamentos/1/itens/3/fotos
     * Body (multipart/form-data): fotos: (arquivos), ind_tipo_foto: antes
     */
    adicionar = asyncHandler(async (req, res) => {
        const dados = await FotoService.adicionarFotos({
            idAgendamento: req.params.idAgendamento,
            idItem: req.params.idItem,
            ind_tipo_foto: req.body.ind_tipo_foto,
            arquivos: req.files
        }, req.usuario);

        res.status(201).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.CRIADO, dados });
    });

    /**
     * Lista as fotos de um item.
     *
     * @name listarPorItem
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - idAgendamento e idItem.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Lista de fotos com total.
     *
     * @example
     * GET /api/agendamentos/1/itens/3/fotos
     */
    listarPorItem = asyncHandler(async (req, res) => {
        const dados = await FotoService.listarPorItem(req.params.idAgendamento, req.params.idItem, req.usuario);
        res.status(200).json({ sucesso: true, total: dados.length, dados });
    });

    /**
     * Busca os metadados de uma foto.
     *
     * @name buscarPorId
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Dados da foto.
     *
     * @example
     * GET /api/agendamentos/fotos/10
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const dados = await FotoService.buscarPorId(req.params.id, req.usuario);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Entrega o arquivo da foto (autenticado, sem cache).
     *
     * @name baixarArquivo
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     * @param {Function} next - Próximo middleware (erros de stream).
     *
     * @returns {Promise<void>} - Binário da imagem.
     *
     * @example
     * GET /api/agendamentos/fotos/10/arquivo
     */
    baixarArquivo = asyncHandler(async (req, res, next) => {
        const { caminho } = await FotoService.obterArquivo(req.params.id, req.usuario);

        res.set({
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': `inline; filename="${path.basename(caminho)}"`
        });

        res.sendFile(caminho, { dotfiles: 'deny' }, (err) => {
            if (err && !res.headersSent) next(err);
        });
    });

    /**
     * Remove (soft delete) uma foto, movendo o arquivo para uploads/deletados.
     *
     * @name deletar
     * @function
     * @memberof FotoProdutoAgendamentoController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Mensagem de sucesso.
     *
     * @example
     * DELETE /api/agendamentos/fotos/10
     */
    deletar = asyncHandler(async (req, res) => {
        await FotoService.deletar(req.params.id, req.usuario);
        res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.DELETADO });
    });
}

module.exports = new FotoProdutoAgendamentoController();
