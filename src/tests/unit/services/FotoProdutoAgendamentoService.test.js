// src/tests/unit/services/FotoProdutoAgendamentoService.test.js
jest.mock('fs/promises', () => ({
    rename: jest.fn(), rm: jest.fn(), access: jest.fn(), mkdir: jest.fn(), utimes: jest.fn()
}));
jest.mock('../../../config/database', () => ({ transaction: jest.fn() }));
jest.mock('../../../config/env', () => ({ upload: { directory: '/tmp/up' } }));
jest.mock('../../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../../../models/agendamento/FotoProdutoAgendamentoModel', () => ({
    buscarContextoItem: jest.fn(), contarPorItem: jest.fn(), criar: jest.fn(),
    listarPorItem: jest.fn(), buscarPorId: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../utils/arquivoUtils', () => ({
    detectarTipoImagem: jest.fn(),
    gerarNomeFotoAjuste: jest.fn((a, i, t, e) => `ag${a}_it${i}_${t}.${e}`),
    sanitizarNomeOriginal: jest.fn((n) => n),
    resolverCaminhoSeguro: jest.fn((root, rel) => require('path').join(root, rel))
}));

const path = require('path');
const fs = require('fs/promises');
const database = require('../../../config/database');
const logger = require('../../../config/logger');
const FotoModel = require('../../../models/agendamento/FotoProdutoAgendamentoModel');
const LogService = require('../../../services/LogService');
const { detectarTipoImagem } = require('../../../utils/arquivoUtils');
const Service = require('../../../services/agendamento/FotoProdutoAgendamentoService');

const ROOT = path.resolve('/tmp/up');
const CONN = { id: 'conn' };
const admin = { id: 1, papeis: ['administrador'] };
const costureira = { id: 5, papeis: ['costureira'] };
const outraCostureira = { id: 6, papeis: ['costureira'] };
const medico = { id: 7, papeis: ['medico'] };
const contexto = (extra = {}) => ({
    id_item: 3, id_agendamento: 1, ind_status_item: 'pendente', ind_status_agendamento: 'agendado', id_costureira: 5, ...extra
});
const foto = (extra = {}) => ({
    id: 10, id_produto_agendamento: 3, ind_tipo_foto: 'antes', nom_original: 'a.jpg', num_tamanho_bytes: 10,
    created_at: '2026-01-01', des_caminho_arquivo: 'ajustes/f.jpg', ...contexto(), ...extra
});
const arquivos = (n = 2) => Array.from({ length: n }, (_, i) => ({ path: `/tmp/t${i}`, originalname: `a${i}.jpg`, size: 10 }));
const params = (extra = {}) => ({ idAgendamento: '1', idItem: '3', ind_tipo_foto: 'antes', arquivos: arquivos(), ...extra });
const temporarios = (n = 2) => Array.from({ length: n }, (_, i) => path.resolve(`/tmp/t${i}`));

beforeEach(() => {
    jest.clearAllMocks();
    database.transaction.mockImplementation(async (cb) => cb(CONN));
    Object.values(fs).forEach((fn) => fn.mockReset().mockResolvedValue());
    detectarTipoImagem.mockResolvedValue({ ext: 'jpg' });
    FotoModel.buscarContextoItem.mockResolvedValue(contexto());
    FotoModel.contarPorItem.mockResolvedValue(0);
    FotoModel.criar.mockReset().mockResolvedValueOnce(11).mockResolvedValueOnce(12);
    FotoModel.buscarPorId.mockResolvedValue(foto());
    FotoModel.listarPorItem.mockResolvedValue([foto()]);
    FotoModel.deletar.mockReset().mockResolvedValue(true);
    LogService.registrar.mockReset().mockResolvedValue();
});

