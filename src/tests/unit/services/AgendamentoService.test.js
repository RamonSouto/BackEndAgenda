// src/tests/unit/services/AgendamentoService.test.js
jest.mock('../../../models/agendamento/AgendamentoModel');
jest.mock('../../../models/agendamento/AgendamentoProdutoModel');
jest.mock('../../../models/sistema/ParametrizacaoModel');
jest.mock('../../../models/PessoaModel');
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../services/email/EmailOutboxService', () => ({ enfileirarEventoAgendamento: jest.fn() }));
jest.mock('../../../utils/validators', () => {
    const ok = () => ({ validate: jest.fn((d) => ({ value: { ...d } })) });
    return {
        agendamentoSchema: ok(), agendamentoUpdateSchema: ok(),
        filtroAgendamentoSchema: ok(), publicAgendamentoSchema: ok()
    };
});

const AgendamentoModel = require('../../../models/agendamento/AgendamentoModel');
const ItemModel = require('../../../models/agendamento/AgendamentoProdutoModel');
const ParametrizacaoModel = require('../../../models/sistema/ParametrizacaoModel');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
const EmailOutbox = require('../../../services/email/EmailOutboxService');
const validators = require('../../../utils/validators');
const Service = require('../../../services/agendamento/AgendamentoService');
const { BadRequestError, NotFoundError, ConflictError, ForbiddenError } = require('../../../utils/ApiError');
const { usuarios, agendamento } = require('../../helpers/factories');

const SEGUNDA_10H = '2030-01-07 10:00:00';
const PARAM = { ind_ativo: 1, hra_inicio: '08:00:00', hra_fim: '18:00:00' };
const pessoa = (over) => ({ id: 1, ind_status: 'ativo', ...over });
const erroJoi = { error: { details: [{ message: 'x' }] } };

beforeEach(() => {
    jest.clearAllMocks();
    ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo = jest.fn().mockResolvedValue([PARAM]);
    PessoaModel.buscarPorId = jest.fn((id) => Promise.resolve({
        5: pessoa({ id: 5, ind_paciente: 1 }),
        3: pessoa({ id: 3, ind_costureira: 1 }),
        2: pessoa({ id: 2, ind_secretaria: 1 })
    }[id] || null));
    AgendamentoModel.verificarConflito = jest.fn().mockResolvedValue(false);
    AgendamentoModel.criar = jest.fn().mockResolvedValue(10);
    AgendamentoModel.buscarPorId = jest.fn().mockResolvedValue(agendamento());
    AgendamentoModel.atualizarStatus = jest.fn().mockResolvedValue(true);
    AgendamentoModel.atualizar = jest.fn().mockResolvedValue(true);
    ItemModel.listarPorAgendamento = jest.fn().mockResolvedValue([]);
});

describe('AgendamentoService – helpers privados', () => {
    it.each([
        [undefined, false], [{}, false],
        [{ papeis: ['costureira'] }, true],
        [{ papeis: ['costureira', 'administrador'] }, false],
        [{ papeis: ['secretaria'] }, false]
    ])('_restritoAosProprios(%j) → %s', (u, esperado) => {
        expect(Service._restritoAosProprios(u)).toBe(esperado);
    });

    it.each([
        [null],
        [pessoa({ ind_secretaria: 0 })],
        [pessoa({ ind_secretaria: 1, ind_status: 'inativo' })]
    ])('_validarSecretaria rejeita %j', async (s) => {
        PessoaModel.buscarPorId.mockResolvedValueOnce(s);
        await expect(Service._validarSecretaria(9)).rejects.toThrow('Secretária informada é inválida ou inativa');
    });

    it('_validarSecretaria aceita secretária ativa', async () => {
        await expect(Service._validarSecretaria(2)).resolves.toBeUndefined();
    });

    it('_validarPessoas retorna paciente e costureira', async () => {
        await expect(Service._validarPessoas(5, 3, 2)).resolves.toEqual({
            paciente: expect.objectContaining({ id: 5 }), costureira: expect.objectContaining({ id: 3 })
        });
    });

    // BUG: o Model retorna objeto|null, mas o Service chama .find()
    it.failing('_validarJanelaHorario aceita o retorno real do Model (objeto)', async () => {
        ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo.mockResolvedValue(PARAM);
        await expect(Service._validarJanelaHorario(new Date('2030-01-07T10:00:00'))).resolves.toEqual(PARAM);
    });
});

