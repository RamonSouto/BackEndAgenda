// src/services/agendamento/AgendamentoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/AgendamentoService.js
 * @description Regras de negócio de agendamento: validação de disponibilidade
 * (parametrização de horários), validação de papéis de pessoa, criação
 * transacional (cabeçalho + itens), troca de costureira e máquina de estados
 * de status.
 * 
 * @requires uuid
 * @requires ../../config/database
 * @requires ../../models/agendamento/AgendamentoModel
 * @requires ../../models/agendamento/ProdutoAgendamentoModel
 * @requires ../../models/sistema/ParametrizacaoModel
 * @requires ../../models/PessoaModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const { v4: uuidv4, randomUUID } = require('crypto');
const database = require('../../config/database');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const ProdutoAgendamentoModel = require('../../models/agendamento/AgendamentoProdutoModel');
const ParametrizacaoModel = require('../../models/sistema/ParametrizacaoModel');
const PessoaModel = require('../../models/PessoaModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS, STATUS_AGENDAMENTO } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/ApiError');
const { formatarDataHoraDB } = require('../../utils/formatters');

/**
 * Transições de status permitidas (máquina de estados simples).
 * Chave = status atual, valor = lista de status para os quais pode transicionar.
 */
const TRANSICOES_PERMITIDAS = {
    agendado: ['confirmado', 'cancelado', 'falta'],
    confirmado: ['concluido', 'cancelado', 'falta'],
    concluido: [],
    cancelado: [],
    falta: []
};

class AgendamentoService {

    /**
     * Valida se um dia/horário respeita a parametrização ativa (UTIL/SABADO)
     * e retorna a parametrização encontrada.
     * 
     * @method _validarJanelaHorario
     * @private
     * @param {Date} dataHora
     * @returns {Promise<Object>} Parametrização vigente.
     * @throws {BadRequestError} Se domingo (sem atendimento) ou fora da janela.
     */
    async _validarJanelaHorario(dataHora) {
        const diaSemana = dataHora.getDay(); // 0 = domingo

        if (diaSemana === 0) {
            throw new BadRequestError('Não há atendimento aos domingos');
        }

        const tipoDia = diaSemana === 6 ? 'SABADO' : 'UTIL';

        const parametrizacoes = await ParametrizacaoModel.listarAtivasPorTipoDia
            ? await ParametrizacaoModel.listarAtivasPorTipoDia(tipoDia)
            : await ParametrizacaoModel.listar(); // fallback se método específico não existir

        const parametrizacao = (Array.isArray(parametrizacoes) ? parametrizacoes : [])
            .find(p => p.des_tipo_dia === tipoDia && (p.ind_ativo === 1 || p.ind_ativo === true));

        if (!parametrizacao) {
            throw new BadRequestError(`Não há horário de atendimento configurado para ${tipoDia}`);
        }

        const horaMinuto = dataHora.toTimeString().slice(0, 8); // HH:MM:SS
        if (horaMinuto < parametrizacao.hra_inicio || horaMinuto > parametrizacao.hra_fim) {
            throw new BadRequestError(
                `Horário fora do expediente (${parametrizacao.hra_inicio} às ${parametrizacao.hra_fim})`
            );
        }

        return parametrizacao;
    }

    /**
     * Valida se as pessoas informadas possuem os papéis corretos e estão ativas.
     * Regras 2.1.
     * 
     * @method _validarPessoas
     * @private
     * @param {number} id_paciente
     * @param {number} id_costureira
     * @param {number|null} id_secretaria
     * @returns {Promise<void>}
     * @throws {BadRequestError|NotFoundError}
     */
    async _validarPessoas(id_paciente, id_costureira, id_secretaria) {
        const paciente = await PessoaModel.buscarPorId(id_paciente);

        if (!paciente || !paciente.ind_paciente || paciente.ind_status !== 'ativo') {
            throw new BadRequestError('Paciente inválido, inativo ou não encontrado');
        }

        const costureira = await PessoaModel.buscarPorId(id_costureira);

        if (!costureira || !costureira.ind_costureira || costureira.ind_status !== 'ativo') {
            throw new BadRequestError('Costureira inválida, inativa ou não encontrada');
        }

        if (id_secretaria) {

            const secretaria = await PessoaModel.buscarPorId(id_secretaria);

            if (!secretaria || !secretaria.ind_secretaria) {
                throw new BadRequestError('Secretária informada é inválida');
            }
        }

        return { paciente, costureira };
    }

