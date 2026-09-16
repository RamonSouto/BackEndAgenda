// src/services/produto/ImagemService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/ImagemService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/ImagemModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const ImagemModel = require('../../models/produto/ImagemModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe ImagemService.
 * @class ImagemService
 */
class ImagemService {
    /**
     * Lista todas as imagens de produtos.
     * 
     * @method listarImagemProdutos
     * @memberof ImagemService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de imagens.
     * 
     * @example
     * const imagens = await imagemService.listarImagemProdutos(1);
     */
    async listarImagemProdutos(usuarioLogadoId) {
        try {
            const imagemProdutos = await ImagemModel.listarImagemProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_imagens',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: imagemProdutos.length
                }
            });

            return imagemProdutos;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Adiciona uma nova imagem a um produto ou grade.
     * 
     * @method adicionarImagemProduto
     * @memberof ImagemService
     * @async
     * @param {Object} dados - Dados da imagem (id_produto, id_produto_grade, des_url_imagem, etc.).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Imagem criada.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await ImagemService.adicionarImagemProduto({ id_produto: 1, des_url_imagem: '/uploads/...' }, 1);
     */
    async adicionarImagemProduto(dados, usuarioLogadoId) {
        try {

            dados.id_produto = (dados.id_produto && dados.id_produto !== '' && dados.id_produto !== 'null') ? parseInt(dados.id_produto) : null;

            dados.id_produto_grade = (dados.id_produto_grade && dados.id_produto_grade !== '' && dados.id_produto_grade !== 'null') ? parseInt(dados.id_produto_grade) : null;

            const { error, value } = validators.imagemProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const isPrincipal = value.ind_principal == true || value.ind_principal === 'true' || value.ind_principal === 1;

            if (isPrincipal) {
                if (value.id_produto) {
                    await ImagemModel.desmarcarImagemPrincipalPorProduto(value.id_produto)
                } else if (value.id_produto_grade) {
                    await ImagemModel.desmarcarImagemPrincipalPorGrade(value.id_produto_grade)
                }
            }

            const imagemProdutoId = await ImagemModel.criarImagemProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_imagens',
                num_registro_id: imagemProdutoId,
                des_detalhes: {
                    id_produto_grade: imagemProdutoId.id_produto_grade,
                    id_produto: imagemProdutoId.id_produto,
                    des_url_imagem: imagemProdutoId.des_url_imagem,
                    num_ordem: imagemProdutoId.num_ordem,
                    ind_principal: imagemProdutoId.ind_principal
                }
            });

            const imagemProduto = await ImagemModel.buscarImagemProdutoId(imagemProdutoId)

            return imagemProduto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma imagem por ID.
     * 
     * @method buscarImagemProdutoID
     * @memberof ImagemService
     * @async
     * @param {number} id_produto - ID da imagem (ou produto?).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da imagem.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const img = await imagemService.buscarImagemProdutoID(1, 1);
     */
    async buscarImagemProdutoID(id_produto, usuarioLogadoId) {

        const imagemProduto = await ImagemModel.buscarImagemProdutoPorId(id_produto);

        if (!imagemProduto) {
            throw new NotFoundError('Imagem do produto não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_imagens',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_produto_grade: imagemProduto.id_produto_grade,
                id_produto: imagemProduto.id_produto,
                des_url_imagem: imagemProduto.des_url_imagem,
                num_ordem: imagemProduto.num_ordem,
                ind_principal: imagemProduto.ind_principal
            }
        });

        return imagemProduto;
    }

    /**
     * Busca imagens associadas a uma grade de produto.
     * 
     * @method buscarImagemProdutoGradeID
     * @memberof ImagemService
     * @async
     * @param {number} id_produto_grade - ID da grade.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Imagem(s) da grade.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const img = await ImagemService.buscarImagemProdutoGradeID(1, 1);
     */
    async buscarImagemProdutoGradeID(id_produto_grade, usuarioLogadoId) {

        const imagemProduto = await ImagemModel.buscarImagemProdutoGradeID(id_produto_grade);

        if (!imagemProduto) {
            throw new NotFoundError('Imagem do produto não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_imagens',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_produto_grade: imagemProduto.id_produto_grade,
                id_produto: imagemProduto.id_produto,
                des_url_imagem: imagemProduto.des_url_imagem,
                num_ordem: imagemProduto.num_ordem,
                ind_principal: imagemProduto.ind_principal
            }
        });

        return imagemProduto;
    }

    /**
     * Atualiza uma imagem de produto.
     * 
     * @method atualizarImagemProduto
     * @memberof ImagemService
     * @async
     * @param {number} id - ID da imagem.
     * @param {Object} dados - Dados a atualizar (inclui des_url_imagem se nova imagem).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Imagem atualizada.
     * @throws {Error} Se não encontrada ou falha na atualização.
     * 
     * @example
     * await imagemService.atualizarImagemProduto(1, { ind_principal: true }, 1);
     */
    async atualizarImagemProduto(id, dados, usuarioLogadoId) {
        try {

            dados.id_produto = (dados.id_produto && dados.id_produto !== '' && dados.id_produto !== 'null') ? parseInt(dados.id_produto) : null;
            dados.id_produto_grade = (dados.id_produto_grade && dados.id_produto_grade !== '' && dados.id_produto_grade !== 'null') ? parseInt(dados.id_produto_grade) : null;
            dados.ind_principal = (dados.ind_principal === true || dados.ind_principal === 'true' || dados.ind_principal === 1) ? true : false;

            const imagemProduto = await ImagemModel.buscarImagemProdutoId(id);

            if (!imagemProduto) {
                throw new NotFoundError('Imagem do produto não encontrado');
            }

            // imagemProduto é um array (ver Model: `return resultado || null;`)
            const registroAtual = Array.isArray(imagemProduto) ? imagemProduto[0] : imagemProduto;

            const isPrincipal = dados.ind_principal == true || dados.ind_principal === 'true' || dados.ind_principal === 1;

            if (isPrincipal) {
                if (dados.id_produto) {
                    await ImagemModel.desmarcarImagemPrincipalPorProduto(dados.id_produto)
                } else if (dados.id_produto_grade) {
                    await ImagemModel.desmarcarImagemPrincipalPorGrade(dados.id_produto_grade)
                }
            }

            // Se uma NOVA imagem foi enviada (des_url_imagem mudou), apaga o arquivo físico antigo
            const enviouNovaImagem = dados.des_url_imagem &&
                registroAtual?.des_url_imagem &&
                dados.des_url_imagem !== registroAtual.des_url_imagem;

            if (enviouNovaImagem) {
                await UploadService.deletarArquivo(registroAtual.des_url_imagem).catch(console.error);
            }

            const atualizado = await ImagemModel.atualizarImagemProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_imagens',
                des_detalhes: {
                    id_produto_grade: registroAtual.id_produto_grade,
                    id_produto: registroAtual.id_produto,
                    des_url_imagem_anterior: registroAtual.des_url_imagem,
                    des_url_imagem_nova: dados.des_url_imagem || registroAtual.des_url_imagem,
                    num_ordem: registroAtual.num_ordem,
                    ind_principal: registroAtual.ind_principal,
                    campos_alterados: Object.keys(dados)
                }
            });

            const imagemProdutoAtualizada = await ImagemModel.buscarImagemProdutoPorId(id);

            return imagemProdutoAtualizada;
        } catch (error) {
            throw error;
        }
    }



    /**
     * Deleta (soft delete) uma imagem de produto.
     * 
     * @method deletarImagemProduto
     * @memberof ImagemService
     * @async
     * @param {number} id - ID da imagem.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrada ou falha na exclusão.
     * 
     * @description
     * Se a imagem for a principal, tenta ativar a próxima imagem como principal.
     * 
     * @example
     * await imagemService.deletarImagemProduto(1, 1);
     */
    async deletarImagemProduto(id, usuarioLogadoId) {
        try {
            const imagemProduto = await ImagemModel.buscarImagemProdutoId(id);

            if (!imagemProduto) {
                throw new NotFoundError('Imagem do produto não encontrado');
            }

            const isPrincipal = imagemProduto[0].ind_principal == true || imagemProduto[0].ind_principal === 'true' || imagemProduto[0].ind_principal === 1;

            if (isPrincipal) {
                if (imagemProduto[0].id_produto) {

                    const produto = await ImagemModel.buscarImagemProdutoPorId(imagemProduto[0].id_produto);

                    if (produto.length > 0) {
                        await ImagemModel.desmarcarImagemPrincipalPorProduto(imagemProduto[0].id_produto)
                        await ImagemModel.atualizarImagemProduto(produto[0].id, { ind_principal: 1 })
                    }
                } else if (imagemProduto[0].id_produto_grade) {
                    const produto = await ImagemModel.buscarImagemProdutoGradeID(imagemProduto[0].id_produto_grade);
                    console.log(produto.length)
                    if (produto.length > 0) {
                        await ImagemModel.desmarcarImagemPrincipalPorGrade(imagemProduto[0].id_produto_grade)
                        await ImagemModel.atualizarImagemProduto(produto[0].id, { ind_principal: 1 })
                    }
                }
            }
            // Soft delete
            const deletado = await ImagemModel.deletarImagemProduto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar imagem do produto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produto_imagens',
                num_registro_id: id,
                des_detalhes: {
                    id_produto_grade: imagemProduto.id_produto_grade,
                    id_produto: imagemProduto.id_produto,
                    des_url_imagem: imagemProduto.des_url_imagem,
                    num_ordem: imagemProduto.num_ordem,
                    ind_principal: imagemProduto.ind_principal,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ImagemService();