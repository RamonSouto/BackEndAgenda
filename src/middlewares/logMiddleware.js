const LogService = require('../services/LogService');

/**
 * Middleware para registrar automaticamente todas as requisições
 */
const logMiddleware = async (req, res, next) => {
    // Armazenar dados originais
    const originalSend = res.send;
    const startTime = Date.now();

    // Sobrescrever método send para capturar resposta
    res.send = function (data) {
        res.send = originalSend;

        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Registrar apenas se houver usuário autenticado
        if (req.usuario) {
            // Não registrar logs de consulta de logs (evitar recursão infinita)
            if (!req.path.includes('/api/logs')) {
                LogService.registrar({
                    id_usuario: req.usuario.id,
                    des_acao: `${req.method}_${req.path}`,
                    des_tabela: 'requisicoes',
                    des_detalhes: {
                        metodo: req.method,
                        rota: req.path,
                        query: req.query,
                        status_code: statusCode,
                        duracao_ms: duration,
                        sucesso: statusCode >= 200 && statusCode < 400
                    },
                    num_ip_address: req.ipAddress || req.ip,
                    des_user_agent: req.get('user-agent')
                }).catch(err => {
                    console.error('Erro ao registrar log de requisição:', err.message);
                });
            }
        }

        return originalSend.call(this, data);
    };

    next();
};

module.exports = logMiddleware;
