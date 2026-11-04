// /tests/services/NotificacaoService.test.js

jest.mock('../../../models/agendamento/AgendamentoModel', () => ({ buscarPorId: jest.fn(), listar: jest.fn() }));
jest.mock('../../../models/PessoaModel', () => ({ buscarPorId: jest.fn() }));
jest.mock('../../../utils/formatters', () => ({ formatarDataHora: jest.fn(() => '05/11/2026 14:00') }));
jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../../config/env', () => ({ whatsapp: { apiUrl: 'https://wa.api', apiKey: 'k' } }));

const AgendamentoModel = require('../../../models/agendamento/AgendamentoModel');
const PessoaModel = require('../../../models/PessoaModel');
const axios = require('axios');
const config = require('../../../config/env');
const svc = require('../../../services/NotificacaoService');

const agendamento = (over = {}) => ({
    id: 10, paciente_id: 5, dta_agendamento: new Date(),
    costureira_nome: 'Maria', des_observacoes_geral: null, ...over
});
const paciente = (over = {}) => ({ id: 5, nom_completo: 'Ana', num_celular_1: '62999999999', ind_whatsapp_1: 1, ...over });
const mensagemEnviada = () => axios.post.mock.calls[0][1].message;

beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    config.whatsapp = { apiUrl: 'https://wa.api', apiKey: 'k' };
    AgendamentoModel.buscarPorId.mockResolvedValue(agendamento());
    PessoaModel.buscarPorId.mockResolvedValue(paciente());
    axios.post.mockResolvedValue({ status: 200 });
});

