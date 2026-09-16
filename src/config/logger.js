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
const LOG_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

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
    'num_cpf', 'cpf', 'num_cnpj', 'cnpj'
]);

/**
 * Formatter recursivo que substitui valores sensíveis por "***".
 * Funciona em objetos aninhados e arrays.
 */
const maskSensitiveFormat = winston.format((info) => {
    const maskValue = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key of Object.keys(obj)) {
            if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
                obj[key] = '***';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                maskValue(obj[key]);
            }
        }
        return obj;
    };
    return maskValue(info);
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
    level: config.env === 'production' ? 'info' : 'debug',
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
    // transports: [
    //     // 1) Erros → arquivo dedicado
    //     new winston.transports.File({
    //         filename: path.join(LOG_DIR, 'error.log'),
    //         level: 'error',
    //         maxsize: 5 * 1024 * 1024,
    //         maxFiles: 5,
    //         tailable: true,
    //         format: combine(
    //             timestamp(),
    //             injectContextFormat(),
    //             maskSensitiveFormat(),
    //             errors({ stack: true }),
    //             json()
    //         )
    //     }),

    //     // 2) Tudo (HTTP, warnings, info) → arquivo geral
    //     new winston.transports.File({
    //         filename: path.join(LOG_DIR, 'combined.log'),
    //         maxsize: 10 * 1024 * 1024,
    //         maxFiles: 10,
    //         tailable: true,
    //         format: combine(
    //             timestamp(),
    //             injectContextFormat(),
    //             maskSensitiveFormat(),
    //             errors({ stack: true }),
    //             json()
    //         )
    //     })
    // ]
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