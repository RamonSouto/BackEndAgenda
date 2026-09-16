// src/utils/ApiError.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module ApiError
 * @description Hierarquia de erros operacionais para APIs REST.
 * Fornece classes base e especializadas para códigos HTTP comuns.
 */

/**
 * Classe base para erros operacionais da API.
 * Estende Error nativo e adiciona statusCode e flag isOperational.
 * 
 * @class ApiError
 * @extends Error
 * @param {string} message - Mensagem descritiva do erro.
 * @param {number} statusCode - Código HTTP (ex: 400, 404, 500).
 * 
 * @property {number} statusCode - Código HTTP do erro.
 * @property {boolean} isOperational - Indica se é um erro operacional previsto.
 * 
 * @example
 * throw new ApiError('Dados inválidos', 400);
 */
class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // útil para diferenciar erros operacionais de bugs
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Erro 404 - Recurso não encontrado.
 * @class NotFoundError
 * @extends ApiError
 * @param {string} [message='Recurso não encontrado'] - Mensagem personalizada.
 */
class NotFoundError extends ApiError {
    constructor(message = 'Recurso não encontrado') {
        super(message, 404);
    }
}

/**
 * Erro 400 - Requisição inválida (ex: validação falhou).
 * @class BadRequestError
 * @extends ApiError
 * @param {string} [message='Requisição inválida'] - Mensagem personalizada.
 */
class BadRequestError extends ApiError {
    constructor(message = 'Requisição inválida') {
        super(message, 400);
    }
}

/**
 * Erro 401 - Não autorizado (falta de autenticação).
 * @class UnauthorizedError
 * @extends ApiError
 * @param {string} [message='Não autorizado'] - Mensagem personalizada.
 */
class UnauthorizedError extends ApiError {
    constructor(message = 'Não autorizado') {
        super(message, 401);
    }
}

/**
 * Erro 403 - Acesso proibido (autenticado, mas sem permissão).
 * @class ForbiddenError
 * @extends ApiError
 * @param {string} [message='Acesso proibido'] - Mensagem personalizada.
 */
class ForbiddenError extends ApiError {
    constructor(message = 'Acesso proibido') {
        super(message, 403);
    }
}

/**
 * Erro 409 - Conflito de dados (ex: duplicidade de registro).
 * @class ConflictError
 * @extends ApiError
 * @param {string} [message='Conflito de dados'] - Mensagem personalizada.
 */
class ConflictError extends ApiError {
    constructor(message = 'Conflito de dados') {
        super(message, 409);
    }
}

module.exports = {
    ApiError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError
};