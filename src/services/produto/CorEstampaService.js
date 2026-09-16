// src/services/produto/CorEstampaService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/TamanhoService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/CorEstampaService
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const CorEstampaModel = require('../../models/produto/CorEstampaModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError, ConflictError } = require('../../utils/ApiError');
const UploadService = require('../UploadService');

/**
 * Classe CorEstampaService.
 * @class CorEstampaService
 */
class CorEstampaService {
    /**
         * Lista todas as cores/estampas.
         * 
         * @method listarCoresEstampas
         * @memberof ProdutoService
         * @async
         * @param {number} usuarioLogadoId - ID do usuário logado.
         * @returns {Promise<Array<Object>>} Lista de cores/estampas.
         * 
         * @example
         * const cores = await produtoService.listarCoresEstampas(1);
         */
    async listarCoresEstampas(usuarioLogadoId) {
        try {
            const coresEstampas = await CorEstampaModel.listarCoresEstampas();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: coresEstampas.length
                }
            });

            return coresEstampas;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cria uma nova cor/estampa.
     * 
     * @method adicionarCorEstampa
     * @memberof ProdutoService
     * @async
     * @param {Object} dados - Dados da cor/estampa.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Cor/estampa criada.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * await produtoService.adicionarCorEstampa({ nom_cor_estampa: 'Vermelho', ind_tipo: 'cor' }, 1);
     */
    async adicionarCorEstampa(dados, usuarioLogadoId) {
        try {

            if (dados.des_imagem_url && dados.val_codigo_hex) {
                await UploadService.deletarArquivo(dados.des_imagem_url);
                throw new ConflictError('Conflito de dados enviado!');
            }

            if (dados.des_imagem_url) {
                dados.val_codigo_hex = null
            } else {
                dados.des_imagem_url = null
            }

            //Validar dados
            const { error, value } = validators.corEstampaProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            console.log(value);

            const corEstampaId = await CorEstampaModel.criarCorEstampaProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                num_registro_id: corEstampaId,
                des_detalhes: {
                    nom_cor_estampa: value.nom_cor_estampa,
                    ind_tipo: value.ind_tipo,
                    val_codigo_hex: value.val_codigo_hex,
                    des_imagem_url: value.des_imagem_url,
                    num_ordem_exibicao: value.num_ordem_exibicao
                }
            });

            const corEstampaProduto = await CorEstampaModel.buscarCorEstampaPorId(corEstampaId)

            return corEstampaProduto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma cor/estampa por ID.
     * 
     * @method listarCorEstampa
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID da cor/estampa.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da cor/estampa.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const cor = await produtoService.listarCorEstampa(1, 1);
     */
    async listarCorEstampa(id, usuarioLogadoId) {

        const corEstampa = await CorEstampaModel.buscarCorEstampaPorId(id);

        if (!corEstampa) {
            throw new NotFoundError('Cor ou Estampa não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_variacoes_cor_estampa',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                nom_cor_estampa: corEstampa.nom_cor_estampa,
                ind_tipo: corEstampa.ind_tipo,
                val_codigo_hex: corEstampa.val_codigo_hex,
                des_imagem_url: corEstampa.des_imagem_url,
                num_ordem_exibicao: corEstampa.num_ordem_exibicao
            }
        });

        return corEstampa;
    }

    /**
     * Atualiza uma cor/estampa.
     * 
     * @method atualizarCorEstampa
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID da cor/estampa.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Cor/estampa atualizada.
     * @throws {Error} Se não encontrada ou falha na atualização.
     * 
     * @example
     * await produtoService.atualizarCorEstampa(1, { nom_cor_estampa: 'Azul' }, 1);
     */
    async atualizarCorEstampa(id, dados, usuarioLogadoId) {
        try {

            if (dados.des_imagem_url && dados.val_codigo_hex) {
                await UploadService.deletarArquivo(dados.des_imagem_url);
                throw new ConflictError('Conflito de dados enviado!');
            }

            const corEstampaExiste = await CorEstampaModel.buscarCorEstampaPorId(id);

            if (!corEstampaExiste) {
                throw new NotFoundError("Cor ou Estampa não encontrado");
            }

            if (corEstampaExiste.des_imagem_url && corEstampaExiste.ind_tipo === "estampa" && dados.ind_tipo === "cor") {
                dados.des_imagem_url = null
                UploadService.deletarArquivo(corEstampaExiste.des_imagem_url);
            } else {
                dados.val_codigo_hex = null
            }

            const atualizado = await CorEstampaModel.atualizarCorEstampa(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                des_detalhes: {
                    nom_cor_estampa: corEstampaExiste.nom_cor_estampa,
                    ind_tipo: corEstampaExiste.ind_tipo,
                    campos_alterados: Object.keys(dados)
                }
            });

            const corEstampaAtualizada = await CorEstampaModel.buscarCorEstampaPorId(id);

            return corEstampaAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) uma cor/estampa.
     * 
     * @method deletarCorEstampa
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID da cor/estampa.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrada ou falha na exclusão.
     * 
     * @example
     * await produtoService.deletarCorEstampa(1, 1);
     */
    async deletarCorEstampa(id, usuarioLogadoId) {
        try {
            const corEstampa = await CorEstampaModel.buscarCorEstampaPorId(id);

            if (!corEstampa) {
                throw new NotFoundError("Cor ou Estampa não encontrado");
            }

            // Soft delete
            const deletado = await CorEstampaModel.deletarCorEstampa(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    nom_cor_estampa: deletado.nom_cor_estampa,
                    ind_tipo: deletado.ind_tipo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CorEstampaService();