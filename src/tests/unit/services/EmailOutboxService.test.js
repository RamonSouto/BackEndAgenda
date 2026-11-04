// /src/tests/unit/services/EmailOutboxService.test.js

jest.mock('../../../config/env', () => ({ email: { empresaId: 1, publicUrl: 'https://app.test', workerBatch: 10 } }));
jest.mock('../../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../../../models/sistema/EmailOutboxModel', () => ({
    criar: jest.fn(), liberarTravados: jest.fn(), reivindicarLote: jest.fn(), marcarEnviado: jest.fn(),
    registrarFalha: jest.fn(), listar: jest.fn(), reprocessar: jest.fn()
}));
jest.mock('../../../models/sistema/EmailTemplateModel', () => ({ buscarPorEvento: jest.fn() }));
jest.mock('../../../models/sistema/EmpresaModel', () => ({ buscarConfigSmtp: jest.fn(), buscarIdEmpresaPadrao: jest.fn() }));
jest.mock('../../../models/agendamento/AgendamentoModel', () => ({ buscarDadosNotificacao: jest.fn() }));
jest.mock('../../../services/email/EmailTemplateService', () => ({ renderizar: jest.fn() }));
jest.mock('../../../services/email/MailTransportService', () => ({ circuitoAberto: jest.fn(), enviar: jest.fn() }));
jest.mock('../../../utils/formatters', () => ({
    formatarData: jest.fn(() => '20/11/2026'),
    formatarDataHora: jest.fn(() => '14:00'),
    formatarTelefone: jest.fn(() => '(62) 99999-0000')
}));

const config = require('../../../config/env');
const logger = require('../../../config/logger');
const Outbox = require('../../../models/sistema/EmailOutboxModel');
const TemplateModel = require('../../../models/sistema/EmailTemplateModel');
const Empresa = require('../../../models/sistema/EmpresaModel');
const Agendamento = require('../../../models/agendamento/AgendamentoModel');
const TemplateService = require('../../../services/email/EmailTemplateService');
const Mail = require('../../../services/email/MailTransportService');
const { BadRequestError, NotFoundError } = require('../../../utils/ApiError');
const Service = require('../../../services/email/EmailOutboxService');

const UUID = '3f2b8c1e-9a4d-4e2f-8b6a-1c2d3e4f5a6b';
const EV = 'agendamento_cadastrado';
const vars = () => TemplateService.renderizar.mock.calls[0][1];

beforeEach(() => {
    jest.clearAllMocks();
    config.email.empresaId = 1;
    Empresa.buscarConfigSmtp.mockResolvedValue({ ind_smtp_ativo: 1, nom_fantasia: 'Ateliê', num_celular_1: '62999990000' });
    Agendamento.buscarDadosNotificacao.mockResolvedValue({
        nom_paciente: 'Maria', nom_costureira: 'Ana', dta_agendamento: new Date('2026-11-20T17:00:00Z'),
        des_email_paciente: 'maria@x.com', des_url_externa: UUID
    });
    TemplateModel.buscarPorEvento.mockResolvedValue({ ind_ativo: 1, des_assunto: 'A', des_corpo_html: '<p/>' });
    TemplateService.renderizar.mockReturnValue({ assunto: 'Assunto', html: '<p>h</p>', texto: 'h' });
    Outbox.criar.mockResolvedValue(42);
    Outbox.reivindicarLote.mockResolvedValue([]);
    Mail.circuitoAberto.mockReturnValue(false);
    Mail.enviar.mockResolvedValue({ messageId: 'mid' });
});