describe('regras de acesso e status', () => {
    it.each([[admin, true], [costureira, true], [outraCostureira, false], [medico, false], [undefined, false]])(
        '_validarAcesso(%j) → %s', (u, permitido) => {
            const fn = () => Service._validarAcesso(u, contexto());
            permitido ? expect(fn).not.toThrow() : expect(fn).toThrow(expect.objectContaining({ statusCode: 403 }));
        });
    it('_validarStatusEditavel', () => {
        expect(() => Service._validarStatusEditavel(contexto({ ind_status_agendamento: 'cancelado' }))).toThrow(/Agendamento cancelado/);
        expect(() => Service._validarStatusEditavel(contexto({ ind_status_item: 'cancelado' }))).toThrow(/Item cancelado/);
        expect(() => Service._validarStatusEditavel(contexto({ ind_status_agendamento: 'concluido' }))).not.toThrow();
    });
    it('validarAcessoItem: item de outro agendamento → 404', async () => {
        FotoModel.buscarContextoItem.mockResolvedValue(contexto({ id_agendamento: 2 }));
        await expect(Service.validarAcessoItem(1, 3, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe('adicionarFotos', () => {
    it('sucesso: lock, rename, persistência e log', async () => {
        await expect(Service.adicionarFotos(params(), costureira)).resolves.toEqual({ ids: [11, 12], total: 2 });
        expect(FotoModel.buscarContextoItem).toHaveBeenCalledWith(3, CONN, true);
        expect(fs.rename).toHaveBeenCalledWith(temporarios()[0], path.join(ROOT, 'ajustes', 'ag1_it3_antes.jpg'));
        expect(FotoModel.criar).toHaveBeenCalledWith(expect.objectContaining({
            id_produto_agendamento: 3, des_caminho_arquivo: 'ajustes/ag1_it3_antes.jpg', ind_tipo_foto: 'antes'
        }), CONN);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'upload', des_detalhes: expect.objectContaining({ ids_fotos: [11, 12] }) }));
        expect(fs.rm).not.toHaveBeenCalled();
    });
    it.each([
        ['tipo inválido', () => ({ p: params({ ind_tipo_foto: 'lateral' }) }), 400],
        ['sem arquivos', () => ({ p: params({ arquivos: [] }), n: 0 }), 400],
        ['excede por requisição', () => ({ p: params({ arquivos: arquivos(11) }), n: 11 }), 400],
        ['assinatura inválida', () => { detectarTipoImagem.mockResolvedValueOnce({ ext: 'jpg' }).mockResolvedValueOnce(null); return { p: params() }; }, 400],
        ['item de outro agendamento', () => { FotoModel.buscarContextoItem.mockResolvedValue(contexto({ id_agendamento: 2 })); return { p: params() }; }, 404],
        ['costureira não dona', () => ({ p: params(), u: outraCostureira }), 403],
        ['limite por item', () => { FotoModel.contarPorItem.mockResolvedValue(9); return { p: params() }; }, 422],
        ['agendamento cancelado', () => { FotoModel.buscarContextoItem.mockResolvedValue(contexto({ ind_status_agendamento: 'cancelado' })); return { p: params() }; }, 422]
    ])('%s → %s e descarta temporários', async (_, setup, status) => {
        const { p, u = costureira, n = 2 } = setup();
        await expect(Service.adicionarFotos(p, u)).rejects.toMatchObject({ statusCode: status });
        expect(FotoModel.criar).not.toHaveBeenCalled();
        temporarios(n).forEach((t) => expect(fs.rm).toHaveBeenCalledWith(t, { force: true }));
    });
    it('falha após rename descarta também os definitivos', async () => {
        FotoModel.criar.mockReset().mockRejectedValue(new Error('db'));
        await expect(Service.adicionarFotos(params(), admin)).rejects.toThrow('db');
        expect(fs.rm).toHaveBeenCalledWith(path.join(ROOT, 'ajustes', 'ag1_it3_antes.jpg'), { force: true });
    });
    it('falha na auditoria não derruba o upload', async () => {
        LogService.registrar.mockRejectedValue(new Error('log'));
        await expect(Service.adicionarFotos(params(), admin)).resolves.toMatchObject({ total: 2 });
        expect(logger.error).toHaveBeenCalledWith('Falha ao registrar auditoria de foto', expect.objectContaining({ erro: 'log' }));
        expect(fs.rm).not.toHaveBeenCalled();
    });
    it('falha ao descartar arquivo é apenas logada', async () => {
        fs.rm.mockRejectedValue(new Error('EBUSY'));
        await expect(Service.adicionarFotos(params({ ind_tipo_foto: 'lateral' }), costureira))
            .rejects.toMatchObject({ statusCode: 400 });
        expect(logger.error).toHaveBeenCalledWith('Falha ao descartar arquivo', expect.objectContaining({ erro: 'EBUSY' }));
    });
    it('arquivos undefined → 400 sem descartar nada', async () => {
        await expect(Service.adicionarFotos(params({ arquivos: undefined }), costureira))
            .rejects.toMatchObject({ statusCode: 400 });
        expect(fs.rm).not.toHaveBeenCalled();
    });
});

describe('consultas', () => {
    it('listarPorItem mapeia sem caminho físico', async () => {
        const [f] = await Service.listarPorItem(1, 3, admin);
        expect(f).not.toHaveProperty('des_caminho_arquivo');
        expect(f.url_arquivo).toBe('/api/agendamentos/fotos/10/arquivo');
    });
    it('buscarPorId 404 / 403', async () => {
        FotoModel.buscarPorId.mockResolvedValueOnce(null);
        await expect(Service.buscarPorId(10, admin)).rejects.toMatchObject({ statusCode: 404 });
        await expect(Service.buscarPorId(10, medico)).rejects.toMatchObject({ statusCode: 403 });
    });
    it('buscarPorId sucesso retorna foto mapeada', async () => {
        const f = await Service.buscarPorId(10, costureira);
        expect(f).toMatchObject({ id: 10, url_arquivo: '/api/agendamentos/fotos/10/arquivo' });
        expect(f).not.toHaveProperty('des_caminho_arquivo');
    });
    it('obterArquivo resolve caminho e audita', async () => {
        await expect(Service.obterArquivo(10, costureira)).resolves.toEqual({ caminho: path.join(ROOT, 'ajustes/f.jpg') });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toEqual({ tipo_consulta: 'download_arquivo' });
    });
    it('obterArquivo inexistente no banco → 404', async () => {
        FotoModel.buscarPorId.mockResolvedValueOnce(null);
        await expect(Service.obterArquivo(10, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
    it('obterArquivo com arquivo físico ausente → 404 e log', async () => {
        fs.access.mockRejectedValue(new Error('ENOENT'));
        await expect(Service.obterArquivo(10, admin)).rejects.toMatchObject({ statusCode: 404 });
        expect(logger.error).toHaveBeenCalledWith('Arquivo físico de foto ausente', { id_foto: 10 });
    });
});

describe('deletar', () => {
    const origem = path.join(ROOT, 'ajustes/f.jpg');
    const destino = path.join(ROOT, 'deletados', 'f.jpg');

    it('move para deletados, atualiza mtime e caminho', async () => {
        await expect(Service.deletar(10, admin)).resolves.toBe(true);
        expect(FotoModel.buscarPorId).toHaveBeenCalledWith(10, CONN, true);
        expect(fs.rename).toHaveBeenCalledWith(origem, destino);
        expect(fs.utimes).toHaveBeenCalled();
        expect(FotoModel.deletar).toHaveBeenCalledWith(10, 'deletados/f.jpg', CONN);
    });
    it('foto inexistente → 404', async () => {
        FotoModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.deletar(10, admin)).rejects.toMatchObject({ statusCode: 404 });
        expect(fs.rename).not.toHaveBeenCalled();
    });
    it('arquivo ausente (ENOENT) segue com soft delete', async () => {
        fs.rename.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'ENOENT' }));
        await expect(Service.deletar(10, admin)).resolves.toBe(true);
        expect(FotoModel.deletar).toHaveBeenCalledWith(10, null, CONN);
        expect(logger.warn).toHaveBeenCalled();
    });
    it('erro de disco diferente de ENOENT aborta', async () => {
        fs.rename.mockRejectedValueOnce(Object.assign(new Error('perm'), { code: 'EACCES' }));
        await expect(Service.deletar(10, admin)).rejects.toThrow('perm');
        expect(FotoModel.deletar).not.toHaveBeenCalled();
    });
    it('falha no banco após mover reverte o arquivo', async () => {
        FotoModel.deletar.mockRejectedValue(new Error('db'));
        await expect(Service.deletar(10, admin)).rejects.toThrow('db');
        expect(fs.rename).toHaveBeenLastCalledWith(destino, origem);
    });
    it('falha ao reverter movimentação é logada', async () => {
        FotoModel.deletar.mockRejectedValue(new Error('db'));
        fs.rename.mockResolvedValueOnce().mockRejectedValueOnce(new Error('revert'));
        await expect(Service.deletar(10, admin)).rejects.toThrow('db');
        expect(logger.error).toHaveBeenCalledWith('Falha ao reverter movimentação de foto', { id_foto: 10, erro: 'revert' });
    });
    it('item cancelado → 422', async () => {
        FotoModel.buscarPorId.mockResolvedValue(foto({ ind_status_item: 'cancelado' }));
        await expect(Service.deletar(10, admin)).rejects.toMatchObject({ statusCode: 422 });
    });
    it('costureira dona pode excluir', async () => {
        await expect(Service.deletar(10, costureira)).resolves.toBe(true);
    });
    it.each([[outraCostureira], [medico]])('%j não pode excluir foto alheia (IDOR)', async (u) => {
        await expect(Service.deletar(10, u)).rejects.toMatchObject({ statusCode: 403 });
        expect(fs.rename).not.toHaveBeenCalled();
        expect(FotoModel.deletar).not.toHaveBeenCalled();
    });
});
