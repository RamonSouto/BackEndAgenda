const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const config = require('../config/env');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const { differenceInMinutes } = require('date-fns');

class AuthService {
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

                throw new Error(MENSAGENS.ERRO.CREDENCIAIS_INVALIDAS);
            }

            // Verificar se usuário está ativo
            if (usuario.ind_status !== 'ativo') {
                throw new Error('Usuário inativo');
            }

            // Verificar se o tipo de pessoa pode fazer login
            const tiposComAcesso = [
                TIPO_PESSOA.ADMINISTRADOR,
                TIPO_PESSOA.SECRETARIA,
                TIPO_PESSOA.COSTUREIRA,
                TIPO_PESSOA.MEDICO
            ];

            if (!tiposComAcesso.includes(usuario.ind_tipo_pessoa)) {
                throw new Error('Tipo de usuário sem permissão de acesso');
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

            // Gerar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id,
                    cpf: usuario.num_cpf,
                    tipo: usuario.ind_tipo_pessoa
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
                des_detalhes: { sucesso: true },
                num_ip_address: ipAddress,
                des_user_agent: userAgent
            });

            // Remover senha do objeto retornado
            delete usuario.des_senha;

            return {
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nom_completo,
                    cpf: usuario.num_cpf,
                    tipo: usuario.ind_tipo_pessoa,
                    email: usuario.des_email_1
                }
            };

        } catch (error) {
            throw error;
        }
    }

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

    verificarToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            throw new Error('Token inválido ou expirado');
        }
    }

    async verificarPermissao(userId, permissao) {
        const usuario = await PessoaModel.buscarPorId(userId);

        if (!usuario) {
            return false;
        }

        const { PERMISSOES } = require('../utils/constants');
        const permissoesUsuario = PERMISSOES[usuario.ind_tipo_pessoa] || [];

        // Administrador tem todas as permissões
        if (permissoesUsuario.includes('*')) {
            return true;
        }

        return permissoesUsuario.includes(permissao);
    }
}

module.exports = new AuthService();
