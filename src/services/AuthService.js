// src/services/AuthService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/AuthService.js
 * @description Serviço de autenticação e segurança.
 * Gerencia login, logout, alteração e reset de senha, verificação de token
 * e validação de permissões.
 * 
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires ../models/PessoaModel
 * @requires ./LogService
 * @requires ../config/env
 * @requires ../utils/constants
 * @requires date-fns/differenceInMinutes
 * @requires ../utils/ApiError
 * @requires ../utils/formatters
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const config = require('../config/env');
const { PAPEIS_PESSOA, MENSAGENS, ACOES_LOG, PERMISSOES } = require('../utils/constants');
const { differenceInMinutes } = require('date-fns');
const { UnauthorizedError } = require('../utils/ApiError');
const { ocultarDadosSensiveis } = require('../utils/formatters');

/**
 * Classe AuthService.
 * @class AuthService
 */
class AuthService {
    /**
     * Extrai a lista de papéis de um objeto usuário a partir de flags booleanas.
     * 
     * @method extrairPapeis
     * @memberof AuthService
     * @param {Object} usuario - Objeto do usuário (deve conter flags ind_*).
     * @param {boolean} usuario.ind_medico - Indica se é médico.
     * @param {boolean} usuario.ind_secretaria - Indica se é secretária.
     * @param {boolean} usuario.ind_costureira - Indica se é costureira.
     * @param {boolean} usuario.ind_paciente - Indica se é paciente.
     * @param {boolean} usuario.ind_administrador - Indica se é administrador.
     * @returns {string[]} Lista de nomes de papéis.
     * 
     * @example
     * const papeis = authService.extrairPapeis({ ind_medico: true, ind_admin: false });
     * // Retorna: ['medico']
     */
    extrairPapeis(usuario) {
        const papeis = [];

        if (usuario.ind_medico) {
            papeis.push(PAPEIS_PESSOA.MEDICO);
        }

        if (usuario.ind_secretaria) {
            papeis.push(PAPEIS_PESSOA.SECRETARIA);
        }

        if (usuario.ind_costureira) {
            papeis.push(PAPEIS_PESSOA.COSTUREIRA);
        }

        if (usuario.ind_paciente) {
            papeis.push(PAPEIS_PESSOA.PACIENTE);
        }

        if (usuario.ind_administrador) {
            papeis.push(PAPEIS_PESSOA.ADMINISTRADOR);
        }

        return papeis;
    }

    /**
     * Verifica se o usuário possui pelo menos um dos papéis permitidos.
     * 
     * @method possuiAlgumPapel
     * @memberof AuthService
     * @param {Object} usuario - Objeto do usuário.
     * @param {string[]} papeisPermitidos - Lista de nomes de papéis permitidos.
     * @returns {boolean} `true` se o usuário tiver pelo menos um papel permitido.
     * 
     * @example
     * const permitido = authService.possuiAlgumPapel(usuario, ['admin', 'secretaria']);
     */
    possuiAlgumPapel(usuario, papeisPermitidos = []) {
        const papeisUsuario = this.extrairPapeis(usuario);
        return papeisUsuario.some(papel => papeisPermitidos.includes(papel));
    }

    /**
     * Obtém todas as permissões do usuário com base em seus papéis.
     * 
     * @method obterPermissoesUsuario
     * @memberof AuthService
     * @param {Object} usuario - Objeto do usuário.
     * @returns {string[]} Lista de permissões (strings) ou ['*'] se for super usuário.
     * 
     * @example
     * const permissoes = authService.obterPermissoesUsuario(usuario);
     * // Exemplo: ['usuarios:listar', 'agendamentos:criar']
     */
    obterPermissoesUsuario(usuario) {
        const papeisUsuario = this.extrairPapeis(usuario);

        const permissoes = new Set();

        for (const papel of papeisUsuario) {
            const permissoesDoPapel = PERMISSOES[papel] || [];

            if (permissoesDoPapel.includes('*')) {
                return ['*'];
            }

            permissoesDoPapel.forEach(permissoes => permissoes.add(permissao));
        }

        return Array.from(permissoes);
    }

