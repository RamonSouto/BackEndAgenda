// src/services/produto/PrecoProdutoServicoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/PrecoProdutoServicoService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/ProdutoServicoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const PrecoProdutoServicoModel = require('../../models/produto/PrecoProdutoServicoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe PrecoProdutoServicoService.
 * @class PrecoProdutoServicoService
 */
class PrecoProdutoServicoService {
    /**
     * Cria um preço para uma associação produto-serviço.
     * 
     * @method adicionarPrecoProdutoServico
     * @memberof PrecoProdutoServicoService
     * @async
     * @param {Object} dados - Dados do preço (id_produto_servico, val_preco, dta_inicio).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<number>} ID do preço criado.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * const id = await precoProdutoServicoService.adicionarPrecoProdutoServico({ id_produto_servico: 1, val_preco: 49.90, dta_inicio: '2025-01-01' }, 1);
     */
    async adicionarPrecoProdutoServico(dados, usuarioLogadoId) {
        try {
            console.log(dados);
            //Validar dados
            const { error, value } = validators.precoProdutoServicoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const precoProdutoServicoId = await PrecoProdutoServicoModel.criarPrecoProdutoServico(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_preco_produto_servico',
                num_registro_id: precoProdutoServicoId,
                des_detalhes: {
                    id_produto_servico: value.id_produto_servico,
                    val_preco: value.val_preco,
                    dta_inicio: value.dta_inicio,
                }
            });

            const precoProdutoServico = await PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId(precoProdutoServicoId)

            return precoProdutoServico;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todos os preços de produto-serviço.
     * 
     * @method listarPrecoProdutoServico
     * @memberof PrecoProdutoServicoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de preços.
     * 
     * @example
     * const precos = await precoProdutoServicoService.listarPrecoProdutoServico(1);
     */
    async listarPrecoProdutoServico(usuarioLogadoId) {
        try {
            const precoProdutoServico = await PrecoProdutoServicoModel.listarPrecoProdutoServico();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_preco_produto_servico',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: precoProdutoServico.length
                }
            });

            return precoProdutoServico;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um preço por ID.
     * 
     * @method buscarPrecoProdutoServicoPorId
     * @memberof PrecoProdutoServicoService
     * @async
     * @param {number} id - ID do preço.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados do preço.
     * @throws {NotFoundError} Se não encontrado.
     * 
     * @example
     * const preco = await precoProdutoServicoService.buscarPrecoProdutoServicoPorId(1, 1);
     */
    async buscarPrecoProdutoServicoPorId(id, usuarioLogadoId) {

        const precoProdutoServico = await PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId(id);

        if (!precoProdutoServico) {
            throw new NotFoundError('Preço do serviço do produto não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_preco_produto_servico',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id: precoProdutoServico.id,
                id_produto_servico: precoProdutoServico.id_produto_servico,
                val_preco: precoProdutoServico.val_preco,
                dta_inicio: precoProdutoServico.dta_inicio,
            }
        });

        return precoProdutoServico;
    }

    /**
     * Atualiza um preço de produto-serviço.
     * 
     * @method atualizarPrecoProdutoServico
     * @memberof PrecoProdutoServicoService
     * @async
     * @param {number} id - ID do preço.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Preço atualizado.
     * @throws {Error} Se não encontrado ou falha na atualização.
     * 
     * @example
     * await precoProdutoServicoService.atualizarPrecoProdutoServico(1, { val_preco: 59.90 }, 1);
     */
    async atualizarPrecoProdutoServico(id, dados, usuarioLogadoId) {
        try {

            const precoProdutoServico = await PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId(id);


            if (!precoProdutoServico) {
                throw new NotFoundError('Preço do serviço do produto não encontrado');
            }

            const atualizado = await PrecoProdutoServicoModel.atualizarPrecoProdutoServico(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar tipo de Serviço');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_preco_produto_servico',
                des_detalhes: {
                    id: precoProdutoServico.id,
                    id_produto_servico: precoProdutoServico.id_produto_servico,
                    val_preco: precoProdutoServico.val_preco,
                    dta_inicio: precoProdutoServico.dta_inicio,
                    campos_alterados: Object.keys(dados)
                }
            });

            const precoProdutoServicoAtualizada = await PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId(id);

            return precoProdutoServicoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) um preço de produto-serviço.
     * 
     * @method deletarPrecoProdutoServico
     * @memberof PrecoProdutoServicoService
     * @async
     * @param {number} id - ID do preço.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrado ou falha na exclusão.
     * 
     * @example
     * await precoProdutoServicoService.deletarPrecoProdutoServico(1, 1);
     */
    async deletarPrecoProdutoServico(id, usuarioLogadoId) {
        try {
            const precoProdutoServico = await PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId(id);

            if (!precoProdutoServico) {
                throw new NotFoundError('Preço do serviço do produto não encontrado');
            }

            // Soft delete
            const deletado = await PrecoProdutoServicoModel.deletarPrecoProdutoServico(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_preco_produto_servico',
                num_registro_id: id,
                des_detalhes: {
                    id: precoProdutoServico.id,
                    id_produto_servico: precoProdutoServico.id_produto_servico,
                    val_preco: precoProdutoServico.val_preco,
                    dta_inicio: precoProdutoServico.dta_inicio,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PrecoProdutoServicoService();