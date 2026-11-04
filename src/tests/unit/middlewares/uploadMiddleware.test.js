// src/tests/unit/middlewares/uploadMiddleware.test.js
const mockEstado = { err: null, req: {} };

jest.mock('multer', () => {
    class MulterError extends Error { constructor(code) { super(code); this.code = code; } }
    const handler = () => (req, res, cb) => { Object.assign(req, mockEstado.req); cb(mockEstado.err); };
    const m = jest.fn(() => ({ single: jest.fn(handler), array: jest.fn(handler), fields: jest.fn(handler) }));
    m.MulterError = MulterError;
    return m;
});
jest.mock('../../../services/UploadService', () => ({
    getMulterConfig: jest.fn(() => ({})),
    validarArquivo: jest.fn(),
    deletarArquivo: jest.fn(() => Promise.resolve()),
    formatarTamanhoArquivo: jest.fn(() => '5 MB'),
    maxFileSize: 5242880
}));

const multer = require('multer');
const UploadService = require('../../../services/UploadService');
const { uploadSingle, uploadSingleOptional, uploadMultiple, uploadFields } = require('../../../middlewares/uploadMiddleware');

const executar = (mw) => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    mw(req, res, next);
    return { req, res, next };
};
const arq = (path) => ({ path, mimetype: 'image/png' });
const corpo = (res) => res.json.mock.calls[0][0];
const falhar = () => UploadService.validarArquivo.mockImplementationOnce(() => { throw new Error('inválido'); });

beforeEach(() => {
    jest.clearAllMocks();
    mockEstado.err = null;
    mockEstado.req = {};
});

describe.each([
    ['uploadSingle', uploadSingle, 'ajuste'],
    ['uploadSingleOptional', uploadSingleOptional, 'ajuste']
])('%s – fluxo comum', (_, fabrica, subDirPadrao) => {
    it('subDir padrão e next com arquivo válido', () => {
        mockEstado.req = { file: arq('/a.png') };
        const { req, next } = executar(fabrica());
        expect(req.uploadSubDir).toBe(subDirPadrao);
        expect(UploadService.validarArquivo).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
    it('subDir customizado', () => {
        mockEstado.req = { file: arq('/a.png') };
        expect(executar(fabrica('foto', 'perfil')).req.uploadSubDir).toBe('perfil');
    });
    it('400 para LIMIT_FILE_SIZE', () => {
        mockEstado.err = new multer.MulterError('LIMIT_FILE_SIZE');
        const { res, next } = executar(fabrica());
        expect(corpo(res)).toMatchObject({ mensagem: 'Arquivo muito grande', erro: expect.stringContaining('5 MB') });
        expect(next).not.toHaveBeenCalled();
    });
    it('400 para outro MulterError', () => {
        mockEstado.err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
        expect(corpo(executar(fabrica()).res)).toMatchObject({ mensagem: 'Erro no upload', erro: 'LIMIT_UNEXPECTED_FILE' });
    });
    it('400 para erro genérico', () => {
        mockEstado.err = new Error('falhou');
        expect(corpo(executar(fabrica()).res)).toMatchObject({ mensagem: 'Erro no upload', erro: 'falhou' });
    });
    it('arquivo inválido é deletado e retorna 400', () => {
        mockEstado.req = { file: arq('/x.exe') };
        falhar();
        const { res, next } = executar(fabrica());
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/x.exe');
        expect(corpo(res).mensagem).toBe('Arquivo inválido');
        expect(next).not.toHaveBeenCalled();
    });
});

it('uploadSingle: 400 sem arquivo', () => {
    expect(corpo(executar(uploadSingle()).res).mensagem).toBe('Nenhum arquivo foi enviado');
});

it('uploadSingleOptional: next sem arquivo e sem validar', () => {
    const { next } = executar(uploadSingleOptional());
    expect(next).toHaveBeenCalled();
    expect(UploadService.validarArquivo).not.toHaveBeenCalled();
});

describe('uploadMultiple', () => {
    it.each([
        ['LIMIT_FILE_SIZE', 'Um ou mais arquivos são muito grandes'],
        ['LIMIT_FILE_COUNT', 'Muitos arquivos'],
        ['OUTRO', 'Erro no upload']
    ])('MulterError %s', (code, mensagem) => {
        mockEstado.err = new multer.MulterError(code);
        expect(corpo(executar(uploadMultiple('fotos', 3)).res).mensagem).toBe(mensagem);
    });
    it('LIMIT_FILE_COUNT informa maxCount', () => {
        mockEstado.err = new multer.MulterError('LIMIT_FILE_COUNT');
        expect(corpo(executar(uploadMultiple('fotos', 3)).res).erro).toContain('3');
    });
    it('erro genérico e subDir padrão', () => {
        mockEstado.err = new Error('x');
        const { req, res } = executar(uploadMultiple());
        expect(req.uploadSubDir).toBe('ajustes');
        expect(corpo(res).mensagem).toBe('Erro no upload');
    });
    it.each([[undefined], [[]]])('400 sem arquivos (%p)', (files) => {
        mockEstado.req = files === undefined ? {} : { files };
        expect(corpo(executar(uploadMultiple()).res).mensagem).toBe('Nenhum arquivo foi enviado');
    });
    it('um inválido deleta todos', () => {
        mockEstado.req = { files: [arq('/1'), arq('/2')] };
        UploadService.validarArquivo.mockImplementationOnce(() => { }).mockImplementationOnce(() => { throw new Error('x'); });
        const { res } = executar(uploadMultiple());
        expect(UploadService.deletarArquivo).toHaveBeenCalledTimes(2);
        expect(corpo(res).mensagem).toBe('Um ou mais arquivos são inválidos');
    });
    it('todos válidos → next', () => {
        mockEstado.req = { files: [arq('/1'), arq('/2')] };
        expect(executar(uploadMultiple()).next).toHaveBeenCalled();
        expect(UploadService.validarArquivo).toHaveBeenCalledTimes(2);
    });
});

describe('uploadFields', () => {
    const campos = [{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }];

    it.each([
        ['MulterError', () => new multer.MulterError('X')],
        ['genérico', () => new Error('y')]
    ])('400 para erro %s', (_, criarErro) => {
        mockEstado.err = criarErro();
        const { req, res } = executar(uploadFields(campos));
        expect(req.uploadSubDir).toBe('empresa');
        expect(corpo(res).mensagem).toBe('Erro no upload');
    });
    it('sem arquivos → next', () => {
        expect(executar(uploadFields(campos)).next).toHaveBeenCalled();
    });
    it('valida arquivos de todos os campos', () => {
        mockEstado.req = { files: { logo: [arq('/l')], banner: [arq('/b')] } };
        const { req, next } = executar(uploadFields(campos, 'x'));
        expect(req.uploadSubDir).toBe('x');
        expect(UploadService.validarArquivo).toHaveBeenCalledTimes(2);
        expect(next).toHaveBeenCalled();
    });
    it('inválido em qualquer campo deleta todos', () => {
        mockEstado.req = { files: { logo: [arq('/l')], banner: [arq('/b')] } };
        falhar();
        const { res } = executar(uploadFields(campos));
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/l');
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith('/b');
        expect(corpo(res).mensagem).toBe('Arquivo inválido');
    });
});
