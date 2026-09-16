// src/services/produto/TipoServicoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/TipoServicoService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/TipoServicoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const TipoServicoModel = require('../../models/produto/TipoServicoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe TipoServicoService.
 * @class TipoServicoService
 */
class TipoServicoService {
    /**
     * Cria um novo tipo de serviço.
     * 
     * @method adicionarTipoServico
     * @memberof TipoServicoService
     * @async
     * @param {Object} dados - Dados do tipo (des_tipo_ajuste, ind_ativo).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Tipo criado.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await tipoServicoService.adicionarTipoServico({ des_tipo_ajuste: 'Costura', ind_ativo: true }, 1);
     */
    async adicionarTipoServico(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.tipoServicoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const tipoServicoId = await TipoServicoModel.criarTipoServico(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_tipo_servico',
                num_registro_id: tipoServicoId,
                des_detalhes: {
                    des_tipo_ajuste: value.des_tipo_ajuste,
                    ind_ativo: value.ind_ativo,
                }
            });

            const tipoServico = await TipoServicoModel.buscarTipoServicoPorId(tipoServicoId)

            return tipoServico;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todos os tipos de serviço.
     * 
     * @method listarTipoServico
     * @memberof TipoServicoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de tipos.
     * 
     * @example
     * const tipos = await tipoServicoService.listarTipoServico(1);
     */
    async listarTipoServico(usuarioLogadoId) {
        try {
            const tipoServico = await TipoServicoModel.listarTipoServico();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_tipo_servico',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: tipoServico.length
                }
            });

            return tipoServico;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um tipo de serviço por ID.
     * 
     * @method buscarTipoServicoId
     * @memberof TipoServicoService
     * @async
     * @param {number} id - ID do tipo.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados do tipo.
     * @throws {NotFoundError} Se não encontrado.
     * 
     * @example
     * const tipo = await tipoServicoService.buscarTipoServicoId(1, 1);
     */
    async buscarTipoServicoId(id, usuarioLogadoId) {

        const tipoServico = await TipoServicoModel.buscarTipoServicoPorId(id);

        if (!tipoServico) {
            throw new NotFoundError('Tipo de serviço não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_tipo_servico',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id: tipoServico.id,
                des_tipo_ajuste: tipoServico.des_tipo_ajuste,
                ind_ativo: tipoServico.ind_ativo,
            }
        });

        return tipoServico;
    }

    /**
     * Atualiza um tipo de serviço.
     * 
     * @method atualizarTipoServico
     * @memberof TipoServicoService
     * @async
     * @param {number} id - ID do tipo.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Tipo atualizado.
     * @throws {Error} Se não encontrado ou falha na atualização.
     * 
     * @example
     * await tipoServicoService.atualizarTipoServico(1, { des_tipo_ajuste: 'Costura Fina' }, 1);
     */
    async atualizarTipoServico(id, dados, usuarioLogadoId) {
        try {

            const tipoServico = await TipoServicoModel.buscarTipoServicoPorId(id);


            if (!tipoServico) {
                throw new NotFoundError('Tipo de serviço não encontrado');
            }

            const atualizado = await TipoServicoModel.atualizarTipoServico(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar tipo de Serviço');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_tipo_servico',
                des_detalhes: {
                    id: tipoServico.id_categoria,
                    des_tipo_ajuste: tipoServico.nom_produto,
                    ind_ativo: tipoServico.num_sku,
                    campos_alterados: Object.keys(dados)
                }
            });

            const tipoServicoAtualizada = await TipoServicoModel.buscarTipoServicoPorId(id);

            return tipoServicoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) um tipo de serviço.
     * 
     * @method deletarTipoServico
     * @memberof TipoServicoService
     * @async
     * @param {number} id - ID do tipo.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrado ou falha na exclusão.
     * 
     * @example
     * await tipoServicoService.deletarTipoServico(1, 1);
     */
    async deletarTipoServico(id, usuarioLogadoId) {
        try {
            const tipoServico = await TipoServicoModel.buscarTipoServicoPorId(id);

            if (!tipoServico) {
                throw new NotFoundError('Tipo de serviço não encontrado');
            }

            // Soft delete
            const deletado = await TipoServicoModel.deletarTipoServico(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_tipo_servico',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    des_tipo_ajuste: deletado.des_tipo_ajuste,
                    ind_ativo: deletado.ind_ativo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new TipoServicoService();