// /src/tests/unit/controllers/agendamento/FotoProdutoAgendamentoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/agendamento/FotoProdutoAgendamentoService', () => ({
    validarAcessoItem: jest.fn(), adicionarFotos: jest.fn(), listarPorItem: jest.fn(),
    buscarPorId: jest.fn(), obterArquivo: jest.fn(), deletar: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/agendamento/FotoProdutoAgendamentoService');
const ctrl = require('../../../../controllers/agendamento/FotoProdutoAgendamentoController');

const usuario = { id: 1, tipo: 'administrador' };
const params = { idAgendamento: '1', idItem: '3', id: '10' };

beforeEach(() => jest.clearAllMocks());

describe('validarAcessoUpload', () => {
    it('chama next() sem erro quando autorizado', async () => {
        const next = jest.fn();
        await ctrl.validarAcessoUpload(mockReq({ params }), mockRes(), next);
        expect(S.validarAcessoItem).toHaveBeenCalledWith('1', '3', usuario);
        expect(next).toHaveBeenCalledWith();
    });

    it('nega acesso antes do Multer gravar', async () => {
        const erro = new Error('proibido');
        S.validarAcessoItem.mockRejectedValue(erro);
        const next = jest.fn();
        await ctrl.validarAcessoUpload(mockReq({ params }), mockRes(), next);
        expect(next).toHaveBeenCalledWith(erro);
    });
});

it('adicionar monta payload com req.files', async () => {
    const files = [{ path: '/a' }];
    const res = mockRes();
    await ctrl.adicionar(mockReq({ params, body: { ind_tipo_foto: 'antes' }, files }), res, jest.fn());
    expect(S.adicionarFotos).toHaveBeenCalledWith({ idAgendamento: '1', idItem: '3', ind_tipo_foto: 'antes', arquivos: files }, usuario);
    expect(res.status).toHaveBeenCalledWith(201);
});

it('listarPorItem e buscarPorId', async () => {
    S.listarPorItem.mockResolvedValue([{}]);
    const res = mockRes();
    await ctrl.listarPorItem(mockReq({ params }), res, jest.fn());
    await ctrl.buscarPorId(mockReq({ params }), mockRes(), jest.fn());
    expect(res.json.mock.calls[0][0].total).toBe(1);
    expect(S.buscarPorId).toHaveBeenCalledWith('10', usuario);
});

describe('baixarArquivo', () => {
    beforeEach(() => S.obterArquivo.mockResolvedValue({ caminho: '/uploads/ajustes/foto.png' }));

    it('define headers seguros e envia com dotfiles deny', async () => {
        const res = mockRes();
        await ctrl.baixarArquivo(mockReq({ params }), res, jest.fn());
        expect(res.set).toHaveBeenCalledWith({
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'inline; filename="foto.png"'
        });
        expect(res.sendFile).toHaveBeenCalledWith('/uploads/ajustes/foto.png', { dotfiles: 'deny' }, expect.any(Function));
    });

    it('erro de stream vai para next se headers não enviados', async () => {
        const res = mockRes(); const next = jest.fn(); const erro = new Error('ENOENT');
        res.sendFile.mockImplementation((p, o, cb) => cb(erro));
        await ctrl.baixarArquivo(mockReq({ params }), res, next);
        expect(next).toHaveBeenCalledWith(erro);
    });

    it('não chama next se headers já enviados', async () => {
        const res = mockRes(); res.headersSent = true; const next = jest.fn();
        res.sendFile.mockImplementation((p, o, cb) => cb(new Error('x')));
        await ctrl.baixarArquivo(mockReq({ params }), res, next);
        expect(next).not.toHaveBeenCalled();
    });
});

it('deletar', async () => {
    await ctrl.deletar(mockReq({ params }), mockRes(), jest.fn());
    expect(S.deletar).toHaveBeenCalledWith('10', usuario);
});
