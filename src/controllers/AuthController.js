// /src/controllers/AuthController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/AuthController.js
 * @description Controlador de autenticação e gerenciamento de usuários.
 * Gerencia login, logout, verificação de token, alteração de senha,
 * reset de senha (admin) e obtenção de perfil.
 * 
 * @requires ../services/AuthService
 * @requires ../utils/constants
 * @requires ../middlewares/errorMiddleware
 */
const AuthService = require('../services/AuthService');
const { MENSAGENS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * Classe AuthController.
 * @class AuthController
 */
class AuthController {
    /**
     * Login de usuário.
     * 
     * @name login
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.body - Corpo da requisição.
     * @param {string} req.body.user - CPF ou identificador do usuário.
     * @param {string} req.body.senha - Senha do usuário.
     * @param {string} [req.ipAddress] - Endereço IP real (injetado por middleware).
     * @param {string} req.ip - Endereço IP da requisição.
     * @param {Function} req.get - Função para obter cabeçalhos.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com token e dados do usuário.
     * 
     * @throws {Error} - Repassa erros para o middleware de erros via asyncHandler.
     * 
     * @example
     * POST /api/auth/login
     * Body: { "user": "11144477735", "senha": "senha123" }
     * // Resposta 200:
     * {
     *   "sucesso": true,
     *   "mensagem": "Login realizado com sucesso",
     *   "dados": { "token": "...", "usuario": { ... } }
     * }
     */
    login = asyncHandler(async (req, res) => {
        const { user, senha } = req.body;
        if (!user || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'CPF e senha são obrigatórios'
            });
        }

        const resultado = await AuthService.login(
            user,
            senha,
            req.ipAddress || req.ip,
            req.get('user-agent')
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.LOGIN,
            dados: resultado
        });
    });

    /**
     * Logout de usuário.
     * 
     * @name logout
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado (injetado pelo authMiddleware).
     * @param {number} req.usuario.id - ID do usuário.
     * @param {string} [req.ipAddress] - IP real.
     * @param {string} req.ip - IP da requisição.
     * @param {Function} req.get - Para obter User-Agent.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @example
     * POST /api/auth/logout
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": "Logout realizado com sucesso" }
     */
    logout = asyncHandler(async (req, res) => {
        await AuthService.logout(
            req.usuario.id,
            req.ipAddress || req.ip,
            req.get('user-agent')
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Logout realizado com sucesso'
        });
    });

    /**
     * Verifica a validade do token JWT.
     * 
     * @name verificarToken
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado (decodificado do token).
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Retorna dados do usuário se o token for válido.
     * 
     * @example
     * GET /api/auth/verificar
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": "Token válido", "dados": { "usuario": { ... } } }
     */
    verificarToken = asyncHandler(async (req, res) => {
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Token válido',
            dados: {
                usuario: req.usuario
            }
        });
    });

    /**
     * Altera a senha do próprio usuário autenticado.
     * 
     * @name alterarSenha
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} req.body - Corpo da requisição.
     * @param {string} req.body.senha_atual - Senha atual.
     * @param {string} req.body.nova_senha - Nova senha.
     * @param {string} req.body.confirmar_senha - Confirmação da nova senha.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso ou erro.
     * 
     * @throws {Error} - Se a senha atual estiver incorreta ou outro erro.
     * 
     * @example
     * PUT /api/auth/alterar-senha
     * Body: { "senha_atual": "123456", "nova_senha": "654321", "confirmar_senha": "654321" }
     * // Resposta 200: { "sucesso": true, "mensagem": "Senha alterada com sucesso" }
     */
    alterarSenha = asyncHandler(async (req, res) => {
        const { senha_atual, nova_senha, confirmar_senha } = req.body;

        if (!senha_atual || !nova_senha || !confirmar_senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Todos os campos são obrigatórios'
            });
        }

        if (nova_senha !== confirmar_senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Nova senha e confirmação não coincidem'
            });
        }

        if (nova_senha.length < 6) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Nova senha deve ter no mínimo 6 caracteres'
            });
        }

        await AuthService.alterarSenha(req.usuario.id, senha_atual, nova_senha);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Senha alterada com sucesso'
        });
    });

    /**
     * Reseta a senha de um usuário (apenas administradores).
     * 
     * @name resetarSenha
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado (admin).
     * @param {number} req.usuario.id - ID do administrador (para auditoria).
     * @param {Object} req.body - Corpo da requisição.
     * @param {string} req.body.num_cpf - CPF do usuário alvo.
     * @param {string} req.body.nova_senha - Nova senha a ser definida.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso ou erro.
     * 
     * @throws {Error} - Se o CPF não existir ou outro erro.
     * 
     * @example
     * POST /api/auth/resetar-senha
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "num_cpf": "11144477735", "nova_senha": "nova123" }
     * // Resposta 200: { "sucesso": true, "mensagem": "Senha resetada com sucesso" }
     */
    resetarSenha = asyncHandler(async (req, res) => {
        const { num_cpf, nova_senha } = req.body;

        if (!num_cpf || !nova_senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'CPF e nova senha são obrigatórios'
            });
        }

        if (nova_senha.length < 6) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Nova senha deve ter no mínimo 6 caracteres'
            });
        }

        await AuthService.resetarSenha(num_cpf, nova_senha, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Senha resetada com sucesso'
        });
    });

    /**
     * Obtém o perfil completo do usuário autenticado.
     * 
     * @name obterPerfil
     * @function
     * @memberof AuthController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Retorna os dados do perfil.
     * 
     * @throws {Error} - Se o usuário não for encontrado.
     * 
     * @example
     * GET /api/auth/perfil
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "dados": { "id": 1, "nome": "João", ... } }
     */
    obterPerfil = asyncHandler(async (req, res) => {
        const PessoaService = require('../services/PessoaService');
        const pessoa = await PessoaService.buscarPorId(req.usuario.id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });
}

module.exports = new AuthController();
