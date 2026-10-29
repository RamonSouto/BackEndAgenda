// src/services/NotificacaoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file NotificacaoService.js
 * @description Serviço de notificações para envio de mensagens via WhatsApp.
 * Gerencia envio de notificações relacionadas a agendamentos (criação, confirmação,
 * alteração, cancelamento, lembrete) e lembretes automáticos para agendamentos do dia seguinte.
 * 
 * @requires ../models/AgendamentoModel
 * @requires ../models/PessoaModel
 * @requires ../utils/formatters
 * @requires axios
 * @requires ../config/env
 */

const AgendamentoModel = require('../models/agendamento/AgendamentoModel');
const PessoaModel = require('../models/PessoaModel');
const { formatarDataHora } = require('../utils/formatters');
const axios = require('axios');
const config = require('../config/env');

/**
 * Classe NotificacaoService.
 * @class NotificacaoService
 */
class NotificacaoService {
    /**
     * Envia uma notificação para um agendamento específico, conforme o tipo.
     * 
     * @method enviarNotificacaoAgendamento
     * @memberof NotificacaoService
     * @async
     * @param {number} id_agendamento - ID do agendamento.
     * @param {string} tipo - Tipo de notificação ('criacao', 'confirmacao', 'alteracao', 'cancelamento', 'lembrete').
     * @returns {Promise<boolean>} `true` se a notificação foi enviada com sucesso, `false` caso contrário.
     * @throws {Error} Se o agendamento ou paciente não for encontrado, ou tipo inválido.
     * 
     * @description
     * - Busca o agendamento e o paciente associado.
     * - Verifica se o paciente tem WhatsApp habilitado (`ind_whatsapp_1`).
     * - Monta a mensagem conforme o tipo.
     * - Envia via API do WhatsApp.
     * - Loga erros sem interromper o fluxo principal.
     * 
     * @example
     * await notificacaoService.enviarNotificacaoAgendamento(1, 'criacao');
     */
    async enviarNotificacaoAgendamento(id_agendamento, tipo) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id_agendamento);

            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }

            const paciente = await PessoaModel.buscarPorId(agendamento.paciente_id);

            if (!paciente) {
                throw new Error('Paciente não encontrado');
            }

            // Verificar se paciente tem WhatsApp
            if (!paciente.ind_whatsapp_1) {
                console.log('Paciente não possui WhatsApp habilitado');
                return false;
            }

            // Montar mensagem conforme o tipo
            let mensagem = '';

            switch (tipo) {
                case 'criacao':
                    mensagem = this.montarMensagemCriacao(agendamento, paciente);
                    break;
                case 'confirmacao':
                    mensagem = this.montarMensagemConfirmacao(agendamento, paciente);
                    break;
                case 'alteracao':
                    mensagem = this.montarMensagemAlteracao(agendamento, paciente);
                    break;
                case 'cancelamento':
                    mensagem = this.montarMensagemCancelamento(agendamento, paciente);
                    break;
                case 'lembrete':
                    mensagem = this.montarMensagemLembrete(agendamento, paciente);
                    break;
                default:
                    throw new Error('Tipo de notificação inválido');
            }

            // Enviar via WhatsApp API
            await this.enviarWhatsApp(paciente.num_celular_1, mensagem);

            return true;

        } catch (error) {
            console.error('Erro ao enviar notificação:', error.message);
            return false;
        }
    }

    /**
     * Monta a mensagem de criação de agendamento.
     * 
     * @method montarMensagemCriacao
     * @memberof NotificacaoService
     * @param {Object} agendamento - Dados do agendamento.
     * @param {Object} paciente - Dados do paciente.
     * @returns {string} Mensagem formatada.
     */
    montarMensagemCriacao(agendamento, paciente) {
        return `
Olá, ${paciente.nom_completo}! 👋

Seu agendamento foi realizado com sucesso! ✅

📅 Data: ${formatarDataHora(agendamento.dta_agendamento)}
👩‍⚕️ Costureira: ${agendamento.costureira_nome}

${agendamento.des_observacoes_geral ? `\n📝 Observações: ${agendamento.des_observacoes_geral}\n` : ''}

Por favor, chegue com 10 minutos de antecedência.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe de Ajustes
    `.trim();
    }

    /**
     * Monta a mensagem de confirmação de agendamento.
     * 
     * @method montarMensagemConfirmacao
     * @memberof NotificacaoService
     * @param {Object} agendamento - Dados do agendamento.
     * @param {Object} paciente - Dados do paciente.
     * @returns {string} Mensagem formatada.
     */
    montarMensagemConfirmacao(agendamento, paciente) {
        return `
Olá, ${paciente.nom_completo}! 👋

Seu agendamento foi CONFIRMADO! ✅

📅 Data: ${formatarDataHora(agendamento.dta_agendamento)}
👩‍⚕️ Costureira: ${agendamento.costureira_nome}

Aguardamos você!

Atenciosamente,
Equipe de Ajustes
    `.trim();
    }

    /**
     * Monta a mensagem de alteração de agendamento.
     * 
     * @method montarMensagemAlteracao
     * @memberof NotificacaoService
     * @param {Object} agendamento - Dados do agendamento.
     * @param {Object} paciente - Dados do paciente.
     * @returns {string} Mensagem formatada.
     */
    montarMensagemAlteracao(agendamento, paciente) {
        return `
Olá, ${paciente.nom_completo}! 👋

Seu agendamento foi ALTERADO! ⚠️

📅 Nova Data: ${formatarDataHora(agendamento.dta_agendamento)}
👩‍⚕️ Costureira: ${agendamento.costureira_nome}

${agendamento.des_observacoes_geral ? `\n📝 Observações: ${agendamento.des_observacoes_geral}\n` : ''}

Por favor, confirme o recebimento desta mensagem.

Atenciosamente,
Equipe de Ajustes
    `.trim();
    }

    /**
     * Monta a mensagem de cancelamento de agendamento.
     * 
     * @method montarMensagemCancelamento
     * @memberof NotificacaoService
     * @param {Object} agendamento - Dados do agendamento.
     * @param {Object} paciente - Dados do paciente.
     * @returns {string} Mensagem formatada.
     */
    montarMensagemCancelamento(agendamento, paciente) {
        return `
Olá, ${paciente.nom_completo}! 👋

Informamos que seu agendamento foi CANCELADO. ❌

📅 Data que seria: ${formatarDataHora(agendamento.dta_agendamento)}

Para reagendar, entre em contato conosco.

Atenciosamente,
Equipe de Ajustes
    `.trim();
    }

    /**
     * Monta a mensagem de lembrete de agendamento.
     * 
     * @method montarMensagemLembrete
     * @memberof NotificacaoService
     * @param {Object} agendamento - Dados do agendamento.
     * @param {Object} paciente - Dados do paciente.
     * @returns {string} Mensagem formatada.
     */
    montarMensagemLembrete(agendamento, paciente) {
        return `
Olá, ${paciente.nom_completo}! 👋

Este é um LEMBRETE do seu agendamento! 🔔

📅 Data: ${formatarDataHora(agendamento.dta_agendamento)}
👩‍⚕️ Costureira: ${agendamento.costureira_nome}

Aguardamos você!

Atenciosamente,
Equipe de Ajustes
    `.trim();
    }

    /**
     * Envia uma mensagem via API do WhatsApp.
     * 
     * @method enviarWhatsApp
     * @memberof NotificacaoService
     * @async
     * @param {string} numero - Número de telefone (com DDD, sem formatação).
     * @param {string} mensagem - Texto da mensagem.
     * @returns {Promise<boolean>} `true` se enviado com sucesso, `false` em caso de erro ou configuração ausente.
     * 
     * @description
     * - Verifica se a API do WhatsApp está configurada (`config.whatsapp.apiUrl` e `apiKey`).
     * - Se não estiver, loga a mensagem e retorna `false`.
     * - Faz uma requisição POST para o endpoint de envio.
     * - Captura erros e retorna `false`.
     */
    async enviarWhatsApp(numero, mensagem) {
        try {
            // Verificar se API do WhatsApp está configurada
            if (!config.whatsapp.apiUrl || !config.whatsapp.apiKey) {
                console.log('API WhatsApp não configurada. Mensagem não enviada.');
                console.log('Número:', numero);
                console.log('Mensagem:', mensagem);
                return false;
            }

            // Enviar via API do WhatsApp
            const response = await axios.post(
                `${config.whatsapp.apiUrl}/send`,
                {
                    phone: numero,
                    message: mensagem
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.whatsapp.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.status === 200;

        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error.message);
            return false;
        }
    }

    /**
     * Envia lembretes automáticos para agendamentos confirmados do dia seguinte.
     * 
     * @method enviarLembretesAutomaticos
     * @memberof NotificacaoService
     * @async
     * @returns {Promise<void>}
     * 
     * @description
     * - Calcula a data de amanhã (00:00:00 até 23:59:59).
     * - Busca agendamentos com status 'confirmado' para essa data.
     * - Para cada agendamento, chama `enviarNotificacaoAgendamento` com tipo 'lembrete'.
     * - Loga o progresso e erros.
     * 
     * @example
     * // Pode ser executado como um job agendado (cron)
     * await notificacaoService.enviarLembretesAutomaticos();
     */
    async enviarLembretesAutomaticos() {
        try {
            // Buscar agendamentos para amanhã
            const amanha = new Date();
            amanha.setDate(amanha.getDate() + 1);
            amanha.setHours(0, 0, 0, 0);

            const amanhaFim = new Date(amanha);
            amanhaFim.setHours(23, 59, 59, 999);

            const agendamentos = await AgendamentoModel.listar({
                data_inicio: amanha,
                data_fim: amanhaFim,
                ind_status: 'confirmado'
            });

            console.log(`Enviando ${agendamentos.length} lembretes automáticos...`);

            for (const agendamento of agendamentos) {
                await this.enviarNotificacaoAgendamento(agendamento.id, 'lembrete');
            }

            console.log('Lembretes enviados com sucesso!');

        } catch (error) {
            console.error('Erro ao enviar lembretes automáticos:', error.message);
        }
    }

    /**
     * Envia uma notificação personalizada para uma pessoa (paciente, costureira, etc.).
     * 
     * @method enviarNotificacaoCustomizada
     * @memberof NotificacaoService
     * @async
     * @param {number} id_pessoa - ID da pessoa (destinatário).
     * @param {string} mensagem - Mensagem personalizada a ser enviada.
     * @returns {Promise<boolean>} `true` se enviado com sucesso.
     * @throws {Error} Se a pessoa não for encontrada ou não tiver WhatsApp habilitado.
     * 
     * @example
     * await notificacaoService.enviarNotificacaoCustomizada(1, 'Sua consulta foi remarcada para amanhã.');
     */
    async enviarNotificacaoCustomizada(id_pessoa, mensagem) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id_pessoa);

            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }

            if (!pessoa.ind_whatsapp_1) {
                throw new Error('Pessoa não possui WhatsApp habilitado');
            }

            await this.enviarWhatsApp(pessoa.num_celular_1, mensagem);

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new NotificacaoService();
