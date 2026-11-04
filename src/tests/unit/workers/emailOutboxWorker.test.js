// src/tests/unit/workers/emailOutboxWorker.test.js
jest.mock('../../../services/email/EmailOutboxService', () => ({ processarLote: jest.fn() }));
jest.mock('../../../services/email/MailTransportService', () => ({ fecharTodos: jest.fn() }));
jest.mock('../../../models/sistema/EmailOutboxModel', () => ({ purgarEnviados: jest.fn() }));
jest.mock('../../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const UMA_HORA = 60 * 60 * 1000;

const carregar = (email = {}) => {
    let m;
    jest.isolateModules(() => {
        const config = require('../../../config/env');
        Object.assign(config.email, { workerEnabled: true, workerIntervalMs: 1000, retencaoDias: 90, ...email });
        m = {
            worker: require('../../../workers/emailOutboxWorker'),
            Outbox: require('../../../services/email/EmailOutboxService'),
            Mail: require('../../../services/email/MailTransportService'),
            Model: require('../../../models/sistema/EmailOutboxModel'),
            logger: require('../../../config/logger')
        };
    });
    m.Outbox.processarLote.mockResolvedValue({ processados: 0, enviados: 0, falhas: 0 });
    m.Model.purgarEnviados.mockResolvedValue(0);
    return m;
};

describe('EmailOutboxWorker', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('estado inicial', () => {
        const { worker } = carregar();
        expect(worker).toMatchObject({ timer: null, ativo: false, ultimaPurga: 0 });
    });

    it('não inicia quando workerEnabled=false', () => {
        const { worker, Outbox, logger } = carregar({ workerEnabled: false });
        worker.iniciar();
        expect(worker.ativo).toBe(false);
        expect(Outbox.processarLote).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
    });

    it('iniciar é idempotente e loga o intervalo', async () => {
        const { worker, Outbox, logger } = carregar();
        worker.iniciar();
        worker.iniciar();
        await Promise.resolve();
        expect(Outbox.processarLote).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('Worker de e-mail iniciado', { intervaloMs: 1000 });
        worker.parar();
    });

    it('agenda o próximo ciclo exatamente no intervalo', async () => {
        const { worker, Outbox } = carregar();
        worker.ativo = true;
        await worker._ciclo();
        jest.advanceTimersByTime(999);
        expect(Outbox.processarLote).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(Outbox.processarLote).toHaveBeenCalledTimes(2);
        worker.parar();
    });

    it('não reagenda quando inativo', async () => {
        const { worker, Outbox } = carregar();
        await worker._ciclo();
        expect(worker.timer).toBeNull();
        jest.advanceTimersByTime(5000);
        expect(Outbox.processarLote).toHaveBeenCalledTimes(1);
    });

    it('purga na 1ª execução, não repete em < 1h e repete após 1h', async () => {
        const { worker, Model, logger } = carregar();
        Model.purgarEnviados.mockResolvedValue(3);
        await worker._ciclo();
        await worker._ciclo();
        expect(Model.purgarEnviados).toHaveBeenCalledTimes(1);
        expect(Model.purgarEnviados).toHaveBeenCalledWith(90);
        expect(logger.info).toHaveBeenCalledWith('Outbox purgada (LGPD)', { removidos: 3 });

        jest.setSystemTime(Date.now() + UMA_HORA + 1);
        await worker._ciclo();
        expect(Model.purgarEnviados).toHaveBeenCalledTimes(2);
    });

    it('não loga purga quando nada foi removido', async () => {
        const { worker, logger } = carregar();
        await worker._ciclo();
        expect(logger.info).not.toHaveBeenCalledWith('Outbox purgada (LGPD)', expect.anything());
        expect(worker.ultimaPurga).toBeGreaterThan(0);
    });

    it('falha no processarLote não executa a purga', async () => {
        const { worker, Outbox, Model } = carregar();
        Outbox.processarLote.mockRejectedValueOnce(new Error('db'));
        await worker._ciclo();
        expect(Model.purgarEnviados).not.toHaveBeenCalled();
        expect(worker.ultimaPurga).toBe(0);
    });

    it.each([
        ['processarLote', (m) => m.Outbox.processarLote.mockRejectedValueOnce(new Error('smtp'))],
        ['purgarEnviados', (m) => m.Model.purgarEnviados.mockRejectedValueOnce(new Error('smtp'))]
    ])('erro em %s é logado e o ciclo continua', async (_, falhar) => {
        const m = carregar();
        falhar(m);
        m.worker.ativo = true;
        await expect(m.worker._ciclo()).resolves.toBeUndefined();
        expect(m.logger.error).toHaveBeenCalledWith('Erro no ciclo do worker de e-mail', { erro: 'smtp' });
        jest.advanceTimersByTime(1000);
        expect(m.Outbox.processarLote).toHaveBeenCalledTimes(2);
        m.worker.parar();
    });

    it('parar desativa, cancela o timer e fecha os transportes SMTP', async () => {
        const { worker, Outbox, Mail } = carregar();
        worker.ativo = true;
        await worker._ciclo();
        worker.parar();
        jest.advanceTimersByTime(5000);
        expect(worker.ativo).toBe(false);
        expect(Outbox.processarLote).toHaveBeenCalledTimes(1);
        expect(Mail.fecharTodos).toHaveBeenCalledTimes(1);
    });

    it('parar sem iniciar não lança', () => {
        const { worker, Mail } = carregar();
        expect(() => worker.parar()).not.toThrow();
        expect(Mail.fecharTodos).toHaveBeenCalled();
    });
});
