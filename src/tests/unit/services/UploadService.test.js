// src/tests/unit/services/UploadService.test.js

jest.mock('../../../config/env', () => ({
    upload: {
        directory: require('path').join(require('os').tmpdir(), `upload-test-${process.pid}`),
        maxFileSize: 1024,
        allowedTypes: ['image/jpeg', 'image/png']
    }
}));

const path = require('path');
const fsp = require('fs').promises;
const config = require('../../../config/env');
const Service = require('../../../services/UploadService');

const DIR = config.upload.directory;
const DIA = 24 * 60 * 60 * 1000;
const rel = (abs) => path.relative(process.cwd(), abs);
const erroFs = (code) => Object.assign(new Error(code), { code });

const criarArquivo = async (sub, nome, idadeMs = 0) => {
    const p = path.join(DIR, sub, nome);
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(p, 'x');
    const t = new Date(Date.now() - idadeMs);
    await fsp.utimes(p, t, t);
    return p;
};

const nomeGerado = (req, originalname = 'foto.jpg') => new Promise((resolve, reject) =>
    Service.getStorage().getFilename(req, { originalname }, (err, nome) => (err ? reject(err) : resolve(nome))));

beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    await fsp.rm(DIR, { recursive: true, force: true });
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => fsp.rm(DIR, { recursive: true, force: true }));

describe('UploadService – configuração', () => {
    it('carrega config do env', () => {
        expect(Service).toMatchObject({ uploadDir: DIR, maxFileSize: 1024, allowedTypes: ['image/jpeg', 'image/png'] });
    });
    it('inicializar cria ajustes e deletados', async () => {
        await Service.inicializar();
        await expect(fsp.access(path.join(DIR, 'ajustes'))).resolves.toBeUndefined();
        await expect(fsp.access(path.join(DIR, 'deletados'))).resolves.toBeUndefined();
    });
    // NOVO (linha 67)
    it('inicializar: erro no mkdir é logado e não propaga', async () => {
        jest.spyOn(fsp, 'mkdir').mockRejectedValueOnce(new Error('EACCES'));
        await expect(Service.inicializar()).resolves.toBeUndefined();
        expect(console.error).toHaveBeenCalledWith('Erro ao criar diretório de uploads:', 'EACCES');
    });
    it('getMulterConfig expõe limite e filtro', () => {
        const cfg = Service.getMulterConfig();
        expect(cfg.limits.fileSize).toBe(1024);
        expect(typeof cfg.fileFilter).toBe('function');
    });
    it.each([['image/png', null, true], ['application/pdf', expect.any(Error), false]])
        ('fileFilter %s', (mimetype, erro, aceito) => {
            const cb = jest.fn();
            Service.getFileFilter()({}, { mimetype }, cb);
            expect(cb).toHaveBeenCalledWith(erro, aceito);
        });
});

describe('UploadService.getStorage', () => {
    it('destination cria subpasta (padrão imagem_ajuste)', async () => {
        const destino = await new Promise((res) => Service.getStorage().getDestination({}, {}, (e, d) => res(d)));
        expect(destino).toBe(path.join(DIR, 'imagem_ajuste'));
        await expect(fsp.access(destino)).resolves.toBeUndefined();
    });
    // NOVO (linha 93)
    it('destination: erro no mkdir vai para cb(error)', async () => {
        jest.spyOn(fsp, 'mkdir').mockRejectedValueOnce(new Error('falha'));
        const erro = await new Promise((res) => Service.getStorage().getDestination({ uploadSubDir: 'x' }, {}, (e) => res(e)));
        expect(erro).toEqual(expect.objectContaining({ message: 'falha' }));
    });
    it('ajustes → nome temporário sem extensão', async () => {
        expect(await nomeGerado({ uploadSubDir: 'ajustes' })).toMatch(/^tmp-\d+-[0-9a-f]{12}$/);
    });
    it.each([
        [{ uploadSubDir: 'imagem_produto', body: { id_produto: 1 } }, 'img-prod'],
        [{ uploadSubDir: 'imagem_produto', body: { id_produto_grade: 1 } }, 'img-grad'],
        [{ uploadSubDir: 'imagem_produto', body: {} }, 'img-prod'],
        [{ uploadSubDir: 'avatar_usuario' }, 'img-avat'],
        [{ uploadSubDir: 'imagem_ajuste' }, 'img-ajus'],
        [{}, 'img']
    ])('%j → prefixo %s', async (req, prefixo) => {
        expect(await nomeGerado(req)).toMatch(new RegExp(`^${prefixo}-foto-\\d+-\\d+\\.jpg$`));
    });
    it('sanitiza o nome original', async () => {
        expect(await nomeGerado({}, 'minha foto!@#.png')).toMatch(/^img-minhafoto-\d+-\d+\.png$/);
    });
});

describe('UploadService.validarArquivo', () => {
    it('válido', () => expect(Service.validarArquivo({ size: 100, mimetype: 'image/jpeg' })).toBe(true));
    it.each([
        [undefined, 'Nenhum arquivo foi enviado'],
        [{ size: 2048, mimetype: 'image/jpeg' }, 'Arquivo muito grande. Tamanho máximo: 1 KB'],
        [{ size: 10, mimetype: 'text/plain' }, /Tipo de arquivo não permitido/]
    ])('%j → erro', (file, msg) => expect(() => Service.validarArquivo(file)).toThrow(msg));
});

