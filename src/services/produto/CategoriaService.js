// src/services/produto/CategoriaService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/service/produto/CategoriaService.js
 * @description Serviço de gerenciamento completo de Categorias.
 * 
 * @requires ../../models/produto/CategoriaModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const CategoriaModel = require('../../models/produto/CategoriaModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe CategoriaService.
 * @class CategoriaService
 */
class CategoriaService {
    /**
         * Cria uma nova categoria.
         * 
         * @method adicionarCategoria
         * @memberof CategoriaService
         * @async
         * @param {Object} dados - Dados da categoria (nom_categoria, id_pai).
         * @param {number} usuarioLogadoId - ID do usuário logado.
         * @returns {Promise<Object>} Categoria criada.
         * @throws {Error} Se validação falhar ou categoria pai não existir.
         * 
         * @example
         * const cat = await CategoriaService.adicionarCategoria({ nom_categoria: 'Camisas' }, 1);
         */
    async adicionarCategoria(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.categoriaProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            if (value.id_pai) {
                const existeCategoriaPai = await CategoriaModel.buscarCategoriaPorId(value.id_pai);

                if (!existeCategoriaPai) {
                    throw new Error(MENSAGENS.ERRO.CATEGORIA_PAI);
                }
            }

            const categoriaId = await CategoriaModel.criarCategoriaProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_categorias_produtos',
                num_registro_id: categoriaId,
                des_detalhes: {
                    nom_categoria: value.nom_categoria,
                    id_pai: value.id_pai
                }
            });

            const categoriaProduto = await CategoriaModel.buscarCategoriaPorId(categoriaId)

            return categoriaProduto;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista todas as categorias.
     * 
     * @method listarCategorias
     * @memberof CategoriaService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Array<Object>>} Lista de categorias.
     * 
     * @example
     * const categorias = await CategoriaService.listarCategorias(1);
     */
    async listarCategorias(usuarioLogadoId) {
        try {
            const categorias = await CategoriaModel.listarCategorias();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_categorias_produtos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: categorias.length
                }
            });

            return categorias;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca uma categoria por ID.
     * 
     * @method listarCategoria
     * @memberof CategoriaService
     * @async
     * @param {number} id - ID da categoria.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Dados da categoria.
     * @throws {NotFoundError} Se não encontrada.
     * 
     * @example
     * const categoria = await CategoriaService.listarCategoria(1, 1);
     */
    async listarCategoria(id, usuarioLogadoId) {
        try {
            const categoria = await CategoriaModel.buscarCategoriaPorId(id);

            if (!categoria) {

                throw new NotFoundError('Categoria não encontrada');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_categorias_produtos',
                des_detalhes: {
                    tipo_consulta: 'busca_por_id',
                    categoria_consultada: categoria.nom_categoria
                }
            });

            return categoria;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza uma categoria.
     * 
     * @method atualizarCategoria
     * @memberof CategoriaService
     * @async
     * @param {number} id - ID da categoria.
     * @param {Object} dados - Dados a atualizar.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Categoria atualizada.
     * @throws {Error} Se não encontrada ou falha na atualização.
     * 
     * @example
     * const cat = await CategoriaService.atualizarCategoria(1, { nom_categoria: 'Novo Nome' }, 1);
     */
    async atualizarCategoria(id, dados, usuarioLogadoId) {
        try {
            const categoriaExiste = await CategoriaModel.buscarCategoriaPorId(id);

            if (!categoriaExiste) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await CategoriaModel.atualizarCategoria(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_categorias_produtos',
                des_detalhes: {
                    categoria: categoriaExiste.nom_categoria,
                    campos_alterados: Object.keys(dados)
                }
            });

            const categoriaAtualizada = await CategoriaModel.buscarCategoriaPorId(id);

            return categoriaAtualizada;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta (soft delete) uma categoria.
     * 
     * @method deletarCategoria
     * @memberof CategoriaService
     * @async
     * @param {number} id - ID da categoria.
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<boolean>} `true` se deletado.
     * @throws {Error} Se não encontrada, tiver subcategorias ou falha na exclusão.
     * 
     * @example
     * await CategoriaService.deletarCategoria(1, 1);
     */
    async deletarCategoria(id, usuarioLogadoId) {
        try {
            const categoria = await CategoriaModel.buscarCategoriaPorId(id);

            if (!categoria) {
                throw new NotFoundError('Categoria não encontrada!');
            }

            const temFilho = await CategoriaModel.buscarCategoriaFilho(id);


            if (temFilho.length > 0) {
                throw new Error(MENSAGENS.ERRO.CATEGORIA_FILHO);
            }

            // Soft delete
            const deletado = await CategoriaModel.deletarCategoria(id);

            if (!deletado) {
                throw new Error('Erro ao deletar Categoria');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_categorias_produtos',
                num_registro_id: id,
                des_detalhes: {
                    categoria: categoria.nom_categoria,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CategoriaService();