// src/services/ProdutoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/ProdutoService.js
 * @description Serviço de gerenciamento completo de produtos.
 * Gerencia produtos em agendamentos, fotos de ajuste, categorias, tamanhos,
 * cores/estampas, grades, produtos, imagens, tipos de serviço,
 * associações produto-serviço e preços, com validação, logs e upload.
 * 
 * @requires ../models/ProdutoModel
 * @requires ../models/AgendamentoModel
 * @requires ./LogService
 * @requires ../utils/constants
 * @requires ../utils/validators
 * @requires ../utils/ApiError
 * @requires ./UploadService
 */
const ProdutoModel = require('../models/ProdutoModel');
const AgendamentoModel = require('../models/AgendamentoModel');
const LogService = require('./LogService');
const { ACOES_LOG, MENSAGENS } = require('../utils/constants');
const validators = require('../utils/validators');
const { NotFoundError } = require('../utils/ApiError');
const UploadService = require('./UploadService');

/**
 * Classe ProdutoService.
 * @class ProdutoService
 */
class ProdutoService {
    /**
     * ===========================================
     * PRODUTOS EM AGENDAMENTO
     * ===========================================
     */

    /**
     * Adiciona um produto a um agendamento.
     * 
     * @method adicionarProdutoAgendamento
     * @memberof ProdutoService
     * @async
     * @param {Object} dados - Dados do produto no agendamento.
     * @param {number} dados.id_agendamento - ID do agendamento.
     * @param {number} dados.id_produto_grade - ID da grade do produto.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<number>} ID do produto de agendamento criado.
     * @throws {Error} Se o agendamento não existir.
     * 
     * @example
     * const id = await produtoService.adicionarProdutoAgendamento({ id_agendamento: 1, id_produto_grade: 5 }, 1);
     */
    async adicionarProdutoAgendamento(dados, usuarioLogadoId) {
        try {
            // Verificar se agendamento existe
            const agendamento = await AgendamentoModel.buscarPorId(dados.id_agendamento);

            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }

            // Adicionar produto ao agendamento
            const produtoId = await ProdutoModel.adicionarProdutoAgendamento(dados);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_agendamento',
                num_registro_id: produtoId,
                des_detalhes: {
                    agendamento_id: dados.id_agendamento,
                    produto_grade_id: dados.id_produto_grade,
                    paciente: agendamento.paciente_nome
                }
            });

            return produtoId;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todos os produtos de um agendamento (inclui fotos).
     * 
     * @method listarProdutosAgendamento
     * @memberof ProdutoService
     * @async
     * @param {number} id_agendamento - ID do agendamento.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de produtos com fotos.
     * 
     * @example
     * const produtos = await produtoService.listarProdutosAgendamento(1, 1);
     */
    async listarProdutosAgendamento(id_agendamento, usuarioLogadoId) {
        try {
            const produtos = await ProdutoModel.listarProdutosAgendamento(id_agendamento);

            // Buscar fotos de cada produto
            for (const produto of produtos) {
                produto.fotos = await ProdutoModel.listarFotosAjuste(produto.id);
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_agendamento',
                des_detalhes: {
                    tipo_consulta: 'listar_produtos_agendamento',
                    agendamento_id: id_agendamento,
                    total_produtos: produtos.length
                }
            });

            return produtos;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza o status de um produto de agendamento.
     * 
     * @method atualizarStatusProduto
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do produto de agendamento.
     * @param {string} status - Novo status.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se atualizado.
     * @throws {Error} Se a atualização falhar.
     * 
     * @example
     * await produtoService.atualizarStatusProduto(1, 'concluido', 1);
     */
    async atualizarStatusProduto(id, status, usuarioLogadoId) {
        try {
            const atualizado = await ProdutoModel.atualizarStatusProduto(id, status);

            if (!atualizado) {
                throw new Error('Erro ao atualizar status do produto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_agendamento',
                num_registro_id: id,
                des_detalhes: {
                    novo_status: status
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }




    /**
     * ===========================================
     * FOTOS DE AJUSTE
     * ===========================================
     */

    /**
     * Adiciona uma foto de ajuste.
     * 
     * @method adicionarFotoAjuste
     * @memberof ProdutoService
     * @async
     * @param {Object} dados - Dados da foto.
     * @param {number} dados.id_produto_agendamento - ID do produto de agendamento.
     * @param {string} dados.des_caminho_arquivo - Caminho do arquivo.
     * @param {string} dados.nom_original - Nome original do arquivo.
     * @param {number} dados.num_tamanho_bytes - Tamanho em bytes.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<number>} ID da foto inserida.
     * 
     * @example
     * const id = await produtoService.adicionarFotoAjuste({ id_produto_agendamento: 1, ... }, 1);
     */
    async adicionarFotoAjuste(dados, usuarioLogadoId) {
        try {
            const fotoId = await ProdutoModel.adicionarFotoAjuste(dados);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.UPLOAD,
                des_tabela: 'tab_fotos_ajustes',
                num_registro_id: fotoId,
                des_detalhes: {
                    produto_agendamento_id: dados.id_produto_agendamento,
                    nome_arquivo: dados.nom_original,
                    tamanho_bytes: dados.num_tamanho_bytes
                }
            });

            return fotoId;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista fotos de ajuste de um produto de agendamento.
     * 
     * @method listarFotosAjuste
     * @memberof ProdutoService
     * @async
     * @param {number} id_produto_agendamento - ID do produto de agendamento.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de fotos.
     * 
     * @example
     * const fotos = await produtoService.listarFotosAjuste(1, 1);
     */
    async listarFotosAjuste(id_produto_agendamento, usuarioLogadoId) {
        try {
            const fotos = await ProdutoModel.listarFotosAjuste(id_produto_agendamento);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_fotos_ajustes',
                des_detalhes: {
                    tipo_consulta: 'listar_fotos_ajuste',
                    produto_agendamento_id: id_produto_agendamento,
                    total_fotos: fotos.length
                }
            });

            return fotos;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta uma foto de ajuste (registro no banco, arquivo deletado no controller).
     * 
     * @method deletarFoto
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID da foto.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se a foto não existir ou falha na exclusão.
     * 
     * @example
     * await produtoService.deletarFoto(1, 1);
     */
    async deletarFoto(id, usuarioLogadoId) {
        try {
            const foto = await ProdutoModel.buscarFotoPorId(id);

            if (!foto) {
                throw new Error('Foto não encontrada');
            }

            const deletado = await ProdutoModel.deletarFoto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar foto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_fotos_ajustes',
                num_registro_id: id,
                des_detalhes: {
                    caminho_arquivo: foto.des_caminho_arquivo,
                    nome_original: foto.nom_original
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma foto por ID.
     * 
     * @method buscarFotoPorId
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID da foto.
     * @returns {Promise<Object>} Dados da foto.
     * @throws {Error} Se a foto não existir.
     * 
     * @example
     * const foto = await produtoService.buscarFotoPorId(1);
     */
    async buscarFotoPorId(id) {
        try {
            const foto = await ProdutoModel.buscarFotoPorId(id);

            if (!foto) {
                throw new Error('Foto não encontrada');
            }

            return foto;

        } catch (error) {
            throw error;
        }
    }



    /**
     * ===========================================
     * CATEGORIAS
     * ===========================================
     */






    /**
     * ===========================================
     * TAMANHOS
     * ===========================================
     */






    /**
     * ===========================================
     * CORES E ESTAMPAS
     * ===========================================
     */






    /**
     * ===========================================
     * GRADES DE PRODUTOS
     * ===========================================
     */






    /**
     * ===========================================
     * PRODUTOS
     * ===========================================
     */

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




    /**
     * ===========================================
     * IMAGENS DE PRODUTOS
     * ===========================================
     */







    /**
     * ===========================================
     * TIPOS DE SERVIÇO
     * ===========================================
     */







    /**
     * ===========================================
     * PRODUTO-SERVIÇO
     * ===========================================
     */







    /**
     * ===========================================
     * PREÇOS DE PRODUTO-SERVIÇO
     * ===========================================
     */


}

module.exports = new ProdutoService();