const { PAPEIS_PESSOA, PERMISSOES, MENSAGENS } = require('../utils/constants');

const extrairPapeisUsuario = (usuario) => {
    const papeis = [];

    if (usuario.ind_medico) papeis.push(PAPEIS_PESSOA.MEDICO);
    if (usuario.ind_secretaria) papeis.push(PAPEIS_PESSOA.SECRETARIA);
    if (usuario.ind_costureira) papeis.push(PAPEIS_PESSOA.COSTUREIRA);
    if (usuario.ind_paciente) papeis.push(PAPEIS_PESSOA.PACIENTE);
    if (usuario.ind_administrador) papeis.push(PAPEIS_PESSOA.ADMINISTRADOR);

    return papeis;
};

const permissionMiddleware = (permissoesRequeridas) => {
    return (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
                });
            }

            const papeisUsuario = req.usuario.papeis || extrairPapeisUsuario(req.usuario);

            if (!papeisUsuario.length) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
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

const papelMiddleware = (papeisPermitidos) => {
    return (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
                });
            }

            const papeisUsuario = req.usuario.papeis || extrairPapeisUsuario(req.usuario);

            if (!papeisUsuario.length) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: MENSAGENS.ERRO.NAO_AUTORIZADO
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

const apenasAdminMiddleware = (req, res, next) => {
    return papelMiddleware(PAPEIS_PESSOA.ADMINISTRADOR)(req, res, next);
};

const secretariaOuAdminMiddleware = (req, res, next) => {
    return papelMiddleware([
        PAPEIS_PESSOA.SECRETARIA,
        PAPEIS_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

const costureiraOuAdminMiddleware = (req, res, next) => {
    return papelMiddleware([
        PAPEIS_PESSOA.COSTUREIRA,
        PAPEIS_PESSOA.ADMINISTRADOR
    ])(req, res, next);
};

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