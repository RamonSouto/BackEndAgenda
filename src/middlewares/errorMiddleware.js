// src/middlewares/errorMiddleware.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module errorMiddleware
 * @description Middlewares para tratamento de erros, validação e sanitização de entrada.
 * Fornece: erro 404, tratamento global de exceções, wrapper assíncrono,
 * validação de ID, validação de corpo e sanitização de strings.
 * 
 * @requires ../utils/constants
 * @requires ../utils/ApiError (para verificação de instância)
 */

const { MENSAGENS } = require('../utils/constants');
const logger = require('../config/logger');

/**
 * Middleware para rotas não encontradas (404).
 * 
 * @function notFoundMiddleware
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função next (não usada, mas mantida por padrão).
 * @returns {void} - Envia resposta JSON com status 404.
 */
const notFoundMiddleware = (req, res, next) => {
    return res.status(404).json({
        sucesso: false,
        mensagem: MENSAGENS.ERRO.NAO_ENCONTRADO,
        erro: `Rota ${req.method} ${req.path} não encontrada`
    });
};

/**
 * Middleware global de tratamento de erros.
 * Identifica diferentes tipos de erro e retorna resposta padronizada.
 * 
 * @function errorMiddleware
 * @param {Error} err - Objeto de erro capturado.
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função next (não usada, mas necessária).
 * @returns {void} - Envia resposta JSON com status apropriado.
 * 
 * @example
 * // Uso no app principal:
 * app.use(errorMiddleware);
 */
const errorMiddleware = (err, req, res, next) => {
    // console.log(err.statusCode);
    // console.error('❌ Erro capturado:', err);
    logger.error('Erro capturado pelo errorMiddleware', {
        mensagem: err.message,
        stack: err.stack,
        codigo: err.code,
        rota: req.originalUrl,
        metodo: req.method
    });

    // Erro de validação do Joi
    if (err.isJoi) {
        return res.status(400).json({
            sucesso: false,
            mensagem: MENSAGENS.ERRO.VALIDACAO,
            erro: err.details[0].message,
            detalhes: err.details
        });
    }

    // Erro do MySQL
    if (err.code && err.code.startsWith('ER_')) {
        let mensagem = 'Erro no banco de dados';
        let statusCode = 500;

        switch (err.code) {
            case 'ER_DUP_ENTRY':
                mensagem = 'Registro duplicado';
                statusCode = 409;
                break;
            case 'ER_NO_REFERENCED_ROW_2':
                mensagem = 'Referência inválida';
                statusCode = 400;
                break;
            case 'ER_ROW_IS_REFERENCED_2':
                mensagem = 'Não é possível deletar. Existem registros relacionados';
                statusCode = 400;
                break;
            case 'ER_SIGNAL_EXCEPTION':
                mensagem = err.sqlMessage || 'Erro de validação do banco';
                statusCode = 400;
                break;
        }

        return res.status(statusCode).json({
            sucesso: false,
            mensagem: mensagem,
            erro: err.sqlMessage || err.message
        });
    }

    // Erro do Multer (upload)
    if (err.name === 'MulterError') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Erro no upload de arquivo',
            erro: err.message
        });
    }

    // Erro de sintaxe JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'JSON inválido',
            erro: 'O corpo da requisição contém JSON malformado'
        });
    }

    // Erro genérico
    const statusCode = err.statusCode || err.status || 500;
    const mensagem = statusCode === 500 ? MENSAGENS.ERRO.SERVIDOR : err.message;

    return res.status(statusCode).json({
        sucesso: false,
        mensagem: mensagem,
        erro: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Wrapper para capturar erros em funções assíncronas async/await (controllers).
 * 
 * @function asyncHandler
 * @param {Function} fn - Função assíncrona (controller) a ser envolvida.
 * @returns {Function} Middleware que executa fn e repassa erros para next.
 * 
 * @example
 * router.get('/usuarios', asyncHandler(async (req, res) => {
 *   const usuarios = await Usuario.findAll();
 *   res.json(usuarios);
 * }));
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Factory para middleware que valida parâmetros de rota como números inteiros positivos.
 * 
 * @function validarIdMiddleware
 * @param {string} [paramName='id'] - Nome do parâmetro na rota (ex: 'id', 'userId').
 * @returns {Function} Middleware que valida e converte o parâmetro.
 * 
 * @example
 * router.get('/usuario/:id', validarIdMiddleware('id'), (req, res) => {
 *   // req.params.id é um número
 * });
 */
const validarIdMiddleware = (paramName = 'id') => {
    return (req, res, next) => {
        const id = parseInt(req.params[paramName]);

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: `${paramName} deve ser um número inteiro positivo`
            });
        }

        req.params[paramName] = id;
        next();
    };
};

/**
 * Middleware que valida se o corpo da requisição não está vazio para métodos POST, PUT e PATCH.
 * 
 * @function validarBodyMiddleware
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função next.
 * @returns {void} - Se vazio, retorna 400; caso contrário, chama next().
 */
const validarBodyMiddleware = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Corpo da requisição não pode estar vazio'
            });
        }
    }
    next();
};

/**
 * Middleware que sanitiza campos string em req.body e req.query,
 * removendo espaços em branco no início e fim (trim).
 * 
 * @function sanitizarInputMiddleware
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função next.
 * @returns {void} - Modifica req.body e req.query, depois chama next().
 * 
 * @note A sanitização é aplicada recursivamente a objetos e arrays.
 * @warning Em alguns casos, pode ser desejável não aplicar trim a todos os campos;
 * considere aplicar apenas em campos específicos via schema de validação.
 */
const sanitizarInputMiddleware = (req, res, next) => {
    // Sanitizar strings removendo caracteres perigosos
    const sanitizar = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim();
        }

        if (Array.isArray(obj)) {
            return obj.map(item => sanitizar(item));
        }

        if (obj !== null && typeof obj === 'object') {
            const sanitizado = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitizado[key] = sanitizar(obj[key]);
                }
            }
            return sanitizado;
        }

        return obj;
    };

    if (req.body) {
        req.body = sanitizar(req.body);
    }

    if (req.query) {
        req.query = sanitizar(req.query);
    }

    next();
};

module.exports = {
    notFoundMiddleware,
    errorMiddleware,
    asyncHandler,
    validarIdMiddleware,
    validarBodyMiddleware,
    sanitizarInputMiddleware
};
