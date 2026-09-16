// src/services/produto/GradeService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/GradeService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/GradeModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const GradeModel = require('../../models/produto/GradeModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe GradeService.
 * @class GradeService
 */
class GradeService {

    /**
     * Lista todas as grades de produtos.
     * 
     * @method listarGradesProdutos
     * @memberof GradeService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de grades.
     * 
     * @example
     * const grades = await gradeService.listarGradesProdutos(1);
     */
    async listarGradesProdutos(usuarioLogadoId) {
        try {
            const gradesProdutos = await GradeModel.listarGradesProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_grade',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: gradesProdutos.length
                }
            });

            return gradesProdutos;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cria uma nova grade de produto.
     * 
     * @method adicionarGradeProduto
     * @memberof GradeService
     * @async
     * @param {Object} dados - Dados da grade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Grade criada.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await gradeService.adicionarGradeProduto({ id_produto: 1, id_variacao_cor_estampa: 2, ... }, 1);
     */
    async adicionarGradeProduto(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.gradeProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const gradeProdutoId = await GradeModel.criarGradeProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_grade',
                num_registro_id: gradeProdutoId,
                des_detalhes: {
                    id_produto: value.id_produto,
                    id_variacao_cor_estampa: value.id_variacao_cor_estampa,
                    id_tamanho: value.id_tamanho,
                    num_sku: value.num_sku,
                    val_preco_variacao: value.val_preco_variacao,
                    ind_ativo: value.ind_ativo,
                    num_codigo_barras: value.num_codigo_barras
                }
            });

            const gradeProduto = await GradeModel.buscarGradeProdutoPorId(gradeProdutoId)

            return gradeProduto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma grade por ID.
     * 
     * @method listarGradeProduto
     * @memberof GradeService
     * @async
     * @param {number} id - ID da grade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da grade.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const grade = await gradeService.listarGradeProduto(1, 1);
     */
    async listarGradeProduto(id, usuarioLogadoId) {

        const gradeProduto = await GradeModel.buscarGradeProdutoPorId(id);

        if (!gradeProduto) {
            throw new NotFoundError('Grade não encontrada!');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_grade',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_produto: gradeProduto.id_produto,
                id_variacao_cor_estampa: gradeProduto.id_variacao_cor_estampa,
                id_tamanho: gradeProduto.id_tamanho,
                num_sku: gradeProduto.num_sku,
                val_preco_variacao: gradeProduto.val_preco_variacao,
                ind_ativo: gradeProduto.ind_ativo,
                num_codigo_barras: gradeProduto.num_codigo_barras
            }
        });

        return gradeProduto;
    }

    /**
     * Atualiza uma grade de produto.
     * 
     * @method atualizarGradeProduto
     * @memberof GradeService
     * @async
     * @param {number} id - ID da grade.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Grade atualizada.
     * @throws {Error} Se não encontrada ou falha na atualização.
     * 
     * @example
     * await gradeService.atualizarGradeProduto(1, { val_preco_variacao: 79.90 }, 1);
     */
    async atualizarGradeProduto(id, dados, usuarioLogadoId) {
        try {

            const gradeProduto = await GradeModel.buscarGradeProdutoPorId(id);

            if (!gradeProduto) {
                throw new NotFoundError("Grade não encontrada!");
            }

            const atualizado = await GradeModel.atualizarGradeProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar grade');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_grade',
                des_detalhes: {
                    id_produto: gradeProduto.id_produto,
                    id_variacao_cor_estampa: gradeProduto.id_variacao_cor_estampa,
                    id_tamanho: gradeProduto.id_tamanho,
                    num_sku: gradeProduto.num_sku,
                    val_preco_variacao: gradeProduto.val_preco_variacao,
                    ind_ativo: gradeProduto.ind_ativo,
                    num_codigo_barras: gradeProduto.num_codigo_barras,
                    campos_alterados: Object.keys(dados)
                }
            });

            const gradeProdutoAtualizada = await GradeModel.buscarGradeProdutoPorId(id);

            return gradeProdutoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) uma grade de produto.
     * 
     * @method deletarGradeProduto
     * @memberof GradeService
     * @async
     * @param {number} id - ID da grade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrada ou falha na exclusão.
     * 
     * @example
     * await gradeService.deletarGradeProduto(1, 1);
     */
    async deletarGradeProduto(id, usuarioLogadoId) {
        try {
            const gradeProduto = await GradeModel.buscarGradeProdutoPorId(id);

            console.log({ 'id': id, 'Produto Service': gradeProduto })

            if (!gradeProduto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await GradeModel.deletarGradeProduto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produto_grade',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    id_produto: deletado.id_produto,
                    id_variacao_cor_estampa: deletado.id_variacao_cor_estampa,
                    id_tamanho: deletado.id_tamanho,
                    num_sku: deletado.num_sku,
                    val_preco_variacao: deletado.val_preco_variacao,
                    ind_ativo: deletado.ind_ativo,
                    num_codigo_barras: deletado.num_codigo_barras
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new GradeService();