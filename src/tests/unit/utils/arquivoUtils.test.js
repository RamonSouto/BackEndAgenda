// src/tests/unit/utils/arquivoUtils.test.js
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {
    detectarTipoImagem, gerarNomeFotoAjuste, sanitizarNomeOriginal, resolverCaminhoSeguro
} = require('../../../utils/arquivoUtils');

describe('arquivoUtils', () => {
    let dir;
    beforeAll(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'arq-')); });
    afterAll(async () => { await fs.rm(dir, { recursive: true, force: true }); });

    const criar = async (nome, bytes) => {
        const p = path.join(dir, nome);
        await fs.writeFile(p, Buffer.from(bytes));
        return p;
    };

    describe('detectarTipoImagem', () => {
        it('detecta JPEG pela assinatura', async () => {
            const p = await criar('a', [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0]);
            await expect(detectarTipoImagem(p)).resolves.toEqual({ mime: 'image/jpeg', ext: '.jpg' });
        });
        it('detecta PNG pela assinatura', async () => {
            const p = await criar('b', [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            await expect(detectarTipoImagem(p)).resolves.toEqual({ mime: 'image/png', ext: '.png' });
        });
        it('rejeita arquivo disfarçado (GIF/texto)', async () => {
            const p = await criar('c', [0x47, 0x49, 0x46, 0x38]);
            await expect(detectarTipoImagem(p)).resolves.toBeNull();
        });
        it('limite: PNG truncado (7 bytes) → null', async () => {
            const p = await criar('d', [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A]);
            await expect(detectarTipoImagem(p)).resolves.toBeNull();
        });
        it('limite: arquivo vazio → null', async () => {
            const p = await criar('e', []);
            await expect(detectarTipoImagem(p)).resolves.toBeNull();
        });
    });

    describe('gerarNomeFotoAjuste', () => {
        it.each([['antes', 'A'], ['depois', 'D']])('tipo %s → sufixo %s', (tipo, suf) => {
            expect(gerarNomeFotoAjuste(1, 2, tipo, '.jpg'))
                .toMatch(new RegExp(`^ajuste-1-2-${suf}-\\d+-[0-9a-f]{6}\\.jpg$`));
        });
        it('gera nomes únicos em chamadas consecutivas', () => {
            expect(gerarNomeFotoAjuste(1, 1, 'antes', '.png')).not.toBe(gerarNomeFotoAjuste(1, 1, 'antes', '.png'));
        });
    });

    describe('sanitizarNomeOriginal', () => {
        it('troca caracteres perigosos por _', () => {
            expect(sanitizarNomeOriginal('foto <script>.jpg')).toBe('foto__script_.jpg');
        });
        it('fallback para nome vazio', () => {
            expect(sanitizarNomeOriginal(undefined)).toBe('arquivo');
        });
        it('limite: trunca em 255 caracteres', () => {
            expect(sanitizarNomeOriginal('a'.repeat(300))).toHaveLength(255);
        });
    });

    describe('resolverCaminhoSeguro', () => {
        it('resolve caminho interno', () => {
            expect(resolverCaminhoSeguro(dir, 'ajustes/x.jpg')).toBe(path.join(dir, 'ajustes', 'x.jpg'));
        });
        it.each(['../../etc/passwd', '/etc/passwd', '.', ''])('bloqueia traversal: "%s"', (rel) => {
            expect(() => resolverCaminhoSeguro(dir, rel)).toThrow('Caminho de arquivo inválido');
        });
    });
});
