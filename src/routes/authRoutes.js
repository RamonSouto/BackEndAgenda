// src/routes/authRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/authRoutes.js
 * @description Rotas de autenticação e gerenciamento de usuário.
 * Gerencia login, logout, verificação de token, perfil, alteração de senha
 * e reset de senha (apenas administradores).
 * 
 * @requires express
 * @requires ../controllers/AuthController
 * @requires ../middlewares/authMiddleware
 * @requires ../middlewares/permissionMiddleware
 * @requires ../middlewares/rateLimitMiddleware
 * @requires ../middlewares/errorMiddleware
 */
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { limiterLogin } = require('../middlewares/rateLimitMiddleware');
const { validarBodyMiddleware } = require('../middlewares/errorMiddleware');

/**
 * Rota de login.
 * 
 * @name POST /api/auth/login
 * @function
 * @description Autentica um usuário e retorna um token JWT.
 * @access Público (sem autenticação)
 * 
 * @param {Object} req.body - Dados de login.
 * @param {string} req.body.num_cpf - CPF do usuário (11 dígitos).
 * @param {string} req.body.des_senha - Senha do usuário.
 * 
 * @returns {Object} 200 - Token JWT e dados do usuário.
 * @returns {Object} 400 - Erro de validação ou corpo vazio.
 * @returns {Object} 401 - Credenciais inválidas.
 * @returns {Object} 429 - Muitas tentativas (rate limit).
 * 
 * @example
 * POST /api/auth/login
 * Body: { "num_cpf": "11144477735", "des_senha": "senha123" }
 * // Resposta:
 * {
 *   "sucesso": true,
 *   "mensagem": "Login realizado com sucesso",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "usuario": { "id": 1, "nome": "João", "papeis": ["admin"] }
 * }
 */
router.post('/login', limiterLogin, validarBodyMiddleware, AuthController.login);

/**
 * Rota de logout.
 * 
 * @name POST /api/auth/logout
 * @function
 * @description Invalida o token do usuário (lado cliente) – o middleware apenas exige autenticação, o controlador pode limpar a sessão ou token.
 * @access Privado (requer token)
 * 
 * @param {Object} req.headers - Authorization: Bearer <token>
 * 
 * @returns {Object} 200 - Mensagem de sucesso.
 * @returns {Object} 401 - Token ausente ou inválido.
 * 
 * @example
 * POST /api/auth/logout
 * Headers: { "Authorization": "Bearer eyJhbGciOiJ..." }
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * Rota para verificar a validade do token JWT.
 * 
 * @name GET /api/auth/verificar
 * @function
 * @description Verifica se o token fornecido é válido e não expirou.
 * @access Privado (requer token)
 * 
 * @param {Object} req.headers - Authorization: Bearer <token>
 * 
 * @returns {Object} 200 - Token válido com dados decodificados.
 * @returns {Object} 401 - Token inválido ou expirado.
 * 
 * @example
 * GET /api/auth/verificar
 * Headers: { "Authorization": "Bearer eyJhbGciOiJ..." }
 */
router.get('/verificar', authMiddleware, AuthController.verificarToken);

/**
 * Rota para obter o perfil do usuário autenticado.
 * 
 * @name GET /api/auth/perfil
 * @function
 * @description Retorna os dados do perfil do usuário logado.
 * @access Privado (requer token)
 * 
 * @param {Object} req.headers - Authorization: Bearer <token>
 * 
 * @returns {Object} 200 - Dados do perfil.
 * @returns {Object} 401 - Token ausente ou inválido.
 * 
 * @example
 * GET /api/auth/perfil
 * Headers: { "Authorization": "Bearer eyJhbGciOiJ..." }
 */
router.get('/perfil', authMiddleware, AuthController.obterPerfil);

/**
 * Rota para alterar a própria senha.
 * 
 * @name PUT /api/auth/alterar-senha
 * @function
 * @description Permite que o usuário autenticado altere sua senha.
 * @access Privado (requer token)
 * 
 * @param {Object} req.body - Dados da alteração.
 * @param {string} req.body.senha_atual - Senha atual.
 * @param {string} req.body.nova_senha - Nova senha (mínimo 6 caracteres).
 * 
 * @returns {Object} 200 - Senha alterada com sucesso.
 * @returns {Object} 400 - Erro de validação ou corpo vazio.
 * @returns {Object} 401 - Senha atual incorreta ou token inválido.
 * 
 * @example
 * PUT /api/auth/alterar-senha
 * Body: { "senha_atual": "123456", "nova_senha": "654321" }
 */
router.put('/alterar-senha', authMiddleware, validarBodyMiddleware, AuthController.alterarSenha);

/**
 * Rota para resetar a senha de outro usuário.
 * 
 * @name POST /api/auth/resetar-senha
 * @function
 * @description Permite que um administrador redefina a senha de qualquer usuário.
 * @access Privado (requer token + papel de administrador)
 * 
 * @param {Object} req.body - Dados do reset.
 * @param {number|string} req.body.id_usuario - ID do usuário alvo.
 * @param {string} req.body.nova_senha - Nova senha a ser definida.
 * 
 * @returns {Object} 200 - Senha resetada com sucesso.
 * @returns {Object} 400 - Erro de validação ou corpo vazio.
 * @returns {Object} 401 - Token inválido ou não autenticado.
 * @returns {Object} 403 - Acesso negado (não é admin).
 * 
 * @example
 * POST /api/auth/resetar-senha
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "id_usuario": 5, "nova_senha": "nova123" }
 */
router.post('/resetar-senha', authMiddleware, apenasAdminMiddleware, validarBodyMiddleware, AuthController.resetarSenha);

module.exports = router;
