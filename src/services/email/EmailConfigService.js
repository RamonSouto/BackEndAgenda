// src/services/email/EmailConfigService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/email/EmailConfigService.js
 * @description Regras de negócio da configuração SMTP da empresa.
 * A senha nunca é retornada: apenas indicador `ind_senha_configurada`.
 *
 * @requires ../../models/sistema/EmpresaModel
 * @requires ./MailTransportService
 * @requires ../LogService
 * @requires ../../utils/cryptoUtils
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 * @requires ../../utils/constants
 */
const EmpresaModel = require('../../models/sistema/EmpresaModel');
const MailTransportService = require('./MailTransportService');
const LogService = require('../LogService');
const { criptografar } = require('../../utils/cryptoUtils');
const validators = require('../../utils/validators');
const { BadRequestError, NotFoundError } = require('../../utils/ApiError');
const { ACOES_LOG } = require('../../utils/constants');

class EmailConfigService {

    /**
     * Retorna a configuração SMTP mascarada.
     *
     * @method obterSmtp
     * @memberof EmailConfigService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @returns {Promise<Object>} Configuração sem senha.
     * @throws {NotFoundError} Se a empresa não existir.
     *
     * @example
     * const cfg = await EmailConfigService.obterSmtp(1);
     */
    async obterSmtp(idEmpresa) {
        const cfg = await EmpresaModel.buscarConfigSmtp(idEmpresa);
        if (!cfg) throw new NotFoundError('Empresa não encontrada');

        const { des_smtp_senha_enc, updated_ad, ...publico } = cfg;
        return { ...publico, ind_senha_configurada: Boolean(des_smtp_senha_enc) };
    }

    /**
     * Atualiza a configuração SMTP, criptografando a senha (AES-256-GCM).
     *
     * @method atualizarSmtp
     * @memberof EmailConfigService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @param {Object} dados - Payload validado por `smtpSchema`.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Configuração mascarada.
     * @throws {BadRequestError|NotFoundError}
     *
     * @example
     * await EmailConfigService.atualizarSmtp(1, { des_smtp_host: 'smtp.gmail.com', ... }, 1);
     */
    async atualizarSmtp(idEmpresa, dados, usuarioLogadoId) {
        const { error, value } = validators.smtpSchema.validate(dados, { stripUnknown: true });
        if (error) throw new BadRequestError(error.details[0].message);

        const atual = await EmpresaModel.buscarConfigSmtp(idEmpresa);
        if (!atual) throw new NotFoundError('Empresa não encontrada');

        if (value.ind_smtp_ativo && !value.des_smtp_senha && !atual.des_smtp_senha_enc) {
            throw new BadRequestError('Senha SMTP obrigatória para ativar o envio');
        }

        const senhaEnc = value.des_smtp_senha ? criptografar(value.des_smtp_senha) : null;
        await EmpresaModel.atualizarSmtp(idEmpresa, value, senhaEnc);
        MailTransportService.invalidar(idEmpresa);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.EDITAR,
            des_tabela: 'tab_empresa',
            num_registro_id: idEmpresa,
            des_detalhes: { acao: 'config_smtp', host: value.des_smtp_host, senha_alterada: Boolean(senhaEnc) }
        });

        return this.obterSmtp(idEmpresa);
    }

    /**
     * Testa a conexão SMTP e envia um e-mail de teste (síncrono, fora da outbox).
     *
     * @method testarSmtp
     * @memberof EmailConfigService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @param {Object} dados - { des_destinatario }.
     * @returns {Promise<{messageId: string}>}
     * @throws {BadRequestError} Se a conexão/autenticação falhar.
     *
     * @example
     * await EmailConfigService.testarSmtp(1, { des_destinatario: 'admin@x.com' });
     */
    async testarSmtp(idEmpresa, dados) {
        const { error, value } = validators.smtpTesteSchema.validate(dados);
        if (error) throw new BadRequestError(error.details[0].message);

        try {
            await MailTransportService.verificar(idEmpresa);
            return await MailTransportService.enviar(idEmpresa, {
                para: value.des_destinatario,
                assunto: 'Teste de configuração SMTP',
                html: '<p>Configuração SMTP funcionando.</p>',
                texto: 'Configuração SMTP funcionando.'
            });
        } catch (erro) {
            throw new BadRequestError(`Falha no teste SMTP: ${erro.message}`);
        }
    }
}

module.exports = new EmailConfigService();