describe('AgendamentoService.verificarDisponibilidade', () => {
    it.each([
        ['data inválida', 'abc', 'Data inválida'],
        ['data passada', '2000-01-01 10:00:00', 'Data deve ser futura'],
        ['domingo', '2030-01-06 10:00:00', 'Não há atendimento aos domingos']
    ])('%s → indisponível', async (_, data, motivo) => {
        await expect(Service.verificarDisponibilidade(3, data)).resolves.toEqual({ disponivel: false, motivo });
    });

    it.each(['08:00:00', '18:00:00'])('limite do expediente %s → disponível', async (h) => {
        await expect(Service.verificarDisponibilidade(3, `2030-01-07 ${h}`)).resolves.toEqual({ disponivel: true });
    });

    it.each(['07:59:59', '18:00:01'])('fora do expediente %s → indisponível', async (h) => {
        const r = await Service.verificarDisponibilidade(3, `2030-01-07 ${h}`);
        expect(r.disponivel).toBe(false);
        expect(r.motivo).toMatch(/fora do expediente/);
    });

    it('sábado consulta parametrização SABADO', async () => {
        await Service.verificarDisponibilidade(3, '2030-01-05 10:00:00');
        expect(ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo).toHaveBeenCalledWith('SABADO');
    });

    it('sem parametrização ativa → indisponível', async () => {
        ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo.mockResolvedValue([{ ind_ativo: 0 }]);
        const r = await Service.verificarDisponibilidade(3, SEGUNDA_10H);
        expect(r.motivo).toMatch(/Não há horário de atendimento configurado/);
    });

    it('conflito → indisponível', async () => {
        AgendamentoModel.verificarConflito.mockResolvedValue(true);
        await expect(Service.verificarDisponibilidade(3, SEGUNDA_10H))
            .resolves.toEqual({ disponivel: false, motivo: 'Costureira já possui agendamento neste horário' });
    });

    it('erro de infraestrutura é propagado', async () => {
        ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo.mockRejectedValue(new Error('db down'));
        await expect(Service.verificarDisponibilidade(3, SEGUNDA_10H)).rejects.toThrow('db down');
    });
});

describe('AgendamentoService.criar', () => {
    const dados = { id_paciente: 5, id_costureira: 3, dta_agendamento: SEGUNDA_10H };

    it('happy path: cria, audita, enfileira e-mail e retorna o agendamento', async () => {
        const r = await Service.criar(dados, 2);
        expect(AgendamentoModel.criar).toHaveBeenCalledWith(expect.objectContaining({
            dta_agendamento: SEGUNDA_10H,
            des_url_externa: expect.stringMatching(/^[0-9a-f-]{36}$/)
        }));
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ id_usuario: 2, num_registro_id: 10 }));
        expect(EmailOutbox.enfileirarEventoAgendamento).toHaveBeenCalledWith('agendamento_cadastrado', 10);
        expect(r.id).toBe(10);
    });

    it('erro de validação Joi → BadRequest', async () => {
        validators.agendamentoSchema.validate.mockReturnValueOnce(erroJoi);
        await expect(Service.criar({}, 1)).rejects.toThrow(BadRequestError);
    });

    it.each([
        ['paciente inexistente', { id_paciente: 999 }, /Paciente/],
        ['paciente sem papel', { id_paciente: 3 }, /Paciente/],
        ['costureira inexistente', { id_costureira: 999 }, /Costureira/],
        ['costureira sem papel', { id_costureira: 5 }, /Costureira/],
        ['secretária inexistente', { id_secretaria: 999 }, /Secretária/],
        ['secretária inválida', { id_secretaria: 5 }, /Secretária/]
    ])('%s → BadRequest', async (_, over, msg) => {
        await expect(Service.criar({ ...dados, ...over }, 1)).rejects.toThrow(msg);
        expect(AgendamentoModel.criar).not.toHaveBeenCalled();
    });

    it.each([
        ['paciente', pessoa({ ind_paciente: 1, ind_status: 'inativo' }), /Paciente/],
        ['costureira', pessoa({ ind_costureira: 1, ind_status: 'inativo' }), /Costureira/]
    ])('%s inativa → BadRequest', async (papel, p, msg) => {
        if (papel === 'costureira') PessoaModel.buscarPorId.mockResolvedValueOnce(pessoa({ ind_paciente: 1 }));
        PessoaModel.buscarPorId.mockResolvedValueOnce(p);
        await expect(Service.criar(dados, 1)).rejects.toThrow(msg);
    });

    it('domingo → BadRequest', async () => {
        await expect(Service.criar({ ...dados, dta_agendamento: '2030-01-06 10:00:00' }, 1)).rejects.toThrow(/domingos/);
    });

    it('horário ocupado → Conflict e não envia e-mail', async () => {
        AgendamentoModel.verificarConflito.mockResolvedValue(true);
        await expect(Service.criar(dados, 1)).rejects.toThrow(ConflictError);
        expect(EmailOutbox.enfileirarEventoAgendamento).not.toHaveBeenCalled();
    });
});

