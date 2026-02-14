const AuthService = require('../services/AuthService');
const { MENSAGENS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

class AuthController {
    /**
     * Login de usuário
     * POST /api/auth/login
     */
    login = asyncHandler(async (req, res) => {
        const { num_cpf, des_senha } = req.body;

        if (!num_cpf || !des_senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'CPF e senha são obrigatórios'
            });
        }

        const resultado = await AuthService.login(
            num_cpf,
            des_senha,
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
     * Logout de usuário
     * POST /api/auth/logout
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
     * Verificar token
     * GET /api/auth/verificar
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
     * Alterar senha do próprio usuário
     * PUT /api/auth/alterar-senha
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
     * Resetar senha de um usuário (apenas admin)
     * POST /api/auth/resetar-senha
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
     * Obter perfil do usuário logado
     * GET /api/auth/perfil
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
