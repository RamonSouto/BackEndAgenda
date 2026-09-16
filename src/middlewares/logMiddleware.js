// src/middlewares/logMiddleware.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module logMiddleware
 * @description Middleware de logging estruturado de requisições HTTP.
 * Registra método, rota, status, tempo de resposta e usuário (se autenticado)
 * usando o logger Winston. Mantém separação de responsabilidade em relação
 * ao LogService (auditoria de negócio em banco de dados).
 *
 * @requires ../config/logger
 */
const logger = require('../config/logger');

/**
 * Middleware que intercepta requisições e registra métricas estruturadas.
 *
 * @function logMiddleware
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Próximo middleware da cadeia.
 * @returns {void}
 *
 * @description
 * Utiliza o evento `finish` da resposta para capturar o tempo total
 * de processamento e o status HTTP final, sem interferir no fluxo
 * normal da requisição (não bloqueia, não altera req/res).
 */
const logMiddleware = (req, res, next) => {
    const inicio = Date.now();

    res.on('finish', () => {
        const duracaoMs = Date.now() - inicio;
        const nivel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger[nivel]('Requisição HTTP', {
            metodo: req.method,
            rota: req.originalUrl,
            status: res.statusCode,
            duracaoMs,
            ip: req.ip,
            usuarioId: req.usuario?.id || null
        });
    });

    next();
};

module.exports = logMiddleware;
