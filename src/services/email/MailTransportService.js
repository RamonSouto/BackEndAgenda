// src/services/email/MailTransportService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/email/MailTransportService.js
 * @description Fábrica/cache de transporters Nodemailer por empresa, com
 * timeouts curtos e circuit breaker simples em memória (evita martelar
 * um SMTP fora do ar a cada ciclo do worker).
 *
 * @requires nodemailer
 * @requires ../../models/sistema/EmpresaModel
 * @requires ../../utils/cryptoUtils
 * @requires ../../config/logger
 */
const nodemailer = require('nodemailer');
const EmpresaModel = require('../../models/sistema/EmpresaModel');
const { descriptografar } = require('../../utils/cryptoUtils');
const logger = require('../../config/logger');

const LIMIAR_FALHAS = 5;
const PAUSA_CIRCUITO_MS = 5 * 60 * 1000;

class MailTransportService {
    constructor() {
        /** @type {Map<number, {transporter: Object, versao: string, remetente: Object}>} */
        this.cache = new Map();
        /** @type {Map<number, {falhas: number, abertoAte: number}>} */
        this.circuitos = new Map();
    }

    /**
     * Obtém (ou cria) o transporter da empresa. Recria se a config mudou.
     *
     * @method _obterTransporter
     * @memberof MailTransportService
     * @private
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @returns {Promise<{transporter: Object, remetente: Object}>}
     * @throws {Error} Se SMTP inativo/incompleto.
     */
    async _obterTransporter(idEmpresa) {
        const cfg = await EmpresaModel.buscarConfigSmtp(idEmpresa);
        if (!cfg || !cfg.ind_smtp_ativo || !cfg.des_smtp_host || !cfg.des_smtp_senha_enc) {
            const erro = new Error('SMTP inativo ou não configurado para a empresa');
            erro.permanente = true;
            throw erro;
        }

        const versao = `${cfg.updated_ad?.getTime?.() || cfg.updated_ad}`;
        const emCache = this.cache.get(idEmpresa);
        if (emCache && emCache.versao === versao) return emCache;

        emCache?.transporter.close();
        const transporter = nodemailer.createTransport({
            host: cfg.des_smtp_host,
            port: cfg.num_smtp_porta,
            secure: Boolean(cfg.ind_smtp_seguro),
            requireTLS: !cfg.ind_smtp_seguro,
            auth: { user: cfg.des_smtp_usuario, pass: descriptografar(cfg.des_smtp_senha_enc) },
            pool: true,
            maxConnections: 2,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000
        });

        const item = {
            transporter, versao,
            remetente: { name: cfg.nom_smtp_remetente || cfg.nom_fantasia, address: cfg.des_smtp_email_remetente }
        };
        this.cache.set(idEmpresa, item);
        return item;
    }

    /**
     * Indica se o circuito da empresa está aberto (envio suspenso).
     *
     * @method circuitoAberto
     * @memberof MailTransportService
     * @param {number} idEmpresa - ID da empresa.
     * @returns {boolean}
     *
     * @example
     * if (MailTransportService.circuitoAberto(1)) return;
     */
    circuitoAberto(idEmpresa) {
        const c = this.circuitos.get(idEmpresa);
        return Boolean(c && c.abertoAte > Date.now());
    }

    /**
     * Registra o resultado de um envio no circuit breaker.
     *
     * @method _registrarResultado
     * @memberof MailTransportService
     * @private
     * @param {number} idEmpresa - ID da empresa.
     * @param {boolean} sucesso - Resultado.
     * @returns {void}
     */
    _registrarResultado(idEmpresa, sucesso) {
        if (sucesso) { this.circuitos.delete(idEmpresa); return; }
        const c = this.circuitos.get(idEmpresa) || { falhas: 0, abertoAte: 0 };
        c.falhas += 1;
        if (c.falhas >= LIMIAR_FALHAS) {
            c.abertoAte = Date.now() + PAUSA_CIRCUITO_MS;
            c.falhas = 0;
            logger.warn('Circuit breaker SMTP aberto', { id_empresa: idEmpresa, pausa_ms: PAUSA_CIRCUITO_MS });
        }
        this.circuitos.set(idEmpresa, c);
    }

    /**
     * Envia um e-mail pela empresa.
     *
     * @method enviar
     * @memberof MailTransportService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @param {Object} msg - { para, assunto, html, texto }.
     * @returns {Promise<{messageId: string}>}
     * @throws {Error} Erro do SMTP (com `permanente` quando não vale retry).
     *
     * @example
     * await MailTransportService.enviar(1, { para: 'a@b.com', assunto: 'Oi', html: '<p>Oi</p>', texto: 'Oi' });
     */
    async enviar(idEmpresa, { para, assunto, html, texto }) {
        try {
            const { transporter, remetente } = await this._obterTransporter(idEmpresa);
            const info = await transporter.sendMail({ from: remetente, to: para, subject: assunto, html, text: texto });
            this._registrarResultado(idEmpresa, true);
            return { messageId: info.messageId };
        } catch (erro) {
            if (!erro.permanente) this._registrarResultado(idEmpresa, false);
            erro.permanente = erro.permanente
                || erro.code === 'EAUTH' || erro.code === 'EENVELOPE'
                || (erro.responseCode >= 500 && erro.responseCode < 600);
            throw erro;
        }
    }

    /**
     * Verifica conexão/autenticação SMTP (usado no teste do administrador).
     *
     * @method verificar
     * @memberof MailTransportService
     * @async
     * @param {number} idEmpresa - ID da empresa.
     * @returns {Promise<boolean>}
     * @throws {Error} Se falhar.
     *
     * @example
     * await MailTransportService.verificar(1);
     */
    async verificar(idEmpresa) {
        this.invalidar(idEmpresa);
        const { transporter } = await this._obterTransporter(idEmpresa);
        return transporter.verify();
    }

    /**
     * Remove o transporter do cache (após alterar SMTP).
     *
     * @method invalidar
     * @memberof MailTransportService
     * @param {number} idEmpresa - ID da empresa.
     * @returns {void}
     *
     * @example
     * MailTransportService.invalidar(1);
     */
    invalidar(idEmpresa) {
        this.cache.get(idEmpresa)?.transporter.close();
        this.cache.delete(idEmpresa);
        this.circuitos.delete(idEmpresa);
    }

    /**
     * Fecha todos os transporters (graceful shutdown).
     *
     * @method fecharTodos
     * @memberof MailTransportService
     * @returns {void}
     *
     * @example
     * MailTransportService.fecharTodos();
     */
    fecharTodos() {
        for (const { transporter } of this.cache.values()) transporter.close();
        this.cache.clear();
    }
}

module.exports = new MailTransportService();