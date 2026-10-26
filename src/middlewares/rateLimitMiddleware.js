// src/middlewares/rateLimitMiddleware.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file rateLimitMiddleware.js
 * @module rateLimitMiddleware
 * @description Configura middlewares de rate limiting para proteger a API contra abusos.
 * Fornece limitadores específicos para rotas gerais, login, criação e upload,
 * com janelas de tempo e limites configuráveis via variáveis de ambiente.
 * 
 * @requires express-rate-limit
 * @requires ../utils/constants
 * @requires ../config/env (opcional, se houver variáveis)
 * @requires ../config/logger
 */

const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');
const { MENSAGENS } = require('../utils/constants');
const logger = require('../config/logger');
const { optional, options } = require('joi');
/**
 * Middleware de rate limiting geral para todas as rotas.
 * 
 * @constant {Function} limiterGeral
 * @description Aplica limite de 10.000 requisições por IP a cada 15 minutos.
 * Configurável via variáveis de ambiente:
 * - `RATE_LIMIT_GERAL_WINDOW_MS` (milissegundos) – padrão: 900000 (15 min)
 * - `RATE_LIMIT_GERAL_MAX` (requisições) – padrão: 10000
 * 
 * @example
 * // Aplicar a todas as rotas (exceto login)
 * app.use('/api', limiterGeral);
 */
const limiterGeral = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10000, // máximo de 100 requisições por IP
    message: {
        sucesso: false,
        mensagem: 'Muitas requisições',
        erro: 'Você excedeu o limite de requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,

});

/**
 * Middleware de rate limiting para rotas de login.
 * 
 * @constant {Function} limiterLogin
 * @description Permite apenas 5 tentativas (por IP) a cada 15 minutos.
 * Configurável via variáveis de ambiente:
 * - `RATE_LIMIT_LOGIN_WINDOW_MS` – padrão: 900000 (15 min)
 * - `RATE_LIMIT_LOGIN_MAX` – padrão: 5
 * 
 * @example
 * app.post('/api/login', limiterLogin, loginController);
 */
const limiterLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo de 5 tentativas de login
    message: {
        sucesso: false,
        mensagem: 'Muitas tentativas de login',
        erro: 'Você excedeu o limite de tentativas de login. Tente novamente em 15 minutos.'
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Middleware de rate limiting para criação de registros (POST).
 * 
 * @constant {Function} limiterCriacao
 * @description Permite até 10 criações por IP a cada minuto.
 * Configurável via variáveis de ambiente:
 * - `RATE_LIMIT_CRIACAO_WINDOW_MS` – padrão: 60000 (1 min)
 * - `RATE_LIMIT_CRIACAO_MAX` – padrão: 10
 * 
 * @example
 * app.post('/api/produtos', limiterCriacao, criarProduto);
 */
const limiterCriacao = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // máximo de 10 criações por minuto
    message: {
        sucesso: false,
        mensagem: 'Muitas requisições de criação',
        erro: 'Você está criando registros muito rapidamente. Aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Middleware de rate limiting para upload de arquivos.
 * 
 * @constant {Function} limiterUpload
 * @description Permite até 5 uploads por IP a cada minuto.
 * Configurável via variáveis de ambiente:
 * - `RATE_LIMIT_UPLOAD_WINDOW_MS` – padrão: 60000 (1 min)
 * - `RATE_LIMIT_UPLOAD_MAX` – padrão: 5
 * 
 * @example
 * app.post('/api/upload', limiterUpload, uploadController);
 */
const limiterUpload = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // máximo de 5 uploads por minuto
    message: {
        sucesso: false,
        mensagem: 'Muitos uploads',
        erro: 'Você está fazendo uploads muito rapidamente. Aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Middleware de rate limiting para a rota PÚBLICA de agendamento.
 * 
 * @constant {Function} limiterPublicoAgendamento
 * @description Limite agressivo: 5 requisições por IP a cada 1 hora.
 * Rotas públicas de agendamento são vetor clássico de spam/DoS
 * (ex.: bot travando todos os horários disponíveis da costureira).
 * Não usa `skipSuccessfulRequests` propositalmente: mesmo tentativas
 * bem-sucedidas contam, pois criar múltiplos agendamentos falsos
 * também é abuso.
 * 
 * Configurável via variáveis de ambiente:
 * - `RATE_LIMIT_PUBLICO_WINDOW_MS` – padrão: 3600000 (1h)
 * - `RATE_LIMIT_PUBLICO_MAX` – padrão: 5
 * 
 * @example
 * router.post('/agendamentos/publico', limiterPublicoAgendamento, controller);
 */
const limiterPublicoAgendamento = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_PUBLICO_WINDOW_MS) || 60 * 60 * 1000, // 1 hora
    max: parseInt(process.env.RATE_LIMIT_PUBLICO_MAX) || 5,
    message: {
        sucesso: false,
        mensagem: 'Muitas tentativas de agendamento',
        erro: 'Você excedeu o limite de agendamentos por hora. Tente novamente mais tarde ou entre em contato com a clínica.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit excedido em rota pública de agendamento', {
            ip: req.ip,
            rota: req.originalUrl
        });
        res.status(429).json(options.message);
    }
});

module.exports = {
    limiterGeral,
    limiterLogin,
    limiterCriacao,
    limiterUpload,
    limiterPublicoAgendamento
};
