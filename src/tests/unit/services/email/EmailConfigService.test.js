// /EmailConfigService.test.js

jest.mock('../../../../models/sistema/EmpresaModel', () => ({
    buscarConfigSmtp: jest.fn(), atualizarSmtp: jest.fn()
}));
jest.mock('../../../../services/email/MailTransportService', () => ({
    invalidar: jest.fn(), verificar: jest.fn(), enviar: jest.fn()
}));
jest.mock('../../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../../utils/cryptoUtils', () => ({ criptografar: jest.fn((s) => `enc(${s})`) }));

const EmpresaModel = require('../../../../models/sistema/EmpresaModel');
const MailTransportService = require('../../../../services/email/MailTransportService');
const LogService = require('../../../../services/LogService');
const { criptografar } = require('../../../../utils/cryptoUtils');
const { BadRequestError, NotFoundError } = require('../../../../utils/ApiError');
const { ACOES_LOG } = require('../../../../utils/constants');
const svc = require('../../../../services/email/EmailConfigService');

const cfgDb = (over = {}) => ({
    id_empresa: 1, ind_smtp_ativo: 1, des_smtp_host: 'smtp.x.com', num_smtp_porta: 587,
    ind_smtp_seguro: 0, des_smtp_usuario: 'user', des_smtp_email_remetente: 'no-reply@x.com',
    nom_smtp_remetente: 'Ateliê', des_smtp_senha_enc: 'enc', updated_ad: new Date(), ...over
});

const payload = (over = {}) => ({
    ind_smtp_ativo: true, des_smtp_host: 'smtp.x.com', num_smtp_porta: 587,
    ind_smtp_seguro: false, des_smtp_usuario: 'user',
    des_smtp_email_remetente: 'no-reply@x.com', nom_smtp_remetente: 'Ateliê', ...over
});

beforeEach(() => {
    jest.clearAllMocks();
    EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgDb());
    EmpresaModel.atualizarSmtp.mockResolvedValue();
    LogService.registrar.mockResolvedValue();
});

describe('EmailConfigService.obterSmtp', () => {
    it('404 quando empresa não existe', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(null);
        await expect(svc.obterSmtp(1)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('remove senha/updated_ad e expõe ind_senha_configurada', async () => {
        const r = await svc.obterSmtp(1);
        expect(r).not.toHaveProperty('des_smtp_senha_enc');
        expect(r).not.toHaveProperty('updated_ad');
        expect(r).toMatchObject({ des_smtp_host: 'smtp.x.com', ind_senha_configurada: true });
    });

    it('ind_senha_configurada=false sem senha', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgDb({ des_smtp_senha_enc: null }));
        expect((await svc.obterSmtp(1)).ind_senha_configurada).toBe(false);
    });
});

