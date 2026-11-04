// /tests/services/email/MailTransportService.test.js

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('../../../../models/sistema/EmpresaModel', () => ({ buscarConfigSmtp: jest.fn() }));
jest.mock('../../../../utils/cryptoUtils', () => ({ descriptografar: jest.fn(() => 'senha-plana') }));
jest.mock('../../../../config/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }));

const nodemailer = require('nodemailer');
const EmpresaModel = require('../../../../models/sistema/EmpresaModel');
const { descriptografar } = require('../../../../utils/cryptoUtils');
const logger = require('../../../../config/logger');
const svc = require('../../../../services/email/MailTransportService');

const cfgBase = (over = {}) => ({
    ind_smtp_ativo: 1,
    des_smtp_host: 'smtp.x.com',
    num_smtp_porta: 587,
    ind_smtp_seguro: 0,
    des_smtp_usuario: 'user',
    des_smtp_senha_enc: 'enc',
    des_smtp_email_remetente: 'no-reply@x.com',
    nom_smtp_remetente: 'Ateliê',
    nom_fantasia: 'Fantasia',
    updated_ad: new Date('2026-01-01T00:00:00Z'),
    ...over
});

const novoTransporter = () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: '<id@x>' }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn()
});

const msg = { para: 'a@b.com', assunto: 'Oi', html: '<p>Oi</p>', texto: 'Oi' };
const erroCom = (props) => Object.assign(new Error('smtp'), props);

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    svc.cache.clear();
    svc.circuitos.clear();
    nodemailer.createTransport.mockImplementation(novoTransporter);
    EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgBase());
});

describe('MailTransportService._obterTransporter', () => {
    it.each([
        ['config inexistente', null],
        ['SMTP inativo', cfgBase({ ind_smtp_ativo: 0 })],
        ['sem host', cfgBase({ des_smtp_host: null })],
        ['sem senha', cfgBase({ des_smtp_senha_enc: null })]
    ])('rejeita como permanente quando %s', async (_, cfg) => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfg);
        await expect(svc._obterTransporter(1)).rejects.toMatchObject({
            message: 'SMTP inativo ou não configurado para a empresa',
            permanente: true
        });
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('cria transporter com timeouts, pool e STARTTLS obrigatório', async () => {
        await svc._obterTransporter(1);
        expect(descriptografar).toHaveBeenCalledWith('enc');
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.x.com', port: 587, secure: false, requireTLS: true,
            auth: { user: 'user', pass: 'senha-plana' },
            pool: true, maxConnections: 2,
            connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000
        });
    });

    it('secure=true desabilita requireTLS', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgBase({ ind_smtp_seguro: 1, num_smtp_porta: 465 }));
        await svc._obterTransporter(1);
        expect(nodemailer.createTransport).toHaveBeenCalledWith(
            expect.objectContaining({ secure: true, requireTLS: false })
        );
    });

    it('usa nom_fantasia como nome do remetente quando não há nome SMTP', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgBase({ nom_smtp_remetente: null }));
        const { remetente } = await svc._obterTransporter(1);
        expect(remetente).toEqual({ name: 'Fantasia', address: 'no-reply@x.com' });
    });

    it('reutiliza o cache quando a versão não mudou', async () => {
        const a = await svc._obterTransporter(1);
        const b = await svc._obterTransporter(1);
        expect(a).toBe(b);
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });

    it('recria e fecha o antigo quando updated_ad muda', async () => {
        const a = await svc._obterTransporter(1);
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgBase({ updated_ad: new Date('2026-02-01') }));
        const b = await svc._obterTransporter(1);
        expect(a.transporter.close).toHaveBeenCalled();
        expect(b).not.toBe(a);
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
    });

    it('aceita updated_ad como string', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(cfgBase({ updated_ad: '2026-01-01 00:00:00' }));
        const { versao } = await svc._obterTransporter(1);
        expect(versao).toBe('2026-01-01 00:00:00');
    });

    it('isola o cache por empresa', async () => {
        await svc._obterTransporter(1);
        await svc._obterTransporter(2);
        expect(svc.cache.size).toBe(2);
    });

    // BUG: chamadas concorrentes criam 2 transporters; um vaza sem close()
    it('não cria transporters duplicados em chamadas concorrentes', async () => {
        await Promise.all([svc._obterTransporter(1), svc._obterTransporter(1)]);
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });
});

describe('MailTransportService circuit breaker', () => {
    it('abre só na 5ª falha, loga e zera o contador', () => {
        for (let i = 0; i < 4; i++) svc._registrarResultado(1, false);
        expect(svc.circuitoAberto(1)).toBe(false);
        svc._registrarResultado(1, false);
        expect(svc.circuitoAberto(1)).toBe(true);
        expect(svc.circuitos.get(1).falhas).toBe(0);
        expect(logger.warn).toHaveBeenCalledWith('Circuit breaker SMTP aberto', { id_empresa: 1, pausa_ms: 300000 });
    });

    it('fecha após 5 minutos', () => {
        const agora = 1_000_000;
        jest.spyOn(Date, 'now').mockReturnValue(agora);
        for (let i = 0; i < 5; i++) svc._registrarResultado(1, false);
        Date.now.mockReturnValue(agora + 300000);
        expect(svc.circuitoAberto(1)).toBe(false);
    });

    it('sucesso limpa o circuito', () => {
        svc._registrarResultado(1, false);
        svc._registrarResultado(1, true);
        expect(svc.circuitos.has(1)).toBe(false);
    });

    it('empresa sem registro tem circuito fechado', () => {
        expect(svc.circuitoAberto(99)).toBe(false);
    });
});

