// src/workers/emailOutboxWorker.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/workers/emailOutboxWorker.js
 * @description Worker in-process (setTimeout encadeado) que drena a outbox.
 * Sem sobreposição de ciclos; seguro com múltiplas instâncias (claim atômico).
 * Executa purga LGPD de mensagens enviadas a cada hora.
 *
 * @requires ../config/env
 * @requires ../config/logger
 * @requires ../services/email/EmailOutboxService
 * @requires ../services/email/MailTransportService
 * @requires ../models/sistema/EmailOutboxModel
 */
const config = require('../config/env');
const logger = require('../config/logger');
const EmailOutboxService = require('../services/email/EmailOutboxService');
const MailTransportService = require('../services/email/MailTransportService');
const EmailOutboxModel = require('../models/sistema/EmailOutboxModel');

const UMA_HORA = 60 * 60 * 1000;

class EmailOutboxWorker {
    constructor() {
        this.timer = null;
        this.ativo = false;
        this.ultimaPurga = 0;
    }

    /**
     * Executa um ciclo e agenda o próximo.
     *
     * @method _ciclo
     * @memberof EmailOutboxWorker
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async _ciclo() {
        try {
            await EmailOutboxService.processarLote();
            if (Date.now() - this.ultimaPurga > UMA_HORA) {
                const removidos = await EmailOutboxModel.purgarEnviados(config.email.retencaoDias);
                this.ultimaPurga = Date.now();
                if (removidos) logger.info('Outbox purgada (LGPD)', { removidos });
            }
        } catch (erro) {
            logger.error('Erro no ciclo do worker de e-mail', { erro: erro.message });
        } finally {
            if (this.ativo) {
                this.timer = setTimeout(() => this._ciclo(), config.email.workerIntervalMs);
                this.timer.unref();
            }
        }
    }

    /**
     * Inicia o worker.
     *
     * @method iniciar
     * @memberof EmailOutboxWorker
     * @returns {void}
     *
     * @example
     * EmailOutboxWorker.iniciar();
     */
    iniciar() {
        if (this.ativo || !config.email.workerEnabled) return;
        this.ativo = true;
        logger.info('Worker de e-mail iniciado', { intervaloMs: config.email.workerIntervalMs });
        this._ciclo();
    }

    /**
     * Para o worker e fecha conexões SMTP.
     *
     * @method parar
     * @memberof EmailOutboxWorker
     * @returns {void}
     *
     * @example
     * EmailOutboxWorker.parar();
     */
    parar() {
        this.ativo = false;
        clearTimeout(this.timer);
        MailTransportService.fecharTodos();
    }
}

module.exports = new EmailOutboxWorker();