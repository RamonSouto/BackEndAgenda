// /src/tests/unit/services/EmailTemplateService.test.js

jest.mock('../../../models/sistema/EmailTemplateModel', () => ({ listar: jest.fn(), salvar: jest.fn(), buscarPorEvento: jest.fn() }));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/emailTemplateUtils', () => ({
    PLACEHOLDERS: ['nome_cliente', 'nome_costureira', 'data_agendamento', 'hora_agendamento', 'nome_empresa', 'telefone_empresa', 'link_acompanhamento'],
    placeholdersInvalidos: jest.fn(() => []),
    sanitizarTemplate: jest.fn((h) => h),
    renderizarHtml: jest.fn((h) => `R:${h}`),
    renderizarAssunto: jest.fn((a) => `S:${a}`),
    htmlParaTexto: jest.fn(() => 'T')
}));

const Model = require('../../../models/sistema/EmailTemplateModel');
const LogService = require('../../../services/LogService');
const tpl = require('../../../utils/emailTemplateUtils');
const { BadRequestError, NotFoundError } = require('../../../utils/ApiError');
const Service = require('../../../services/email/EmailTemplateService');

const EV = 'agendamento_cadastrado';
const body = (extra = {}) => ({ des_assunto: 'Oi\r\n{{nome_cliente}} ', des_corpo_html: '<p>{{nome_cliente}}</p>', ...extra });

beforeEach(() => {
    jest.clearAllMocks();
    tpl.placeholdersInvalidos.mockReturnValue([]);
    tpl.sanitizarTemplate.mockImplementation((h) => h);
    Model.buscarPorEvento.mockResolvedValue({ id: 5, des_assunto: 'Salvo', des_corpo_html: '<p>s</p>' });
    Model.salvar.mockResolvedValue(true);
});

it('listar retorna templates e placeholders', async () => {
    Model.listar.mockResolvedValue([{ id: 1 }]);
    await expect(Service.listar(1)).resolves.toEqual({ templates: [{ id: 1 }], placeholders: tpl.PLACEHOLDERS });
});

describe('salvar', () => {
    it('sanitiza, normaliza assunto, aplica default ativo, audita e retorna salvo', async () => {
        await expect(Service.salvar(1, EV, body({ extra: 'x' }), 9)).resolves.toEqual(expect.objectContaining({ id: 5 }));
        expect(Model.salvar).toHaveBeenCalledWith(1, EV,
            { des_assunto: 'Oi {{nome_cliente}}', des_corpo_html: '<p>{{nome_cliente}}</p>', ind_ativo: true }, 9);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'editar', des_tabela: 'tab_email_template',
            des_detalhes: { id_empresa: 1, evento: EV, html_alterado_pela_sanitizacao: false }
        }));
    });
    it('sinaliza quando a sanitização altera o HTML', async () => {
        tpl.sanitizarTemplate.mockReturnValue('<p>limpo</p>');
        await Service.salvar(1, EV, body(), 9);
        expect(Model.salvar.mock.calls[0][2].des_corpo_html).toBe('<p>limpo</p>');
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.html_alterado_pela_sanitizacao).toBe(true);
    });
    it('respeita ind_ativo=false', async () => {
        await Service.salvar(1, EV, body({ ind_ativo: false }), 9);
        expect(Model.salvar.mock.calls[0][2].ind_ativo).toBe(false);
    });
    it('evento inválido → 400', async () => {
        await expect(Service.salvar(1, 'x', body(), 9)).rejects.toThrow(new BadRequestError('Evento de e-mail inválido'));
        expect(Model.salvar).not.toHaveBeenCalled();
    });
    it.each([
        ['sem assunto', { des_assunto: undefined }],
        ['assunto > 200', { des_assunto: 'a'.repeat(201) }],
        ['sem html', { des_corpo_html: undefined }],
        ['ind_ativo inválido', { ind_ativo: 'talvez' }]
    ])('%s → 400', async (_, extra) => {
        await expect(Service.salvar(1, EV, body(extra), 9)).rejects.toBeInstanceOf(BadRequestError);
    });
    it('placeholder desconhecido → 400 listando permitidos', async () => {
        tpl.placeholdersInvalidos.mockReturnValue(['foo']);
        await expect(Service.salvar(1, EV, body(), 9)).rejects.toThrow(/Placeholders desconhecidos: foo\. Permitidos: nome_cliente/);
        expect(Model.salvar).not.toHaveBeenCalled();
    });
    it.failing('assunto só com espaços/quebras deveria ser rejeitado (hoje salva vazio)', async () => {
        await expect(Service.salvar(1, EV, body({ des_assunto: ' \r\n ' }), 9)).rejects.toBeInstanceOf(BadRequestError);
    });
    it.failing('auditoria deveria ter num_registro_id do template', async () => {
        await Service.salvar(1, EV, body(), 9);
        expect(LogService.registrar.mock.calls[0][0].num_registro_id).toBe(5);
    });
});

describe('preVisualizar / renderizar', () => {
    it('template do body: sanitiza e usa dados fictícios', async () => {
        const r = await Service.preVisualizar(1, EV, { des_assunto: 'A', des_corpo_html: '<p>x</p>' });
        expect(r).toEqual({ assunto: 'S:A', html: 'R:<p>x</p>', texto: 'T' });
        expect(tpl.sanitizarTemplate).toHaveBeenCalledWith('<p>x</p>');
        expect(tpl.renderizarHtml).toHaveBeenCalledWith('<p>x</p>', expect.objectContaining({
            nome_cliente: 'Maria da Silva', nome_costureira: 'Ana Souza', data_agendamento: '20/11/2026',
            hora_agendamento: '14:00', nome_empresa: 'Ateliê Exemplo', telefone_empresa: '(62) 99999-0000'
        }));
        expect(Model.buscarPorEvento).not.toHaveBeenCalled();
    });
    it('body sem assunto → assunto vazio', async () => {
        await Service.preVisualizar(1, EV, { des_corpo_html: '<p/>' });
        expect(tpl.renderizarAssunto).toHaveBeenCalledWith('', expect.any(Object));
    });
    it('sem body usa template salvo', async () => {
        await expect(Service.preVisualizar(1, EV)).resolves.toEqual({ assunto: 'S:Salvo', html: 'R:<p>s</p>', texto: 'T' });
        expect(Model.buscarPorEvento).toHaveBeenCalledWith(1, EV);
    });
    it('sem template salvo → 404', async () => {
        Model.buscarPorEvento.mockResolvedValue(null);
        await expect(Service.preVisualizar(1, EV, {})).rejects.toThrow(new NotFoundError('Template não encontrado'));
    });
    it('evento inválido → 400', async () => {
        await expect(Service.preVisualizar(1, 'x')).rejects.toBeInstanceOf(BadRequestError);
    });
    it('renderizar gera texto a partir do HTML renderizado', () => {
        Service.renderizar({ des_assunto: 'A', des_corpo_html: '<b/>' }, { nome_cliente: 'Ana' });
        expect(tpl.htmlParaTexto).toHaveBeenCalledWith('R:<b/>');
    });
    it.failing('prévia deveria rejeitar placeholders desconhecidos (consistência com salvar)', async () => {
        tpl.placeholdersInvalidos.mockReturnValue(['foo']);
        await expect(Service.preVisualizar(1, EV, { des_corpo_html: '<p>{{foo}}</p>' })).rejects.toBeInstanceOf(BadRequestError);
    });
});
