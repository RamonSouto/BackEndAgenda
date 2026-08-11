const { TIPO_PESSOA, PERMISSOES, MENSAGENS } = require('../utils/constants');

/**
 * Middleware para verificar permissões específicas
 * @param {string|string[]} permissoesRequeridas - Permissão(ões) necessária(s)
 */
const permissionMiddleware = (permissoesRequeridas) => {
    return (req, res, next) => {
        try {
            // Verificar se usuário está autenticado
            if (!req.usuario || !req.usuario.tipo) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
                });
            }

            const tipoUsuario = req.usuario.tipo;
            const permissoesUsuario = PERMISSOES[tipoUsuario] || [];

            // Administrador tem todas as permissões
            if (permissoesUsuario.includes('*')) {
                return next();
            }

            // Converter para array se for string
            const permissoes = Array.isArray(permissoesRequeridas)
                ? permissoesRequeridas
                : [permissoesRequeridas];

            // Verificar se usuário tem pelo menos uma das permissões requeridas
            const temPermissao = permissoes.some(permissao =>
                permissoesUsuario.includes(permissao)
            );

            if (!temPermissao) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso negado',
                    erro: 'Você não tem permissão para executar esta ação'
                });
            }

            next();

        } catch (error) {
            console.error('Erro no middleware de permissão:', error);
            return res.status(500).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.SERVIDOR,
                erro: error.message
            });
        }
    };
};

/**
 * Middleware para verificar se usuário é de um tipo específico
 * @param {string|string[]} tiposPermitidos - Tipo(s) de usuário permitido(s)
 */
const tipoUsuarioMiddleware = (tiposPermitidos) => {
    return (req, res, next) => {
        try {
            if (!req.usuario || !req.usuario.tipo) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
                });
            }

            const tipos = Array.isArray(tiposPermitidos)
                ? tiposPermitidos
                : [tiposPermitidos];

            if (!tipos.includes(req.usuario.tipo)) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso negado',
                    erro: 'Tipo de usuário não autorizado para esta ação'
                });
            }

            next();

        } catch (error) {
            console.error('Erro no middleware de tipo de usuário:', error);
            return res.status(500).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.SERVIDOR,
                erro: error.message
            });
        }
    };
};

/**
 * Middleware para permitir apenas administradores
 */
const apenasAdminMiddleware = (req, res, next) => {
    return tipoUsuarioMiddleware(TIPO_PESSOA.ADMINISTRADOR)(req, res, next);
};

/**
 * Middleware para permitir secretárias e administradores
 */
const secretariaOuAdminMiddleware = (req, res, next) => {
    return tipoUsuarioMiddleware([
        TIPO_PESSOA.SECRETARIA,
        TIPO_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

/**
 * Middleware para permitir costureiras e administradores
 */
const costureiraOuAdminMiddleware = (req, res, next) => {
    return tipoUsuarioMiddleware([
        TIPO_PESSOA.COSTUREIRA,
        TIPO_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

/**
 * Middleware para verificar se usuário pode acessar recurso próprio
 * @param {string} paramName - Nome do parâmetro que contém o ID do recurso
 */
const recursoProprio = (paramName = 'id') => {
    return (req, res, next) => {
        try {
            // Administrador pode acessar qualquer recurso
            if (req.usuario.tipo === TIPO_PESSOA.ADMINISTRADOR) {
                return next();
            }

            const resourceId = parseInt(req.params[paramName]);
            const usuarioId = req.usuario.id;

            if (resourceId !== usuarioId) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso negado',
                    erro: 'Você só pode acessar seus próprios recursos'
                });
            }

            next();

        } catch (error) {
            console.error('Erro no middleware de recurso próprio:', error);
            return res.status(500).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.SERVIDOR,
                erro: error.message
            });
        }
    };
};

module.exports = {
    permissionMiddleware,
    tipoUsuarioMiddleware,
    apenasAdminMiddleware,
    secretariaOuAdminMiddleware,
    costureiraOuAdminMiddleware,
    recursoProprio
};
