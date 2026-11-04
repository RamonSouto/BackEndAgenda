// /src/tests/unit/controllers/sistema/EmailController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/email/EmailConfigService', () => ({
    obterSmtp: jest.fn(), atualizarSmtp: jest.fn(), testarSmtp: jest.fn()
}));
jest.mock('../../../../services/email/EmailTemplateService', () => ({
    listar: jest.fn(), salvar: jest.fn(), preVisualizar: jest.fn()
}));
jest.mock('../../../../services/email/EmailOutboxService', () => ({
    listar: jest.fn(), reprocessar: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const Config = require('../../../../services/email/EmailConfigService');
const Template = require('../../../../services/email/EmailTemplateService');
const Outbox = require('../../../../services/email/EmailOutboxService');
const { MENSAGENS } = require('../../../../utils/constants');
const ctrl = require('../../../../controllers/sistema/EmailController');

const run = async (fn, req) => {
    const res = mockRes(); const next = jest.fn();
    await fn(req, res, next);
    return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const params = { idEmpresa: '1', evento: 'agendamento_cadastrado', id: '42' };

beforeEach(() => jest.clearAllMocks());

describe('SMTP', () => {
    it('obterSmtp', async () => {
        Config.obterSmtp.mockResolvedValue({ des_smtp_host: 'smtp.x.com' });
        const { body } = await run(ctrl.obterSmtp, mockReq({ params }));
        expect(Config.obterSmtp).toHaveBeenCalledWith('1');
        expect(body).toEqual({ sucesso: true, dados: { des_smtp_host: 'smtp.x.com' } });
    });

    it('atualizarSmtp repassa usuário para auditoria', async () => {
        const b = { des_smtp_host: 'smtp.x.com' };
        const { body } = await run(ctrl.atualizarSmtp, mockReq({ params, body: b }));
        expect(Config.atualizarSmtp).toHaveBeenCalledWith('1', b, 1);
        expect(body.mensagem).toBe(MENSAGENS.SUCESSO.ATUALIZADO);
    });

    it('testarSmtp', async () => {
        Config.testarSmtp.mockResolvedValue({ messageId: 'm1' });
        const { body } = await run(ctrl.testarSmtp, mockReq({ params, body: { des_destinatario: 'a@b.com' } }));
        expect(Config.testarSmtp).toHaveBeenCalledWith('1', { des_destinatario: 'a@b.com' });
        expect(body).toMatchObject({ mensagem: 'E-mail de teste enviado', dados: { messageId: 'm1' } });
    });

    it('falha de SMTP vai para next', async () => {
        const erro = new Error('ECONNREFUSED');
        Config.testarSmtp.mockRejectedValue(erro);
        const { next, res } = await run(ctrl.testarSmtp, mockReq({ params }));
        expect(next).toHaveBeenCalledWith(erro);
        expect(res.json).not.toHaveBeenCalled();
    });
});

describe('Templates', () => {
    it('listarTemplates', async () => {
        await run(ctrl.listarTemplates, mockReq({ params }));
        expect(Template.listar).toHaveBeenCalledWith('1');
    });

    it('salvarTemplate', async () => {
        const b = { des_assunto: 'Olá', des_corpo_html: '<p>x</p>' };
        const { body } = await run(ctrl.salvarTemplate, mockReq({ params, body: b }));
        expect(Template.salvar).toHaveBeenCalledWith('1', 'agendamento_cadastrado', b, 1);
        expect(body.mensagem).toBe(MENSAGENS.SUCESSO.ATUALIZADO);
    });

    it('preVisualizarTemplate', async () => {
        Template.preVisualizar.mockResolvedValue({ assunto: 'a', html: 'h', texto: 't' });
        const { body } = await run(ctrl.preVisualizarTemplate, mockReq({ params }));
        expect(Template.preVisualizar).toHaveBeenCalledWith('1', 'agendamento_cadastrado', {});
        expect(body.dados.html).toBe('h');
    });
});

describe('Outbox', () => {
    it('listarOutbox repassa query e conta', async () => {
        Outbox.listar.mockResolvedValue([{}, {}]);
        const { body } = await run(ctrl.listarOutbox, mockReq({ query: { ind_status: 'falha' } }));
        expect(Outbox.listar).toHaveBeenCalledWith({ ind_status: 'falha' });
        expect(body.total).toBe(2);
    });

    it('reprocessarOutbox', async () => {
        const { body } = await run(ctrl.reprocessarOutbox, mockReq({ params }));
        expect(Outbox.reprocessar).toHaveBeenCalledWith('42');
        expect(body.mensagem).toBe('Mensagem recolocada na fila');
    });
});