describe('AgendamentoService.atualizar', () => {
    it('erro de validação → BadRequest', async () => {
        validators.agendamentoUpdateSchema.validate.mockReturnValueOnce(erroJoi);
        await expect(Service.atualizar(10, {}, 1)).rejects.toThrow(BadRequestError);
    });

    it('não encontrado → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.atualizar(1, {}, 1)).rejects.toThrow(NotFoundError);
    });

    it.each(['concluido', 'cancelado', 'falta'])('status %s finalizado → BadRequest', async (s) => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: s }));
        await expect(Service.atualizar(10, { des_observacoes_geral: 'x' }, 1)).rejects.toThrow(/finalizado/);
    });

    it('nova data em conflito (ignorando o próprio id) → 409', async () => {
        AgendamentoModel.verificarConflito.mockResolvedValue(true);
        await expect(Service.atualizar(10, { dta_agendamento: SEGUNDA_10H }, 1)).rejects.toThrow(ConflictError);
        expect(AgendamentoModel.verificarConflito).toHaveBeenCalledWith(3, SEGUNDA_10H, 10);
    });

    it('nova data livre é formatada e persistida', async () => {
        await Service.atualizar(10, { dta_agendamento: SEGUNDA_10H }, 1);
        expect(AgendamentoModel.atualizar).toHaveBeenCalledWith(10, { dta_agendamento: SEGUNDA_10H });
    });

    it('secretária inválida → BadRequest e não persiste', async () => {
        await expect(Service.atualizar(10, { id_secretaria: 5 }, 1)).rejects.toThrow(/Secretária/);
        expect(AgendamentoModel.atualizar).not.toHaveBeenCalled();
    });

    it('secretária válida → persiste', async () => {
        await Service.atualizar(10, { id_secretaria: 2 }, 1);
        expect(AgendamentoModel.atualizar).toHaveBeenCalledWith(10, { id_secretaria: 2 });
    });

    it('sem data não revalida horário', async () => {
        await Service.atualizar(10, { des_observacoes_geral: 'x' }, 1);
        expect(ParametrizacaoModel.buscarParametrizacaoPorTipoAtivo).not.toHaveBeenCalled();
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_detalhes: { antes: { des_observacoes_geral: undefined }, depois: { des_observacoes_geral: 'x' } }
        }));
    });
});

describe('AgendamentoService.listarAgendamentos', () => {
    beforeEach(() => {
        AgendamentoModel.listar = jest.fn().mockResolvedValue([{ id: 1 }]);
        AgendamentoModel.contar = jest.fn().mockResolvedValue(1);
    });

    it('erro de validação → BadRequest', async () => {
        validators.filtroAgendamentoSchema.validate.mockReturnValueOnce(erroJoi);
        await expect(Service.listarAgendamentos({}, usuarios.admin)).rejects.toThrow(BadRequestError);
    });

    it('costureira recebe filtro forçado pelo próprio id (ignora o enviado)', async () => {
        await Service.listarAgendamentos({ id_costureira: 99 }, usuarios.costureira);
        expect(AgendamentoModel.listar).toHaveBeenCalledWith({ id_costureira: 3 });
    });

    it('admin respeita o filtro enviado', async () => {
        await expect(Service.listarAgendamentos({ id_costureira: 99 }, usuarios.admin))
            .resolves.toEqual({ dados: [{ id: 1 }], total: 1 });
        expect(AgendamentoModel.listar).toHaveBeenCalledWith({ id_costureira: 99 });
    });
});

