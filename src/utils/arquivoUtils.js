// src/utils/arquivoUtils.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/arquivoUtils.js
 * @description Funções puras/utilitárias para arquivos: detecção do tipo real
 * de imagem por assinatura binária (magic bytes), geração do nome padronizado
 * das fotos de ajuste, sanitização de nome original e proteção contra
 * path traversal.
 *
 * @requires fs/promises
 * @requires path
 * @requires crypto
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/**
 * Assinaturas binárias aceitas. A extensão final vem daqui,
 * nunca do originalname enviado pelo cliente.
 */
const ASSINATURAS = [
    { mime: 'image/jpeg', ext: '.jpg', bytes: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/png', ext: '.png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
];

/**
 * Detecta o tipo real da imagem lendo os primeiros 8 bytes do arquivo.
 *
 * @function detectarTipoImagem
 * @async
 * @param {string} caminho - Caminho absoluto do arquivo.
 * @returns {Promise<{mime: string, ext: string}|null>} Tipo detectado ou null se não for JPEG/PNG.
 *
 * @example
 * const tipo = await detectarTipoImagem('/app/uploads/ajustes/tmp-123');
 * // { mime: 'image/jpeg', ext: '.jpg' }
 */
async function detectarTipoImagem(caminho) {
    const handle = await fs.open(caminho, 'r');
    try {
        const buffer = Buffer.alloc(8);
        const { bytesRead } = await handle.read(buffer, 0, 8, 0);

        const tipo = ASSINATURAS.find((a) =>
            bytesRead >= a.bytes.length && a.bytes.every((byte, i) => buffer[i] === byte)
        );

        return tipo ? { mime: tipo.mime, ext: tipo.ext } : null;
    } finally {
        await handle.close();
    }
}

/**
 * Gera o nome padronizado da foto de ajuste.
 * Formato: ajuste-{idAgendamento}-{idItem}-{A|D}-{timestamp}-{6 hex}.{ext}
 * Os 3 bytes aleatórios evitam colisão em uploads no mesmo milissegundo.
 *
 * @function gerarNomeFotoAjuste
 * @param {number} idAgendamento
 * @param {number} idItem
 * @param {'antes'|'depois'} indTipoFoto
 * @param {string} ext - Extensão com ponto (ex: '.jpg').
 * @returns {string} Nome do arquivo.
 *
 * @example
 * gerarNomeFotoAjuste(1, 1, 'antes', '.jpg'); // 'ajuste-1-1-A-1730000000000-a1b2c3.jpg'
 */
function gerarNomeFotoAjuste(idAgendamento, idItem, indTipoFoto, ext) {
    const sufixoTipo = indTipoFoto === 'antes' ? 'A' : 'D';
    const aleatorio = crypto.randomBytes(3).toString('hex');
    return `ajuste-${idAgendamento}-${idItem}-${sufixoTipo}-${Date.now()}-${aleatorio}${ext}`;
}

/**
 * Sanitiza o nome original do arquivo para persistência (máx. 255 chars).
 *
 * @function sanitizarNomeOriginal
 * @param {string} nome
 * @returns {string}
 *
 * @example
 * sanitizarNomeOriginal('foto <script>.jpg'); // 'foto__script_.jpg'
 */
function sanitizarNomeOriginal(nome) {
    return String(nome || 'arquivo')
        .normalize('NFKD')
        .replace(/[^\w.\-]/g, '_')
        .slice(0, 255);
}

/**
 * Resolve um caminho relativo garantindo que ele permaneça dentro do diretório base
 * (proteção contra path traversal, ex: '../../etc/passwd').
 *
 * @function resolverCaminhoSeguro
 * @param {string} baseDir - Diretório base.
 * @param {string} relativo - Caminho relativo salvo no banco.
 * @returns {string} Caminho absoluto.
 * @throws {Error} Se o caminho escapar do diretório base.
 *
 * @example
 * resolverCaminhoSeguro('./uploads', 'ajustes/ajuste-1-1-A-1.jpg');
 */
function resolverCaminhoSeguro(baseDir, relativo) {
    const base = path.resolve(baseDir);
    const absoluto = path.resolve(base, relativo);

    if (!absoluto.startsWith(base + path.sep)) {
        throw new Error('Caminho de arquivo inválido');
    }
    return absoluto;
}

module.exports = {
    detectarTipoImagem,
    gerarNomeFotoAjuste,
    sanitizarNomeOriginal,
    resolverCaminhoSeguro
};
