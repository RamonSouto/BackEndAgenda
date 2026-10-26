// src/services/agendamento/tipoAgendamentoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/tipoAgendamentoService.js
 * @description Regras de negócio para tipos de agendamento.
 * 
 * @requires ../../models/agendamento/tipoAgendamentoModel
 * @requires ../../utils/ApiError
 * @requires ../LogService
 */
const TipoAgendamentoModel = require('../../models/agendamento/TipoAgendamentoModel');
const ApiError = require('../../utils/ApiError');
const validators = require('../../utils/validators');
const LogService = require('../LogService');
const { ACOES_LOG } = require('../../utils/constants')
class TipoAgendamentoService {

    async criar(dados, usuarioLogadoId) {

        try {
            const { error, value } = validators.tipoAgendamentoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`)
            }

            const tipo = await TipoAgendamentoModel.criar(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: 'CRIAR',
                des_tabela: 'tab_tipo_agendamento',
                num_registro_id: tipo.id,
                des_detalhes: {
                    des_tipo_agendamento: value.des_tipo_agendamento,
                    ind_ativo: value.ind_ativo
                }
            });

            return tipo;
        } catch (error) {
            throw error;
        }

    }

    async listar(usuarioLogadoId) {
        try {
            const tipoAgendamento = TipoAgendamentoModel.listar();

            if (!tipoAgendamento) {
                throw new NotFoundError('Tipo de Agendamento não encontrado!');
            }

            if (tipoAgendamento.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.LISTAR,
                    des_tabela: 'tab_tipo_agendamento',
                    des_detalhes: {
                        tipo_consulta: 'listar_tipo_agendamento',
                        total_registros: tipoAgendamento.length,
                    }
                });
            }

            return tipoAgendamento;

        } catch (error) {
            throw error;
        }
    }

    async buscarPorId(id, usuarioLogadoId) {
        try {
            const tipoAgendamento = await TipoAgendamentoModel.buscarPorId(id);

            if (!tipoAgendamento) {
                throw new NotFoundError('Tipo de agendamento não encontrado');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_tipo_agendamento',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    des_tipo_agendamento: tipoAgendamento.des_tipo_agendamento,
                    ind_ativo: tipoAgendamento.ind_ativo
                }
            });

            return tipoAgendamento;

        } catch (error) {
            throw error;
        }
    }


    async atualizar(id, dados, usuarioLogadoId) {

        try {

            const tipoAgendamento = await this.buscarPorId(id);

            if (!tipoAgendamento) {
                throw new NotFoundError('Tipo de agendamento não encontrada');
            }

            const atualizado = await TipoAgendamentoModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar empresa');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.atualizar,
                des_tabela: 'tab_tipo_agendamento',
                num_registro_id: id,
                des_detalhes: dados
            });

            const tipoAgendamentoAtualizada = await this.buscarPorId(id);

            return tipoAgendamentoAtualizada;

        } catch (error) {
            throw error;
        }
    }

    async deletar(id, usuario) {

        const tipoAgendamento = await this.buscarPorId(id);

        if (!tipoAgendamento) {
            throw new NotFoundError('Tipo de agendamento não encontrada');
        }

        const deletado = await TipoAgendamentoModel.deletar(id);

        if (!deletado) {
            throw new Error('Erro ao deletar empresa');
        }

        await LogService.registrar({
            id_usuario: usuario?.id,
            des_acao: ACOES_LOG.DELETAR,
            des_tabela: 'tab_tipo_agendamento',
            num_registro_id: id,
            des_detalhes: {
                tipo_agendamento: tipoAgendamento
            }
        });

        return true;

    }
}

module.exports = new TipoAgendamentoService();
