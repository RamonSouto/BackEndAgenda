// src/services/produto/TamanhoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/TamanhoService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/TamanhoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const TamanhoModel = require('../../models/produto/TamanhoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe TamanhoService.
 * @class TamanhoService
 */
class TamanhoService {
    /**
     * Lista todos os tamanhos.
     * 
     * @method listarTamanhos
     * @memberof ProdutoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de tamanhos.
     * 
     * @example
     * const tamanhos = await produtoService.listarTamanhos(1);
     */
    async listarTamanhos(usuarioLogadoId) {
        try {
            const tamanhos = await TamanhoModel.listarTamanhos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_tamanhos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: tamanhos.length
                }
            });

            return tamanhos;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cria um novo tamanho.
     * 
     * @method adicionarTamanho
     * @memberof ProdutoService
     * @async
     * @param {Object} dados - Dados do tamanho.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Tamanho criado.
     * @throws {Error} Se validação falhar.
     * 
     * @example
     * const tam = await produtoService.adicionarTamanho({ cod_tamanho: 'M', des_tamanho: 'Médio' }, 1);
     */
    async adicionarTamanho(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.tamanhoProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const tamanhoId = await TamanhoModel.criarTamanhoProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_tamanhos',
                num_registro_id: tamanhoId,
                des_detalhes: {
                    cod_tamanho: value.cod_tamanho,
                    des_tamanho: value.des_tamanho,
                    des_categoria_tamanho: value.des_categoria_tamanho,
                    num_ordem_exibicao: value.num_ordem_exibicao
                }
            });

            const tamanhoProduto = await TamanhoModel.buscarTamanhoPorId(tamanhoId)

            return tamanhoProduto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um tamanho por ID.
     * 
     * @method listarTamanho
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do tamanho.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados do tamanho.
     * @throws {NotFoundError} Se não encontrado.
     * 
     * @example
     * const tam = await produtoService.listarTamanho(1, 1);
     */
    async buscarTamanho(id, usuarioLogadoId) {

        const tamanho = await TamanhoModel.buscarTamanhoPorId(id);

        if (!tamanho) {
            throw new NotFoundError('Tamanho não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_tamanhos',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                cod_tamanho: tamanho.cod_tamanho,
                des_tamanho: tamanho.des_tamanho,
                des_categoria_tamanho: tamanho.des_categoria_tamanho,
                num_ordem_exibicao: tamanho.num_ordem_exibicao
            }
        });

        return tamanho;
    }

    /**
     * Atualiza um tamanho.
     * 
     * @method atualizarTamanhos
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do tamanho.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Tamanho atualizado.
     * @throws {Error} Se não encontrado ou falha na atualização.
     * 
     * @example
     * await produtoService.atualizarTamanhos(1, { des_tamanho: 'Médio Grande' }, 1);
     */
    async atualizarTamanhos(id, dados, usuarioLogadoId) {
        try {
            const tamanhoExiste = await TamanhoModel.buscarTamanhoPorId(id);


            if (!tamanhoExiste) {
                throw new NotFoundError('Tamanho não encontrado');
            }

            const atualizado = await TamanhoModel.atualizarTamanho(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar tamanho');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_tamanhos',
                des_detalhes: {
                    cod_tamanho: tamanhoExiste.cod_tamanho,
                    des_tamanho: tamanhoExiste.des_tamanho,
                    campos_alterados: Object.keys(dados)
                }
            });

            const tamanhoAtualizada = await TamanhoModel.buscarTamanhoPorId(id);

            return tamanhoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) um tamanho.
     * 
     * @method deletarTamanhos
     * @memberof ProdutoService
     * @async
     * @param {number} id - ID do tamanho.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrado ou falha na exclusão.
     * 
     * @example
     * await produtoService.deletarTamanhos(1, 1);
     */
    async deletarTamanhos(id, usuarioLogadoId) {
        try {
            const tamanho = await TamanhoModel.buscarTamanhoPorId(id);

            if (!tamanho) {
                throw new NotFoundError('Tamanho não encontrado');
            }

            // Soft delete
            const deletado = await TamanhoModel.deletarTamanho(id);

            if (!deletado) {
                throw new Error('Erro ao deletar tamanho');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_tamanhos',
                num_registro_id: id,
                des_detalhes: {
                    tamanho: deletado.cod_tamanho,
                    des_tamanho: deletado.des_tamanho
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new TamanhoService();