    /**
     * Verifica disponibilidade de um horário para uma costureira específica.
     * Método público — reutilizável pela UI para exibir grade de horários livres.
     * 
     * @method verificarDisponibilidade
     * @async
     * @param {number} id_costureira
     * @param {string} dta_agendamento - Datetime 'YYYY-MM-DD HH:MM:SS'.
     * @returns {Promise<{disponivel: boolean, motivo?: string}>}
     */
    async verificarDisponibilidade(id_costureira, dta_agendamento) {
        try {
            const dataHora = new Date(dta_agendamento.replace(' ', 'T'));

            if (dataHora <= new Date()) {
                return {
                    disponivel: false,
                    motivo: 'Data deve ser futura'
                };
            }

            await this._validarJanelaHorario(dataHora);

            const temConflito = await AgendamentoModel.verificarConflito(id_costureira, dta_agendamento);

            if (temConflito) {
                return {
                    disponivel: false,
                    motivo: 'Costureira já possui agendamento neste horário'
                };
            }

            return {
                disponivel: true
            };
        } catch (error) {
            return {
                disponivel: false,
                motivo: error.message
            };
        }
    }

    /**
     * Cria um agendamento completo (cabeçalho + itens) de forma transacional.
     * Se qualquer item falhar (produto inexistente, preço não configurado, etc.),
     * TODO o agendamento é revertido (rollback).
     * 
     * @method criar
     * @async
     * @param {Object} dados - Corpo validado por `agendamentoSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento criado com itens.
     * @throws {BadRequestError|ConflictError}
     * 
     * @example
     * await AgendamentoService.criar({
     *   id_paciente: 1, id_costureira: 2, dta_agendamento: '2025-12-01 10:00:00',
     *   itens: [{ id_produto_grade: 5, id_produto_servico: 3, id_tipo_agendamento: 1 }]
     * }, usuarioId);
     */
    async criar(dados, usuarioLogadoId) {

        const { error, value } = validators.agendamentoSchema.validate(dados);

        if (error) {
            throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
        }

        const dataHora = new Date(value.dta_agendamento);

        const validarPessoa = await this._validarPessoas(value.id_paciente, value.id_costureira, value.id_secretaria);

        const validarHorario = await this._validarJanelaHorario(dataHora);

        const dtaFormatada = formatarDataHoraDB(dataHora)


        //const temConflito = await AgendamentoModel.verificarConflito(value.id_costureira, dtaFormatada);
        const temConflito = await this.verificarDisponibilidade(value.id_costureira, dtaFormatada);

        if (!temConflito) {
            throw new ConflictError(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
        }

        const agendamentoId = await AgendamentoModel.criar({
            ...value,
            dta_agendamento: dtaFormatada,
            des_url_externa: randomUUID()
        });

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CRIAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: agendamentoId,
            des_detalhes: {
                id_paciente: value.id_paciente,
                id_costureira: value.id_costureira,
                id_secretaria: value.id_secretaria,
                dta_agendamento: value.dta_agendamento,
                des_observacoes_geral: value.des_observacoes_geral,
                des_observacoes_costureira: value.des_observacoes_costureira
            }
        });

        const agendamento = await AgendamentoModel.buscarPorId(agendamentoId);