describe('NotificacaoService.enviarNotificacaoAgendamento', () => {
    it('false quando agendamento não existe', async () => {
        AgendamentoModel.buscarPorId.mockResolvedValue(null);
        await expect(svc.enviarNotificacaoAgendamento(10, 'criacao')).resolves.toBe(false);
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('false quando paciente não existe', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(null);
        await expect(svc.enviarNotificacaoAgendamento(10, 'criacao')).resolves.toBe(false);
    });

    it('busca paciente por paciente_id', async () => {
        await svc.enviarNotificacaoAgendamento(10, 'criacao');
        expect(PessoaModel.buscarPorId).toHaveBeenCalledWith(5);
    });

    it('false quando WhatsApp desabilitado', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(paciente({ ind_whatsapp_1: 0 }));
        await expect(svc.enviarNotificacaoAgendamento(10, 'criacao')).resolves.toBe(false);
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('false com tipo inválido', async () => {
        await expect(svc.enviarNotificacaoAgendamento(10, 'xpto')).resolves.toBe(false);
        expect(axios.post).not.toHaveBeenCalled();
    });

    it.each([
        ['criacao', 'realizado com sucesso'],
        ['confirmacao', 'CONFIRMADO'],
        ['alteracao', 'ALTERADO'],
        ['cancelamento', 'CANCELADO'],
        ['lembrete', 'LEMBRETE']
    ])('tipo %s envia mensagem correta', async (tipo, trecho) => {
        await expect(svc.enviarNotificacaoAgendamento(10, tipo)).resolves.toBe(true);
        expect(axios.post).toHaveBeenCalledWith(
            'https://wa.api/send',
            { phone: '62999999999', message: expect.stringContaining(trecho) },
            { headers: { Authorization: 'Bearer k', 'Content-Type': 'application/json' } }
        );
        expect(mensagemEnviada()).toContain('Olá, Ana!');
        expect(mensagemEnviada()).toContain('05/11/2026 14:00');
    });

    it.each(['criacao', 'alteracao'])('%s inclui observações quando presentes', async (tipo) => {
        AgendamentoModel.buscarPorId.mockResolvedValue(agendamento({ des_observacoes_geral: 'Trazer peça' }));
        await svc.enviarNotificacaoAgendamento(10, tipo);
        expect(mensagemEnviada()).toContain('📝 Observações: Trazer peça');
    });

    it('omite observações quando ausentes', async () => {
        await svc.enviarNotificacaoAgendamento(10, 'criacao');
        expect(mensagemEnviada()).not.toContain('Observações');
    });

    it('cancelamento não cita a costureira', async () => {
        await svc.enviarNotificacaoAgendamento(10, 'cancelamento');
        expect(mensagemEnviada()).not.toContain('Costureira');
    });

    // BUG: ignora o retorno de enviarWhatsApp → reporta sucesso mesmo com falha
    it.failing('retorna false quando o envio WhatsApp falha', async () => {
        axios.post.mockRejectedValue(new Error('timeout'));
        await expect(svc.enviarNotificacaoAgendamento(10, 'criacao')).resolves.toBe(false);
    });

    it.failing('retorna false quando a API não está configurada', async () => {
        config.whatsapp = {};
        await expect(svc.enviarNotificacaoAgendamento(10, 'criacao')).resolves.toBe(false);
    });
});

describe('NotificacaoService.enviarWhatsApp', () => {
    it.each([[{}], [{ apiUrl: 'https://wa.api' }], [{ apiKey: 'k' }]])('false sem config %j', async (wa) => {
        config.whatsapp = wa;
        await expect(svc.enviarWhatsApp('62', 'msg')).resolves.toBe(false);
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('false quando config.whatsapp é undefined (erro capturado)', async () => {
        config.whatsapp = undefined;
        await expect(svc.enviarWhatsApp('62', 'msg')).resolves.toBe(false);
    });

    it('true com status 200', async () => {
        await expect(svc.enviarWhatsApp('62', 'msg')).resolves.toBe(true);
    });

    it('false em erro de rede', async () => {
        axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
        await expect(svc.enviarWhatsApp('62', 'msg')).resolves.toBe(false);
    });

    // BUG: APIs costumam responder 201/202 em sucesso
    it.failing('considera qualquer 2xx como sucesso', async () => {
        axios.post.mockResolvedValue({ status: 201 });
        await expect(svc.enviarWhatsApp('62', 'msg')).resolves.toBe(true);
    });

    // RISCO: sem timeout, API lenta trava o job de lembretes
    it.failing('define timeout na requisição', async () => {
        await svc.enviarWhatsApp('62', 'msg');
        expect(axios.post.mock.calls[0][2]).toHaveProperty('timeout');
    });
});

describe('NotificacaoService.enviarLembretesAutomaticos', () => {
    afterEach(() => jest.useRealTimers());

    it('busca confirmados de amanhã (00:00–23:59:59.999) e envia lembrete a cada um', async () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 10, 4, 10, 0, 0));
        AgendamentoModel.listar.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        const spy = jest.spyOn(svc, 'enviarNotificacaoAgendamento').mockResolvedValue(true);

        await svc.enviarLembretesAutomaticos();

        expect(AgendamentoModel.listar).toHaveBeenCalledWith({
            data_inicio: new Date(2026, 10, 5, 0, 0, 0, 0),
            data_fim: new Date(2026, 10, 5, 23, 59, 59, 999),
            ind_status: 'confirmado'
        });
        expect(spy).toHaveBeenNthCalledWith(1, 1, 'lembrete');
        expect(spy).toHaveBeenNthCalledWith(2, 2, 'lembrete');
    });

    it('vira o mês corretamente', async () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 10, 30, 22, 0, 0));
        AgendamentoModel.listar.mockResolvedValue([]);
        await svc.enviarLembretesAutomaticos();
        expect(AgendamentoModel.listar.mock.calls[0][0].data_inicio).toEqual(new Date(2026, 11, 1, 0, 0, 0, 0));
    });

    it('não propaga erro do listar', async () => {
        AgendamentoModel.listar.mockRejectedValue(new Error('db'));
        await expect(svc.enviarLembretesAutomaticos()).resolves.toBeUndefined();
    });
});

describe('NotificacaoService.enviarNotificacaoCustomizada', () => {
    it('rejeita quando pessoa não existe', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(null);
        await expect(svc.enviarNotificacaoCustomizada(5, 'oi')).rejects.toThrow('Pessoa não encontrada');
    });

    it('rejeita sem WhatsApp habilitado', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(paciente({ ind_whatsapp_1: 0 }));
        await expect(svc.enviarNotificacaoCustomizada(5, 'oi')).rejects.toThrow('Pessoa não possui WhatsApp habilitado');
    });

    it('envia e retorna true', async () => {
        await expect(svc.enviarNotificacaoCustomizada(5, 'oi')).resolves.toBe(true);
        expect(axios.post.mock.calls[0][1]).toEqual({ phone: '62999999999', message: 'oi' });
    });

    // BUG: mesmo problema, ignora falha do envio
    it.failing('não retorna true quando o envio falha', async () => {
        axios.post.mockRejectedValue(new Error('x'));
        await expect(svc.enviarNotificacaoCustomizada(5, 'oi')).resolves.not.toBe(true);
    });
});
