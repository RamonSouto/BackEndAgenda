// src/services/agendamento/agendamentoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/agendamentoService.js
 * @description Orquestra as regras de negócio do módulo de agendamento:
 * validação de perfis, disponibilidade de horário (com lock transacional),
 * criação atômica com itens, troca de costureira e máquina de estados de status.
 * 
 * @requires uuid
 * @requires ../../config/database
 * @requires ../../models/agendamento/agendamentoModel
 * @requires ../../models/agendamento/ProdutoAgendamentoModel
 * @requires ../../models/PessoaModel
 * @requires ../../models/sistema/ParametrizacaoModel
 * @requires ../../utils/ApiError
 * @requires ../LogService
 * @requires ../NotificacaoService
 */
const { v4: uuidv4 } = require('crypto');
const database = require('../../config/database');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const ProdutoAgendamentoModel = require('../../models/agendamento/ProdutoAgendamentoModel');
const PessoaModel = require('../../models/PessoaModel');
const ParametrizacaoModel = require('../../models/sistema/ParametrizacaoModel');
const { NotFoundError } = require('../../utils/ApiError');
const LogService = require('../LogService');
const NotificacaoService = require('../NotificacaoService');
const TipoAgendamentoModel = require('../../models/agendamento/TipoAgendamentoModel');
const { ACOES_LOG } = require('../../utils/constants');

/** Transições de status permitidas (máquina de estados). */
const TRANSICOES_VALIDAS = {
    agendado: ['confirmado', 'cancelado', 'falta'],
    confirmado: ['concluido', 'cancelado', 'falta'],
    concluido: [],
    cancelado: [],
    falta: []
};

class AgendamentoService {
    /**
     * Cria um agendamento completo com seus itens, de forma transacional.
     * 
     * @async
     * @param {Object} payload
     * @param {number} payload.id_paciente
     * @param {number} payload.id_costureira
     * @param {number} [payload.id_secretaria]
     * @param {string} payload.dta_agendamento
     * @param {string} [payload.des_observacoes_geral]
     * @param {string} [payload.des_observacoes_costureira]
     * @param {Array<Object>} payload.itens - Itens de produto/serviço (mín. 1).
     * @param {Object} [usuario] - Usuário autenticado (null se público).
     * @returns {Promise<Object>} Agendamento criado com UUID público.
     */
    async criarAgendamento(dados, usuarioLogadoId) {

        try {
            const { id_paciente, id_costureira, id_secretaria, dta_agendamento, des_observacoes_geral, des_observacoes_costureira, itens } = dados;

            if (!itens || itens.length === 0) {
                throw new ValidationError('É necessário informar ao menos um item de produto/serviço');
            }

            if (new Date(dta_agendamento) <= new Date()) {
                throw new ValidationError('A data do agendamento deve ser no futuro');
            }

            // Validações de papel (fora da transação — leitura pura)
            await this._validarPapel(id_paciente, 'ind_paciente', 'Paciente');
            await this._validarPapel(id_costureira, 'ind_costureira', 'Costureira');

            if (id_secretaria) {
                await this._validarPapel(id_secretaria, 'ind_secretaria', 'Secretária');
            }

            await this.validarJanelaAtendimento(dta_agendamento);

            const uuidExterno = uuidv4();

            const agendamentoCriado = await database.transaction(async (conn) => {
                // Lock pessimista das linhas concorrentes — evita double-booking.
                const conflito = await AgendamentoModel.existeConflito(conn, id_costureira, dta_agendamento);

                if (conflito) {
                    throw new ApiError(409, 'Já existe um agendamento ativo para esta costureira neste horário');
                }

                const idAgendamento = await AgendamentoModel.inserir(conn, {
                    id_paciente, id_costureira, id_secretaria, dta_agendamento,
                    des_observacoes_geral, des_observacoes_costureira,
                    des_url_externa: uuidExterno
                });

                for (const item of itens) {
                    const precoVigente = await ProdutoAgendamentoModel.buscarPrecoVigente(
                        conn, item.id_produto_servico
                    );
                    if (precoVigente === null) {
                        throw new ApiError(422, `Não há preço vigente configurado para o serviço ${item.id_produto_servico}`);
                    }

                    await ProdutoAgendamentoModel.inserir(conn, {
                        id_agendamento: idAgendamento,
                        id_tipo_agendamento: item.id_tipo_agendamento,
                        id_produto_grade: item.id_produto_grade,
                        id_produto_servico: item.id_produto_servico,
                        des_ajuste_produto: item.des_ajuste_produto,
                        val_preco_servico: precoVigente,
                        val_desconto_servico: item.val_desconto_servico ?? 0
                    });
                }

                return AgendamentoModel.buscarPorId(idAgendamento, conn);
            });

            await LogService.registrar({
                id_usuario: usuarioLogadoId ?? null,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_agendamento',
                num_registro_id: id,
                des_detalhes: {
                    origem: usuarioLogadoId ? 'interna' : 'publica'
                }
            });

            NotificacaoService.notificarNovoAgendamento(agendamentoCriado).catch((err) => {
                // Falha de notificação não deve reverter o agendamento — apenas logar.
                console.error('⚠️ Falha ao notificar agendamento:', err.message);
            });

            return agendamentoCriado;
        } catch (error) {
            throw error
        }

    }

