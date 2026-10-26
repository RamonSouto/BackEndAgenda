// src/services/sistema/CidadeService.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/sistema/CidadeService.js
 * @description Serviço de gerenciamento de pessoas.
 * Gerencia criação, listagem, busca (por ID, CPF, papel), atualização,
 * exclusão (soft delete), ativação/desativação, além de consultas auxiliares
 * de cidades e estados, com validação, sanitização e auditoria.
 * 
 * @requires bcryptjs
 * @requires ../models/sistema/CidadeModel
 * @requires ./LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/formatters
 * @requires ../../config/logger
 */

const bcrypt = require('bcryptjs');
const CidadeModel = require('../../models/sistema/CidadeModel');
const LogService = require('../LogService');
const { PAPEIS_PESSOA, MENSAGENS, ACOES_LOG } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { limparCPF, limparCEP, limparTelefone, ocultarDadosSensiveis } = require('../../utils/formatters');
const logger = require('../../config/logger'); // logger raiz
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe CidadeService.
 * @class CidadeService
 */
class CidadeService {

    /**
     * Lista cidades.
     * 
     * @method listarCidades
     * @memberof PessoaService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de cidades.
     */
    async listarCidades(usuarioLogadoId) {
        try {

            const cidades = await CidadeModel.listarCidades();

            if (cidades.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.LISTAR,
                    des_tabela: 'tab_cidades',
                    des_detalhes: {
                        tipo_consulta: 'listar_cidades',
                        total_registros: cidades.length,
                    }
                });

                return cidades;
            } else {
                return new NotFoundError('Cidades não encotradas!')
            }

        } catch (error) {

            throw error;
        }
    }

    /**
     * Busca cidade por ID.
     * 
     * @method buscarCidadeId
     * @memberof PessoaService
     * @async
     * @param {number} id - ID da cidade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da cidade.
     */
    async buscarCidadeId(id, usuarioLogadoId) {
        try {
            const cidade = await CidadeModel.buscarCidadeId(id);
            if (cidade.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_cidades',
                    des_detalhes: {
                        tipo_consulta: 'buscar_cidade_id',
                        total_registros: cidade.length,
                    }
                });

                return cidade;
            } else {
                throw new NotFoundError('Cidade não encontrada!')
            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca cidades por nome.
     * 
     * @method buscarCidadeNome
     * @memberof PessoaService
     * @async
     * @param {string} nome - Nome da cidade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de cidades.
     */
    async buscarCidadeNome(nome, usuarioLogadoId) {
        try {
            const cidades = await CidadeModel.buscarCidadeNome(nome);

            if (cidades.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_cidades',
                    des_detalhes: {
                        tipo_consulta: 'buscar_cidade_nome',
                        total_registros: cidades.length,
                    }
                });

                return cidades;
            } else {
                throw new NotFoundError('Cidade(s) não encontrada(s)!')
            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca cidades por ID do estado.
     * 
     * @method buscarCidadeEstadoId
     * @memberof PessoaService
     * @async
     * @param {number} id - ID do estado.
     * @param {Object} req - Objeto de requisição (usado para extrair `req.usuario.id`).
     * @returns {Promise<Array<Object>>} Lista de cidades.
     * 
     * @description
     * ⚠️ **BUG:** Recebe `req` em vez de `usuarioLogadoId`, o que é inconsistente com os demais métodos.
     */
    async buscarCidadeEstadoId(id, usuarioLogadoId) {
        try {

            const cidades = await CidadeModel.buscarCidadeEstadoId(id);

            if (cidades.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_cidades',
                    num_registro_id: id,
                    des_detalhes: {
                        tipo_consulta: 'buscar_cidades_estado_id',
                        total_registros: cidades.length,
                    }
                });

                return cidades;
            } else {
                throw new NotFoundError('Cidades não encontrado para o ID do estado fornecido')
            }

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CidadeService();