describe('MailTransportService.enviar', () => {
    it('envia com remetente e retorna messageId', async () => {
        const r = await svc.enviar(1, msg);
        const { transporter } = svc.cache.get(1);
        expect(transporter.sendMail).toHaveBeenCalledWith({
            from: { name: 'Ateliê', address: 'no-reply@x.com' },
            to: 'a@b.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi'
        });
        expect(r).toEqual({ messageId: '<id@x>' });
        expect(svc.circuitos.has(1)).toBe(false);
    });

    it.each([
        ['ETIMEDOUT', { code: 'ETIMEDOUT' }, false],
        ['421 temporário', { responseCode: 421 }, false],
        ['EAUTH', { code: 'EAUTH' }, true],
        ['EENVELOPE', { code: 'EENVELOPE' }, true],
        ['550', { responseCode: 550 }, true],
        ['599', { responseCode: 599 }, true],
        ['600', { responseCode: 600 }, false]
    ])('classifica %s com permanente=%s', async (_, props, permanente) => {
        nodemailer.createTransport.mockImplementationOnce(() => ({
            ...novoTransporter(), sendMail: jest.fn().mockRejectedValue(erroCom(props))
        }));
        await expect(svc.enviar(1, msg)).rejects.toMatchObject({ permanente });
    });

    it('falha transitória incrementa o breaker', async () => {
        nodemailer.createTransport.mockImplementationOnce(() => ({
            ...novoTransporter(), sendMail: jest.fn().mockRejectedValue(erroCom({ code: 'ECONNECTION' }))
        }));
        await expect(svc.enviar(1, msg)).rejects.toThrow();
        expect(svc.circuitos.get(1).falhas).toBe(1);
    });

    it('SMTP não configurado não incrementa o breaker', async () => {
        EmpresaModel.buscarConfigSmtp.mockResolvedValue(null);
        await expect(svc.enviar(1, msg)).rejects.toMatchObject({ permanente: true });
        expect(svc.circuitos.has(1)).toBe(false);
    });

    // BUG: classificação ocorre DEPOIS do registro → EAUTH/5xx contam no breaker
    it.failing('erro permanente do SMTP (EAUTH) não deve contar no breaker', async () => {
        nodemailer.createTransport.mockImplementationOnce(() => ({
            ...novoTransporter(), sendMail: jest.fn().mockRejectedValue(erroCom({ code: 'EAUTH' }))
        }));
        await expect(svc.enviar(1, msg)).rejects.toThrow();
        expect(svc.circuitos.has(1)).toBe(false);
    });

    // BUG: falha de descriptografia (chave trocada) é tratada como transitória → retry infinito
    it.failing('falha ao descriptografar senha deve ser permanente', async () => {
        descriptografar.mockImplementationOnce(() => { throw new Error('Unsupported state or unable to authenticate data'); });
        await expect(svc.enviar(1, msg)).rejects.toMatchObject({ permanente: true });
    });
});

describe('MailTransportService.verificar / invalidar / fecharTodos', () => {
    it('verificar invalida cache e chama verify', async () => {
        const antigo = await svc._obterTransporter(1);
        await expect(svc.verificar(1)).resolves.toBe(true);
        expect(antigo.transporter.close).toHaveBeenCalled();
        expect(svc.cache.get(1).transporter.verify).toHaveBeenCalled();
    });

    it('verificar propaga erro do verify', async () => {
        nodemailer.createTransport.mockImplementationOnce(() => ({
            ...novoTransporter(), verify: jest.fn().mockRejectedValue(new Error('Invalid login'))
        }));
        await expect(svc.verificar(1)).rejects.toThrow('Invalid login');
    });

    it('invalidar fecha, remove cache e limpa circuito', async () => {
        const { transporter } = await svc._obterTransporter(1);
        svc._registrarResultado(1, false);
        svc.invalidar(1);
        expect(transporter.close).toHaveBeenCalled();
        expect(svc.cache.has(1)).toBe(false);
        expect(svc.circuitos.has(1)).toBe(false);
    });

    it('invalidar sem cache não lança', () => {
        expect(() => svc.invalidar(42)).not.toThrow();
    });

    it('fecharTodos fecha todos e limpa cache', async () => {
        const a = await svc._obterTransporter(1);
        const b = await svc._obterTransporter(2);
        svc.fecharTodos();
        expect(a.transporter.close).toHaveBeenCalled();
        expect(b.transporter.close).toHaveBeenCalled();
        expect(svc.cache.size).toBe(0);
    });
});
