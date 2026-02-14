const AgendamentoModel = require('../models/AgendamentoModel');
const PessoaModel = require('../models/PessoaModel');
const ProdutoModel = require('../models/ProdutoModel');
const LogService = require('./LogService');
const NotificacaoService = require('./NotificacaoService');
const { STATUS_AGENDAMENTO, TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const { differenceInHours, parseISO } = require('date-fns');
const database = require('../config/database');

class AgendamentoService {
    async criar(dados, usuarioLogadoId) {
        return await database.transaction(async (connection) => {
            try {
                // Validar dados
                const { error, value } = require('../utils/validators').agendamentoSchema.validate(dados);

                if (error) {
                    throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
                }

                // Verificar se paciente existe e é do tipo correto
                const paciente = await PessoaModel.buscarPorId(value.id_paciente);
                if (!paciente || paciente.ind_tipo_pessoa !== TIPO_PESSOA.PACIENTE) {
                    throw new Error('Paciente inválido');
                }

                // Verificar se costureira existe e é do tipo correto
                const costureira = await PessoaModel.buscarPorId(value.id_costureira);
                if (!costureira || costureira.ind_tipo_pessoa !== TIPO_PESSOA.COSTUREIRA) {
                    throw new Error('Costureira inválida');
                }

                // Verificar se costureira está disponível
                const costureiraDisponivel = await AgendamentoModel.verificarCostureiraDisponivel(value.id_costureira);
                if (!costureiraDisponivel) {
                    throw new Error(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
                }

                // Verificar se secretária existe e é do tipo correto
                const secretaria = await PessoaModel.buscarPorId(value.id_secretaria);
                if (!secretaria || ![TIPO_PESSOA.SECRETARIA, TIPO_PESSOA.ADMINISTRADOR].includes(secretaria.ind_tipo_pessoa)) {
                    throw new Error('Secretária/Administrador inválido');
                }

                // Criar agendamento
                const agendamentoId = await AgendamentoModel.criar(value);

                // Adicionar produtos ao agendamento
                if (value.produtos && value.produtos.length > 0) {
                    for (const produto of value.produtos) {
                        await ProdutoModel.adicionarProdutoAgendamento({
                            id_agendamento: agendamentoId,
                            id_produto_grade: produto.id_produto_grade,
                            des_ajuste_produto: produto.des_ajuste_produto
                        });
                    }
                }

                // Registrar log
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.AGENDAMENTO_CRIAR,
                    des_tabela: 'tab_agendamentos',
                    num_registro_id: agendamentoId,
                    des_detalhes: {
                        paciente: paciente.nom_completo,
                        costureira: costureira.nom_completo,
                        data_agendamento: value.dta_agendamento,
                        total_produtos: value.produtos?.length || 0
                    }
                });

                // Enviar notificação ao paciente
                await NotificacaoService.enviarNotificacaoAgendamento(agendamentoId, 'criacao');

                const agendamento = await AgendamentoModel.buscarPorId(agendamentoId);
                return agendamento;

            } catch (error) {
                throw error;
            }
        });
    }

    async buscarPorId(id, usuarioLogadoId, tipoUsuario) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Buscar produtos do agendamento
            const produtos = await ProdutoModel.listarProdutosAgendamento(id);
            agendamento.produtos = produtos;

            // Secretária não pode ver observações da costureira
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA) {
                delete agendamento.des_observacoes_costureira;
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_agendamentos',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id'
                }
            });

            return agendamento;

        } catch (error) {
            throw error;
        }
    }

    async listar(filtros = {}, usuarioLogadoId, tipoUsuario) {
        try {
            // Se for costureira, filtrar apenas seus agendamentos
            if (tipoUsuario === TIPO_PESSOA.COSTUREIRA) {
                filtros.id_costureira = usuarioLogadoId;
            }

            const agendamentos = await AgendamentoModel.listar(filtros);

            // Secretária não pode ver observações da costureira
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA) {
                agendamentos.forEach(agendamento => {
                    delete agendamento.des_observacoes_costureira;
                });
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_agendamentos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    filtros: filtros,
                    total_registros: agendamentos.length
                }
            });

            return agendamentos;

        } catch (error) {
            throw error;
        }
    }

    async atualizar(id, dados, usuarioLogadoId, tipoUsuario) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Secretária só pode editar agendamentos criados por ela
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA && agendamento.secretaria_id !== usuarioLogadoId) {
                throw new Error('Você só pode editar agendamentos criados por você');
            }

            // Se está alterando a costureira, verificar disponibilidade
            if (dados.id_costureira && dados.id_costureira !== agendamento.costureira_id) {
                const disponivel = await AgendamentoModel.verificarCostureiraDisponivel(dados.id_costureira, id);
                if (!disponivel) {
                    throw new Error(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
                }
            }

            // Atualizar agendamento
            const atualizado = await AgendamentoModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar agendamento');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.AGENDAMENTO_EDITAR,
                des_tabela: 'tab_agendamentos',
                num_registro_id: id,
                des_detalhes: {
                    campos_alterados: Object.keys(dados),
                    paciente: agendamento.paciente_nome
                }
            });

            // Notificar paciente sobre alteração
            await NotificacaoService.enviarNotificacaoAgendamento(id, 'alteracao');

            const agendamentoAtualizado = await AgendamentoModel.buscarPorId(id);
            return agendamentoAtualizado;

        } catch (error) {
            throw error;
        }
    }

    async cancelar(id, usuarioLogadoId, tipoUsuario) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Secretária só pode cancelar agendamentos criados por ela
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA && agendamento.secretaria_id !== usuarioLogadoId) {
                throw new Error('Você só pode cancelar agendamentos criados por você');
            }

            // Verificar prazo de 2 horas para secretária
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA) {
                const dataAgendamento = parseISO(agendamento.dta_agendamento);
                const horasRestantes = differenceInHours(dataAgendamento, new Date());

                if (horasRestantes < 2) {
                    throw new Error(MENSAGENS.ERRO.PRAZO_CANCELAMENTO);
                }
            }

            // Cancelar agendamento
            const cancelado = await AgendamentoModel.cancelar(id);

            if (!cancelado) {
                throw new Error('Erro ao cancelar agendamento');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.AGENDAMENTO_CANCELAR,
                des_tabela: 'tab_agendamentos',
                num_registro_id: id,
                des_detalhes: {
                    paciente: agendamento.paciente_nome,
                    costureira: agendamento.costureira_nome,
                    data_agendamento: agendamento.dta_agendamento
                }
            });

            // Notificar paciente sobre cancelamento
            await NotificacaoService.enviarNotificacaoAgendamento(id, 'cancelamento');

            return true;

        } catch (error) {
            throw error;
        }
    }

    async deletar(id, usuarioLogadoId, tipoUsuario) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Secretária só pode deletar agendamentos criados por ela
            if (tipoUsuario === TIPO_PESSOA.SECRETARIA) {
                if (agendamento.secretaria_id !== usuarioLogadoId) {
                    throw new Error('Você só pode deletar agendamentos criados por você');
                }

                // Verificar prazo de 2 horas
                const dataAgendamento = parseISO(agendamento.dta_agendamento);
                const horasRestantes = differenceInHours(dataAgendamento, new Date());

                if (horasRestantes < 2) {
                    throw new Error(MENSAGENS.ERRO.PRAZO_CANCELAMENTO);
                }
            }

            // Deletar (soft delete)
            const deletado = await AgendamentoModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar agendamento');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_agendamentos',
                num_registro_id: id,
                des_detalhes: {
                    paciente: agendamento.paciente_nome,
                    data_agendamento: agendamento.dta_agendamento
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    async registrarComparecimento(id, compareceu, observacoes, usuarioLogadoId) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Apenas a costureira do agendamento pode registrar comparecimento
            if (agendamento.costureira_id !== usuarioLogadoId) {
                throw new Error('Apenas a costureira responsável pode registrar o comparecimento');
            }

            // Registrar comparecimento
            const registrado = await AgendamentoModel.registrarComparecimento(id, compareceu, observacoes);

            if (!registrado) {
                throw new Error('Erro ao registrar comparecimento');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.COMPARECIMENTO,
                des_tabela: 'tab_agendamentos',
                num_registro_id: id,
                des_detalhes: {
                    paciente: agendamento.paciente_nome,
                    compareceu: compareceu,
                    tem_observacoes: !!observacoes
                }
            });

            const agendamentoAtualizado = await AgendamentoModel.buscarPorId(id);
            return agendamentoAtualizado;

        } catch (error) {
            throw error;
        }
    }

    async confirmar(id, usuarioLogadoId) {
        try {
            const confirmado = await AgendamentoModel.confirmar(id);

            if (!confirmado) {
                throw new Error('Erro ao confirmar agendamento');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: 'confirmar_agendamento',
                des_tabela: 'tab_agendamentos',
                num_registro_id: id
            });

            // Notificar paciente
            await NotificacaoService.enviarNotificacaoAgendamento(id, 'confirmacao');

            return true;

        } catch (error) {
            throw error;
        }
    }

    async listarPorCostureira(id_costureira, apenasAtivos = false, usuarioLogadoId) {
        try {
            const agendamentos = await AgendamentoModel.buscarPorCostureira(id_costureira, apenasAtivos);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_agendamentos',
                des_detalhes: {
                    tipo_consulta: 'listar_por_costureira',
                    id_costureira: id_costureira,
                    apenas_ativos: apenasAtivos,
                    total_registros: agendamentos.length
                }
            });

            return agendamentos;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AgendamentoService();
