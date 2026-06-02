// errors/ApiError.js
class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // útil para diferenciar erros operacionais de bugs
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends ApiError {
    constructor(message = 'Recurso não encontrado') {
        super(message, 404);
    }
}

class BadRequestError extends ApiError {
    constructor(message = 'Requisição inválida') {
        super(message, 400);
    }
}

class UnauthorizedError extends ApiError {
    constructor(message = 'Não autorizado') {
        super(message, 401);
    }
}

class ForbiddenError extends ApiError {
    constructor(message = 'Acesso proibido') {
        super(message, 403);
    }
}

// Adicione outras classes conforme necessidade

module.exports = {
    ApiError,
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
};