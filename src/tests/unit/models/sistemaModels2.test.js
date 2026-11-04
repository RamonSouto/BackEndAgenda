// /src/tests/unit/models/sistemaModels2.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({
    montarUpdate: jest.fn(() => ({ set: 'hra_inicio = ?', valores: ['08:00:00'] }))
}));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
const ParamModel = require('../../../models/sistema/ParametrizacaoModel');
const OutboxModel = require('../../../models/sistema/EmailOutboxModel');
const TemplateModel = require('../../../models/sistema/EmailTemplateModel');

const sql = (i = 0) => database.query.mock.calls[i][0];
const params = (i = 0) => database.query.mock.calls[i][1];

beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue([]);
});

describe('ParametrizacaoModel', () => {
    it('criar envia campos na ordem e retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 3 });
        const d = { des_tipo_dia: 'UTIL', hra_inicio: '08:00:00', hra_fim: '18:00:00', qtd_minutos_intervalo: 60, ind_ativo: true };
        await expect(ParamModel.criar(d)).resolves.toBe(3);
        expect(params()).toEqual(['UTIL', '08:00:00', '18:00:00', 60, true]);
    });
    it('buscarParametrizacaoPorId filtra deletados e retorna objeto/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(ParamModel.buscarParametrizacaoPorId(1)).resolves.toEqual({ id: 1 });
        expect(sql()).toMatch(/deleted_at IS NULL/);
        await expect(ParamModel.buscarParametrizacaoPorId(2)).resolves.toBeNull();
    });
    it('buscarParametrizacaoPorTipoAtivo filtra tipo, ativo e deletados', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(ParamModel.buscarParametrizacaoPorTipoAtivo('UTIL')).resolves.toEqual({ id: 1 });
        expect(sql()).toMatch(/des_tipo_dia = \?[\s\S]+ind_ativo = TRUE[\s\S]+deleted_at IS NULL/);
        expect(params()).toEqual(['UTIL']);
    });
    it.each([['contarAtivosPorTipo', 'TRUE'], ['contarDesativadoPorTipo', 'FALSE']])('%s com/sem idExcluir', async (m, v) => {
        database.query.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([]);
        await expect(ParamModel[m]('UTIL', 5)).resolves.toBe(2);
        expect(sql(0)).toMatch(new RegExp(`ind_ativo = ${v}[\\s\\S]+AND id != \\?`));
        expect(params(0)).toEqual(['UTIL', 5]);
        await expect(ParamModel[m]('UTIL')).resolves.toBe(0);
        expect(sql(1)).not.toMatch(/id != \?/);
        expect(params(1)).toEqual(['UTIL']);
    });
    it('desativarPorTipo exclui id informado', async () => {
        database.query.mockResolvedValue({ affectedRows: 2 });
        await expect(ParamModel.desativarPorTipo('SABADO', 4)).resolves.toBe(true);
        expect(params()).toEqual(['SABADO', 4]);
    });
    it.each([['ativarParametrizacao', 'TRUE'], ['desativarParametrizacao', 'FALSE']])('%s', async (m, v) => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(ParamModel[m](1)).resolves.toBe(true);
        expect(sql()).toMatch(new RegExp(`SET ind_ativo = ${v}`));
        await expect(ParamModel[m](1)).resolves.toBe(false);
    });
    it('atualizar usa whitelist e tab_parametrizacao', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(ParamModel.atualizar(1, { hra_inicio: '08:00:00' })).resolves.toBe(true);
        expect(montarUpdate.mock.calls[0][1]).toEqual(['des_tipo_dia', 'hra_inicio', 'hra_fim', 'qtd_minutos_intervalo', 'ind_ativo']);
        expect(sql()).toMatch(/^UPDATE tab_parametrizacao SET hra_inicio = \?/);
        expect(params()).toEqual(['08:00:00', 1]);
    });
    it('deletar faz soft delete', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(ParamModel.deletar(1)).resolves.toBe(true);
        expect(sql()).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
    });
    it('buscarTipoDesativadoMaisRecente retorna id', async () => {
        database.query.mockResolvedValue([{ id: 8 }]);
        await expect(ParamModel.buscarTipoDesativadoMaisRecente('UTIL', 1)).resolves.toBe(8);
        expect(params()).toEqual(['UTIL', 'UTIL', 1]);
    });
    it.failing('buscarTipoDesativadoMaisRecente sem linhas deveria retornar null (hoje TypeError)', async () => {
        await expect(ParamModel.buscarTipoDesativadoMaisRecente('UTIL', 1)).resolves.toBeNull();
    });
    it.failing('buscarTipoDesativadoMaisRecente: query externa deveria excluir o próprio id', async () => {
        await ParamModel.buscarTipoDesativadoMaisRecente('UTIL', 1).catch(() => { });
        expect(sql()).toMatch(/\btp\.id != \?/);
    });
    it.failing('listar deveria ignorar deletados', async () => {
        await ParamModel.listar();
        expect(sql()).toMatch(/deleted_at IS NULL/);
    });
    it.failing('contarAtivosPorTipo deveria retornar Number (COUNT pode vir string)', async () => {
        database.query.mockResolvedValue([{ total: '0' }]);
        await expect(ParamModel.contarAtivosPorTipo('UTIL', 1)).resolves.toBe(0);
    });
});

