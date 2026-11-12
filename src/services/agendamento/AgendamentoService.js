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
 * @requires ../../utils/acessoAgendamento
 */
const { randomUUID } = require('crypto');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const ProdutoAgendamentoModel = require('../../models/agendamento/AgendamentoProdutoModel');
const ParametrizacaoModel = require('../../models/sistema/ParametrizacaoModel');
const PessoaModel = require('../../models/PessoaModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS, STATUS_AGENDAMENTO, EVENTOS_EMAIL, PAPEIS_PESSOA, STATUS_AGENDAMENTO_FINALIZADOS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError } = require('../../utils/ApiError');
const { formatarDataHoraDB } = require('../../utils/formatters');
const EmailOutboxService = require('../email/EmailOutboxService');
const { garantirAcessoAgendamento, restritoAosProprios } = require('../../utils/acessoAgendamento');

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

const EVENTO_POR_STATUS = {
    [STATUS_AGENDAMENTO.CONCLUIDO]: EVENTOS_EMAIL.CONCLUIDO,
    [STATUS_AGENDAMENTO.CANCELADO]: EVENTOS_EMAIL.CANCELADO
};

class AgendamentoService {

    _diff(atual, novos) {
        return Object.fromEntries(Object.keys(novos).map((k) => [k, atual[k]]));
    }

    /**
     * Indica se o usuário só pode ver os próprios agendamentos (costureira sem papel amplo).
     *
     * @method _restritoAosProprios
     * @memberof AgendamentoService
     * @private
     * @param {Object} usuario - req.usuario.
     * @returns {boolean}
     */
    _restritoAosProprios(usuario) {
        const papeis = usuario?.papeis || [];
        const amplos = [PAPEIS_PESSOA.ADMINISTRADOR, PAPEIS_PESSOA.SECRETARIA, PAPEIS_PESSOA.MEDICO];
        return papeis.includes(PAPEIS_PESSOA.COSTUREIRA) && !papeis.some((p) => amplos.includes(p));
    }

    /**
     * Valida a secretária informada (papel + ativa). Antes era chamado mas não existia.
     *
     * @method _validarSecretaria
     * @memberof AgendamentoService
     * @private
     * @async
     * @param {number} idSecretaria
     * @returns {Promise<void>}
     * @throws {BadRequestError}
     */
    async _validarSecretaria(idSecretaria) {
        const secretaria = await PessoaModel.buscarPorId(idSecretaria);
        if (!secretaria || !secretaria.ind_secretaria || secretaria.ind_status !== 'ativo') {
            throw new BadRequestError('Secretária informada é inválida ou inativa');
        }
    }

    /**
     * Valida dia/horário contra a parametrização ativa.
     * Depende de TZ=America/Sao_Paulo no processo (ver docker-compose) para
     * que getDay()/getHours() reflitam o horário local da clínica.
     *
     * @method _validarJanelaHorario
     * @memberof AgendamentoService
     * @private
     * @async
     * @param {Date} dataHora
     * @returns {Promise<Object>} Parametrização vigente.
     * @throws {BadRequestError} Domingo, sem configuração ou fora da janela.
     */
    async _validarJanelaHorario(dataHora) {
        const diaSemana = dataHora.getDay();
        if (diaSemana === 0) throw new BadRequestError('Não há atendimento aos domingos');

        const tipoDia = diaSemana === 6 ? 'SABADO' : 'UTIL';
        const parametrizacoes = await ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo(tipoDia);
        const parametrizacao = [parametrizacoes].find((p) => Boolean(p.ind_ativo));

        if (!parametrizacao) throw new BadRequestError(`Não há horário de atendimento configurado para ${tipoDia}`);

        const hora = formatarDataHoraDB(dataHora).slice(11, 19); // HH:MM:SS sem depender de toTimeString
        if (hora < parametrizacao.hra_inicio || hora > parametrizacao.hra_fim) {
            throw new BadRequestError(`Horário fora do expediente (${parametrizacao.hra_inicio} às ${parametrizacao.hra_fim})`);
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
        const dataHora = new Date(String(dta_agendamento).replace(' ', 'T'));
        if (Number.isNaN(dataHora.getTime())) return {
            disponivel: false,
            motivo: 'Data inválida'
        };

        if (dataHora <= new Date()) return {
            disponivel: false,
            motivo: 'Data deve ser futura'
        };

        try {
            await this._validarJanelaHorario(dataHora);
        } catch (err) {
            if (err instanceof BadRequestError) return { disponivel: false, motivo: err.message };
            throw err; // erro de infra sobe para o errorMiddleware (500 + log)
        }

        const conflito = await AgendamentoModel.verificarConflito(id_costureira, formatarDataHoraDB(dataHora));
        return conflito
            ? { disponivel: false, motivo: 'Costureira já possui agendamento neste horário' }
            : { disponivel: true };
    }


    /**
     * Cria o cabeçalho do agendamento. Itens são adicionados depois via
     * POST /api/agendamentos/:idAgendamento/itens (AgendamentoProdutoService).
     *
     * @method criar
     * @memberof AgendamentoService
     * @async
     * @param {Object} dados - Validado por `agendamentoSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento criado.
     * @throws {BadRequestError|ConflictError}
     *
     * @example
     * await AgendamentoService.criar({ id_paciente: 1, id_costureira: 2, dta_agendamento: '2026-12-01 10:00:00' }, 1);
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

        await EmailOutboxService.enfileirarEventoAgendamento(EVENTOS_EMAIL.CADASTRADO, agendamentoId);

        const agendamento = await AgendamentoModel.buscarPorId(agendamentoId);

        return agendamento;

    };

    /**
     * Atualiza os dados gerais do agendamento (data, secretária e observações).
     * Revalida a janela de horário e o conflito somente se a data mudar.
     *
     * @method atualizar
     * @memberof AgendamentoService
     * @async
     * @param {number} id - ID do agendamento.
     * @param {Object} dados - Validado por `agendamentoUpdateSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Agendamento atualizado com itens.
     * @throws {BadRequestError|NotFoundError|ConflictError}
     *
     * @example
     * await AgendamentoService.atualizar(10, { des_observacoes_geral: 'Trazer peça' }, 1);
     */
    async atualizar(id, dados, usuarioLogadoId) {
        const { error, value } = validators.agendamentoUpdateSchema.validate(dados, { stripUnknown: true });

        if (error) throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);

        const atual = await AgendamentoModel.buscarPorId(id);

        if (!atual) throw new NotFoundError('Agendamento não encontrado');

        if (STATUS_AGENDAMENTO_FINALIZADOS.includes(atual.ind_status)) {
            throw new BadRequestError('Agendamento finalizado não pode ser editado');
        }

        // Só revalida horário/conflito se a data mudou
        if (value.dta_agendamento) {
            const dataHora = new Date(value.dta_agendamento);
            await this._validarJanelaHorario(dataHora);
            value.dta_agendamento = formatarDataHoraDB(dataHora);

            const conflito = await AgendamentoModel.verificarConflito(atual.id_costureira, value.dta_agendamento, id);
            if (conflito) throw new ConflictError(MENSAGENS.ERRO.COSTUREIRA_OCUPADA);
        }

        if (value.id_secretaria) await this._validarSecretaria(value.id_secretaria);

        await AgendamentoModel.atualizar(id, value);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.AGENDAMENTO_EDITAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id,
            des_detalhes: {
                antes: this._diff(atual, value),
                depois: value
            }
        });

        return this.buscarAgendamentoCompleto(id, { id: usuarioLogadoId });
    }

    /**
     * Busca agendamento com itens respeitando escopo da costureira.
     *
     * @method buscarAgendamentoCompleto
     * @memberof AgendamentoService
     * @async
     * @param {number} id
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>}
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * await AgendamentoService.buscarAgendamentoCompleto(10, req.usuario);
     */
    async buscarAgendamentoCompleto(id, usuario) {
        const agendamento = await AgendamentoModel.buscarPorId(id);
        if (!agendamento) throw new NotFoundError('Agendamento não encontrado');

        garantirAcessoAgendamento(usuario, agendamento);
        const itens = await ProdutoAgendamentoModel.listarPorAgendamento(id);
        return { ...agendamento, itens };
    }

    /**
     * Lista agendamentos paginados. Costureira recebe filtro forçado pelo próprio ID.
     *
     * @method listarAgendamentos
     * @memberof AgendamentoService
     * @async
     * @param {Object} filtros - Query string.
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<{dados: Array<Object>, total: number}>}
     * @throws {BadRequestError}
     *
     * @example
     * const { dados, total } = await AgendamentoService.listarAgendamentos({ pagina: 1 }, req.usuario);
     */
    async listarAgendamentos(filtros, usuario) {

        const { error, value } = validators.filtroAgendamentoSchema.validate(filtros, { stripUnknown: true });

        if (error) throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);

        if (restritoAosProprios(usuario)) value.id_costureira = usuario.id;

        const [dados, total] = await Promise.all([AgendamentoModel.listar(value), AgendamentoModel.contar(value)]);

        return { dados, total };
    }

    /**
     * Troca a costureira (bloqueada para qualquer status finalizado, inclusive 'falta').
     *
     * @method trocarCostureira
     * @memberof AgendamentoService
     * @async
     * @param {number} idAgendamento
     * @param {number} novoIdCostureira
     * @param {string} [desMotivo]
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>}
     * @throws {NotFoundError|BadRequestError|ConflictError}
     *
     * @example
     * await AgendamentoService.trocarCostureira(10, 5, 'férias', req.usuario);
     */
    async trocarCostureira(idAgendamento, novoIdCostureira, desMotivo, usuario) {
        const agendamento = await AgendamentoModel.buscarPorId(idAgendamento);
        if (!agendamento) throw new NotFoundError('Agendamento não encontrado');

        if (STATUS_AGENDAMENTO_FINALIZADOS.includes(agendamento.ind_status)) {
            throw new BadRequestError('Não é possível trocar a costureira de um agendamento finalizado');
        }

        const nova = await PessoaModel.buscarPorId(novoIdCostureira);
        if (!nova || !nova.ind_costureira || nova.ind_status !== 'ativo') {
            throw new BadRequestError('Nova costureira inválida, inativa ou não encontrada');
        }

        // Pré-checagem para mensagem amigável; a UNIQUE uq_agenda_costureira_slot é a garantia final (409).
        if (await AgendamentoModel.verificarConflito(novoIdCostureira, agendamento.dta_agendamento, idAgendamento)) {
            throw new ConflictError('A nova costureira já possui agendamento neste horário');
        }

        await AgendamentoModel.trocarCostureira(idAgendamento, novoIdCostureira);

        await LogService.registrar({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.AGENDAMENTO_EDITAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: idAgendamento,
            des_detalhes: {
                acao: 'troca_costureira',
                costureira_anterior: agendamento.id_costureira,
                costureira_nova: novoIdCostureira,
                descricao_motivo: String(desMotivo || '').slice(0, 500)
            }
        });

        return this.buscarAgendamentoCompleto(idAgendamento, usuario);
    }

    /**
     * Altera o status respeitando máquina de estados, escopo da costureira,
     * prazo de cancelamento (2h) e concorrência (lock otimista → 409).
     *
     * @method alterarStatus
     * @memberof AgendamentoService
     * @async
     * @param {number} id
     * @param {string} novoStatus
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>} Agendamento atualizado.
     * @throws {BadRequestError|NotFoundError|ForbiddenError|ConflictError}
     *
     * @example
     * await AgendamentoService.alterarStatus(10, 'concluido', req.usuario);
     */
    async alterarStatus(id, novoStatus, usuario) {
        const validos = Object.values(STATUS_AGENDAMENTO);
        if (!validos.includes(novoStatus)) {
            throw new BadRequestError(`Status inválido. Valores aceitos: ${validos.join(', ')}`);
        }

        const agendamento = await AgendamentoModel.buscarPorId(id);
        if (!agendamento) throw new NotFoundError('Agendamento não encontrado');

        garantirAcessoAgendamento(usuario, agendamento);

        if (!(TRANSICOES_PERMITIDAS[agendamento.ind_status] || []).includes(novoStatus)) {
            throw new BadRequestError(`Não é possível mudar de '${agendamento.ind_status}' para '${novoStatus}'`);
        }

        if (novoStatus === STATUS_AGENDAMENTO.CANCELADO
            && new Date(agendamento.dta_agendamento) < new Date(Date.now() + 2 * 60 * 60 * 1000)) {
            throw new BadRequestError(MENSAGENS.ERRO.PRAZO_CANCELAMENTO);
        }

        const atualizado = await AgendamentoModel.atualizarStatus(id, agendamento.ind_status, novoStatus);
        if (!atualizado) {
            throw new ConflictError('O agendamento foi alterado por outro usuário. Recarregue e tente novamente.');
        }

        await LogService.registrar({
            id_usuario: usuario.id,
            des_acao: novoStatus === STATUS_AGENDAMENTO.CANCELADO ? ACOES_LOG.AGENDAMENTO_CANCELAR : ACOES_LOG.AGENDAMENTO_EDITAR,
            des_tabela: 'tab_agendamento',
            num_registro_id: id,
            des_detalhes: { status_anterior: agendamento.ind_status, status_novo: novoStatus }
        });

        if (EVENTO_POR_STATUS[novoStatus]) {
            await EmailOutboxService.enfileirarEventoAgendamento(EVENTO_POR_STATUS[novoStatus], id);
        }

        return this.buscarAgendamentoCompleto(id, usuario);
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
                id_secretaria: agendamento.id_secretaria,
                nom_costureira: agendamento.nom_costureira,
                ind_status: agendamento.ind_status,
                dta_agendamento: agendamento.dta_agendamento,
                dta_cancelamento: agendamento.dta_cancelamento,
                dta_conclusao: agendamento.dta_conclusao,
                dta_confirmacao: agendamento.dta_confirmacao,
                created_at: agendamento.created_at,
                updated_at: agendamento.updated_at,
            }
        });

        return true;
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
    };

    /**
     * Cria agendamento a partir do fluxo PÚBLICO (sem autenticação).
     * Reutiliza `criar` (validação, conflito, auditoria e e-mail de cadastro).
     *
     * @method criarAgendamentoPublico
     * @async
     * @param {Object} dados - { num_cpf, id_costureira, dta_agendamento, des_observacoes_geral? }
     * @returns {Promise<Object>} Dados mínimos + UUID público.
     * @throws {NotFoundError|BadRequestError|ConflictError}
     */
    async criarAgendamentoPublico(dados) {
        const { error, value } = validators.publicAgendamentoSchema.validate(dados);
        if (error) {
            throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
        }

        const paciente = await PessoaModel.buscarPorCpf(value.num_cpf);
        if (!paciente || !paciente.ind_paciente || paciente.ind_status !== 'ativo') {
            // Mensagem neutra: não confirma se o CPF existe (anti-enumeração/LGPD).
            throw new BadRequestError('Não foi possível concluir o agendamento. Entre em contato com a clínica.');
        }

        // Auditoria: o próprio paciente é o autor
        const resultado = await this.criar({
            id_paciente: paciente.id,
            id_costureira: value.id_costureira,
            dta_agendamento: value.dta_agendamento,
            des_observacoes_geral: value.des_observacoes_geral
        }, paciente.id);

        // Retorno reduzido (LGPD)
        return {
            id: resultado.id,
            des_url_externa: resultado.des_url_externa,
            dta_agendamento: resultado.dta_agendamento,
            ind_status: resultado.ind_status,
            nom_costureira: resultado.nom_costureira
        };
    }

}

module.exports = new AgendamentoService();