describe('AgendamentoService.buscarAgendamentoCompleto', () => {
    it('retorna agendamento com itens', async () => {
        ItemModel.listarPorAgendamento.mockResolvedValue([{ id: 1 }]);
        await expect(Service.buscarAgendamentoCompleto(10, usuarios.admin)).resolves.toMatchObject({ id: 10, itens: [{ id: 1 }] });
    });
    it('não encontrado → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.buscarAgendamentoCompleto(10, usuarios.admin)).rejects.toThrow(NotFoundError);
    });
    it('costureira de outro agendamento → 403', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ id_costureira: 99 }));
        await expect(Service.buscarAgendamentoCompleto(10, usuarios.costureira)).rejects.toThrow(ForbiddenError);
    });
});

describe('AgendamentoService.trocarCostureira', () => {
    beforeEach(() => { AgendamentoModel.trocarCostureira = jest.fn().mockResolvedValue(true); });

    it('happy path com motivo truncado em 500 chars', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoa({ id: 7, ind_costureira: 1 }));
        await Service.trocarCostureira(10, 7, 'x'.repeat(600), usuarios.secretaria);
        expect(AgendamentoModel.trocarCostureira).toHaveBeenCalledWith(10, 7);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.descricao_motivo).toHaveLength(500);
    });

    it('motivo ausente vira string vazia', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoa({ id: 7, ind_costureira: 1 }));
        await Service.trocarCostureira(10, 7, undefined, usuarios.admin);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.descricao_motivo).toBe('');
    });

    it('não encontrado → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.trocarCostureira(10, 7, '', usuarios.admin)).rejects.toThrow(NotFoundError);
    });

    it('agendamento finalizado → BadRequest', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: 'falta' }));
        await expect(Service.trocarCostureira(10, 7, '', usuarios.admin)).rejects.toThrow(BadRequestError);
    });

    it.each([
        ['inexistente', 999],
        ['sem papel', 5]
    ])('nova costureira %s → BadRequest', async (_, id) => {
        await expect(Service.trocarCostureira(10, id, '', usuarios.admin)).rejects.toThrow(/Nova costureira/);
    });

    it('nova costureira inativa → BadRequest', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoa({ ind_costureira: 1, ind_status: 'inativo' }));
        await expect(Service.trocarCostureira(10, 7, '', usuarios.admin)).rejects.toThrow(/Nova costureira/);
    });

    it('nova costureira ocupada → Conflict', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoa({ ind_costureira: 1 }));
        AgendamentoModel.verificarConflito.mockResolvedValue(true);
        await expect(Service.trocarCostureira(10, 7, '', usuarios.admin)).rejects.toThrow(ConflictError);
    });
});

