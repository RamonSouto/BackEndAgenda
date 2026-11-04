// src/tests/integration/agendamento.integration.test.js
jest.mock('yamljs', () => ({ load: () => ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }) }));
jest.mock('../../config/database', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../../config/logger', () => { const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), log: jest.fn() }; l.child = () => l; return l; });
jest.mock('../../services/UploadService', () => ({ getMulterConfig: () => ({ storage: require('multer').memoryStorage() }), validarArquivo: jest.fn(), deletarArquivo: jest.fn().mockResolvedValue(), formatarTamanhoArquivo: () => '5MB', maxFileSize: 5242880 }));
jest.mock('../../services/agendamento/AgendamentoService', () => ({
    criar: jest.fn(), listarAgendamentos: jest.fn(), buscarAgendamentoCompleto: jest.fn(), atualizar: jest.fn(),
    trocarCostureira: jest.fn(), alterarStatus: jest.fn(), deletarAgendamento: jest.fn(),
    verificarDisponibilidade: jest.fn(), criarAgendamentoPublico: jest.fn(), buscarPorUuidPublico: jest.fn()
}));

const request = require('supertest');
const app = require('../../app');
const Service = require('../../services/agendamento/AgendamentoService');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../utils/ApiError');
const { token, usuarios, agendamento } = require('../helpers/factories');

const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const UUID = '3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d';

describe('POST /api/agendamentos', () => {
    const body = { id_paciente: 5, id_costureira: 3, dta_agendamento: '2030-01-07 10:00:00' };

    it('401 sem token', async () => {
        expect((await request(app).post('/api/agendamentos').send(body)).status).toBe(401);
    });

    it.each(['costureira', 'medico', 'paciente'])('403 para %s', async (p) => {
        const r = await request(app).post('/api/agendamentos').set(auth(usuarios[p])).send(body);
        expect(r.status).toBe(403);
        expect(Service.criar).not.toHaveBeenCalled();
    });

    it('400 com body vazio', async () => {
        expect((await request(app).post('/api/agendamentos').set(auth(usuarios.secretaria)).send({})).status).toBe(400);
    });

    it('201 para secretária, repassando o id do usuário', async () => {
        Service.criar.mockResolvedValue(agendamento());
        const r = await request(app).post('/api/agendamentos').set(auth(usuarios.secretaria)).send(body);
        expect(r.status).toBe(201);
        expect(r.body).toMatchObject({ sucesso: true, dados: { id: 10 } });
        expect(Service.criar).toHaveBeenCalledWith(body, 2);
    });

    it('409 quando o Service sinaliza conflito', async () => {
        Service.criar.mockRejectedValue(new ConflictError('ocupado'));
        const r = await request(app).post('/api/agendamentos').set(auth(usuarios.admin)).send(body);
        expect(r.status).toBe(409);
        expect(r.body.mensagem).toBe('ocupado');
    });

    it('409 na corrida (UNIQUE uq_agenda_costureira_slot do MySQL)', async () => {
        Service.criar.mockRejectedValue({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'uq_agenda_costureira_slot'" });
        const r = await request(app).post('/api/agendamentos').set(auth(usuarios.admin)).send(body);
        expect(r.status).toBe(409);
        expect(r.body.mensagem).toMatch(/Costureira já possui/);
    });

    it('500 genérico não vaza detalhes', async () => {
        Service.criar.mockRejectedValue(new Error('segredo interno'));
        const r = await request(app).post('/api/agendamentos').set(auth(usuarios.admin)).send(body);
        expect(r.status).toBe(500);
        expect(r.body.mensagem).toBe('Erro interno do servidor');
        expect(r.body.requestId).toBeDefined();
    });
});

describe('GET /api/agendamentos', () => {
    it.each(['admin', 'secretaria', 'medico', 'costureira'])('200 para %s', async (p) => {
        Service.listarAgendamentos.mockResolvedValue({ dados: [], total: 0 });
        const r = await request(app).get('/api/agendamentos?pagina=1&limite=20').set(auth(usuarios[p]));
        expect(r.status).toBe(200);
        expect(r.body).toEqual({ sucesso: true, total: 0, dados: [] });
    });

    it('403 para paciente', async () => {
        expect((await request(app).get('/api/agendamentos').set(auth(usuarios.paciente))).status).toBe(403);
    });

    it('repassa query sanitizada (trim) e usuário completo', async () => {
        Service.listarAgendamentos.mockResolvedValue({ dados: [], total: 0 });
        await request(app).get('/api/agendamentos?ind_status=%20agendado%20').set(auth(usuarios.costureira));
        expect(Service.listarAgendamentos).toHaveBeenCalledWith(
            expect.objectContaining({ ind_status: 'agendado' }), expect.objectContaining({ id: 3, papeis: ['costureira'] })
        );
    });
});

describe('GET /api/agendamentos/disponibilidade', () => {
    it('não é capturada por /:id', async () => {
        Service.verificarDisponibilidade.mockResolvedValue({ disponivel: true });
        const r = await request(app).get('/api/agendamentos/disponibilidade?id_costureira=3&data=2030-01-07 10:00:00')
            .set(auth(usuarios.admin));
        expect(r.status).toBe(200);
        expect(Service.verificarDisponibilidade).toHaveBeenCalledWith(3, '2030-01-07 10:00:00');
    });

    it.each([
        ['sem parâmetros', ''],
        ['id_costureira=0', '?id_costureira=0&data=x'],
        ['id_costureira decimal', '?id_costureira=1.5&data=x'],
        ['sem data', '?id_costureira=3']
    ])('400: %s', async (_, qs) => {
        expect((await request(app).get(`/api/agendamentos/disponibilidade${qs}`).set(auth(usuarios.admin))).status).toBe(400);
    });
});

describe('GET /api/agendamentos/:id', () => {
    it.each(['abc', '0', '-1', '1.5'])('400 para id inválido %s', async (id) => {
        expect((await request(app).get(`/api/agendamentos/${id}`).set(auth(usuarios.admin))).status).toBe(400);
    });

    it('404 propagado do Service', async () => {
        Service.buscarAgendamentoCompleto.mockRejectedValue(new NotFoundError('Agendamento não encontrado'));
        expect((await request(app).get('/api/agendamentos/999').set(auth(usuarios.admin))).status).toBe(404);
    });

    it('403 para costureira alheia', async () => {
        Service.buscarAgendamentoCompleto.mockRejectedValue(new ForbiddenError());
        expect((await request(app).get('/api/agendamentos/10').set(auth(usuarios.costureira))).status).toBe(403);
    });

    it('id é convertido para number antes do Service', async () => {
        Service.buscarAgendamentoCompleto.mockResolvedValue(agendamento());
        await request(app).get('/api/agendamentos/10').set(auth(usuarios.admin));
        expect(Service.buscarAgendamentoCompleto).toHaveBeenCalledWith(10, expect.any(Object));
    });
});

describe('PATCH /api/agendamentos/:id/status e /costureira', () => {
    it('costureira pode alterar status', async () => {
        Service.alterarStatus.mockResolvedValue(agendamento({ ind_status: 'confirmado' }));
        const r = await request(app).patch('/api/agendamentos/10/status').set(auth(usuarios.costureira)).send({ status: 'confirmado' });
        expect(r.status).toBe(200);
        expect(Service.alterarStatus).toHaveBeenCalledWith(10, 'confirmado', expect.objectContaining({ id: 3 }));
    });

    it('costureira NÃO pode trocar costureira', async () => {
        const r = await request(app).patch('/api/agendamentos/10/costureira').set(auth(usuarios.costureira)).send({ id_costureira: 7 });
        expect(r.status).toBe(403);
    });

    it('secretária troca costureira', async () => {
        Service.trocarCostureira.mockResolvedValue(agendamento({ id_costureira: 7 }));
        const r = await request(app).patch('/api/agendamentos/10/costureira').set(auth(usuarios.secretaria))
            .send({ id_costureira: 7, des_motivo: 'férias' });
        expect(r.status).toBe(200);
        expect(Service.trocarCostureira).toHaveBeenCalledWith(10, 7, 'férias', expect.objectContaining({ id: 2 }));
    });
});

describe('DELETE /api/agendamentos/:id', () => {
    it('403 para secretária (apenas admin)', async () => {
        expect((await request(app).delete('/api/agendamentos/10').set(auth(usuarios.secretaria))).status).toBe(403);
    });
    it('200 para admin', async () => {
        Service.deletarAgendamento.mockResolvedValue(true);
        const r = await request(app).delete('/api/agendamentos/10').set(auth(usuarios.admin));
        expect(r.status).toBe(200);
        expect(Service.deletarAgendamento).toHaveBeenCalledWith(10, 1);
    });
});

describe('Rotas de fotos – ordem de montagem', () => {
    it('/fotos/:id valida id antes de qualquer outra rota', async () => {
        expect((await request(app).get('/api/agendamentos/fotos/abc').set(auth(usuarios.admin))).status).toBe(400);
    });
    it('DELETE /fotos/:id → 403 para costureira', async () => {
        expect((await request(app).delete('/api/agendamentos/fotos/1').set(auth(usuarios.costureira))).status).toBe(403);
    });
});

describe('Rotas públicas /api/public/agendamentos', () => {
    it.each(['nao-e-uuid', '3f2b8c1e-9a4d-1e7b-8c21-5d6f7a8b9c0d' /* v1 */])('400 para UUID inválido %s', async (u) => {
        const r = await request(app).get(`/api/public/agendamentos/${u}`);
        expect(r.status).toBe(400);
        expect(Service.buscarPorUuidPublico).not.toHaveBeenCalled();
    });

    it('200 para UUID v4 válido sem token', async () => {
        Service.buscarPorUuidPublico.mockResolvedValue({ id: 10, ind_status: 'agendado' });
        expect((await request(app).get(`/api/public/agendamentos/${UUID}`)).status).toBe(200);
    });

    it('disponibilidade pública usa a mesma implementação', async () => {
        Service.verificarDisponibilidade.mockResolvedValue({ disponivel: false, motivo: 'x' });
        const r = await request(app).get('/api/public/agendamentos/disponibilidade?id_costureira=3&data=2030-01-07 10:00:00');
        expect(r.body.dados).toEqual({ disponivel: false, motivo: 'x' });
    });

    // Mantido por último: o MemoryStore do rate limit persiste no processo.
    it('rate limit: 5 criações/hora por IP, a 6ª → 429', async () => {
        Service.criarAgendamentoPublico.mockResolvedValue({ id: 1, des_url_externa: UUID });
        const body = { num_cpf: '11144477735', id_costureira: 3, dta_agendamento: '2030-01-07 10:00:00' };
        for (let i = 0; i < 5; i++) {
            expect((await request(app).post('/api/public/agendamentos').send(body)).status).toBe(201);
        }
        const r = await request(app).post('/api/public/agendamentos').send(body);
        expect(r.status).toBe(429);
        expect(r.body.mensagem).toBe('Muitas tentativas de agendamento');
    });
});