describe('enfileirarEventoAgendamento', () => {
    it('renderiza e persiste com chave idempotente', async () => {
        await expect(Service.enfileirarEventoAgendamento(EV, 10)).resolves.toBe(42);
        expect(Outbox.criar).toHaveBeenCalledWith({
            id_empresa: 1, id_agendamento: 10, ind_evento: EV, des_chave_idempotencia: `${EV}:10`,
            des_destinatario: 'maria@x.com', des_assunto: 'Assunto', des_corpo_html: '<p>h</p>', des_corpo_texto: 'h'
        });
        expect(vars()).toEqual({
            nome_cliente: 'Maria', nome_costureira: 'Ana', data_agendamento: '20/11/2026', hora_agendamento: '14:00',
            nome_empresa: 'Ateliê', telefone_empresa: '(62) 99999-0000', link_acompanhamento: `https://app.test/acompanhar/${UUID}`
        });
    });
    it('concluído também recebe link', async () => {
        await Service.enfileirarEventoAgendamento('agendamento_concluido', 10);
        expect(vars().link_acompanhamento).toContain(UUID);
    });
    it('cancelado não recebe link', async () => {
        await Service.enfileirarEventoAgendamento('agendamento_cancelado', 10);
        expect(vars().link_acompanhamento).toBe('');
    });
    it.each(['nao-e-uuid', null, '3f2b8c1e-9a4d-1e2f-8b6a-1c2d3e4f5a6b'])('url externa %p inválida → sem link', async (url) => {
        Agendamento.buscarDadosNotificacao.mockResolvedValue({ des_email_paciente: 'm@x.com', des_url_externa: url });
        await Service.enfileirarEventoAgendamento(EV, 10);
        expect(vars().link_acompanhamento).toBe('');
    });
    it('sem telefone → string vazia', async () => {
        Empresa.buscarConfigSmtp.mockResolvedValue({ ind_smtp_ativo: 1, nom_fantasia: 'A' });
        await Service.enfileirarEventoAgendamento(EV, 10);
        expect(vars().telefone_empresa).toBe('');
    });
    it('sem empresaId no config usa empresa padrão', async () => {
        config.email.empresaId = null;
        Empresa.buscarIdEmpresaPadrao.mockResolvedValue(3);
        await Service.enfileirarEventoAgendamento(EV, 10);
        expect(Empresa.buscarConfigSmtp).toHaveBeenCalledWith(3);
        expect(TemplateModel.buscarPorEvento).toHaveBeenCalledWith(3, EV);
    });
    it.each([
        ['smtp_inativo', () => Empresa.buscarConfigSmtp.mockResolvedValue({ ind_smtp_ativo: 0 })],
        ['smtp_inativo', () => Empresa.buscarConfigSmtp.mockResolvedValue(null)],
        ['agendamento_inexistente', () => Agendamento.buscarDadosNotificacao.mockResolvedValue(null)],
        ['paciente_sem_email', () => Agendamento.buscarDadosNotificacao.mockResolvedValue({ des_email_paciente: '' })],
        ['template_inativo', () => TemplateModel.buscarPorEvento.mockResolvedValue({ ind_ativo: 0 })],
        ['template_inativo', () => TemplateModel.buscarPorEvento.mockResolvedValue(null)]
    ])('ignora com motivo %s', async (motivo, setup) => {
        setup();
        await expect(Service.enfileirarEventoAgendamento(EV, 10)).resolves.toBeNull();
        expect(Outbox.criar).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('E-mail não enfileirado', { evento: EV, id_agendamento: 10, motivo });
    });
    it('duplicado (0) → null', async () => {
        Outbox.criar.mockResolvedValue(0);
        await expect(Service.enfileirarEventoAgendamento(EV, 10)).resolves.toBeNull();
        expect(logger.info).toHaveBeenCalledWith('E-mail enfileirado', expect.objectContaining({ duplicado: true }));
    });
    it.each([
        ['renderização', () => TemplateService.renderizar.mockImplementation(() => { throw new Error('x'); })],
        ['banco', () => Outbox.criar.mockRejectedValue(new Error('x'))],
        ['consulta', () => Agendamento.buscarDadosNotificacao.mockRejectedValue(new Error('x'))]
    ])('erro de %s nunca propaga', async (_, setup) => {
        setup();
        await expect(Service.enfileirarEventoAgendamento(EV, 10)).resolves.toBeNull();
        expect(logger.error).toHaveBeenCalledWith('Falha ao enfileirar e-mail', expect.objectContaining({ erro: 'x' }));
    });
});

