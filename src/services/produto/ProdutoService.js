// src/services/produto/ProdutoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/ProdutoService.js
 * @description Serviço de gerenciamento completo de produtos.
 * Gerencia produtos em agendamentos, fotos de ajuste, categorias, tamanhos,
 * cores/estampas, grades, produtos, imagens, tipos de serviço,
 * associações produto-serviço e preços, com validação, logs e upload.
 * 
 * @requires ../../models/produto/ProdutoModel
 * @requires ../../models/AgendamentoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 * @requires ../UploadService
 */
const ProdutoModel = require('../../models/produto/ProdutoModel');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');
const UploadService = require('../UploadService');

/**
 * Classe ProdutoService.
 * @class ProdutoService
 */
class ProdutoService {

    /**
     * Cria um novo produto.
     * 
     * @method adicionarProduto
     * @memberof ProdutoService
     * @async
     * @param {Object} dados - Dados do produto.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Produto criado.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await produtoService.adicionarProduto({ id_categoria: 1, nom_produto: 'Camisa' }, 1);
     */
    async adicionarProduto(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.produtoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const produtoId = await ProdutoModel.criarProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produtos',
                num_registro_id: produtoId,
                des_detalhes: {
                    id_categoria: value.id_categoria,
                    nom_produto: value.nom_produto,
                    num_sku: value.num_sku,
                    des_produto: value.des_produto,
                    ref_produto: value.ref_produto,
                    val_preco_base: value.val_preco_base,
                    ind_ativo: value.ind_ativo
                }
            });

            const produto = await ProdutoModel.buscarProdutoPorId(produtoId)

            return produto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todos os produtos.
     * 
     * @method listarProdutos
     * @memberof ProdutoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de produtos.
     * 
     * @example
     * const produtos = await produtoService.listarProdutos(1);
     */
    async listarProdutos(usuarioLogadoId) {
        try {
            const produtos = await ProdutoModel.listarProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produtos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: produtos.length
                }
            });

            return produtos;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um produto por ID.
     * 
     * @method listarProduto
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do produto.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados do produto.
     * @throws {NotFoundError} Se não encontrado.
     * 
     * @example
     * const prod = await produtoService.listarProduto(1, 1);
     */
    async listarProduto(id, usuarioLogadoId) {

        const produto = await ProdutoModel.buscarProdutoPorId(id);

        if (!produto) {
            throw new NotFoundError('Produto não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produtos',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_categoria: produto.id_categoria,
                nom_produto: produto.nom_produto,
                num_sku: produto.num_sku,
                des_produto: produto.des_produto,
                ref_produto: produto.ref_produto,
                val_preco_base: produto.val_preco_base,
                ind_ativo: produto.ind_ativo
            }
        });

        return produto;
    }

    /**
     * Atualiza um produto.
     * 
     * @method atualizarProduto
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do produto.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Produto atualizado.
     * @throws {Error} Se não encontrado ou falha na atualização.
     * 
     * @example
     * await produtoService.atualizarProduto(1, { nom_produto: 'Novo Nome' }, 1);
     */
    async atualizarProduto(id, dados, usuarioLogadoId) {
        try {

            const produto = await ProdutoModel.buscarProdutoPorId(id);


            if (!produto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produtos',
                des_detalhes: {
                    id_categoria: produto.id_categoria,
                    nom_produto: produto.nom_produto,
                    num_sku: produto.num_sku,
                    des_produto: produto.des_produto,
                    ref_produto: produto.ref_produto,
                    val_preco_base: produto.val_preco_base,
                    ind_ativo: produto.ind_ativo,
                    campos_alterados: Object.keys(dados)
                }
            });

            const produtoAtualizada = await ProdutoModel.buscarProdutoPorId(id);

            return produtoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) um produto.
     * 
     * @method deletarProduto
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do produto.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrado ou falha na exclusão.
     * 
     * @example
     * await produtoService.deletarProduto(1, 1);
     */
    async deletarProduto(id, usuarioLogadoId) {
        try {
            const produto = await ProdutoModel.buscarProdutoPorId(id);

            if (!produto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarProduto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produtos',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    id_categoria: deletado.id_categoria,
                    nom_produto: deletado.nom_produto,
                    num_sku: deletado.num_sku,
                    des_produto: deletado.des_produto,
                    ref_produto: deletado.ref_produto,
                    val_preco_base: deletado.val_preco_base,
                    ind_ativo: deletado.ind_ativo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ProdutoService();