describe('UploadService.formatarTamanhoArquivo', () => {
    it.each([[0, '0 Bytes'], [500, '500 Bytes'], [1536, '1.5 KB'], [1536000, '1.46 MB'], [1073741824, '1 GB']])
        ('%i → %s', (bytes, esperado) => expect(Service.formatarTamanhoArquivo(bytes)).toBe(esperado));
    it.failing('>= 1 TB não deve retornar "undefined"', () => {
        expect(Service.formatarTamanhoArquivo(1024 ** 4)).not.toMatch(/undefined/);
    });
});

describe('UploadService – operações de arquivo', () => {
    it('verificar, obter informações e deletar', async () => {
        const p = rel(await criarArquivo('x', 'a.jpg'));
        await expect(Service.verificarArquivoExiste(p)).resolves.toBe(true);

        const info = await Service.obterInformacoesArquivo(p);
        expect(info.tamanho).toBe(1);
        expect(Object.prototype.toString.call(info.modificado_em)).toBe('[object Date]');
        expect(Number.isNaN(info.modificado_em.getTime())).toBe(false);

        await expect(Service.deletarArquivo(p)).resolves.toBe(true);
        await expect(Service.verificarArquivoExiste(p)).resolves.toBe(false);
    });
    it('arquivo inexistente', async () => {
        await expect(Service.deletarArquivo('nao/existe.jpg')).resolves.toBe(false);
        await expect(Service.obterInformacoesArquivo('nao/existe.jpg')).rejects.toThrow('Erro ao obter informações do arquivo');
    });
    it.failing('deletarArquivo deve bloquear path traversal', async () => {
        const unlink = jest.spyOn(fsp, 'unlink').mockResolvedValue();
        await Service.deletarArquivo('../../etc/passwd');
        expect(unlink).not.toHaveBeenCalled();
    });
    it('caminhoRelativo usa "/"', () => {
        expect(Service.caminhoRelativo({ path: path.join(DIR, 'imagem_produto', 'a.jpg') })).toBe('imagem_produto/a.jpg');
    });
});

describe('UploadService.listarArquivosDiretorio', () => {
    it('pasta inexistente → []', async () => {
        await expect(Service.listarArquivosDiretorio('nada')).resolves.toEqual([]);
    });
    it('lista só arquivos (ignora subpastas)', async () => {
        await criarArquivo('deletados', 'a.jpg');
        await fsp.mkdir(path.join(DIR, 'deletados', 'sub'));
        const r = await Service.listarArquivosDiretorio();
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ nome: 'a.jpg', tamanho: 1, tamanho_formatado: '1 Bytes' });
    });
    it('erro diferente de ENOENT → lança', async () => {
        await criarArquivo('', 'arquivo-no-lugar-de-pasta');
        await expect(Service.listarArquivosDiretorio('arquivo-no-lugar-de-pasta')).rejects.toThrow('Erro ao listar arquivos do diretório');
    });
    // NOVO (linhas 332-333)
    it('arquivo removido durante a listagem (stat ENOENT) é ignorado', async () => {
        await criarArquivo('deletados', 'sumiu.jpg');
        jest.spyOn(fsp, 'stat').mockRejectedValueOnce(erroFs('ENOENT'));
        await expect(Service.listarArquivosDiretorio()).resolves.toEqual([]);
    });
    it('stat com erro diferente de ENOENT → lança', async () => {
        await criarArquivo('deletados', 'trancado.jpg');
        jest.spyOn(fsp, 'stat').mockRejectedValueOnce(erroFs('EACCES'));
        await expect(Service.listarArquivosDiretorio()).rejects.toThrow('Erro ao listar arquivos do diretório');
    });
});

describe('UploadService – limpezas', () => {
    it('limparArquivosAntigos remove só os vencidos', async () => {
        const velho = await criarArquivo('deletados', 'velho.jpg', 91 * DIA);
        const novo = await criarArquivo('deletados', 'novo.jpg', 10 * DIA);
        await expect(Service.limparArquivosAntigos(90)).resolves.toBe(1);
        await expect(fsp.access(velho)).rejects.toThrow();
        await expect(fsp.access(novo)).resolves.toBeUndefined();
    });
    // NOVO
    it('limparArquivosAntigos usa padrão de 90 dias', async () => {
        await criarArquivo('deletados', 'velho.jpg', 91 * DIA);
        await expect(Service.limparArquivosAntigos()).resolves.toBe(1);
    });
    it('limparTemporarios remove só tmp-* antigos', async () => {
        const tmpVelho = await criarArquivo('ajustes', 'tmp-1-abc', 25 * 60 * 60 * 1000);
        const tmpNovo = await criarArquivo('ajustes', 'tmp-2-abc');
        const fotoVelha = await criarArquivo('ajustes', 'foto.jpg', 30 * DIA);
        await expect(Service.limparTemporarios(24)).resolves.toBe(1);
        await expect(fsp.access(tmpVelho)).rejects.toThrow();
        await expect(fsp.access(tmpNovo)).resolves.toBeUndefined();
        await expect(fsp.access(fotoVelha)).resolves.toBeUndefined();
    });
    it('sem pasta → 0', async () => {
        await expect(Service.limparTemporarios()).resolves.toBe(0);
    });
});
