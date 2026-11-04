// src/services/agendamento/AgendamentoProdutoService.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/services/agendamento/AgendamentoProdutoService.js
 * @description Regras de negócio para itens de produto/serviço agendados:
 * - Item só pode ser alterado se agendamento E item estiverem editáveis.
 * - Item deve pertencer ao agendamento da URL (anti-IDOR).
 * - Preço é sempre o VIGENTE do banco (nunca vindo do cliente).
 * - Desconto não pode exceder o preço.
 *
 * @requires ../../models/agendamento/AgendamentoProdutoModel
 * @requires ../../models/agendamento/AgendamentoModel
 * @requires ../produto/ProdutoServicoService
 * @requires ../LogService
 * @requires ../../utils/validators
 * @requires ../../utils/constants
 * @requires ../../utils/ApiError
 * @requires ../../utils/acessoAgendamento
 */
const AgendamentoProdutoModel = require('../../models/agendamento/AgendamentoProdutoModel');
const AgendamentoModel = require('../../models/agendamento/AgendamentoModel');
const ProdutoServicoService = require('../produto/ProdutoServicoService');
const LogService = require('../LogService');
const validators = require('../../utils/validators');
const { ACOES_LOG, MENSAGENS, STATUS_AGENDAMENTO, STATUS_PRODUTO_AGENDAMENTO, STATUS_AGENDAMENTO_FINALIZADOS } = require('../../utils/constants');
const { NotFoundError, BadRequestError, ValidationError } = require('../../utils/ApiError');

const TABELA = 'tab_agendamento_item';
const STATUS_AGENDAMENTO_BLOQUEADOS = [STATUS_AGENDAMENTO.CONCLUIDO, STATUS_AGENDAMENTO.CANCELADO, STATUS_AGENDAMENTO.FALTA];
const STATUS_ITEM_BLOQUEADOS = [STATUS_PRODUTO_AGENDAMENTO.CONCLUIDO, STATUS_PRODUTO_AGENDAMENTO.CANCELADO];
const { garantirAcessoAgendamento } = require('../../utils/acessoAgendamento');


class AgendamentoProdutoService {

    /**
     * Carrega o agendamento e valida o escopo de acesso do usuário.
     *
     * @method _obterAgendamentoAcessivel
     * @memberof AgendamentoProdutoService
     * @private
     * @async
     * @param {number} idAgendamento
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>}
     * @throws {NotFoundError|ForbiddenError}
     */
    async _obterAgendamentoAcessivel(idAgendamento, usuario) {
        const agendamento = await AgendamentoModel.buscarPorId(idAgendamento);
        if (!agendamento) throw new NotFoundError('Agendamento não encontrado');
        garantirAcessoAgendamento(usuario, agendamento);
        return agendamento;
    }

    /**
     * Garante acesso + agendamento editável (não finalizado).
     *
     * @method _obterAgendamentoEditavel
     * @memberof AgendamentoProdutoService
     * @private
     * @async
     * @param {number} idAgendamento
     * @param {Object} usuario
     * @returns {Promise<Object>}
     * @throws {NotFoundError|ForbiddenError|ValidationError}
     */
    async _obterAgendamentoEditavel(idAgendamento, usuario) {
        const agendamento = await this._obterAgendamentoAcessivel(idAgendamento, usuario);
        if (STATUS_AGENDAMENTO_FINALIZADOS.includes(agendamento.ind_status)) {
            throw new ValidationError('Agendamento finalizado não permite alteração de itens');
        }
        return agendamento;
    }

    /**
     * Carrega o item garantindo que pertence ao agendamento informado.
     *
     * @method _obterItemDoAgendamento
     * @memberof AgendamentoProdutoService
     * @private
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @returns {Promise<Object>} Item.
     * @throws {NotFoundError}
     */
    async _obterItemDoAgendamento(idAgendamento, idItem) {
        const item = await AgendamentoProdutoModel.buscarPorId(idItem);
        if (!item || Number(item.id_agendamento) !== Number(idAgendamento)) {
            throw new NotFoundError('Item não encontrado neste agendamento');
        }
        return item;
    }

    /**
     * Valida o par grade/serviço e resolve o preço vigente.
     *
     * @method _resolverPreco
     * @memberof AgendamentoProdutoService
     * @private
     * @async
     * @param {number} idProdutoServico
     * @param {number} idProdutoGrade
     * @param {number} desconto
     * @param {number} usuarioLogadoId
     * @returns {Promise<number>} Preço vigente.
     * @throws {ValidationError} Se o serviço não pertence ao produto da grade, não há preço, ou desconto > preço.
     */
    async _resolverPreco(idProdutoServico, idProdutoGrade, desconto, usuarioLogadoId) {
        const servico = await ProdutoServicoService.buscarServicoPorIdEIdGrade(idProdutoServico, idProdutoGrade, usuarioLogadoId);
        if (!servico) throw new ValidationError('Serviço não disponível para o produto desta grade');

        const preco = await AgendamentoProdutoModel.buscarPrecoVigente(idProdutoServico);
        if (!preco) throw new ValidationError('Serviço sem preço vigente cadastrado');

        const valor = Number(preco.val_preco);
        if (Number(desconto || 0) > valor) throw new ValidationError('Desconto não pode ser maior que o preço do serviço');

        return valor;
    }