describe('processarLote', () => {
    const msg = (extra = {}) => ({
        id: 1, id_empresa: 1, ind_evento: EV, des_destinatario: 'a@b.com', des_assunto: 'A',
        des_corpo_html: '<p/>', des_corpo_texto: 't', num_tentativas: 0, ...extra
    });

    it('libera travados, reivindica com token UUID e envia', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg(), msg({ id: 2 })]);
        await expect(Service.processarLote(5)).resolves.toEqual({ processados: 2, enviados: 2, falhas: 0 });
        expect(Outbox.liberarTravados).toHaveBeenCalledWith(10);
        expect(Outbox.reivindicarLote).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/), 5);
        expect(Mail.enviar).toHaveBeenCalledWith(1, { para: 'a@b.com', assunto: 'A', html: '<p/>', texto: 't' });
        expect(Outbox.marcarEnviado).toHaveBeenCalledWith(1, 'mid');
    });
    it('tamanho default vem do config', async () => {
        await Service.processarLote();
        expect(Outbox.reivindicarLote).toHaveBeenCalledWith(expect.any(String), 10);
    });
    it('lote vazio não loga resumo', async () => {
        await expect(Service.processarLote(5)).resolves.toEqual({ processados: 0, enviados: 0, falhas: 0 });
        expect(logger.info).not.toHaveBeenCalledWith('Lote outbox processado', expect.anything());
    });
    it('circuito aberto: reagenda em 5 min sem enviar', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg()]);
        Mail.circuitoAberto.mockReturnValue(true);
        await expect(Service.processarLote(5)).resolves.toEqual({ processados: 1, enviados: 0, falhas: 1 });
        expect(Mail.enviar).not.toHaveBeenCalled();
        expect(Outbox.registrarFalha).toHaveBeenCalledWith(1, 'Circuit breaker aberto', 5);
    });
    it.each([[0, 1, 'warn'], [1, 5, 'warn'], [2, 15, 'warn'], [3, 60, 'warn'], [4, 240, 'warn'], [5, null, 'error']])(
        'tentativa %p → atraso %p (%s)', async (tent, atraso, nivel) => {
            Outbox.reivindicarLote.mockResolvedValue([msg({ num_tentativas: tent })]);
            Mail.enviar.mockRejectedValue(new Error('timeout'));
            await Service.processarLote(5);
            expect(Outbox.registrarFalha).toHaveBeenCalledWith(1, 'timeout', atraso);
            expect(logger[nivel]).toHaveBeenCalledWith('Falha no envio de e-mail', expect.objectContaining({
                tentativa: tent + 1, definitiva: atraso === null
            }));
        });
    it('erro permanente → falha definitiva já na 1ª tentativa', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg()]);
        Mail.enviar.mockRejectedValue(Object.assign(new Error('auth'), { permanente: true, responseCode: 535 }));
        await Service.processarLote(5);
        expect(Outbox.registrarFalha).toHaveBeenCalledWith(1, 'auth', null);
    });
    it('falha em uma mensagem não impede as demais', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg(), msg({ id: 2 })]);
        Mail.enviar.mockRejectedValueOnce(new Error('x'));
        await expect(Service.processarLote(5)).resolves.toEqual({ processados: 2, enviados: 1, falhas: 1 });
    });
    it.failing('erro em marcarEnviado após envio NÃO deveria registrar falha (reenvio duplicado)', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg()]);
        Outbox.marcarEnviado.mockRejectedValue(new Error('db'));
        await Service.processarLote(5);
        expect(Outbox.registrarFalha).not.toHaveBeenCalled();
    });
    it.failing('erro em registrarFalha não deveria abortar o lote', async () => {
        Outbox.reivindicarLote.mockResolvedValue([msg(), msg({ id: 2 })]);
        Mail.enviar.mockRejectedValueOnce(new Error('x'));
        Outbox.registrarFalha.mockRejectedValueOnce(new Error('db'));
        await expect(Service.processarLote(5)).resolves.toBeDefined();
        expect(Mail.enviar).toHaveBeenCalledTimes(2);
    });
});

describe('listar / reprocessar', () => {
    it('valida, aplica defaults e remove desconhecidos', async () => {
        Outbox.listar.mockResolvedValue([{ id: 1 }]);
        await expect(Service.listar({ ind_status: 'falha', foo: 1 })).resolves.toEqual([{ id: 1 }]);
        expect(Outbox.listar).toHaveBeenCalledWith({ ind_status: 'falha', pagina: 1, limite: 20 });
    });
    it.each([{ ind_status: 'x' }, { limite: 101 }, { pagina: 0 }, { id_agendamento: -1 }])('filtro inválido %p → 400', async (f) => {
        await expect(Service.listar(f)).rejects.toBeInstanceOf(BadRequestError);
        expect(Outbox.listar).not.toHaveBeenCalled();
    });
    it.failing('listar sem filtros deveria aplicar defaults (hoje passa undefined ao Model)', async () => {
        await Service.listar();
        expect(Outbox.listar).toHaveBeenCalledWith({ pagina: 1, limite: 20 });
    });
    it('reprocessar ok / 404', async () => {
        Outbox.reprocessar.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        await expect(Service.reprocessar(1)).resolves.toBe(true);
        await expect(Service.reprocessar(1)).rejects.toBeInstanceOf(NotFoundError);
    });
});
