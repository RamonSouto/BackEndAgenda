const { MENSAGENS } = require('../utils/constants');

/**
 * Middleware para tratamento de erros 404
 */
const notFoundMiddleware = (req, res, next) => {
    return res.status(404).json({
        sucesso: false,
        mensagem: MENSAGENS.ERRO.NAO_ENCONTRADO,
        erro: `Rota ${req.method} ${req.path} não encontrada`
    });
};

/**
 * Middleware para tratamento global de erros
 */
const errorMiddleware = (err, req, res, next) => {
    console.error('❌ Erro capturado:', err);

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
 * Middleware para tratamento de erros assíncronos
 * Envolve funções async/await para capturar erros automaticamente
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para validação de ID numérico
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
 * Middleware para validar body da requisição
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
 * Middleware para sanitizar entrada de dados
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