describe('AgendamentoService.alterarStatus', () => {
    it('status fora do enum → BadRequest', async () => {
        await expect(Service.alterarStatus(10, 'xpto', usuarios.admin)).rejects.toThrow(/Status inválido/);
    });

    it('não encontrado → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.alterarStatus(10, 'confirmado', usuarios.admin)).rejects.toThrow(NotFoundError);
    });

    it('costureira alheia → 403', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ id_costureira: 99 }));
        await expect(Service.alterarStatus(10, 'confirmado', usuarios.costureira)).rejects.toThrow(ForbiddenError);
    });

    it('status atual fora da máquina usa fallback []', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: 'xpto' }));
        await expect(Service.alterarStatus(10, 'confirmado', usuarios.admin)).rejects.toThrow("de 'xpto'");
    });

    it.each([
        ['agendado', 'concluido'], ['agendado', 'agendado'],
        ['concluido', 'cancelado'], ['cancelado', 'confirmado'], ['falta', 'concluido']
    ])('transição inválida %s → %s', async (de, para) => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: de }));
        await expect(Service.alterarStatus(10, para, usuarios.admin)).rejects.toThrow(/Não é possível mudar/);
    });

    describe('prazo de cancelamento (2h)', () => {
        const em = (ms) => new Date(Date.now() + ms);
        it('1h59 antes → bloqueado', async () => {
            AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ dta_agendamento: em(119 * 60e3) }));
            await expect(Service.alterarStatus(10, 'cancelado', usuarios.admin)).rejects.toThrow(/2 horas/);
        });
        it('2h01 antes → permitido e envia e-mail de cancelamento', async () => {
            AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ dta_agendamento: em(121 * 60e3) }));
            await Service.alterarStatus(10, 'cancelado', usuarios.admin);
            expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'agendamento_cancelar' }));
            expect(EmailOutbox.enfileirarEventoAgendamento).toHaveBeenCalledWith('agendamento_cancelado', 10);
        });
    });

    it('concluido envia e-mail; confirmado não', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ ind_status: 'confirmado' }));
        await Service.alterarStatus(10, 'concluido', usuarios.admin);
        expect(EmailOutbox.enfileirarEventoAgendamento).toHaveBeenCalledWith('agendamento_concluido', 10);

        EmailOutbox.enfileirarEventoAgendamento.mockClear();
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento());
        await Service.alterarStatus(10, 'confirmado', usuarios.admin);
        expect(EmailOutbox.enfileirarEventoAgendamento).not.toHaveBeenCalled();
        expect(LogService.registrar).toHaveBeenLastCalledWith(expect.objectContaining({ des_acao: 'agendamento_editar' }));
    });

    it('lock otimista falhou → 409', async () => {
        AgendamentoModel.atualizarStatus.mockResolvedValue(false);
        await expect(Service.alterarStatus(10, 'confirmado', usuarios.admin)).rejects.toThrow(ConflictError);
        expect(LogService.registrar).not.toHaveBeenCalled();
    });
});

describe('AgendamentoService.deletarAgendamento', () => {
    it('happy path', async () => {
        AgendamentoModel.deletar = jest.fn().mockResolvedValue(true);
        await expect(Service.deletarAgendamento(10, 1)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'deletar' }));
    });
    it('não encontrado → 404', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.deletarAgendamento(10, 1)).rejects.toThrow(NotFoundError);
    });
    it('falha no soft delete → Error', async () => {
        AgendamentoModel.deletar = jest.fn().mockResolvedValue(false);
        await expect(Service.deletarAgendamento(10, 1)).rejects.toThrow('Erro ao deletar agendamento');
    });
});

describe('AgendamentoService – fluxo público', () => {
    const base = { num_cpf: '11144477735', id_costureira: 3, dta_agendamento: SEGUNDA_10H };

    it('buscarPorUuidPublico encontrado', async () => {
        AgendamentoModel.buscarPorUuid = jest.fn().mockResolvedValue({ id: 10 });
        await expect(Service.buscarPorUuidPublico('u')).resolves.toEqual({ id: 10 });
    });

    it('buscarPorUuidPublico inexistente → 404', async () => {
        AgendamentoModel.buscarPorUuid = jest.fn().mockResolvedValue(null);
        await expect(Service.buscarPorUuidPublico('u')).rejects.toThrow(NotFoundError);
    });

    it('erro de validação → BadRequest', async () => {
        validators.publicAgendamentoSchema.validate.mockReturnValueOnce(erroJoi);
        await expect(Service.criarAgendamentoPublico({})).rejects.toThrow(/Erro de validação/);
    });

    it.each([
        [null],
        [pessoa({ id: 5, ind_paciente: 0 })],
        [pessoa({ id: 5, ind_paciente: 1, ind_status: 'inativo' })]
    ])('paciente %j → mensagem neutra (anti-enumeração)', async (p) => {
        PessoaModel.buscarPorCpf = jest.fn().mockResolvedValue(p);
        await expect(Service.criarAgendamentoPublico(base)).rejects.toThrow(/Entre em contato com a clínica/);
    });

    it('happy path retorna apenas dados mínimos (LGPD) e paciente é o autor', async () => {
        PessoaModel.buscarPorCpf = jest.fn().mockResolvedValue(pessoa({ id: 5, ind_paciente: 1 }));
        const r = await Service.criarAgendamentoPublico(base);
        expect(Object.keys(r).sort()).toEqual(['des_url_externa', 'dta_agendamento', 'id', 'ind_status', 'nom_costureira']);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ id_usuario: 5 }));
    });
});