    /**
     * Adiciona um item de produto/serviço a um agendamento existente.
     *
     * @method adicionarItem
     * @memberof AgendamentoProdutoService
     * @async
     * @param {Object} dados - Corpo + id_agendamento (da URL).
     * @param {number} usuarioLogadoId - ID do usuário logado.
     * @returns {Promise<Object>} Item criado.
     * @throws {BadRequestError|NotFoundError|ValidationError}
     *
     * @example
     * await AgendamentoProdutoService.adicionarItem({ id_agendamento: 1, id_produto_grade: 5, id_produto_servico: 3, id_tipo_agendamento: 1 }, 1);
     */
    async adicionarItem(dados, usuario) {
        const { error, value } = validators.produtoAgendadoSchema.validate(dados, { stripUnknown: true });
        if (error) throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);

        await this._obterAgendamentoEditavel(value.id_agendamento);

        const val_preco_servico = await this._resolverPreco(
            value.id_produto_servico, value.id_produto_grade, value.val_desconto_servico, usuario
        );

        const id = await AgendamentoProdutoModel.criar({ ...value, val_preco_servico });

        await LogService.registrar({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.CRIAR,
            des_tabela: TABELA,
            num_registro_id: id,
            des_detalhes: { ...value, val_preco_servico }
        });

        return AgendamentoProdutoModel.buscarPorId(id);
    }

    /**
     * Lista os itens de um agendamento (respeitando escopo).
     *
     * @method listarPorAgendamento
     * @memberof AgendamentoProdutoService
     * @async
     * @param {number} idAgendamento
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Array<Object>>}
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * await AgendamentoProdutoService.listarPorAgendamento(1, req.usuario);
     */
    async listarPorAgendamento(idAgendamento, usuario) {
        await this._obterAgendamentoAcessivel(idAgendamento, usuario);
        return AgendamentoProdutoModel.listarPorAgendamento(idAgendamento);
    }

    /**
     * Busca um item garantindo vínculo e escopo.
     *
     * @method buscarPorId
     * @memberof AgendamentoProdutoService
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @param {Object} usuario
     * @returns {Promise<Object>}
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * await AgendamentoProdutoService.buscarPorId(1, 3, req.usuario);
     */
    async buscarPorId(idAgendamento, idItem, usuario) {
        await this._obterAgendamentoAcessivel(idAgendamento, usuario);
        return this._obterItemDoAgendamento(idAgendamento, idItem);
    }

    /**
     * Atualiza parcialmente um item. Preço só é recalculado se grade/serviço mudarem;
     * desconto isolado é validado contra o preço já congelado no item.
     *
     * @method atualizar
     * @memberof AgendamentoProdutoService
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @param {Object} dados
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>} Item atualizado.
     * @throws {BadRequestError|NotFoundError|ForbiddenError|ValidationError}
     *
     * @example
     * await AgendamentoProdutoService.atualizar(1, 3, { val_desconto_servico: 5 }, req.usuario);
     */
    async atualizar(idAgendamento, idItem, dados, usuario) {
        const { error, value } = validators.produtoAgendadoUpdateSchema.validate(dados, { stripUnknown: true });
        if (error) throw new BadRequestError(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);

        await this._obterAgendamentoEditavel(idAgendamento, usuario);
        const atual = await this._obterItemDoAgendamento(idAgendamento, idItem);

        if (STATUS_ITEM_BLOQUEADOS.includes(atual.ind_status)) {
            throw new ValidationError('Item finalizado ou cancelado não pode ser alterado');
        }

        const alterados = Object.fromEntries(
            Object.entries(value).filter(([campo, novo]) => !validators.valoresIguais(atual[campo], novo))
        );
        if (Object.keys(alterados).length === 0) return atual;

        const desconto = alterados.val_desconto_servico ?? atual.val_desconto_servico;

        if (alterados.id_produto_grade || alterados.id_produto_servico) {
            alterados.val_preco_servico = await this._resolverPreco(
                alterados.id_produto_servico ?? atual.id_produto_servico,
                alterados.id_produto_grade ?? atual.id_produto_grade,
                desconto,
                usuario.id
            );
        } else if (Number(desconto) > Number(atual.val_preco_servico)) {
            throw new ValidationError('Desconto não pode ser maior que o preço do serviço');
        }

        await AgendamentoProdutoModel.atualizar(idItem, alterados);

        await LogService.registrar({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.EDITAR,
            des_tabela: TABELA,
            num_registro_id: idItem,
            des_detalhes: {
                antes: Object.fromEntries(Object.keys(alterados).map((k) => [k, atual[k]])),
                depois: alterados
            }
        });

        return AgendamentoProdutoModel.buscarPorId(idItem);
    }

    /**
     * Soft delete de um item de agendamento.
     *
     * @method deletarItem
     * @memberof AgendamentoProdutoService
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @param {number} usuarioLogadoId
     * @returns {Promise<boolean>}
     * @throws {NotFoundError|ValidationError}
     *
     * @example
     * await AgendamentoProdutoService.deletarItem(1, 3, 1);
     */
    async deletarItem(idAgendamento, idItem, usuario) {
        await this._obterAgendamentoEditavel(idAgendamento);
        await this._obterItemDoAgendamento(idAgendamento, idItem);

        await AgendamentoProdutoModel.deletar(idAgendamento, idItem);

        await LogService.registrar({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.DELETAR,
            des_tabela: TABELA,
            num_registro_id: idItem,
            des_detalhes: { id_agendamento: idAgendamento }
        });

        return true;
    }
}

module.exports = new AgendamentoProdutoService();
