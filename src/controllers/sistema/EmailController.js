// src/controllers/sistema/EmailController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/sistema/EmailController.js
 * @description Controller HTTP da configuração de e-mail: SMTP da empresa,
 * templates por evento e monitoramento da outbox.
 *
 * @requires ../../services/email/EmailConfigService
 * @requires ../../services/email/EmailTemplateService
 * @requires ../../services/email/EmailOutboxService
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../utils/constants
 */
const EmailConfigService = require('../../services/email/EmailConfigService');
const EmailTemplateService = require('../../services/email/EmailTemplateService');
const EmailOutboxService = require('../../services/email/EmailOutboxService');
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const { MENSAGENS } = require('../../utils/constants');

class EmailController {

    /**
     * Retorna a configuração SMTP (sem senha).
     *
     * @name obterSmtp
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Configuração mascarada.
     *
     * @example
     * GET /api/sistema/empresa/1/smtp
     */
    obterSmtp = asyncHandler(async (req, res) => {
        const dados = await EmailConfigService.obterSmtp(req.params.idEmpresa);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Atualiza a configuração SMTP.
     *
     * @name atualizarSmtp
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {Object} req.body - Dados SMTP.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Configuração atualizada.
     *
     * @example
     * PUT /api/sistema/empresa/1/smtp
     * Body: { ind_smtp_ativo: true, des_smtp_host: 'smtp.gmail.com', num_smtp_porta: 465, ... }
     */
    atualizarSmtp = asyncHandler(async (req, res) => {
        const dados = await EmailConfigService.atualizarSmtp(req.params.idEmpresa, req.body, req.usuario.id);
        res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.ATUALIZADO, dados });
    });

    /**
     * Testa a configuração SMTP enviando um e-mail.
     *
     * @name testarSmtp
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {Object} req.body - { des_destinatario }.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - messageId do envio.
     *
     * @example
     * POST /api/sistema/empresa/1/smtp/teste
     * Body: { des_destinatario: 'admin@empresa.com' }
     */
    testarSmtp = asyncHandler(async (req, res) => {
        const dados = await EmailConfigService.testarSmtp(req.params.idEmpresa, req.body);
        res.status(200).json({ sucesso: true, mensagem: 'E-mail de teste enviado', dados });
    });

    /**
     * Lista templates e placeholders disponíveis.
     *
     * @name listarTemplates
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Templates e placeholders.
     *
     * @example
     * GET /api/sistema/empresa/1/email-templates
     */
    listarTemplates = asyncHandler(async (req, res) => {
        const dados = await EmailTemplateService.listar(req.params.idEmpresa);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Salva o template de um evento.
     *
     * @name salvarTemplate
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {string} req.params.evento - Evento.
     * @param {Object} req.body - { des_assunto, des_corpo_html, ind_ativo }.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Template salvo (já sanitizado).
     *
     * @example
     * PUT /api/sistema/empresa/1/email-templates/agendamento_cadastrado
     */
    salvarTemplate = asyncHandler(async (req, res) => {
        const dados = await EmailTemplateService.salvar(req.params.idEmpresa, req.params.evento, req.body, req.usuario.id);
        res.status(200).json({ sucesso: true, mensagem: MENSAGENS.SUCESSO.ATUALIZADO, dados });
    });

    /**
     * Pré-visualiza um template com dados fictícios.
     *
     * @name preVisualizarTemplate
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.idEmpresa - ID da empresa.
     * @param {string} req.params.evento - Evento.
     * @param {Object} [req.body] - Template não salvo (opcional).
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - { assunto, html, texto }.
     *
     * @example
     * POST /api/sistema/empresa/1/email-templates/agendamento_cadastrado/preview
     */
    preVisualizarTemplate = asyncHandler(async (req, res) => {
        const dados = await EmailTemplateService.preVisualizar(req.params.idEmpresa, req.params.evento, req.body);
        res.status(200).json({ sucesso: true, dados });
    });

    /**
     * Lista mensagens da outbox.
     *
     * @name listarOutbox
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.query - Filtros (ind_status, id_agendamento, pagina, limite).
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Lista com total.
     *
     * @example
     * GET /api/sistema/email-outbox?ind_status=falha
     */
    listarOutbox = asyncHandler(async (req, res) => {
        const dados = await EmailOutboxService.listar(req.query);
        res.status(200).json({ sucesso: true, total: dados.length, dados });
    });

    /**
     * Reprocessa uma mensagem com falha.
     *
     * @name reprocessarOutbox
     * @function
     * @memberof EmailController
     * @async
     *
     * @param {Object} req - Objeto de requisição.
     * @param {number} req.params.id - ID da outbox.
     * @param {Object} res - Objeto de resposta.
     *
     * @returns {Promise<void>} - Mensagem de sucesso.
     *
     * @example
     * POST /api/sistema/email-outbox/42/reprocessar
     */
    reprocessarOutbox = asyncHandler(async (req, res) => {
        await EmailOutboxService.reprocessar(req.params.id);
        res.status(200).json({ sucesso: true, mensagem: 'Mensagem recolocada na fila' });
    });
}

module.exports = new EmailController();