describe('EmailOutboxModel', () => {
    const dados = {
        id_empresa: 1, ind_evento: 'agendamento_cadastrado', des_chave_idempotencia: 'agendamento_cadastrado:10',
        des_destinatario: 'a@b.com', des_assunto: 'A', des_corpo_html: '<p>x</p>', des_corpo_texto: 'x'
    };

    it('criar idempotente: insertId ou 0 se duplicado', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1, insertId: 42 }).mockResolvedValueOnce({ affectedRows: 0, insertId: 0 });
        await expect(OutboxModel.criar(dados)).resolves.toBe(42);
        expect(sql()).toMatch(/ON DUPLICATE KEY UPDATE id = id/);
        expect(params()[1]).toBeNull(); // id_agendamento ausente
        await expect(OutboxModel.criar(dados)).resolves.toBe(0);
    });
    it.each([[5, 5], [500, 100], [0, 1], ['abc', 10]])('reivindicarLote limite %p → LIMIT %p', async (ent, esp) => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([{ id: 1 }]);
        await expect(OutboxModel.reivindicarLote('tok', ent)).resolves.toEqual([{ id: 1 }]);
        expect(sql(0)).toMatch(new RegExp(`LIMIT ${esp}\\b`));
        expect(sql(0)).toMatch(/ind_status = 'pendente' AND dta_proxima_tentativa <= NOW\(\)/);
        expect(params(0)).toEqual(['tok']);
        expect(params(1)).toEqual(['tok']);
    });
    it('marcarEnviado limpa lock/erro e incrementa tentativas', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(OutboxModel.marcarEnviado(1, 'mid')).resolves.toBe(true);
        expect(sql()).toMatch(/num_tentativas = num_tentativas \+ 1[\s\S]+des_lock_token = NULL, des_ultimo_erro = NULL/);
        expect(params()).toEqual(['mid', 1]);
    });
    it.each([
        [null, 'falha', 0], [15, 'pendente', 15], [99999, 'pendente', 1440], ['x', 'pendente', 5]
    ])('registrarFalha atraso %p → %s / %p min', async (atraso, status, min) => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await OutboxModel.registrarFalha(1, 'erro', atraso);
        expect(params()).toEqual([status, 'erro', 1]);
        expect(sql()).toMatch(new RegExp(`INTERVAL ${min} MINUTE`));
    });
    it('registrarFalha trunca erro em 1000', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await OutboxModel.registrarFalha(1, 'e'.repeat(2000), 5);
        expect(params()[1]).toHaveLength(1000);
    });
    it('liberarTravados default 10 min', async () => {
        database.query.mockResolvedValue({ affectedRows: 3 });
        await expect(OutboxModel.liberarTravados()).resolves.toBe(3);
        expect(sql()).toMatch(/INTERVAL 10 MINUTE/);
    });
    it('listar com filtros e paginação', async () => {
        await OutboxModel.listar({ ind_status: 'falha', id_agendamento: 7, pagina: 2, limite: 20 });
        expect(sql()).toMatch(/1 = 1 AND ind_status = \? AND id_agendamento = \?/);
        expect(sql()).toMatch(/LIMIT 20 OFFSET 20/);
        expect(sql()).not.toMatch(/des_corpo_html/);
        expect(params()).toEqual(['falha', 7]);
    });
    it('listar sem filtros', async () => {
        await OutboxModel.listar({});
        expect(sql()).toMatch(/LIMIT 20 OFFSET 0/);
        expect(params()).toEqual([]);
    });
    it('reprocessar só aceita status falha', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(OutboxModel.reprocessar(1)).resolves.toBe(true);
        expect(sql()).toMatch(/num_tentativas = 0[\s\S]+ind_status = 'falha'/);
        await expect(OutboxModel.reprocessar(1)).resolves.toBe(false);
    });
    it.each([[1, 7], [undefined, 90], [99999, 3650], [30, 30]])('purgarEnviados %p → %p dias', async (ent, esp) => {
        database.query.mockResolvedValue({ affectedRows: 4 });
        await expect(OutboxModel.purgarEnviados(ent)).resolves.toBe(4);
        expect(sql()).toMatch(new RegExp(`INTERVAL ${esp} DAY[\\s\\S]+LIMIT 1000`));
    });
});

describe('EmailTemplateModel', () => {
    it('buscarPorEvento objeto/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(TemplateModel.buscarPorEvento(1, 'agendamento_cadastrado')).resolves.toEqual({ id: 1 });
        expect(params()).toEqual([1, 'agendamento_cadastrado']);
        await expect(TemplateModel.buscarPorEvento(1, 'x')).resolves.toBeNull();
    });
    it('listar ordena por evento', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(TemplateModel.listar(1)).resolves.toEqual([{ id: 1 }]);
        expect(sql()).toMatch(/ORDER BY ind_evento/);
    });
    it('salvar faz upsert', async () => {
        database.query.mockResolvedValue({ affectedRows: 2 });
        const d = { des_assunto: 'A', des_corpo_html: '<p/>', ind_ativo: true };
        await expect(TemplateModel.salvar(1, 'agendamento_cancelado', d, 9)).resolves.toBe(true);
        expect(sql()).toMatch(/ON DUPLICATE KEY UPDATE/);
        expect(params()).toEqual([1, 'agendamento_cancelado', 'A', '<p/>', true, 9]);
    });
});