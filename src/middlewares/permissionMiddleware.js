// src/middlewares/permissionMiddleware.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module permissionMiddleware
 * @description Middlewares para controle de acesso baseado em papéis (roles) e permissões (permissions).
 * Fornece verificação de permissões, papéis, atalhos para combinações comuns,
 * e validação de acesso a recursos próprios.
 * 
 * @requires ../utils/constants
 * @requires ../utils/logger (logger estruturado, opcional)
 */

const { PAPEIS_PESSOA, PERMISSOES, MENSAGENS } = require('../utils/constants');

/**
 * Função auxiliar para extrair lista de papéis de um objeto usuário.
 * Primeiro tenta usar `usuario.papeis` (array); se não existir, extrai das flags booleanas.
 * 
 * @private
 * @param {Object} usuario - Objeto do usuário (pode conter `papeis` ou flags).
 * @returns {string[]} Lista de nomes de papéis.
 */
const extrairPapeisUsuario = (usuario) => {
    if (!usuario) return [];

    if (Array.isArray(usuario.papeis) && usuario.papeis.length > 0) {
        return usuario.papeis;
    }

    const papeis = [];

    if (usuario.ind_medico) papeis.push(PAPEIS_PESSOA.MEDICO);
    if (usuario.ind_secretaria) papeis.push(PAPEIS_PESSOA.SECRETARIA);
    if (usuario.ind_costureira) papeis.push(PAPEIS_PESSOA.COSTUREIRA);
    if (usuario.ind_paciente) papeis.push(PAPEIS_PESSOA.PACIENTE);
    if (usuario.ind_administrador) papeis.push(PAPEIS_PESSOA.ADMINISTRADOR);

    return papeis;
};

/**
 * Middleware para verificar se o usuário possui **pelo menos uma** das permissões requeridas.
 * 
 * @function permissionMiddleware
 * @param {string|string[]} permissoesRequeridas - Uma permissão (string) ou lista de permissões.
 * @returns {Function} Middleware do Express.
 * 
 * @example
 * // Permite acesso apenas se o usuário tiver permissão 'usuarios:editar'
 * app.put('/usuarios/:id', permissionMiddleware('usuarios:editar'), controller);
 * 
 * // Permite acesso se tiver 'usuarios:listar' OU 'usuarios:visualizar'
 * app.get('/usuarios', permissionMiddleware(['usuarios:listar', 'usuarios:visualizar']), controller);
 */
const permissionMiddleware = (permissoesRequeridas) => {
    return (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Usuário não autenticado'
                });
            }

            const papeisUsuario = req.usuario.papeis || extrairPapeisUsuario(req.usuario);

            if (!papeisUsuario.length) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Usuário não possui papéis definidos'
                });
            }

            const todasPermissoes = new Set();

            for (const papel of papeisUsuario) {
                const permissoesDoPapel = PERMISSOES[papel] || [];
                permissoesDoPapel.forEach(permissao => todasPermissoes.add(permissao));
            }

            if (todasPermissoes.has('*')) {
                return next();
            }

            const permissoes = Array.isArray(permissoesRequeridas)
                ? permissoesRequeridas
                : [permissoesRequeridas];

            const temPermissao = permissoes.some(permissao => todasPermissoes.has(permissao));

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
 * Middleware para verificar se o usuário possui **pelo menos um** dos papéis permitidos.
 * 
 * @function papelMiddleware
 * @param {string|string[]} papeisPermitidos - Um papel (string) ou lista de papéis.
 * @returns {Function} Middleware do Express.
 * 
 * @example
 * // Permite apenas administradores
 * app.delete('/usuarios/:id', papelMiddleware('administrador'), controller);
 * 
 * // Permite secretárias ou administradores
 * app.get('/agendamentos', papelMiddleware(['secretaria', 'administrador']), controller);
 */
const papelMiddleware = (papeisPermitidos) => {
    return (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Usuário não autenticado'
                });
            }

            const papeisUsuario = req.usuario.papeis || extrairPapeisUsuario(req.usuario);

            if (!papeisUsuario.length) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO,
                    erro: 'Usuário não possui papéis definidos'
                });
            }

            const papeis = Array.isArray(papeisPermitidos)
                ? papeisPermitidos
                : [papeisPermitidos];

            const autorizado = papeis.some(papel => papeisUsuario.includes(papel));

            if (!autorizado) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso negado',
                    erro: 'Papel de usuário não autorizado para esta ação'
                });
            }

            next();
        } catch (error) {
            console.error('Erro no middleware de papel de usuário:', error);
            return res.status(500).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.SERVIDOR,
                erro: error.message
            });
        }
    };
};

/**
 * Middleware que permite apenas usuários com papel de administrador.
 * 
 * @function apenasAdminMiddleware
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 * @param {Function} next - Função next.
 * @returns {void} - Chama next() se autorizado, ou retorna erro.
 * 
 * @example
 * app.delete('/configuracoes', apenasAdminMiddleware, controller);
 */
const apenasAdminMiddleware = (req, res, next) => {
    return papelMiddleware(PAPEIS_PESSOA.ADMINISTRADOR)(req, res, next);
};

/**
 * Middleware que permite usuários com papel de secretária ou administrador.
 * 
 * @function secretariaOuAdminMiddleware
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 * @param {Function} next - Função next.
 * @returns {void} - Chama next() se autorizado, ou retorna erro.
 * 
 * @example
 * app.post('/agendamentos', secretariaOuAdminMiddleware, controller);
 */
const secretariaOuAdminMiddleware = (req, res, next) => {
    return papelMiddleware([
        PAPEIS_PESSOA.SECRETARIA,
        PAPEIS_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

/**
 * Middleware que permite usuários com papel de costureira ou administrador.
 * 
 * @function costureiraOuAdminMiddleware
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 * @param {Function} next - Função next.
 * @returns {void} - Chama next() se autorizado, ou retorna erro.
 * 
 * @example
 * app.put('/servicos', costureiraOuAdminMiddleware, controller);
 */
const costureiraOuAdminMiddleware = (req, res, next) => {
    return papelMiddleware([
        PAPEIS_PESSOA.COSTUREIRA,
        PAPEIS_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

/**
 * Middleware que restringe acesso a recursos pertencentes ao próprio usuário.
 * Administradores têm acesso irrestrito.
 * 
 * @function recursoProprio
 * @param {string} [paramName='id'] - Nome do parâmetro na rota que contém o ID do recurso.
 * @returns {Function} Middleware do Express.
 * 
 * @example
 * // Apenas o próprio usuário pode acessar /usuarios/5 (se id=5)
 * app.get('/usuarios/:id', recursoProprio('id'), controller);
 * 
 * @throws {403} Se o usuário tentar acessar recurso de outro usuário (e não for admin).
 */
const recursoProprio = (paramName = 'id') => {
    return (req, res, next) => {
        try {
            const papeisUsuario = req.usuario?.papeis || extrairPapeisUsuario(req.usuario || {});

            if (papeisUsuario.includes(PAPEIS_PESSOA.ADMINISTRADOR)) {
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
    papelMiddleware,
    apenasAdminMiddleware,
    secretariaOuAdminMiddleware,
    costureiraOuAdminMiddleware,
    recursoProprio,
    extrairPapeisUsuario
};