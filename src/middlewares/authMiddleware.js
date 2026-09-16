// src/middlewares/authMiddleware.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module authMiddleware
 * @description Middleware de autenticação JWT para proteger rotas da API.
 * Extrai e valida o token Bearer do cabeçalho Authorization, injeta dados do usuário
 * no objeto `req` e permite ou nega o acesso.
 * 
 * @requires jsonwebtoken
 * @requires ../config/env
 * @requires ../utils/constants
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { MENSAGENS } = require('../utils/constants');
const { setContext } = require('../utils/loggerContext');

/**
 * Middleware de autenticação.
 * 
 * @function authMiddleware
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função para passar o controle para o próximo middleware/controller.
 * @returns {void} - Se autenticado, chama `next()`. Caso contrário, envia resposta JSON com erro.
 * 
 * @property {Object} req.usuario - Adicionado ao objeto `req` em caso de sucesso.
 * @property {number|string} req.usuario.id - ID do usuário extraído do token.
 * @property {string} req.usuario.cpf - CPF do usuário.
 * @property {Array<string>} req.usuario.papeis - Lista de papéis/funções do usuário.
 * @property {string} req.ipAddress - Endereço IP do cliente (real, considerando proxy).
 * @property {string} req.userAgent - User-Agent do cliente.
 * 
 * @example
 * // Uso em uma rota Express
 * app.get('/perfil', authMiddleware, (req, res) => {
 *   res.json({ usuario: req.usuario });
 * });
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Verificar se token foi fornecido
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                erro: 'Token não fornecido'
            });
        }

        // Extrair token do header (formato: "Bearer TOKEN")
        const parts = authHeader.split(' ');

        if (parts.length !== 2) {
            return res.status(401).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                erro: 'Formato de token inválido'
            });
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            return res.status(401).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                erro: 'Token mal formatado'
            });
        }

        // Verificar e decodificar token
        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            // Adicionar informações do usuário ao request
            req.usuario = {
                id: decoded.id,
                cpf: decoded.cpf,
                papeis: Array.isArray(decoded.papeis) ? decoded.papeis : []
            };
            setContext({ userId: decoded.id });

            // Adicionar informações de IP e User Agent
            req.ipAddress = req.ip || req.connection.remoteAddress;
            req.userAgent = req.get('user-agent') || 'Desconhecido';

            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Token expirado'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Token inválido'
                });
            }

            throw error;
        }

    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: MENSAGENS.ERRO.SERVIDOR,
            erro: 'Erro interno ao processar autenticação'
        });
    }
};

module.exports = authMiddleware;