    /**
     * Realiza o login do usuário.
     * 
     * @method login
     * @memberof AuthService
     * @async
     * @param {string} num_cpf - CPF do usuário (com ou sem máscara).
     * @param {string} des_senha - Senha em texto plano.
     * @param {string} ipAddress - Endereço IP do cliente.
     * @param {string} userAgent - User-Agent do cliente.
     * @returns {Promise<Object>} Objeto com `token` e `usuario` (dados sanitizados).
     * @throws {UnauthorizedError} Se credenciais inválidas, conta bloqueada ou sem permissão.
     * @throws {Error} Se usuário inativo ou outros erros.
     * 
     * @example
     * const resultado = await authService.login('11144477735', 'senha123', '192.168.1.1', 'Mozilla/5.0');
     */
    async login(num_cpf, des_senha, ipAddress, userAgent) {
        try {
            // Buscar usuário por CPF
            const usuario = await PessoaModel.buscarPorCPF(num_cpf);

            if (!usuario) {
                await LogService.registrar({
                    des_acao: ACOES_LOG.LOGIN,
                    des_tabela: 'tab_pessoas',
                    des_detalhes: { sucesso: false, motivo: 'CPF não encontrado', cpf: num_cpf },
                    num_ip_address: ipAddress,
                    des_user_agent: userAgent
                });

                throw new UnauthorizedError(MENSAGENS.ERRO.CREDENCIAIS_INVALIDAS);
            }

            // Verificar se usuário está ativo
            if (usuario.ind_status !== 'ativo') {
                throw new Error('Usuário inativo');
            }

            // Verificar se o tipo de pessoa pode fazer login
            const papeisComAcesso = [
                PAPEIS_PESSOA.ADMINISTRADOR,
                PAPEIS_PESSOA.SECRETARIA,
                PAPEIS_PESSOA.COSTUREIRA,
                PAPEIS_PESSOA.MEDICO
            ];

            if (!this.possuiAlgumPapel(usuario, papeisComAcesso)) {
                throw new Error('Usuário sem permissão de acesso')
            }

            // Verificar bloqueio por tentativas
            const bloqueio = await PessoaModel.verificarBloqueio(usuario.id);

            if (bloqueio.dta_bloqueio_login) {
                const minutosBloqueado = differenceInMinutes(
                    new Date(),
                    new Date(bloqueio.dta_bloqueio_login)
                );

                if (minutosBloqueado < config.auth.lockTime) {
                    const minutosRestantes = config.auth.lockTime - minutosBloqueado;
                    throw new Error(
                        `${MENSAGENS.ERRO.CONTA_BLOQUEADA}. Tente novamente em ${minutosRestantes} minutos.`
                    );
                } else {
                    // Desbloquear automaticamente após o tempo
                    await PessoaModel.resetarTentativasLogin(usuario.id);
                }
            }

            // Verificar senha
            const senhaValida = await bcrypt.compare(des_senha, usuario.des_senha);

            if (!senhaValida) {
                await PessoaModel.incrementarTentativasLogin(usuario.id);

                const tentativasAtualizadas = bloqueio.num_tentativas_login + 1;

                if (tentativasAtualizadas >= config.auth.maxLoginAttempts) {
                    await PessoaModel.bloquearLogin(usuario.id);

                    await LogService.registrar({
                        id_usuario: usuario.id,
                        des_acao: ACOES_LOG.LOGIN,
                        des_tabela: 'tab_pessoas',
                        num_registro_id: usuario.id,
                        des_detalhes: {
                            sucesso: false,
                            motivo: 'Conta bloqueada por excesso de tentativas',
                            tentativas: tentativasAtualizadas
                        },
                        num_ip_address: ipAddress,
                        des_user_agent: userAgent
                    });

                    throw new Error(MENSAGENS.ERRO.CONTA_BLOQUEADA);
                }

                await LogService.registrar({
                    id_usuario: usuario.id,
                    des_acao: ACOES_LOG.LOGIN,
                    des_tabela: 'tab_pessoas',
                    num_registro_id: usuario.id,
                    des_detalhes: {
                        sucesso: false,
                        motivo: 'Senha inválida',
                        tentativas: tentativasAtualizadas,
                        tentativas_restantes: config.auth.maxLoginAttempts - tentativasAtualizadas
                    },
                    num_ip_address: ipAddress,
                    des_user_agent: userAgent
                });

                throw new Error(
                    `${MENSAGENS.ERRO.CREDENCIAIS_INVALIDAS}. ${config.auth.maxLoginAttempts - tentativasAtualizadas} tentativas restantes.`
                );
            }

            // Login bem-sucedido - resetar tentativas
            await PessoaModel.resetarTentativasLogin(usuario.id);

            const papeis = this.extrairPapeis(usuario)

            // Gerar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id,
                    email: usuario.email,
                    papeis
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Registrar log de login bem-sucedido
            await LogService.registrar({
                id_usuario: usuario.id,
                des_acao: ACOES_LOG.LOGIN,
                des_tabela: 'tab_pessoas',
                num_registro_id: usuario.id,
                des_detalhes: { sucesso: true, papeis },
                num_ip_address: ipAddress,
                des_user_agent: userAgent
            });

            // Remover senha do objeto retornado
            delete usuario.des_senha;

            return ocultarDadosSensiveis({
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nom_completo,
                    cpf: usuario.num_cpf,
                    email: usuario.des_email_1,
                    papeis,
                    indicadores: {
                        ind_medico: !!usuario.ind_medico,
                        ind_secretaria: !!usuario.ind_secretaria,
                        ind_costureira: !!usuario.ind_costureira,
                        ind_paciente: !!usuario.ind_paciente,
                        ind_administrador: !!usuario.ind_administrador
                    }
                }
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Registra o logout do usuário (apenas log de auditoria).
     * 
     * @method logout
     * @memberof AuthService
     * @async
     * @param {number} userId - ID do usuário.
     * @param {string} ipAddress - Endereço IP do cliente.
     * @param {string} userAgent - User-Agent do cliente.
     * @returns {Promise<void>}
     * 
     * @example
     * await authService.logout(1, '192.168.1.1', 'Mozilla/5.0');
     */
    async logout(userId, ipAddress, userAgent) {
        await LogService.registrar({
            id_usuario: userId,
            des_acao: ACOES_LOG.LOGOUT,
            des_tabela: 'tab_pessoas',
            num_registro_id: userId,
            des_detalhes: { sucesso: true },
            num_ip_address: ipAddress,
            des_user_agent: userAgent
        });
    }

    /**
     * Altera a senha do usuário autenticado.
     * 
     * @method alterarSenha
     * @memberof AuthService
     * @async
     * @param {number} userId - ID do usuário.
     * @param {string} senhaAtual - Senha atual em texto plano.
     * @param {string} novaSenha - Nova senha em texto plano.
     * @returns {Promise<boolean>} `true` se a senha foi alterada com sucesso.
     * @throws {Error} Se usuário não encontrado, senha atual incorreta ou outro erro.
     * 
     * @example
     * await authService.alterarSenha(1, '123456', '654321');
     */
    async alterarSenha(userId, senhaAtual, novaSenha) {
        try {
            const usuario = await PessoaModel.buscarPorId(userId);

            if (!usuario) {
                throw new Error('Usuário não encontrado');
            }

            // Verificar senha atual
            const senhaValida = await bcrypt.compare(senhaAtual, usuario.des_senha);

            if (!senhaValida) {
                throw new Error('Senha atual incorreta');
            }

            // Hash da nova senha
            const senhaHash = await bcrypt.hash(novaSenha, 10);

            // Atualizar senha
            await PessoaModel.atualizar(userId, { des_senha: senhaHash });

            await LogService.registrar({
                id_usuario: userId,
                des_acao: 'alterar_senha',
                des_tabela: 'tab_pessoas',
                num_registro_id: userId,
                des_detalhes: { sucesso: true }
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reseta a senha de um usuário (apenas administradores).
     * 
     * @method resetarSenha
     * @memberof AuthService
     * @async
     * @param {string} cpf - CPF do usuário alvo (com ou sem máscara).
     * @param {string} novaSenha - Nova senha em texto plano.
     * @param {number} adminId - ID do administrador que está realizando a ação (para auditoria).
     * @returns {Promise<boolean>} `true` se a senha foi resetada.
     * @throws {Error} Se o usuário alvo não for encontrado.
     * 
     * @example
     * await authService.resetarSenha('11144477735', 'nova123', 1);
     */
    async resetarSenha(cpf, novaSenha, adminId) {
        try {
            const usuario = await PessoaModel.buscarPorCPF(cpf);

            if (!usuario) {
                throw new Error('Usuário não encontrado');
            }

            // Hash da nova senha
            const senhaHash = await bcrypt.hash(novaSenha, 10);

            // Atualizar senha e resetar tentativas
            await PessoaModel.atualizar(usuario.id, {
                des_senha: senhaHash,
                num_tentativas_login: 0,
                dta_bloqueio_login: null
            });

            await LogService.registrar({
                id_usuario: adminId,
                des_acao: 'resetar_senha',
                des_tabela: 'tab_pessoas',
                num_registro_id: usuario.id,
                des_detalhes: {
                    sucesso: true,
                    usuario_afetado: usuario.nom_completo,
                    cpf: usuario.num_cpf
                }
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verifica a validade de um token JWT.
     * 
     * @method verificarToken
     * @memberof AuthService
     * @param {string} token - Token JWT a ser verificado.
     * @returns {Object} Payload decodificado do token.
     * @throws {Error} Se o token for inválido ou expirado.
     * 
     * @example
     * const payload = authService.verificarToken('eyJhbGciOiJ...');
     * // Retorna: { id: 1, email: '...', papeis: [...], iat: ..., exp: ... }
     */
    verificarToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            throw new Error('Token inválido ou expirado');
        }
    }

    /**
     * Verifica se um usuário possui uma permissão específica.
     * 
     * @method verificarPermissao
     * @memberof AuthService
     * @async
     * @param {number} userId - ID do usuário.
     * @param {string} permissao - Nome da permissão (ex: 'usuarios:listar').
     * @returns {Promise<boolean>} `true` se o usuário tem a permissão.
     * 
     * @example
     * const temPermissao = await authService.verificarPermissao(1, 'agendamentos:criar');
     */
    async verificarPermissao(userId, permissao) {
        const usuario = await PessoaModel.buscarPorId(userId);

        if (!usuario) {
            return false;
        }

        const permissoesUsuario = this.obterPermissoesUsuario(usuario);

        // Administrador tem todas as permissões
        if (permissoesUsuario.includes('*')) {
            return true;
        }

        return permissoesUsuario.includes(permissao);
    }
}

module.exports = new AuthService();
