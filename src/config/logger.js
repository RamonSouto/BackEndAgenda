// src/config/logger.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/config/logger.js
 * @description Configuração central do logger estruturado (Winston).
 *
 * - Em produção: JSON puro (ideal para Datadog, Loki, ELK, CloudWatch).
 * - Em desenvolvimento: formato legível com cores.
 * - Mascara automaticamente campos sensíveis (senha, token, cpf).
 * - Injeta requestId vindo do AsyncLocalStorage em todos os logs.
 *
 * @requires winston
 * @requires winston-daily-rotate-file
 * @requires path
 * @requires fs
 * @requires ./env
 * @requires ../utils/loggerContext
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('./env');
const { getContext } = require('../utils/loggerContext');


// ---------------------------------------------------------------------------
// Diretório de logs
// ---------------------------------------------------------------------------
const LOG_DIR = path.resolve(config.logger.directory);

// ---------------------------------------------------------------------------
// Formatos
// ---------------------------------------------------------------------------
const {
    combine, timestamp, printf, colorize, errors, json, splat
} = winston.format;

/**
 * Campos que nunca devem aparecer em log (LGPD/segurança).
 * Comparação em lowercase.
 */
const SENSITIVE_KEYS = new Set([
    'des_senha', 'senha', 'password', 'senha_atual', 'nova_senha',
    'token', 'authorization', 'jwt', 'api_key', 'apikey',
    'num_cpf', 'cpf', 'num_cnpj', 'cnpj', 'des_smtp_senha', 'des_smtp_senha_enc', 'smtp_senha', 'pass'
]);

const mascarar = (valor, vistos = new WeakSet()) => {
    if (!valor || typeof valor !== 'object' || valor instanceof Date || valor instanceof Error) return valor;
    if (vistos.has(valor)) return '[Circular]';
    vistos.add(valor);
    if (Array.isArray(valor)) return valor.map((v) => mascarar(v, vistos));
    return Object.fromEntries(Object.entries(valor).map(([k, v]) =>
        [k, SENSITIVE_KEYS.has(k.toLowerCase()) ? '***' : mascarar(v, vistos)]));
};

/**
 * Formatter recursivo que substitui valores sensíveis por "***".
 * Funciona em objetos aninhados e arrays.
 */
const maskSensitiveFormat = winston.format((info) => {
    for (const k of Object.keys(info)) {
        info[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '***' : mascarar(info[k]);
    }
    return info;
});

/**
 * Injeta requestId (vindo do AsyncLocalStorage) em todos os logs,
 * mesmo que o logger seja chamado dentro de um Service sem receber req.
 */
const injectContextFormat = winston.format((info) => {
    const { requestId, userId } = getContext();
    if (requestId && !info.requestId) info.requestId = requestId;
    if (userId && !info.userId) info.userId = userId;
    return info;
});

/**
 * Formato legível para desenvolvimento.
 */
const devFormat = printf(({ level, message, timestamp, requestId, stack, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    const stackStr = stack ? `\n${stack}` : '';
    const metaKeys = Object.keys(meta).filter(
        (k) => !['service', 'env', 'splat'].includes(k)
    );
    const metaStr = metaKeys.length
        ? `\n  ↳ ${JSON.stringify(
            metaKeys.reduce((acc, k) => ({ ...acc, [k]: meta[k] }), {}),
            null,
            2
        )}`
        : '';
    return `${timestamp} ${level}${rid}: ${message}${metaStr}${stackStr}`;
});

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const logger = winston.createLogger({
    level: config.logger.level,
    defaultMeta: {
        service: 'agenda-ajuste',
        env: config.env,
        pid: process.pid
    },
    exitOnError: false,
    transports: [
        // 1) Erros → arquivo dedicado, rotação diária
        new DailyRotateFile({
            filename: path.join(LOG_DIR, 'error-%DATE%.log'),
            datePattern: config.logger.datePattern,
            level: 'error',
            maxSize: config.logger.maxSize,
            maxFiles: config.logger.maxFiles,
            zippedArchive: true,
            format: combine(
                timestamp(),
                injectContextFormat(),
                maskSensitiveFormat(),
                errors({ stack: true }),
                json()
            )
        }),

        // 2) Tudo (HTTP, warnings, info) → arquivo geral, rotação diária
        new DailyRotateFile({
            filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
            datePattern: config.logger.datePattern,
            maxSize: config.logger.maxSize,
            maxFiles: config.logger.maxFiles,
            zippedArchive: true,
            format: combine(
                timestamp(),
                injectContextFormat(),
                maskSensitiveFormat(),
                errors({ stack: true }),
                json()
            )
        })
    ]
});

// Console apenas fora de produção
if (config.env !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            timestamp({ format: 'HH:mm:ss.SSS' }),
            injectContextFormat(),
            maskSensitiveFormat(),
            errors({ stack: true }),
            splat(),
            devFormat
        )
    }));
}

// ---------------------------------------------------------------------------
// Stream para uso com middleware HTTP
// ---------------------------------------------------------------------------
logger.stream = {
    write: (message) => logger.http(message.trim())
};

module.exports = logger;