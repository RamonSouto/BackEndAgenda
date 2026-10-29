// src/services/email/EmailOutboxService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/email/EmailOutboxService.js
 * @description Enfileiramento e processamento da outbox de e-mails.
 * - Enfileirar: monta variáveis, renderiza e persiste (idempotente).
 * - Processar: claim atômico, envio, retry com backoff exponencial,
 *   falha definitiva para erros permanentes (auth, 5xx).
 *
 * @requires crypto
 * @requires ../../config/env
 * @requires ../../config/logger
 * @requires ../../models/sistema/EmailOutboxModel
 * @requires ../../models/sistema/EmailTemplateModel
 * @requires ../../models/sistema/EmpresaModel
 * @requires ../../models/agendamento/AgendamentoModel
 * @requires ./EmailTemplateService
 * @requires ./MailTransportService
 * @requires ../../utils/formatters
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const { randomUUID } = require('crypto');
const config = require('../../config/env');
const logger = require('../../config/logger');
const EmailOutboxModel = require('../../models/sistema/EmailOutboxModel');
const EmailTemplateModel = require('../../models/sistema/EmailTemplateModel');
const EmpresaModel = require('../../models/sistema/EmpresaModel');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const EmailTemplateService = require('./EmailTemplateService');
const MailTransportService = require('./MailTransportService');
const { formatarData, formatarDataHora, formatarTelefone } = require('../../utils/formatters');
const validators = require('../../utils/validators');
const { BadRequestError, NotFoundError } = require('../../utils/ApiError');
const { EVENTOS_EMAIL } = require('../../utils/constants');

/** Backoff em minutos por tentativa (1ª falha → 1 min ... 5ª → 240 min). */
const BACKOFF_MINUTOS = [1, 5, 15, 60, 240];
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTOS_COM_LINK = [EVENTOS_EMAIL.CADASTRADO, EVENTOS_EMAIL.CONCLUIDO];

class EmailOutboxService {

    /**
     * Resolve a empresa emissora.
     *
     * @method _idEmpresa
     * @memberof EmailOutboxService
     * @private
     * @async
     * @returns {Promise<number|null>}
     */
    async _idEmpresa() {
        return config.email.empresaId || EmpresaModel.buscarIdEmpresaPadrao();
    }

    /**
     * Enfileira o e-mail de um evento de agendamento. Nunca lança:
     * falha de notificação não pode derrubar a operação de negócio.
     *
     * @method enfileirarEventoAgendamento
     * @memberof EmailOutboxService
     * @async
     * @param {string} evento - EVENTOS_EMAIL.
     * @param {number} idAgendamento - ID do agendamento.
     * @returns {Promise<number|null>} ID da outbox, ou null se ignorado/falhou.
     *
     * @example
     * await EmailOutboxService.enfileirarEventoAgendamento('agendamento_cadastrado', 10);
     */
    async enfileirarEventoAgendamento(evento, idAgendamento) {
        try {
            const idEmpresa = await this._idEmpresa();
            const [empresa, agendamento, template] = await Promise.all([
                EmpresaModel.buscarConfigSmtp(idEmpresa),
                AgendamentoModel.buscarDadosNotificacao(idAgendamento),
                EmailTemplateModel.buscarPorEvento(idEmpresa, evento)
            ]);

            const motivo =
                !empresa?.ind_smtp_ativo ? 'smtp_inativo' :
                    !agendamento ? 'agendamento_inexistente' :
                        !agendamento.des_email_paciente ? 'paciente_sem_email' :
                            !template?.ind_ativo ? 'template_inativo' : null;

            if (motivo) {
                logger.info('E-mail não enfileirado', { evento, id_agendamento: idAgendamento, motivo });
                return null;
            }

            const uuidValido = REGEX_UUID.test(agendamento.des_url_externa);
            const link = EVENTOS_COM_LINK.includes(evento) && uuidValido
                ? `${config.email.publicUrl}/acompanhar/${encodeURIComponent(agendamento.des_url_externa)}`
                : '';

            const variaveis = {
                nome_cliente: agendamento.nom_paciente,
                nome_costureira: agendamento.nom_costureira,
                data_agendamento: formatarData(agendamento.dta_agendamento),
                hora_agendamento: formatarDataHora(agendamento.dta_agendamento, 'HH:mm'),
                nome_empresa: empresa.nom_fantasia,
                telefone_empresa: empresa.num_celular_1 ? formatarTelefone(empresa.num_celular_1) : '',
                link_acompanhamento: link
            };

            const { assunto, html, texto } = EmailTemplateService.renderizar(template, variaveis);

            const id = await EmailOutboxModel.criar({
                id_empresa: idEmpresa,
                id_agendamento: idAgendamento,
                ind_evento: evento,
                des_chave_idempotencia: `${evento}:${idAgendamento}`,
                des_destinatario: agendamento.des_email_paciente,
                des_assunto: assunto,
                des_corpo_html: html,
                des_corpo_texto: texto
            });

            logger.info('E-mail enfileirado', { evento, id_agendamento: idAgendamento, id_outbox: id, duplicado: id === 0 });
            return id || null;
        } catch (erro) {
            logger.error('Falha ao enfileirar e-mail', { evento, id_agendamento: idAgendamento, erro: erro.message });
            return null;
        }
    }

