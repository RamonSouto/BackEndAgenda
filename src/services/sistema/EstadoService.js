// src/services/sistema/EstadoService.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/sistema/EstadoService.js
 * @description Serviço de gerenciamento de pessoas.
 * Gerencia criação, listagem, busca (por ID, CPF, papel), atualização,
 * exclusão (soft delete), ativação/desativação, além de consultas auxiliares
 * de cidades e estados, com validação, sanitização e auditoria.
 * 
 * @requires bcryptjs
 * @requires ../models/sistema/EstadoModel
 * @requires ./LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/formatters
 * @requires ../../config/logger
 */

const bcrypt = require('bcryptjs');
const LogService = require('../LogService');
const EstadoModel = require('../../models/sistema/EstadoModel');
const { PAPEIS_PESSOA, MENSAGENS, ACOES_LOG } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { limparCPF, limparCEP, limparTelefone, ocultarDadosSensiveis } = require('../../utils/formatters');
const logger = require('../../config/logger'); // logger raiz
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe EstadoService.
 * @class EstadoService
 */
class EstadoService {

    /**
     * Lista estados.
     * 
     * @method listarEstados
     * @memberof PessoaService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de estados.
     */
    async listarEstados(usuarioLogadoId) {
        try {

            const estados = await EstadoModel.listarEstados();
            if (estados.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.LISTAR,
                    des_tabela: 'tab_estados',
                    des_detalhes: {
                        tipo_consulta: 'listar_estados',
                        total_registros: estados.length,
                    }
                });

                return estados;
            } else {
                throw new NotFoundError('Estados não encontrado!')
            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca estado por ID.
     * 
     * @method buscarEstadoId
     * @memberof PessoaService
     * @async
     * @param {number} id - ID do estado.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados do estado.
     */
    async buscarEstadoId(id, usuarioLogadoId) {
        try {
            const estado = await EstadoModel.buscarEstadoId(id);

            if (estado.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_estados',
                    des_detalhes: {
                        tipo_consulta: 'buscar_estado_id',
                        total_registros: estado.length,
                    }
                });

                return estado;
            } else {
                throw new NotFoundError('Estado não encontrado!')
            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca estado por nome.
     * 
     * @method buscarEstadoNome
     * @memberof PessoaService
     * @async
     * @param {string} nome - Nome do estado.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de estados.
     */
    async buscarEstadoNome(nome, usuarioLogadoId) {
        try {
            const estados = await EstadoModel.buscarEstadoNome(nome);

            if (estados.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_estados',
                    des_detalhes: {
                        tipo_consulta: 'buscar_estado_nome',
                        total_registros: estados.length,
                    }
                });

                return estados;
            } else {
                throw new NotFoundError('Estado(s) não encontrado(s)!')
            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca estado por sigla.
     * 
     * @method buscarEstadoSgl
     * @memberof PessoaService
     * @async
     * @param {string} sgl - Sigla do estado (2 caracteres).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de estados.
     */
    async buscarEstadoSgl(sgl, usuarioLogadoId) {
        try {
            const estados = await EstadoModel.buscarEstadoSgl(sgl);

            if (estados.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.CONSULTAR,
                    des_tabela: 'tab_estados',
                    des_detalhes: {
                        tipo_consulta: 'buscar_estado_sigla',
                        total_registros: estados.length,
                    }
                });

                return estados;
            } else {
                throw new NotFoundError('Estado não encontrado!')
            }

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new EstadoService();