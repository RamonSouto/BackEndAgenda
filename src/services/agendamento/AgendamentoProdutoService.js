// src/services/agendamento/AgendamentoProdutoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/produtoAgendadoService.js
 * @description Regras de negócio para itens de produto/serviço agendados.
 * 
 * @requires ../../config/database
 * @requires ../../models/agendamento/AgendamentoProdutoModel
 * @requires ../../models/agendamento/AgendamentoModel
 * @requires ../../utils/ApiError
 * @requires ../LogService
 */
const AgendamentoProdutoModel = require('../../models/agendamento/AgendamentoProdutoModel');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const { NotFoundError, ValidationError } = require('../../utils/ApiError');
const LogService = require('../LogService');
const GradeService = require('../produto/GradeService');
const ProdutoServicoService = require('../produto/ProdutoServicoService');
const validators = require('../../utils/validators');
const { ACOES_LOG } = require('../../utils/constants');

class AgendamentoProdutoService {

    /**
     * Adiciona um item de produto/serviço a um agendamento existente.
     * 
     * @param {number} idAgendamento
     * @param {Object} dadosItem
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async adicionarItem(dados, usuarioLogadoId) {
        try {
            const { error, value } = validators.produtoAgendadoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const agendamento = await AgendamentoModel.buscarPorId(value.id_agendamento);

            if (!agendamento) throw new ApiError(404, 'Agendamento não encontrado');

            if (['concluido', 'cancelado'].includes(value.ind_status)) {
                throw new ApiError(422, 'Não é possível adicionar itens a um agendamento finalizado ou cancelado');
            }

            const gradeProdutoPorId = await GradeService.listarGradeProduto(value.id_produto_grade, usuarioLogadoId);

            if (!gradeProdutoPorId) {
                throw new ValidationError("Erro grade do produto não localizado");
            }

            const produtoServico = await ProdutoServicoService.buscarServicoPorIdEIdGrade(value.id_produto_servico, value.id_produto_grade, usuarioLogadoId)

            if (!produtoServico) {
                throw new ValidationError("Erro Serviço do produto não localizado");
            }

            const agendamentoProdutoServicoId = await AgendamentoProdutoModel.criar({ ...value, val_preco_servico: produtoServico.val_preco });

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_agendamento_item',
                num_registro_id: agendamentoProdutoServicoId,
                des_detalhes: {
                    id_tipo_agendamento: value.id_tipo_agendamento,
                    id_produto_grade: value.id_produto_grade,
                    id_produto_servico: value.id_produto_servico,
                    des_ajuste_produto: value.des_ajuste_produto,
                    val_desconto_servico: value.val_desconto_servico
                }
            });

            const agendamentoProdutoServico = await this.buscarPorId(agendamentoProdutoServicoId);

            return agendamentoProdutoServico;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lista os itens de um agendamento.
     * @param {number} idAgendamento
     * @returns {Promise<Array>}
     */
    async listarPorAgendamento(idAgendamento) {
        try {
            return AgendamentoProdutoModel.listarPorAgendamento(idAgendamento);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um item por ID.
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async buscarPorId(id) {
        try {
            const item = await AgendamentoProdutoModel.buscarPorId(id);

            if (!item) {
                throw new NotFoundError('Item do agendamento não encontrado');
            }

            return item;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza um item (desconto, observação, status individual).
     * @param {number} id
     * @param {Object} dados
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async atualizar(idAgendamento, idProdutoAgendado, dados, usuarioLogadoId) {
        try {
            const agendamento = await AgendamentoModel.buscarPorId(idAgendamento);

            if (!agendamento) throw new ApiError(404, 'Agendamento não encontrado');

            if (['concluido', 'cancelado'].includes(agendamento.ind_status)) {
                throw new ApiError(422, 'Não é possível adicionar itens a um agendamento finalizado ou cancelado');
            }

            const produtoAgendamento = await this.buscarPorId(idProdutoAgendado);

            if (!produtoAgendamento) throw new ApiError(404, 'Agendamento não encontrado');

            if (['concluido', 'cancelado'].includes(produtoAgendamento.ind_status)) {
                throw new ApiError(422, 'Não é possível adicionar itens a um produto agendado finalizado ou cancelado');
            }

            if (dados.id_produto_grade) {
                const gradeProdutoPorId = await GradeService.listarGradeProduto(dados.id_produto_grade, usuarioLogadoId);

                if (!gradeProdutoPorId) {
                    throw new ValidationError("Erro grade do produto não localizado");
                }
            }

            if (dados.id_produto_grade) {
                const produtoServico = await ProdutoServicoService.buscarServicoPorIdEIdGrade(dados.id_produto_servico, dados.id_produto_grade, usuarioLogadoId)

                if (!produtoServico) {
                    throw new ValidationError("Erro Serviço do produto não localizado");
                }
            }

            const camposAlterados = {};

            for (const [campo, novoValor] of Object.entries(dados ?? {})) {
                if (!(campo in produtoAgendamento)) continue;

                const valorAtual = produtoAgendamento[campo];

                if (!validators.valoresIguais(valorAtual, novoValor)) {
                    camposAlterados[campo] = novoValor;
                }
            }

            if (Object.keys(camposAlterados).length === 0) {
                throw ValidationError('Nenhum campo a ser atualizado');
                return this.buscarPorId(idProdutoAgendado);
            }

            await AgendamentoProdutoModel.atualizar(idProdutoAgendado, dados);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_agendamento_item',
                num_registro_id: idProdutoAgendado,
                des_detalhes: {
                    dados
                }
            });

            return this.buscarPorId(idProdutoAgendado);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Soft delete de um item de agendamento.
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<boolean>}
     */
    async detelarItemAgendamento(idAgendamento, idAgendadoProduto, usuarioLogadoId) {
        try {
            const itemAgendamento = await this.buscarPorId(idAgendadoProduto);

            if (!itemAgendamento) {
                throw new NotFoundError('Item do agenamento não encontrado');
            }

            const produtoAgendado = await AgendamentoProdutoModel.deletar(idAgendamento, idAgendadoProduto);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_agendamento_item',
                num_registro_id: itemAgendamento.id
            });

            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AgendamentoProdutoService();