    /**
     * Lista agendamentos com filtros.
     * @param {Object} filtros
     * @returns {Promise<Object>}
     */
    async listar(body, usuarioLogadoId) {
        try {

            console.log(body);

            const agendamento = await AgendamentoModel.listar(body);

            if (!agendamento) {
                throw new NotFoundError('Agendamento(s) não encontrado!');
            }
            if (agendamento.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.LISTAR,
                    des_tabela: 'tab_agendamento',
                    des_detalhes: {
                        tipo_consulta: 'listar_agendamento',
                        total_registros: agendamento.length,
                    }
                });
            }

            return agendamento;

        } catch (error) {
            throw error
        }
    }

    /**
     * Busca um agendamento por ID.
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async buscarPorId(id, usuarioLogadoId) {

        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) throw new NotFoundError('Agendamento não encontrado');


            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_agendamento',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    des_url_externa: agendamento.des_url_externa,
                    id_paciente: agendamento.id_paciente,
                    id_costureira: agendamento.id_costureira,
                    id_secretaria: agendamento.id_secretaria,
                    dta_agendamento: agendamento.dta_agendamento,
                    des_observacoes_geral: agendamento.des_observacoes_geral,
                    des_observacoes_costureira: agendamento.des_observacoes_costureira,
                    ind_status: agendamento.ind_status,
                    ind_paciente_compareceu: agendamento.ind_paciente_compareceu,
                    dta_confirmacao: agendamento.dta_confirmacao,
                    dta_conclusao: agendamento.dta_conclusao,
                    dta_cancelamento: agendamento.dta_cancelamento,
                    created_at: agendamento.created_at,
                    updated_at: agendamento.updated_at,
                    deleted_at: agendamento.deleted_at
                }
            });

            return agendamento;
        } catch (error) {
            throw error
        }
    }

    /**
     * Valida se a pessoa possui o papel exigido e está ativa.
     * @private
     * @param {number} idPessoa
     * @param {'ind_paciente'|'ind_costureira'|'ind_secretaria'} flag
     * @param {string} rotulo
     * @returns {Promise<Object>} Registro da pessoa.
     */
    async _validarPapel(idPessoa, flag, rotulo) {
        const pessoa = await PessoaModel.buscarPorId(idPessoa);
        if (!pessoa) throw new ApiError(404, `${rotulo} não encontrado(a)`);
        if (!pessoa[flag]) throw new ApiError(422, `Pessoa informada não possui o papel de ${rotulo}`);
        if (pessoa.ind_status !== 'ativo') throw new ApiError(422, `${rotulo} está inativo(a)`);
        return pessoa;
    }

    /**
     * Valida se o horário solicitado está dentro da janela de atendimento
     * configurada em tab_parametrizacao para o tipo de dia correspondente.
     * 
     * @param {string|Date} dataAgendamento
     * @returns {Promise<void>}
     */
    async validarJanelaAtendimento(dataAgendamento) {
        const data = new Date(dataAgendamento);
        const diaSemana = data.getDay(); // 0=domingo ... 6=sábado

        if (diaSemana === 0) {
            throw new ApiError(422, 'Não há atendimento aos domingos');
        }

        const tipoDia = diaSemana === 6 ? 'SABADO' : 'UTIL';
        const parametrizacao = await ParametrizacaoModel.buscarAtivaPorTipoDia(tipoDia);

        if (!parametrizacao) {
            throw new ApiError(422, `Não há horário de atendimento configurado para ${tipoDia}`);
        }

        const horaAgendamento = data.toTimeString().slice(0, 8);
        if (horaAgendamento < parametrizacao.hra_inicio || horaAgendamento > parametrizacao.hra_fim) {
            throw new ApiError(422, `Horário fora da janela de atendimento (${parametrizacao.hra_inicio} - ${parametrizacao.hra_fim})`);
        }
    }

    /**
     * Verifica disponibilidade de horário para uma costureira (leitura, sem lock).
     * Uso: telas de consulta de agenda (não garante atomicidade de escrita).
     * 
     * @async
     * @param {number} idCostureira
     * @param {string} dataAgendamento
     * @returns {Promise<boolean>}
     */
    async verificarDisponibilidade(idCostureira, dataAgendamento) {
        const rows = await database.query(
            `SELECT id FROM tab_agendamento
             WHERE id_costureira = ? AND dta_agendamento = ?
               AND ind_status NOT IN ('cancelado', 'falta') AND deleted_at IS NULL`,
            [idCostureira, dataAgendamento]
        );
        return rows.length === 0;
    }



    /**
     * Busca um agendamento pelo UUID público (visão restrita, sem dados sensíveis).
     * @param {string} uuid
     * @returns {Promise<Object>}
     */
    async buscarPorUuidPublico(uuid) {
        const agendamento = await AgendamentoModel.buscarPorUuid(uuid);
        if (!agendamento) throw new ApiError(404, 'Agendamento não encontrado');
        return agendamento;
    }

    /**
     * Atualiza dados gerais de um agendamento (sem alterar status).
     * Revalida disponibilidade caso data ou costureira sejam alteradas.
     * 
     * @param {number} id
     * @param {Object} dados
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async atualizar(id, dados, usuario) {
        const atual = await this.buscarPorId(id);

        if (['concluido', 'cancelado'].includes(atual.ind_status)) {
            throw new ApiError(422, 'Não é possível editar um agendamento finalizado ou cancelado');
        }

        if (dados.id_costureira) {
            await this._validarPapel(dados.id_costureira, 'ind_costureira', 'Costureira');
        }

        const novaData = dados.dta_agendamento ?? atual.dta_agendamento;
        const novaCostureira = dados.id_costureira ?? atual.id_costureira;

        if (dados.dta_agendamento || dados.id_costureira) {
            await this.validarJanelaAtendimento(novaData);

            await database.transaction(async (conn) => {
                const conflito = await AgendamentoModel.existeConflito(conn, novaCostureira, novaData, id);
                if (conflito) {
                    throw new ApiError(409, 'Já existe um agendamento ativo para esta costureira neste horário');
                }
                await conn.execute(
                    `UPDATE tab_agendamento
                     SET id_costureira = ?, dta_agendamento = ?
                     WHERE id = ?`,
                    [novaCostureira, novaData, id]
                );
            });
        }

        await AgendamentoModel.atualizar(id, dados);

        await LogService.registrar({
            idUsuario: usuario?.id, acao: 'ATUALIZAR', tabela: 'tab_agendamento',
            registroId: id, detalhes: dados
        });

        return this.buscarPorId(id);
    }

    /**
     * Troca a costureira de um agendamento (ex: falta, férias, afastamento).
     * Revalida disponibilidade da nova costureira no mesmo horário.
     * 
     * @param {number} id
     * @param {number} novaCostureiraId
     * @param {string} [motivo]
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async trocarCostureira(id, novaCostureiraId, motivo, usuario) {
        const agendamento = await this.buscarPorId(id);

        if (['concluido', 'cancelado'].includes(agendamento.ind_status)) {
            throw new ApiError(422, 'Não é possível trocar a costureira de um agendamento finalizado ou cancelado');
        }

        await this._validarPapel(novaCostureiraId, 'ind_costureira', 'Costureira');

        await database.transaction(async (conn) => {
            const conflito = await AgendamentoModel.existeConflito(
                conn, novaCostureiraId, agendamento.dta_agendamento, id
            );
            if (conflito) {
                throw new ApiError(409, 'A nova costureira já possui agendamento ativo neste horário');
            }
            await conn.execute(
                `UPDATE tab_agendamento SET id_costureira = ? WHERE id = ?`,
                [novaCostureiraId, id]
            );
        });

        await LogService.registrar({
            idUsuario: usuario?.id, acao: 'TROCA_COSTUREIRA', tabela: 'tab_agendamento',
            registroId: id,
            detalhes: {
                de: agendamento.id_costureira,
                para: novaCostureiraId, motivo
            }
        });

        return this.buscarPorId(id);
    }

    /**
     * Atualiza o status do agendamento respeitando a máquina de estados.
     * 
     * @param {number} id
     * @param {'confirmado'|'concluido'|'cancelado'|'falta'} novoStatus
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async atualizarStatus(id, novoStatus, usuario) {
        const agendamento = await this.buscarPorId(id);
        const transicoesPermitidas = TRANSICOES_VALIDAS[agendamento.ind_status] || [];

        if (!transicoesPermitidas.includes(novoStatus)) {
            throw new ApiError(
                422,
                `Transição de status inválida: '${agendamento.ind_status}' -> '${novoStatus}'`
            );
        }

        await AgendamentoModel.atualizarStatus(id, novoStatus);

        await LogService.registrar({
            idUsuario: usuario?.id,
            acao: 'MUDANCA_STATUS',
            tabela: 'tab_agendamento',
            registroId: id,
            detalhes: {
                de: agendamento.ind_status,
                para: novoStatus
            }
        });

        return this.buscarPorId(id);
    }

    /**
     * Soft delete de um agendamento.
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<boolean>}
     */
    async remover(id, usuario) {
        await this.buscarPorId(id);
        const ok = await AgendamentoModel.remover(id);
        await LogService.registrar({
            idUsuario: usuario?.id,
            acao: 'REMOVER',
            tabela: 'tab_agendamento',
            registroId: id
        });
        return ok;
    }
}

module.exports = new AgendamentoService();