        return agendamento;

    };

    /**
     * Cria um agendamento completo (cabeçalho + itens) de forma transacional.
     * Se qualquer item falhar (produto inexistente, preço não configurado, etc.),
     * TODO o agendamento é revertido (rollback).
     * 
     * @method criar
     * @async
     * @param {Object} dados - Corpo validado por `agendamentoSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento criado com itens.
     * @throws {BadRequestError|ConflictError}
     * 
     * @example
     * await AgendamentoService.criar({
     *   id_paciente: 1, id_costureira: 2, dta_agendamento: '2025-12-01 10:00:00',
     *   itens: [{ id_produto_grade: 5, id_produto_servico: 3, id_tipo_agendamento: 1 }]
     * }, usuarioId);
     */
    async atualizar(id, dados, usuarioLogadoId) {

        try {
            const agendamento = await AgendamentoModel.buscarPorId(id);

            if (!agendamento) {
                throw new NotFoundError('Agendamento não encontrado')
            }

            const valores = [];

            const validarPessoa = Boolean;

            if (dados.id_paciente && dados.id_costureira && dados.id_secretaria) {
                validarPessoa = await this._validarPessoas(agendamento.id_paciente, agendamento.id_costureira, agendamento.id_secretaria);
            }

            const dataHora = new Date(dados.dta_agendamento);

            const validarHorario = await this._validarJanelaHorario(dataHora);

            if (!validarHorario) {
                throw new NotFoundError('Erro ao validar o horario');
            }


            if (dados.dta_agendamento) {
                dados.dta_agendamento = formatarDataHoraDB(dados.dta_agendamento)
            }
            if (dados.dta_confirmacao) {
                dados.dta_confirmacao = formatarDataHoraDB(dados.dta_confirmacao)
            }
            if (dados.dta_conclusao) {
                dados.dta_conclusao = formatarDataHoraDB(dados.dta_conclusao);
            }
            if (dados.dta_cancelamento) {
                dados.dta_cancelamento = formatarDataHoraDB(dados.dta_cancelamento);
            }

            // const temConflito = await AgendamentoModel.verificarConflito(dados.id_costureira || agendamento.id_costureira, dados.dta_agendamento);
            const temConflito = await this.verificarDisponibilidade(dados.id_costureira || agendamento.id_costureira, dados.dta_agendamento);

            if (!temConflito) {
                throw new ConflictError(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
            }

            const agendamentoId = await AgendamentoModel.atualizar(id, dados);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_agendamento',
                num_registro_id: agendamentoId,
                des_detalhes: {
                    id_paciente: value.id_paciente,
                    id_costureira: value.id_costureira,
                    id_secretaria: value.id_secretaria,
                    dta_agendamento: value.dta_agendamento,
                    des_observacoes_geral: value.des_observacoes_geral,
                    des_observacoes_costureira: value.des_observacoes_costureira
                }
            });



            return agendamento;
        } catch (error) {
            throw error
        }

    };

    /**
     * Cria um agendamento completo (cabeçalho + itens) de forma transacional.
     * Se qualquer item falhar (produto inexistente, preço não configurado, etc.),
     * TODO o agendamento é revertido (rollback).
     * 
     * @method criarAgendamentoCompleto
     * @async
     * @param {Object} dados - Corpo validado por `agendamentoSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento criado com itens.
     * @throws {BadRequestError|ConflictError}
     * 
     * @example
     * await AgendamentoService.criarAgendamentoCompleto({
     *   id_paciente: 1, id_costureira: 2, dta_agendamento: '2025-12-01 10:00:00',
     *   itens: [{ id_produto_grade: 5, id_produto_servico: 3, id_tipo_agendamento: 1 }]
     * }, usuarioId);
     */
    async criarAgendamentoCompleto(dados, usuarioLogadoId) {

        const { error, value } = validators.agendamentoSchema.validate(dados);

        if (error) {
            throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
        }

        const dataHora = new Date(value.dta_agendamento);

        const validarPessoa = await this._validarPessoas(value.id_paciente, value.id_costureira, value.id_secretaria);

        const validarHorario = await this._validarJanelaHorario(dataHora);

        const dtaFormatada = formatarDataHoraDB(dataHora) //.toISOString().slice(0, 19).replace('T', ' ');
        // const dtaFormatada = dataHora.toISOString().slice(0, 19).replace('T', ' ');

        const temConflito = await AgendamentoModel.verificarConflito(value.id_costureira, dtaFormatada);

        if (temConflito) {
            throw new ConflictError(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
        }

        const agendamentoId = await AgendamentoModel.criar({
            ...value,
            dta_agendamento: dtaFormatada,
            des_url_externa: randomUUID()
        });

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CRIAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: agendamentoId,
            des_detalhes: {
                id_paciente: value.id_paciente,
                id_costureira: value.id_costureira,
                id_secretaria: value.id_secretaria,
                dta_agendamento: value.dta_agendamento,
                des_observacoes_geral: value.des_observacoes_geral,
                des_observacoes_costureira: value.des_observacoes_costureira
            }
        });


        const agendamento = await CategoriaModel.buscarCategoriaPorId(agendamentoId);

        return agendamento;

    };

    /**
     * Busca um agendamento com seus itens.
     * 
     * @method buscarAgendamentoCompleto
     * @async
     * @param {number} id
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>}
     * @throws {NotFoundError}
     */
    async buscarAgendamentoCompleto(id, usuarioLogadoId) {

        const agendamento = await AgendamentoModel.buscarPorId(id);

        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }

        const itens = await ProdutoAgendamentoModel.listarPorAgendamento(id);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id,
            des_detalhes: { tipo_consulta: 'busca_por_id' }
        });

        return { ...agendamento, itens };
    }

    /**
     * Lista agendamentos com filtros.
     * 
     * @method listarAgendamentos
     * @async
     * @param {Object} filtros
     * @param {number} usuarioLogadoId
     * @returns {Promise<Array<Object>>}
     */
    async listarAgendamentos(filtros, usuarioLogadoId) {

        const agendamentos = await AgendamentoModel.listar(filtros);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.LISTAR,
            des_tabela: 'tab_agendamento',
            des_detalhes: {
                total_registros: agendamentos.length,
                filtros: filtros
            }
        });

        return agendamentos;
    }

    /**
     * Troca a costureira de um agendamento (afastamento, férias, falta).
     * Valida que a nova costureira está ativa e sem conflito de horário.
     * 
     * @method trocarCostureira
     * @async
     * @param {number} id_agendamento
     * @param {number} novoIdCostureira
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento atualizado.
     * @throws {NotFoundError|BadRequestError|ConflictError}
     */
    async trocarCostureira(id_agendamento, novoIdCostureira, des_motivo, usuarioLogadoId) {

        const agendamento = await AgendamentoModel.buscarPorId(id_agendamento);

        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }

        if (['concluido', 'cancelado'].includes(agendamento.ind_status)) {
            throw new BadRequestError('Não é possível trocar a costureira de um agendamento finalizado');
        }

        const novaCostureira = await PessoaModel.buscarPorId(novoIdCostureira);
        if (!novaCostureira || !novaCostureira.ind_costureira || novaCostureira.ind_status !== 'ativo') {
            throw new BadRequestError('Nova costureira inválida, inativa ou não encontrada');
        }

        const temConflito = await AgendamentoModel.verificarConflito(
            novoIdCostureira, agendamento.dta_agendamento, id_agendamento
        );
        if (temConflito) {
            throw new ConflictError('A nova costureira já possui agendamento neste horário');
        }

        const trocado = await AgendamentoModel.trocarCostureira(id_agendamento, novoIdCostureira);
        if (!trocado) {
            throw new Error('Erro ao trocar costureira');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.AGENDAMENTO_EDITAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id_agendamento,
            des_detalhes: {
                acao: 'troca_costureira',
                costureira_anterior: agendamento.id_costureira,
                descricao_motivo: des_motivo,
                costureira_nova: novoIdCostureira
            }
        });

        return this.buscarAgendamentoCompleto(id_agendamento, usuarioLogadoId);
    }

    /**
     * Altera o status do agendamento respeitando a máquina de estados:
     * agendado -> confirmado -> concluido/cancelado/falta.
     * Regra de cancelamento: não permite cancelar com menos de 2h de antecedência.
     * 
     * @method alterarStatus
     * @async
     * @param {number} id
     * @param {string} novoStatus
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento atualizado.
     * @throws {NotFoundError|BadRequestError}
     */
    async alterarStatus(id, novoStatus, usuarioLogadoId) {

        const valoresValidos = Object.values(STATUS_AGENDAMENTO);

        if (!valoresValidos.includes(novoStatus)) {
            throw new BadRequestError(`Status inválido. Valores aceitos: ${valoresValidos.join(', ')}`);
        }

        const agendamento = await AgendamentoModel.buscarPorId(id);

        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }

        const transicoesPermitidas = TRANSICOES_PERMITIDAS[agendamento.ind_status] || [];

        if (!transicoesPermitidas.includes(novoStatus)) {
            throw new BadRequestError(
                `Não é possível mudar de '${agendamento.ind_status}' para '${novoStatus}'`
            );
        }

        if (novoStatus === 'cancelado') {
            const duasHorasAntes = new Date(Date.now() + 2 * 60 * 60 * 1000);
            if (new Date(agendamento.dta_agendamento) < duasHorasAntes) {
                throw new BadRequestError(MENSAGENS.ERRO.PRAZO_CANCELAMENTO);
            }
        }

        const atualizado = await AgendamentoModel.atualizarStatus(id, novoStatus);

        if (!atualizado) {
            throw new Error('Erro ao atualizar status do agendamento');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: novoStatus === 'cancelado' ? ACOES_LOG.AGENDAMENTO_CANCELAR : ACOES_LOG.AGENDAMENTO_EDITAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id,
            des_detalhes: {
                status_anterior: agendamento.ind_status,
                status_novo: novoStatus
            }
        });

        return this.buscarAgendamentoCompleto(id, usuarioLogadoId);
    }

    /**
     * Deleta (soft delete) um agendamento.
     * 
     * @method deletarAgendamento
     * @async
     * @param {number} id
     * @param {number} usuarioLogadoId
     * @returns {Promise<boolean>}
     */
    async deletarAgendamento(id, usuarioLogadoId) {

        const agendamento = await AgendamentoModel.buscarPorId(id);

        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }

        const deletado = await AgendamentoModel.deletar(id);

        if (!deletado) {
            throw new Error('Erro ao deletar agendamento');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.DELETAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id,
            des_detalhes: {
                id_paciente: agendamento.id_paciente,
                nom_paciente: agendamento.nom_paciente,
                id_costureira: agendamento.id_costureira,
                nom_costureira: agendamento.nom_costureira,
                id_secretaria: agendamento.id_secretaria,
                id_costureira: agendamento.id_costureira,
                nom_costureira: agendamento.nom_costureira,
                ind_status: agendamento.ind_status,
                dta_agendamento: agendamento.dta_agendamento,
                dta_cancelamento: agendamento.dta_cancelamento,
                dta_conclusao: agendamento.dta_conclusao,
                dta_confirmacao: agendamento.dta_confirmacao,
                num_celular_paciente: agendamento.num_celular_paciente,
                val_cor_costureira: agendamento.val_cor_costureira,
                created_at: agendamento.created_at,
                updated_at: agendamento.updated_at,
                deleted_at: agendamento.deleted_at
            }
        });

        return true;
    }

    /**
     * Cria agendamento a partir do fluxo PÚBLICO (sem autenticação).
     * Diferenças do fluxo interno:
     * - Não cria paciente: localiza por CPF, exige cadastro prévio.
     * - Único item por agendamento.
     * - Sem id_secretaria.
     * 
     * @method criarAgendamentoPublico
     * @async
     * @param {Object} dados - Corpo validado por `publicAgendamentoSchema`.
     * @returns {Promise<Object>} Agendamento criado (dados mínimos + UUID público).
     * @throws {NotFoundError} Se o CPF não estiver cadastrado como paciente.
     * @throws {BadRequestError|ConflictError}
     */
    async criarAgendamentoPublico(dados) {
        const { error, value } = validators.publicAgendamentoSchema.validate(dados);
        if (error) {
            throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
        }

        const paciente = await PessoaModel.buscarPorCpf(value.num_cpf);
        if (!paciente || !paciente.ind_paciente || paciente.ind_status !== 'ativo') {
            throw new NotFoundError(
                'CPF não encontrado em nosso cadastro. Entre em contato com a clínica para se cadastrar antes de agendar.'
            );
        }

        const resultado = await this.criarAgendamentoCompleto({
            id_paciente: paciente.id,
            id_costureira: value.id_costureira,
            dta_agendamento: value.dta_agendamento,
            des_observacoes_geral: value.des_observacoes_geral,
            itens: [value.item]
        }, paciente.id); // usuarioLogadoId = próprio paciente, para fins de auditoria

        // Retorno reduzido: rota pública não deve expor dados internos completos
        return {
            id: resultado.id,
            des_url_externa: resultado.des_url_externa,
            dta_agendamento: resultado.dta_agendamento,
            ind_status: resultado.ind_status,
            nom_costureira: resultado.nom_costureira
        };
    }

    /**
     * Busca agendamento pelo UUID público — usado por link enviado via WhatsApp.
     * Não registra log (rota anônima, sem usuarioLogadoId confiável) e retorna
     * apenas dados mínimos, sem expor tabela interna completa.
     * 
     * @method buscarPorUuidPublico
     * @async
     * @param {string} uuid
     * @returns {Promise<Object>}
     * @throws {NotFoundError}
     */
    async buscarPorUuidPublico(uuid) {

        const agendamento = await AgendamentoModel.buscarPorUuid(uuid);

        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }

        return agendamento;
    }

}

module.exports = new AgendamentoService();