describe('EmailConfigService.atualizarSmtp', () => {
    it.each([
        ['porta inválida', { num_smtp_porta: 8080 }],
        ['host inválido', { des_smtp_host: 'host inválido!' }],
        ['e-mail inválido', { des_smtp_email_remetente: 'x' }],
        ['nome com <', { nom_smtp_remetente: 'A <b>' }],
        ['nome com CRLF', { nom_smtp_remetente: 'A\r\nBcc: x' }],
        ['senha > 256', { des_smtp_senha: 'a'.repeat(257) }]
    ])('400 com %s e não persiste', async (_, over) => {
        await expect(svc.atualizarSmtp(1, payload(over), 9)).rejects.toBeInstanceOf(BadRequestError);
        expect(EmpresaModel.buscarConfigSmtp).not.toHaveBeenCalled();
        expect(EmpresaModel.atualizarSmtp).not.toHaveBeenCalled();
    });

    it('404 quando empresa não existe', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(null);
        await expect(svc.atualizarSmtp(1, payload(), 9)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('400 ao ativar sem senha nova nem armazenada', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgDb({ des_smtp_senha_enc: null }));
        await expect(svc.atualizarSmtp(1, payload(), 9))
            .rejects.toThrow('Senha SMTP obrigatória para ativar o envio');
        expect(EmpresaModel.atualizarSmtp).not.toHaveBeenCalled();
    });

    it('permite desativar sem senha', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgDb({ des_smtp_senha_enc: null }));
        await svc.atualizarSmtp(1, payload({ ind_smtp_ativo: false }), 9);
        expect(EmpresaModel.atualizarSmtp).toHaveBeenCalledWith(1, expect.any(Object), null);
    });

    it('mantém senha existente (senhaEnc=null) e audita senha_alterada=false', async () => {
        await svc.atualizarSmtp(1, payload(), 9);
        expect(criptografar).not.toHaveBeenCalled();
        expect(EmpresaModel.atualizarSmtp).toHaveBeenCalledWith(1, expect.any(Object), null);
        expect(LogService.registrar).toHaveBeenCalledWith({
            id_usuario: 9, des_acao: ACOES_LOG.EDITAR, des_tabela: 'tab_empresa', num_registro_id: 1,
            des_detalhes: { acao: 'config_smtp', host: 'smtp.x.com', senha_alterada: false }
        });
    });

    it('criptografa senha nova e audita senha_alterada=true', async () => {
        await svc.atualizarSmtp(1, payload({ des_smtp_senha: 's3cr3t' }), 9);
        expect(criptografar).toHaveBeenCalledWith('s3cr3t');
        expect(EmpresaModel.atualizarSmtp).toHaveBeenCalledWith(1, expect.any(Object), 'enc(s3cr3t)');
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.senha_alterada).toBe(true);
    });

    it('log não contém a senha', async () => {
        await svc.atualizarSmtp(1, payload({ des_smtp_senha: 's3cr3t' }), 9);
        expect(JSON.stringify(LogService.registrar.mock.calls[0][0])).not.toContain('s3cr3t');
    });

    it('stripUnknown remove campos extras', async () => {
        await svc.atualizarSmtp(1, payload({ id_empresa: 999, des_smtp_senha_enc: 'hack' }), 9);
        const valor = EmpresaModel.atualizarSmtp.mock.calls[0][1];
        expect(valor).not.toHaveProperty('id_empresa');
        expect(valor).not.toHaveProperty('des_smtp_senha_enc');
    });

    it('invalida transporter após persistir e retorna config mascarada', async () => {
        const r = await svc.atualizarSmtp(1, payload(), 9);
        expect(MailTransportService.invalidar).toHaveBeenCalledWith(1);
        expect(EmpresaModel.atualizarSmtp.mock.invocationCallOrder[0])
            .toBeLessThan(MailTransportService.invalidar.mock.invocationCallOrder[0]);
        expect(EmpresaModel.buscarConfigSmtp).toHaveBeenCalledTimes(2);
        expect(r).not.toHaveProperty('des_smtp_senha_enc');
    });

    it('não invalida cache se persistência falhar', async () => {
        EmpresaModel.atualizarSmtp.mockRejectedValue(new Error('db'));
        await expect(svc.atualizarSmtp(1, payload(), 9)).rejects.toThrow('db');
        expect(MailTransportService.invalidar).not.toHaveBeenCalled();
    });

    // RISCO: senha em texto plano segue no objeto `value` enviado ao Model
    it.failing('não repassa a senha em texto plano ao Model', async () => {
        await svc.atualizarSmtp(1, payload({ des_smtp_senha: 's3cr3t' }), 9);
        expect(EmpresaModel.atualizarSmtp.mock.calls[0][1]).not.toHaveProperty('des_smtp_senha');
    });

    // UX: front costuma enviar '' para "manter senha"; Joi rejeita string vazia
    it.failing('senha vazia ("") significa manter a atual', async () => {
        await expect(svc.atualizarSmtp(1, payload({ des_smtp_senha: '' }), 9)).resolves.toBeDefined();
    });

    // BUG: falha na auditoria retorna erro apesar de a config já ter sido salva
    it.failing('falha no log não deve rejeitar uma atualização já persistida', async () => {
        LogService.registrar.mockRejectedValue(new Error('log off'));
        await expect(svc.atualizarSmtp(1, payload(), 9)).resolves.toBeDefined();
    });
});

describe('EmailConfigService.testarSmtp', () => {
    it.each([[{}], [{ des_destinatario: 'invalido' }]])('400 com destinatário inválido %j', async (dados) => {
        await expect(svc.testarSmtp(1, dados)).rejects.toBeInstanceOf(BadRequestError);
        expect(MailTransportService.verificar).not.toHaveBeenCalled();
    });

    it('verifica e envia e-mail de teste', async () => {
        MailTransportService.verificar.mockResolvedValue(true);
        MailTransportService.enviar.mockResolvedValue({ messageId: '<m>' });
        await expect(svc.testarSmtp(1, { des_destinatario: 'adm@x.com' })).resolves.toEqual({ messageId: '<m>' });
        expect(MailTransportService.enviar).toHaveBeenCalledWith(1, {
            para: 'adm@x.com',
            assunto: 'Teste de configuração SMTP',
            html: '<p>Configuração SMTP funcionando.</p>',
            texto: 'Configuração SMTP funcionando.'
        });
    });

    it('falha no verify vira 400 e não envia', async () => {
        MailTransportService.verificar.mockRejectedValue(new Error('Invalid login'));
        const p = svc.testarSmtp(1, { des_destinatario: 'adm@x.com' });
        await expect(p).rejects.toBeInstanceOf(BadRequestError);
        await expect(p).rejects.toThrow('Falha no teste SMTP: Invalid login');
        expect(MailTransportService.enviar).not.toHaveBeenCalled();
    });

    it('falha no envio vira 400', async () => {
        MailTransportService.verificar.mockResolvedValue(true);
        MailTransportService.enviar.mockRejectedValue(new Error('550 rejected'));
        await expect(svc.testarSmtp(1, { des_destinatario: 'adm@x.com' }))
            .rejects.toThrow('Falha no teste SMTP: 550 rejected');
    });
});
