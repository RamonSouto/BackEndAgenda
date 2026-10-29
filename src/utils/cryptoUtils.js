// src/utils/cryptoUtils.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/cryptoUtils.js
 * @description Criptografia simétrica AES-256-GCM para segredos em repouso
 * (ex.: senha SMTP). Formato versionado "v1:iv:tag:ciphertext" (base64),
 * permitindo rotação futura de algoritmo/chave sem migração destrutiva.
 * IV de 12 bytes aleatório por operação; tag de autenticação de 16 bytes
 * garante integridade (adulteração no banco é detectada).
 *
 * @requires crypto
 * @requires ../config/env
 */
const crypto = require('crypto');
const config = require('../config/env');

const ALGORITMO = 'aes-256-gcm';
const VERSAO = 'v1';
const TAMANHO_IV = 12;

/**
 * Obtém e valida a chave mestra (32 bytes em base64).
 *
 * @function obterChave
 * @private
 * @returns {Buffer}
 * @throws {Error} Se a chave estiver ausente ou com tamanho inválido.
 */
function obterChave() {
    const chave = Buffer.from(config.email.encryptionKey || '', 'base64');
    if (chave.length !== 32) {
        throw new Error('EMAIL_ENCRYPTION_KEY inválida: esperado 32 bytes em base64');
    }
    return chave;
}

/**
 * Valida a chave no boot (fail-fast).
 *
 * @function validarChave
 * @returns {void}
 * @throws {Error}
 *
 * @example
 * validarChave(); // lança se .env estiver incorreto
 */
function validarChave() {
    obterChave();
}

/**
 * Criptografa um texto.
 *
 * @function criptografar
 * @param {string} texto - Texto puro.
 * @returns {string} Payload "v1:iv:tag:ct".
 *
 * @example
 * const enc = criptografar('minhaSenhaSMTP');
 */
function criptografar(texto) {
    const iv = crypto.randomBytes(TAMANHO_IV);
    const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv);
    const ct = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSAO, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Descriptografa um payload gerado por `criptografar`.
 *
 * @function descriptografar
 * @param {string} payload - "v1:iv:tag:ct".
 * @returns {string} Texto puro.
 * @throws {Error} Se formato inválido, chave errada ou dado adulterado.
 *
 * @example
 * const senha = descriptografar(empresa.des_smtp_senha_enc);
 */
function descriptografar(payload) {
    const [versao, iv, tag, ct] = String(payload || '').split(':');
    if (versao !== VERSAO || !iv || !tag || !ct) {
        throw new Error('Formato de segredo criptografado inválido');
    }
    const decipher = crypto.createDecipheriv(ALGORITMO, obterChave(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { criptografar, descriptografar, validarChave };
