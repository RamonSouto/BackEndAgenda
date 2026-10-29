// src/routes/sistema/emailRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/emailRoutes.js
 * @description Rotas administrativas de e-mail (SMTP, templates e outbox).
 *
 * @requires express
 * @requires ../../controllers/sistema/EmailController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 */
const router = require('express').Router();
const EmailController = require('../../controllers/sistema/EmailController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterCriacao } = require('../../middlewares/rateLimitMiddleware');

router.use(authMiddleware, apenasAdminMiddleware);

/**
 * @route GET /api/sistema/empresa/:idEmpresa/smtp
 * @method GET
 * @description Retorna a configuração SMTP (senha nunca é retornada).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Configuração SMTP mascarada.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Empresa não encontrada.
 *
 * @example
 * GET /api/sistema/empresa/1/smtp
 */
router.get(
    '/empresa/:idEmpresa/smtp',
    validarIdMiddleware('idEmpresa'),
    EmailController.obterSmtp
);

/**
 * @route PUT /api/sistema/empresa/:idEmpresa/smtp
 * @method PUT
 * @description Atualiza SMTP; senha criptografada com AES-256-GCM (omitir mantém a atual).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Configuração atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 *
 * @example
 * PUT /api/sistema/empresa/1/smtp
 * Body: { ind_smtp_ativo: true, des_smtp_host: 'smtp.gmail.com', num_smtp_porta: 465, ind_smtp_seguro: true,
 *         des_smtp_usuario: 'x@gmail.com', des_smtp_senha: 'app-password',
 *         des_smtp_email_remetente: 'x@gmail.com', nom_smtp_remetente: 'Ateliê' }
 */
router.put(
    '/empresa/:idEmpresa/smtp',
    validarIdMiddleware('idEmpresa'),
    validarBodyMiddleware,
    EmailController.atualizarSmtp
);

/**
 * @route POST /api/sistema/empresa/:idEmpresa/smtp/teste
 * @method POST
 * @description Verifica conexão SMTP e envia e-mail de teste.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Enviado.
 * @returns {Object} 400 - Falha de conexão/autenticação.
 * @returns {Object} 429 - Muitas requisições.
 *
 * @example
 * POST /api/sistema/empresa/1/smtp/teste
 * Body: { des_destinatario: 'admin@empresa.com' }
 */
router.post(
    '/empresa/:idEmpresa/smtp/teste',
    validarIdMiddleware('idEmpresa'),
    limiterCriacao,
    EmailController.testarSmtp
);

/**
 * @route GET /api/sistema/empresa/:idEmpresa/email-templates
 * @method GET
 * @description Lista templates e placeholders disponíveis.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Templates.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 *
 * @example
 * GET /api/sistema/empresa/1/email-templates
 */
router.get(
    '/empresa/:idEmpresa/email-templates',
    validarIdMiddleware('idEmpresa'),
    EmailController.listarTemplates
);

/**
 * @route PUT /api/sistema/empresa/:idEmpresa/email-templates/:evento
 * @method PUT
 * @description Cria/atualiza template do evento (HTML sanitizado; placeholders validados).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Template salvo.
 * @returns {Object} 400 - Evento/placeholder inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 *
 * @example
 * PUT /api/sistema/empresa/1/email-templates/agendamento_cancelado
 * Body: { des_assunto: 'Cancelado - {{nome_empresa}}', des_corpo_html: '<p>Olá {{nome_cliente}}</p>' }
 */
router.put(
    '/empresa/:idEmpresa/email-templates/:evento',
    validarIdMiddleware('idEmpresa'),
    validarBodyMiddleware,
    EmailController.salvarTemplate
);

/**
 * @route POST /api/sistema/empresa/:idEmpresa/email-templates/:evento/preview
 * @method POST
 * @description Pré-visualiza template com dados fictícios (body opcional = template não salvo).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - { assunto, html, texto }.
 * @returns {Object} 404 - Template não encontrado.
 *
 * @example
 * POST /api/sistema/empresa/1/email-templates/agendamento_cadastrado/preview
 */
router.post(
    '/empresa/:idEmpresa/email-templates/:evento/preview',
    validarIdMiddleware('idEmpresa'),
    EmailController.preVisualizarTemplate
);

/**
 * @route GET /api/sistema/email-outbox
 * @method GET
 * @description Lista mensagens da outbox (monitoramento).
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Lista.
 * @returns {Object} 400 - Filtro inválido.
 *
 * @example
 * GET /api/sistema/email-outbox?ind_status=falha&pagina=1&limite=20
 */
router.get('/email-outbox', EmailController.listarOutbox);

/**
 * @route POST /api/sistema/email-outbox/:id/reprocessar
 * @method POST
 * @description Recoloca na fila uma mensagem em falha definitiva.
 * @access Privado – Apenas Administradores
 * @returns {Object} 200 - Recolocada.
 * @returns {Object} 404 - Não encontrada ou não está em falha.
 *
 * @example
 * POST /api/sistema/email-outbox/42/reprocessar
 */
router.post(
    '/email-outbox/:id/reprocessar',
    validarIdMiddleware('id'),
    EmailController.reprocessarOutbox
);

module.exports = router;