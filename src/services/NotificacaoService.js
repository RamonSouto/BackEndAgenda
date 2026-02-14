const AgendamentoModel = require('../models/AgendamentoModel');
const PessoaModel = require('../models/PessoaModel');
const { formatarDataHora } = require('../utils/formatters');
const axios = require('axios');
const config = require('../config/env');

class NotificacaoService {
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
