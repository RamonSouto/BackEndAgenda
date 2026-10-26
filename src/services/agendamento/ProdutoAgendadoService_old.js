// src/services/agendamento/ProdutoAgendadoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/ProdutoAgendadoService.js
 * @description Regras de negócio para itens de agendamento adicionados
 * de forma isolada (fora da criação completa) e alteração de status
 * individual do item.
 * 
 * @requires ../../models/agendamento/ProdutoAgendamentoModel
 * @requires ../../models/agendamento/AgendamentoModel
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/validators
 * @requires ../../utils/ApiError
 */
const ProdutoAgendamentoModel = require('../../models/agendamento/ProdutoAgendamentoModel');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const LogService = require('../LogService');
const { ACOES_LOG, MENSAGENS, STATUS_PRODUTO_AGENDAMENTO } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError, BadRequestError } = require('../../utils/ApiError');

class ProdutoAgendadoService {
    /**
     * Adiciona um item a um agendamento já existente.
     * 
     * @method adicionarItem
     * @async
     * @param {Object} dados - Validado por `produtoAgendadoSchema`.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Item criado.
     * @throws {NotFoundError|BadRequestError}
     */
    async adicionarItem(dados, usuarioLogadoId) {
        const { error, value } = validators.produtoAgendadoSchema.validate(dados);
        if (error) {
            throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
        }

        const agendamento = await AgendamentoModel.buscarPorId(value.id_agendamento);
        if (!agendamento) {
            throw new NotFoundError('Agendamento não encontrado');
        }
        if (['concluido', 'cancelado'].includes(agendamento.ind_status)) {
            throw new BadRequestError('Não é possível adicionar itens a um agendamento finalizado');
        }

        const preco = await ProdutoAgendamentoModel.buscarPrecoVigente(value.id_produto_servico);
        if (!preco) {
            throw new BadRequestError('Nenhum preço vigente configurado para este serviço');
        }

        const itemId = await ProdutoAgendamentoModel.criar({
            ...value,
            val_preco_servico: preco.val_preco
        });

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CRIAR,
            des_tabela: 'tab_produto_agendamento',
            num_registro_id: itemId,
            des_detalhes: { id_agendamento: value.id_agendamento, id_produto_servico: value.id_produto_servico }
        });

        return ProdutoAgendamentoModel.buscarPorId(itemId);
    }

    /**
     * Lista os itens de um agendamento.
     * 
     * @method listarPorAgendamento
     * @async
     * @param {number} id_agendamento
     * @param {number} usuarioLogadoId
     * @returns {Promise<Array<Object>>}
     */
    async listarPorAgendamento(id_agendamento, usuarioLogadoId) {
        const itens = await ProdutoAgendamentoModel.listarPorAgendamento(id_agendamento);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.LISTAR,
            des_tabela: 'tab_produto_agendamento',
            des_detalhes: { id_agendamento, total_registros: itens.length }
        });

        return itens;
    }

    /**
     * Busca um item por ID.
     * 
     * @method buscarPorId
     * @async
     * @param {number} id
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>}
     * @throws {NotFoundError}
     */
    async buscarPorId(id, usuarioLogadoId) {
        const item = await ProdutoAgendamentoModel.buscarPorId(id);
        if (!item) {
            throw new NotFoundError('Item de agendamento não encontrado');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_agendamento',
            des_detalhes: { tipo_consulta: 'busca_por_id' }
        });

        return item;
    }

    /**
     * Atualiza dados livres do item (desconto, descrição do ajuste).
     * 
     * @method atualizarItem
     * @async
     * @param {number} id
     * @param {Object} dados
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>}
     * @throws {NotFoundError}
     */
    async atualizarItem(id, dados, usuarioLogadoId) {
        const item = await ProdutoAgendamentoModel.buscarPorId(id);
        if (!item) {
            throw new NotFoundError('Item de agendamento não encontrado');
        }

        const atualizado = await ProdutoAgendamentoModel.atualizar(id, dados);
        if (!atualizado) {
            throw new Error('Erro ao atualizar item de agendamento');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.EDITAR,
            des_tabela: 'tab_produto_agendamento',
            num_registro_id: id,
            des_detalhes: { campos_alterados: Object.keys(dados) }
        });

        return ProdutoAgendamentoModel.buscarPorId(id);
    }

    /**
     * Altera o status de um item específico (pendente -> producao -> concluido/cancelado).
     * 
     * @method alterarStatusItem
     * @async
     * @param {number} id
     * @param {string} novoStatus
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>}
     * @throws {NotFoundError|BadRequestError}
     */
    async alterarStatusItem(id, novoStatus, usuarioLogadoId) {
        const valoresValidos = Object.values(STATUS_PRODUTO_AGENDAMENTO);
        if (!valoresValidos.includes(novoStatus)) {
            throw new BadRequestError(`Status inválido. Valores aceitos: ${valoresValidos.join(', ')}`);
        }

        const item = await ProdutoAgendamentoModel.buscarPorId(id);
        if (!item) {
            throw new NotFoundError('Item de agendamento não encontrado');
        }

        const atualizado = await ProdutoAgendamentoModel.atualizar(id, { ind_status: novoStatus });
        if (!atualizado) {
            throw new Error('Erro ao atualizar status do item');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.EDITAR,
            des_tabela: 'tab_produto_agendamento',
            num_registro_id: id,
            des_detalhes: { status_anterior: item.ind_status, status_novo: novoStatus }
        });

        return ProdutoAgendamentoModel.buscarPorId(id);
    }

    /**
     * Deleta (soft delete) um item de agendamento.
     * 
     * @method deletarItem
     * @async
     * @param {number} id
     * @param {number} usuarioLogadoId
     * @returns {Promise<boolean>}
     * @throws {NotFoundError}
     */
    async deletarItem(id, usuarioLogadoId) {
        const item = await ProdutoAgendamentoModel.buscarPorId(id);
        if (!item) {
            throw new NotFoundError('Item de agendamento não encontrado');
        }

        const deletado = await ProdutoAgendamentoModel.deletar(id);
        if (!deletado) {
            throw new Error('Erro ao deletar item de agendamento');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.DELETAR,
            des_tabela: 'tab_produto_agendamento',
            num_registro_id: id,
            des_detalhes: { id_agendamento: item.id_agendamento }
        });

        return true;
    }
}

module.exports = new ProdutoAgendadoService();
