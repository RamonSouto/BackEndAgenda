// src/services/produto/ProdutoServicoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/ProdutoServicoService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/ProdutoServicoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const ProdutoServicoModel = require('../../models/produto/ProdutoServicoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe ProdutoServicoService.
 * @class ProdutoServicoService
 */
class ProdutoServicoService {
    /**
     * Cria uma associação produto-serviço.
     * 
     * @method adicionarProdutoServico
     * @memberof ProdutoServicoService
     * @async
     * @param {Object} dados - Dados da associação (id_produto, id_tipo_servico, ind_ativo).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Associação criada.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await produtoServicoService.adicionarProdutoServico({ id_produto: 1, id_tipo_servico: 2 }, 1);
     */
    async adicionarProdutoServico(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.produtoServicoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const produtoServicoId = await ProdutoServicoModel.criarProdutoTipoServico(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_servico',
                num_registro_id: produtoServicoId,
                des_detalhes: {
                    id_produto: value.id_produto,
                    id_tipo_servico: value.id_tipo_servico,
                    ind_ativo: value.ind_ativo,
                }
            });

            const produtoServico = await ProdutoServicoModel.buscarProdutoServicoPorId(produtoServicoId)

            return produtoServico;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todas as associações produto-serviço.
     * 
     * @method listarProdutoServico
     * @memberof ProdutoServicoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de associações.
     * 
     * @example
     * const assocs = await produtoServicoService.listarProdutoServico(1);
     */
    async listarProdutoServico(usuarioLogadoId) {
        try {
            const produtoServico = await ProdutoServicoModel.listarProdutoServico();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_servico',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: produtoServico.length
                }
            });

            return produtoServico;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma associação produto-serviço por ID.
     * 
     * @method buscarProdutoServicoId
     * @memberof ProdutoServicoService
     * @async
     * @param {number} id - ID da associação.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da associação.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const assoc = await produtoServicoService.buscarProdutoServicoId(1, 1);
     */
    async buscarProdutoServicoId(id, usuarioLogadoId) {

        const produtoServico = await ProdutoServicoModel.buscarProdutoServicoPorId(id);

        if (!produtoServico) {
            throw new NotFoundError('Tipo de serviço do produto não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_servico',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id: produtoServico.id,
                des_tipo_ajuste: produtoServico.des_tipo_ajuste,
                ind_ativo: produtoServico.ind_ativo,
            }
        });

        return produtoServico;
    }

    /**
     * Busca uma associação produto-serviço por ID.
     * 
     * @method buscarProdutoServicoId
     * @memberof ProdutoServicoService
     * @async
     * @param {number} id - ID da associação.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da associação.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const assoc = await produtoServicoService.buscarProdutoServicoId(1, 1);
     */
    async buscarServicoPorIdEIdGrade(idServico, idGrade, usuarioLogadoId) {

        const produtoServicoGrade = await ProdutoServicoModel.buscarServicoPorIdEIdGrade(idServico, idGrade);

        if (!produtoServicoGrade) {
            throw new NotFoundError('Tipo de serviço do produto não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_servico',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id: produtoServicoGrade.id_produto_servico,
                des_tipo_ajuste: produtoServicoGrade.des_tipo_ajuste,
                val_preco: produtoServicoGrade.val_preco
            }
        });

        return produtoServicoGrade;
    }

    /**
     * Atualiza uma associação produto-serviço.
     * 
     * @method atualizarProdutoServico
     * @memberof ProdutoServicoService
     * @async
     * @param {number} id - ID da associação.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Associação atualizada.
     * @throws {Error} Se não encontrada ou falha na atualização.
     * 
     * @example
     * await produtoServicoService.atualizarProdutoServico(1, { ind_ativo: false }, 1);
     */
    async atualizarProdutoServico(id, dados, usuarioLogadoId) {
        try {

            const produtoServico = await ProdutoServicoModel.buscarProdutoServicoPorId(id);


            if (!produtoServico) {
                throw new NotFoundError('Tipo de serviço do produto não encontrado')
            }

            const atualizado = await ProdutoServicoModel.atualizarProdutoServico(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar tipo de Serviço');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_servico',
                des_detalhes: {
                    id: produtoServico.id_categoria,
                    des_tipo_ajuste: produtoServico.nom_produto,
                    ind_ativo: produtoServico.num_sku,
                    campos_alterados: Object.keys(dados)
                }
            });

            const tipoServicoAtualizada = await ProdutoServicoModel.buscarProdutoServicoPorId(id);

            return tipoServicoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) uma associação produto-serviço.
     * 
     * @method deletarProdutoServico
     * @memberof ProdutoServicoService
     * @async
     * @param {number} id - ID da associação.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrada ou falha na exclusão.
     * 
     * @example
     * await produtoServicoService.deletarProdutoServico(1, 1);
     */
    async deletarProdutoServico(id, usuarioLogadoId) {
        try {
            const produtoServico = await ProdutoServicoModel.buscarProdutoServicoPorId(id);

            if (!produtoServico) {
                throw new NotFoundError('Tipo de serviço do produto não encontrado')
            }

            // Soft delete
            const deletado = await ProdutoServicoModel.deletarProdutoServico(id);

            if (!deletado) {
                throw new Error('Erro ao deletar serviço do produto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produto_servico',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    id_produto: deletado.id_produto,
                    id_tipo_servico: deletado.id_tipo_servico,
                    ind_ativo: deletado.ind_ativo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ProdutoServicoService();