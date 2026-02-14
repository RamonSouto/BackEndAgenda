const rateLimit = require('express-rate-limit');
const { MENSAGENS } = require('../utils/constants');

/**
 * Rate limiter geral para todas as rotas
 */
const limiterGeral = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo de 100 requisições por IP
    message: {
        sucesso: false,
        mensagem: 'Muitas requisições',
        erro: 'Você excedeu o limite de requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter mais restritivo para login
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
 * Rate limiter para criação de registros
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
 * Rate limiter para upload de arquivos
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

module.exports = {
    limiterGeral,
    limiterLogin,
    limiterCriacao,
    limiterUpload
};
