const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { MENSAGENS } = require('../utils/constants');

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
                tipo: decoded.tipo
            };

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
            erro: error.message
        });
    }
};

module.exports = authMiddleware;
