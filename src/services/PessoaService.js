// src/services/PessoaService.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/PessoaService.js
 * @description Serviço de gerenciamento de pessoas.
 * Gerencia criação, listagem, busca (por ID, CPF, papel), atualização,
 * exclusão (soft delete), ativação/desativação, além de consultas auxiliares
 * de cidades e estados, com validação, sanitização e auditoria.
 * 
 * @requires bcryptjs
 * @requires ../models/PessoaModel
 * @requires ./LogService
 * @requires ../utils/constants
 * @requires ../utils/validators
 * @requires ../utils/formatters
 * @requires ../config/logger
 */

const bcrypt = require('bcryptjs');
const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { PAPEIS_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const { limparCPF, limparCEP, limparTelefone, ocultarDadosSensiveis } = require('../utils/formatters');
const logger = require('../config/logger'); // logger raiz

/**
 * Classe PessoaService.
 * @class PessoaService
 */
class PessoaService {
    /**
     * Extrai a lista de papéis de um objeto de dados (flags booleanas).
     * 
     * @method extrairPapeis
     * @memberof PessoaService
     * @param {Object} dados - Objeto com flags ind_*.
     * @returns {string[]} Lista de nomes de papéis.
     */
    extrairPapeis(dados) {
        const papeis = [];

        if (dados.ind_medico) papeis.push(PAPEIS_PESSOA.MEDICO);
        if (dados.ind_secretaria) papeis.push(PAPEIS_PESSOA.SECRETARIA);
        if (dados.ind_costureira) papeis.push(PAPEIS_PESSOA.COSTUREIRA);
        if (dados.ind_paciente) papeis.push(PAPEIS_PESSOA.PACIENTE);
        if (dados.ind_administrador) papeis.push(PAPEIS_PESSOA.ADMINISTRADOR);

        return papeis;
    }

    /**
     * Verifica se o objeto possui pelo menos um papel (flag true).
     * 
     * @method possuiAlgumPapel
     * @memberof PessoaService
     * @param {Object} dados - Objeto com flags ind_*.
     * @returns {boolean} `true` se pelo menos um papel estiver ativo.
     */
    possuiAlgumPapel(dados) {
        return (
            dados.ind_medico ||
            dados.ind_secretaria ||
            dados.ind_costureira ||
            dados.ind_paciente ||
            dados.ind_administrador
        );
    }

    /**
     * Cria uma nova pessoa.
     * 
     * @method criar
     * @memberof PessoaService
     * @async
     * @param {Object} dados - Dados da pessoa (conforme schema `pessoaSchema`).
     * @param {number} usuarioLogadoId - ID do usuário logado (para auditoria).
     * @returns {Promise<Object>} Dados da pessoa criada (com campos sensíveis ocultos).
     * @throws {Error} Se a validação falhar, CPF duplicado ou erro na persistência.
     * 
     * @description
     * - Valida com Joi.
     * - Sanitiza CPF, CEP e telefones.
     * - Verifica unicidade de CPF.
     * - Se senha fornecida, aplica hash.
     * - Registra log de criação.
     * - Retorna a pessoa com dados sensíveis ocultos.
     */
    async criar(dados, usuarioLogadoId) {
        logger.debug('PessoaService.criar inicado', { usuarioLogadoId })
        try {

            const { error, value } = validators.pessoaSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            value.num_cpf = limparCPF(value.num_cpf);
            value.num_cep = limparCEP(value.num_cep);

            value.num_celular_1 = limparTelefone(value.num_celular_1);
            if (value.num_celular_2) {
                value.num_celular_2 = limparTelefone(value.num_celular_2);
            }

            const cpfExistente = await PessoaModel.buscarPorCPF(value.num_cpf);

            if (cpfExistente) {
                throw new Error(MENSAGENS.ERRO.CPF_EXISTENTE);
            }

            if (value.des_senha) {
                value.des_senha = await bcrypt.hash(value.des_senha, 10);
            }

            const pessoaId = await PessoaModel.criar(value);
            const papeis = this.extrairPapeis(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: pessoaId,
                des_detalhes: {
                    papeis,
                    nome: value.nom_completo,
                    cpf: value.num_cpf
                }
            });

            const pessoa = await PessoaModel.buscarPorId(pessoaId);
            logger.info('Pessoa persistida', { pessoaId });
            return ocultarDadosSensiveis(pessoa);
        } catch (error) {
            logger.error('Falha ao criar pessoa', { error: error.message, usuarioLogadoId })
            throw error;
        }
    }

    /**
     * Busca uma pessoa por ID.
     * 
     * @method buscarPorId
     * @memberof PessoaService
     * @async
     * @param {number} id - ID da pessoa.
     * @param {number} usuarioLogadoId - ID do usuário logado (para auditoria).
     * @returns {Promise<Object>} Dados da pessoa (com campos sensíveis ocultos).
     * @throws {Error} Se a pessoa não for encontrada.
     */
    async buscarPorId(id, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    pessoa_consultada: pessoa.nom_completo
                }
            });

            return ocultarDadosSensiveis(pessoa);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma pessoa por CPF.
     * 
     * @method buscarPorCPF
     * @memberof PessoaService
     * @async
     * @param {string} cpf - CPF (pode conter máscara).
     * @param {number} usuarioLogadoId - ID do usuário logado (para auditoria).
     * @returns {Promise<Object>} Dados da pessoa (com campos sensíveis ocultos).
     * @throws {Error} Se CPF inválido ou pessoa não encontrada.
     * 
     * @description
     * ⚠️ **BUG:** `cpfLimpo` é usado sem ser definido; o código usa `cpfLimpo` nas variáveis mas não o define.
     */
    async buscarPorCPF(cpf, usuarioLogadoId) {
        try {
            // const cpfLimpo = limparCPF(cpf);

            if (!validators.validarCPF(cpf)) {
                throw new Error('CPF inválido');
            }

            const pessoa = await PessoaModel.buscarPorCPF(cpfLimpo);

            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: pessoa.id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_cpf',
                    cpf: cpfLimpo,
                    pessoa_consultada: pessoa.nom_completo
                }
            });

            return ocultarDadosSensiveis(pessoa);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista pessoas com filtros opcionais.
     * 
     * @method listar
     * @memberof PessoaService
     * @async
     * @param {Object} filtros - Filtros (papel, ind_status, busca).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de pessoas (com campos sensíveis ocultos).
     */
    async listar(filtros = {}, usuarioLogadoId) {
        try {
            const pessoas = await PessoaModel.listar(filtros);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    filtros,
                    total_registros: pessoas.length
                }
            });

            return pessoas.map(pessoa => ocultarDadosSensiveis(pessoa));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista pessoas por papel.
     * 
     * @method listarPorPapel
     * @memberof PessoaService
     * @async
     * @param {string} papel - Nome do papel (ex: 'paciente').
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de pessoas com o papel.
     */
    async listarPorPapel(papel, usuarioLogadoId) {
        try {
            const pessoas = await PessoaModel.buscarPorPapel(papel);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar_por_papel',
                    papel,
                    total_registros: pessoas.length
                }
            });

            return pessoas.map(pessoa => ocultarDadosSensiveis(pessoa));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza uma pessoa existente.
     * 
     * @method atualizar
     * @memberof PessoaService
     * @async
     * @param {number} id - ID da pessoa.
     * @param {Object} dados - Dados a serem atualizados.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Pessoa atualizada (com campos sensíveis ocultos).
     * @throws {Error} Se a pessoa não existir, CPF duplicado, violação de papéis/senha, ou erro na persistência.
     * 
     * @description
     * - Verifica existência.
     * - Sanitiza CPF, CEP, telefones.
     * - Verifica unicidade de CPF (se alterado).
     * - Valida se ao menos um papel está presente.
     * - Valida senha obrigatória para certos papéis (se não existir previamente).
     * - Aplica hash se senha fornecida.
     * - Registra log.
     */
    async atualizar(id, dados, usuarioLogadoId) {
        try {
            const pessoaExistente = await PessoaModel.buscarPorId(id);

            if (!pessoaExistente) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            if (dados.num_cpf) {
                dados.num_cpf = limparCPF(dados.num_cpf);

                if (dados.num_cpf !== pessoaExistente.num_cpf) {
                    const cpfExistente = await PessoaModel.buscarPorCPF(dados.num_cpf);
                    if (cpfExistente) {
                        throw new Error(MENSAGENS.ERRO.CPF_EXISTENTE);
                    }
                }
            }

            if (dados.num_cep) {
                dados.num_cep = limparCEP(dados.num_cep);
            }

            if (dados.num_celular_1) {
                dados.num_celular_1 = limparTelefone(dados.num_celular_1);
            }

            if (dados.num_celular_2) {
                dados.num_celular_2 = limparTelefone(dados.num_celular_2);
            }

            const dadosFinais = {
                ...pessoaExistente,
                ...dados
            };

            if (!this.possuiAlgumPapel(dadosFinais)) {
                throw new Error('A pessoa deve possuir ao menos um papel.');
            }

            const exigeSenha =
                dadosFinais.ind_medico ||
                dadosFinais.ind_secretaria ||
                dadosFinais.ind_costureira ||
                dadosFinais.ind_administrador;

            if (exigeSenha && !dados.des_senha && !pessoaExistente.des_senha) {
                throw new Error('Senha é obrigatória para médico, secretária, costureira ou administrador.');
            }

            if (dados.des_senha) {
                dados.des_senha = await bcrypt.hash(dados.des_senha, 10);
            }

            const atualizado = await PessoaModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar pessoa');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoaExistente.nom_completo,
                    campos_alterados: Object.keys(dados),
                    papeis_resultantes: this.extrairPapeis(dadosFinais)
                }
            });

            const pessoaAtualizada = await PessoaModel.buscarPorId(id);
            return ocultarDadosSensiveis(pessoaAtualizada);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta uma pessoa (soft delete).
     * 
     * @method deletar
     * @memberof PessoaService
     * @async
     * @param {number} id - ID da pessoa.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se a pessoa não existir ou erro na exclusão.
     */
    async deletar(id, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            const deletado = await PessoaModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoa.nom_completo,
                    cpf: pessoa.num_cpf,
                    papeis: this.extrairPapeis(pessoa)
                }
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Ativa ou desativa uma pessoa (altera `ind_status`).
     * 
     * @method ativarDesativar
     * @memberof PessoaService
     * @async
     * @param {number} id - ID da pessoa.
     * @param {string} status - 'ativo' ou 'inativo'.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se alterado.
     * @throws {Error} Se a pessoa não existir.
     */
    async ativarDesativar(id, status, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            await PessoaModel.atualizar(id, { ind_status: status });

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    acao: status === 'ativo' ? 'ativar' : 'desativar',
                    pessoa: pessoa.nom_completo
                }
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista costureiras com disponibilidade (verifica se têm agendamento ativo).
     * 
     * @method listarCostureirasDisponiveis
     * @memberof PessoaService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de costureiras com flags `disponivel` e `agendamento_ativo`.
     */
    async listarCostureirasDisponiveis(usuarioLogadoId) {
        try {
            const costureiras = await PessoaModel.buscarPorPapel(PAPEIS_PESSOA.COSTUREIRA);
            const AgendamentoModel = require('../models/AgendamentoModel');

            const costureirasComStatus = await Promise.all(
                costureiras.map(async (costureira) => {
                    const agendamentoAtivo = await AgendamentoModel.buscarAgendamentoAtivoCostureira(costureira.id);

                    return {
                        ...ocultarDadosSensiveis(costureira),
                        disponivel: !agendamentoAtivo,
                        agendamento_ativo: agendamentoAtivo || null
                    };
                })
            );

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar_costureiras_disponiveis',
                    total: costureirasComStatus.length,
                    disponiveis: costureirasComStatus.filter(c => c.disponivel).length
                }
            });

            return costureirasComStatus;
        } catch (error) {
            throw error;
        }
    }










}

module.exports = new PessoaService();