    /**
     * Processa um lote da outbox (chamado pelo worker).
     *
     * @method processarLote
     * @memberof EmailOutboxService
     * @async
     * @param {number} [tamanho] - Tamanho do lote.
     * @returns {Promise<{processados: number, enviados: number, falhas: number}>}
     *
     * @example
     * const r = await EmailOutboxService.processarLote(10);
     */
    async processarLote(tamanho = config.email.workerBatch) {
        await EmailOutboxModel.liberarTravados(10);

        const token = randomUUID();
        const lote = await EmailOutboxModel.reivindicarLote(token, tamanho);
        const resultado = { processados: lote.length, enviados: 0, falhas: 0 };

        // Sequencial por design: volume baixo, pool SMTP de 2 conexões, evita rate-limit do provedor.
        for (const msg of lote) {
            if (MailTransportService.circuitoAberto(msg.id_empresa)) {
                await EmailOutboxModel.registrarFalha(msg.id, 'Circuit breaker aberto', 5);
                resultado.falhas++;
                continue;
            }

            const inicio = Date.now();
            try {
                const { messageId } = await MailTransportService.enviar(msg.id_empresa, {
                    para: msg.des_destinatario, assunto: msg.des_assunto, html: msg.des_corpo_html, texto: msg.des_corpo_texto
                });
                await EmailOutboxModel.marcarEnviado(msg.id, messageId);
                resultado.enviados++;
                logger.info('E-mail enviado', { id_outbox: msg.id, evento: msg.ind_evento, duracaoMs: Date.now() - inicio });
            } catch (erro) {
                const tentativa = msg.num_tentativas; // 0-based antes do incremento
                const atraso = erro.permanente || tentativa >= BACKOFF_MINUTOS.length ? null : BACKOFF_MINUTOS[tentativa];
                await EmailOutboxModel.registrarFalha(msg.id, erro.message, atraso);
                resultado.falhas++;
                logger[atraso === null ? 'error' : 'warn']('Falha no envio de e-mail', {
                    id_outbox: msg.id, tentativa: tentativa + 1, definitiva: atraso === null,
                    codigo: erro.code, responseCode: erro.responseCode, erro: erro.message
                });
            }
        }

        if (lote.length) logger.info('Lote outbox processado', resultado);
        return resultado;
    }

    /**
     * Lista mensagens da outbox (painel administrativo).
     *
     * @method listar
     * @memberof EmailOutboxService
     * @async
     * @param {Object} filtros - Query string.
     * @returns {Promise<Array<Object>>}
     * @throws {BadRequestError}
     *
     * @example
     * await EmailOutboxService.listar({ ind_status: 'falha' });
     */
    async listar(filtros) {
        const { error, value } = validators.outboxFiltroSchema.validate(filtros, { stripUnknown: true });
        if (error) throw new BadRequestError(error.details[0].message);
        return EmailOutboxModel.listar(value);
    }

    /**
     * Recoloca uma mensagem com falha definitiva na fila.
     *
     * @method reprocessar
     * @memberof EmailOutboxService
     * @async
     * @param {number} id - ID da outbox.
     * @returns {Promise<boolean>}
     * @throws {NotFoundError} Se não existir ou não estiver em 'falha'.
     *
     * @example
     * await EmailOutboxService.reprocessar(42);
     */
    async reprocessar(id) {
        const ok = await EmailOutboxModel.reprocessar(id);
        if (!ok) throw new NotFoundError('Mensagem não encontrada ou não está em falha');
        return true;
    }
}

module.exports = new EmailOutboxService();
