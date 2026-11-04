// /src/tests/unit/controllers/RelatorioController.test.js

jest.mock('../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../services/LogService', () => ({
    gerarRelatorioAuditoria: jest.fn(), buscarPorUsuario: jest.fn(), buscarPorTabela: jest.fn(),
    obterEstatisticasAcoes: jest.fn(), obterEstatisticasUsuarios: jest.fn()
}));
jest.mock('../../../services/agendamento/AgendamentoService', () => ({ listar: jest.fn() }));
jest.mock('../../../services/PessoaService', () => ({ listarCostureirasDisponiveis: jest.fn() }));

const { mockReq, mockRes } = require('../../helpers/http');
const Log = require('../../../services/LogService');
const Ag = require('../../../services/agendamento/AgendamentoService');
const Pessoa = require('../../../services/PessoaService');
const ctrl = require('../../../controllers/RelatorioController');

const run = async (fn, req) => { const res = mockRes(); await fn(req, res, jest.fn()); return res.json.mock.calls[0][0]; };

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-04T12:00:00'));
});
afterEach(() => jest.useRealTimers());

it('auditoria aplica limite padrão 100', async () => {
    await run(ctrl.auditoria, mockReq({ query: { acao: 'login' } }));
    expect(Log.gerarRelatorioAuditoria).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'login', limite: 100 }));
});

it('logsPorUsuario limite padrão 50', async () => {
    Log.buscarPorUsuario.mockResolvedValue([]);
    await run(ctrl.logsPorUsuario, mockReq({ params: { id_usuario: '3' } }));
    expect(Log.buscarPorUsuario).toHaveBeenCalledWith('3', 50);
});

it('logsPorTabela repassa registro_id', async () => {
    Log.buscarPorTabela.mockResolvedValue([{}]);
    const body = await run(ctrl.logsPorTabela, mockReq({ params: { tabela: 'tab_pessoas' }, query: { registro_id: '1' } }));
    expect(Log.buscarPorTabela).toHaveBeenCalledWith('tab_pessoas', '1');
    expect(body.total).toBe(1);
});

it.each(['estatisticasAcoes', 'estatisticasUsuarios'])('%s usa mês atual por padrão', async (m) => {
    const body = await run(ctrl[m], mockReq());
    expect(new Date(body.periodo.data_inicio).getDate()).toBe(1);
    expect(new Date(body.periodo.data_fim).getDate()).toBe(30);
});

describe('agendamentos', () => {
    it('agrega por status, costureira e comparecimento', async () => {
        Ag.listar.mockResolvedValue([
            { ind_status: 'concluido', costureira_nome: 'Ana', ind_paciente_compareceu: true },
            { ind_status: 'falta', costureira_nome: 'Ana', ind_paciente_compareceu: false },
            { ind_status: 'agendado', costureira_nome: 'Bia', ind_paciente_compareceu: null }
        ]);
        const { dados: { resumo } } = await run(ctrl.agendamentos, mockReq({ query: { status: 'x' } }));
        expect(resumo.total).toBe(3);
        expect(resumo.por_status).toEqual({ concluido: 1, falta: 1, agendado: 1 });
        expect(resumo.por_costureira).toEqual([{ nome: 'Ana', total: 2 }, { nome: 'Bia', total: 1 }]);
        expect(resumo.comparecimentos).toEqual({ total: 2, compareceram: 1, faltas: 1, taxa_comparecimento: '50.00%' });
    });

    it('taxa 0% sem registros', async () => {
        Ag.listar.mockResolvedValue([]);
        const { dados } = await run(ctrl.agendamentos, mockReq());
        expect(dados.resumo.comparecimentos.taxa_comparecimento).toBe('0%');
    });

    // BUG: MySQL retorna TINYINT 1/0, não boolean → compareceram/faltas sempre 0
    it.failing('considera 1/0 vindos do MySQL', async () => {
        Ag.listar.mockResolvedValue([{ ind_paciente_compareceu: 1 }, { ind_paciente_compareceu: 0 }]);
        const { dados } = await run(ctrl.agendamentos, mockReq());
        expect(dados.resumo.comparecimentos.compareceram).toBe(1);
    });
});

it('produtividade agrupa e ordena por total desc', async () => {
    Ag.listar.mockResolvedValue([
        { costureira_id: 1, costureira_nome: 'Ana', ind_status: 'concluido' },
        { costureira_id: 2, costureira_nome: 'Bia', ind_status: 'cancelado' },
        { costureira_id: 2, costureira_nome: 'Bia', ind_status: 'confirmado' }
    ]);
    const body = await run(ctrl.produtividadeCostureiras, mockReq());
    expect(body.dados[0]).toMatchObject({ id: 2, total_agendamentos: 2, cancelados: 1, em_andamento: 1 });
    expect(body.total_costureiras).toBe(2);
});

it('dashboard consolida mês, hoje e costureiras', async () => {
    Ag.listar
        .mockResolvedValueOnce([{ ind_status: 'concluido' }, { ind_status: 'agendado' }, { ind_status: 'cancelado' }])
        .mockResolvedValueOnce([{ ind_status: 'agendado' }]);
    Pessoa.listarCostureirasDisponiveis.mockResolvedValue([{ disponivel: true }, { disponivel: false }]);
    const { dados } = await run(ctrl.dashboard, mockReq());
    expect(dados.mes_atual).toEqual({ total: 3, concluidos: 1, cancelados: 1, ativos: 1 });
    expect(dados.hoje.total).toBe(1);
    expect(dados.costureiras).toEqual({ total: 2, disponiveis: 1, ocupadas: 1 });
});
