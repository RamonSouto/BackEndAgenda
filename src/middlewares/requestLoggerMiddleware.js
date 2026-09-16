//

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/middlewares/requestLoggerMiddleware.js
 * @description Middleware de logging HTTP com correlação via AsyncLocalStorage.
 * Substitui o antigo logMiddleware mantendo compatibilidade com o LogService
 * (auditoria de domínio), se desejado.
 */
const crypto = require('crypto');
const logger = require('../config/logger');
const { runWithContext } = require('../utils/loggerContext');

/**
 * Gera um ID de requisição único (compatível com Node 16.0.0 – sem randomUUID).
 */
// const generateRequestId = () =>
//     crypto.randomBytes(8).toString('hex');
const generateRequestId = () => crypto.randomUUID();


const requestLoggerMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    const startNs = process.hrtime.bigint();

    // Expõe o ID para o cliente (útil em suporte/depuração)
    res.setHeader('X-Request-Id', requestId);
    req.id = requestId;

    // Cria child logger e associa à requisição
    const reqLogger = logger.child({ requestId });
    req.logger = reqLogger;

    // Propaga contexto (útil para Services/Models que não recebem req)
    runWithContext({ requestId }, () => {
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
            const { statusCode } = res;

            const level =
                statusCode >= 500 ? 'error' :
                    statusCode >= 400 ? 'warn' :
                        'http';

            reqLogger.log(level, `${req.method} ${req.originalUrl} ${statusCode}`, {
                method: req.method,
                url: req.originalUrl,
                statusCode,
                durationMs: Number(durationMs.toFixed(2)),
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('user-agent'),
                userId: req.usuario?.id || null
            });
        });

        next();
    });
};

module.exports = requestLoggerMiddleware;