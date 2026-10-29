// src/services/email/EmailTemplateService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/email/EmailTemplateService.js
 * @description Regras de negócio dos templates: validação de placeholders,
 * sanitização (anti HTML Injection) no salvamento e renderização segura.
 *
 * @requires ../../models/sistema/EmailTemplateModel
 * @requires ../LogService
 * @requires ../../utils/emailTemplateUtils
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 * @requires ../../utils/constants
 */
const EmailTemplateModel = require('../../models/sistema/EmailTemplateModel');
const LogService = require('../LogService');
const tpl = require('../../utils/emailTemplateUtils');
const validators = require('../../utils/validators');
const { BadRequestError, NotFoundError } = require('../../utils/ApiError');
const { ACOES_LOG } = require('../../utils/constants');

/** Dados fictícios para pré-visualização. */
const DADOS_EXEMPLO = Object.freeze({
    nome_cliente: 'Maria da Silva', nome_costureira: 'Ana Souza',
    data_agendamento: '20/11/2026', hora_agendamento: '14:00',
    nome_empresa: 'Ateliê Exemplo', telefone_empresa: '(62) 99999-0000',
    link_acompanhamento: 'https://exemplo.com/acompanhar/00000000-0000-4000-8000-000000000000'
});

class EmailTemplateService {

    /**
     * Valida o evento (parâmetro de rota).
     *
     * @method _validarEvento
     * @memberof EmailTemplateService
     * @private
     * @param {string} evento
     * @returns {string}
     * @throws {BadRequestError}
     */
    _validarEvento(evento) {
        const { error, value } = validators.eventoEmailSchema.validate(evento);
        if (error) throw new BadRequestError('Evento de e-mail inválido');
        return value;
    }

    /**
     * Lista os templates da empresa e os placeholders disponíveis.
     *
     * @method listar
     * @memberof EmailTemplateService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @returns {Promise<{templates: Array, placeholders: string[]}>}
     *
     * @example
     * const { templates } = await EmailTemplateService.listar(1);
     */
    async listar(idEmpresa) {
        const templates = await EmailTemplateModel.listar(idEmpresa);
        return { templates, placeholders: tpl.PLACEHOLDERS };
    }

    /**
     * Salva (upsert) o template de um evento, sanitizando o HTML.
     *
     * @method salvar
     * @memberof EmailTemplateService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @param {string} evento - Evento.
     * @param {Object} dados - { des_assunto, des_corpo_html, ind_ativo }.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Template salvo.
     * @throws {BadRequestError} Placeholder desconhecido ou payload inválido.
     *
     * @example
     * await EmailTemplateService.salvar(1, 'agendamento_cadastrado', { des_assunto: 'Oi {{nome_cliente}}', des_corpo_html: '<p>...</p>' }, 1);
     */
    async salvar(idEmpresa, evento, dados, usuarioLogadoId) {
        const ev = this._validarEvento(evento);
        const { error, value } = validators.emailTemplateSchema.validate(dados, { stripUnknown: true });
        if (error) throw new BadRequestError(error.details[0].message);

        const invalidos = tpl.placeholdersInvalidos(value.des_assunto, value.des_corpo_html);
        if (invalidos.length) {
            throw new BadRequestError(
                `Placeholders desconhecidos: ${invalidos.join(', ')}. Permitidos: ${tpl.PLACEHOLDERS.join(', ')}`
            );
        }

        const corpoSeguro = tpl.sanitizarTemplate(value.des_corpo_html);
        const assuntoSeguro = value.des_assunto.replace(/[\r\n]+/g, ' ').trim();

        await EmailTemplateModel.salvar(idEmpresa, ev,
            { des_assunto: assuntoSeguro, des_corpo_html: corpoSeguro, ind_ativo: value.ind_ativo }, usuarioLogadoId);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.EDITAR,
            des_tabela: 'tab_email_template',
            des_detalhes: { id_empresa: idEmpresa, evento: ev, html_alterado_pela_sanitizacao: corpoSeguro !== value.des_corpo_html }
        });

        return EmailTemplateModel.buscarPorEvento(idEmpresa, ev);
    }

    /**
     * Pré-visualiza um template (salvo ou enviado no body) com dados fictícios.
     *
     * @method preVisualizar
     * @memberof EmailTemplateService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @param {string} evento - Evento.
     * @param {Object} [dados] - Template não salvo (opcional).
     * @returns {Promise<{assunto: string, html: string, texto: string}>}
     * @throws {NotFoundError}
     *
     * @example
     * const prev = await EmailTemplateService.preVisualizar(1, 'agendamento_cancelado');
     */
    async preVisualizar(idEmpresa, evento, dados) {
        const ev = this._validarEvento(evento);
        let template = null;

        if (dados?.des_corpo_html) {
            template = { des_assunto: dados.des_assunto || '', des_corpo_html: tpl.sanitizarTemplate(dados.des_corpo_html) };
        } else {
            template = await EmailTemplateModel.buscarPorEvento(idEmpresa, ev);
            if (!template) throw new NotFoundError('Template não encontrado');
        }
        return this.renderizar(template, DADOS_EXEMPLO);
    }

    /**
     * Renderiza um template com variáveis (valores escapados).
     *
     * @method renderizar
     * @memberof EmailTemplateService
     * @param {Object} template - { des_assunto, des_corpo_html }.
     * @param {Object} variaveis - Valores dos placeholders.
     * @returns {{assunto: string, html: string, texto: string}}
     *
     * @example
     * EmailTemplateService.renderizar(template, { nome_cliente: 'Ana' });
     */
    renderizar(template, variaveis) {
        const html = tpl.renderizarHtml(template.des_corpo_html, variaveis);
        return {
            assunto: tpl.renderizarAssunto(template.des_assunto, variaveis),
            html,
            texto: tpl.htmlParaTexto(html)
        };
    }
}

module.exports = new EmailTemplateService();