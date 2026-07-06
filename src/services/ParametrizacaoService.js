const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const parametrizacaoModel = require('../models/parametrizacaoModel');

class ParametrizacaoService {
    async criar(dados, usuarioLogadoId) {
        try {
            const { error, value } = validators.parametrizacaoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`)
            }

            const parametrizacaoId = await parametrizacaoModel.criar(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_parametrizacao',
                num_registro_id: parametrizacaoId,
                des_detalhes: {
                    des_tipo_dia: value.des_tipo_dia,
                    hra_inicio: value.hra_inicio,
                    hra_fim: value.hra_fim,
                    qtd_minutos_intervalo: value.qtd_minutos_intervalo,
                    ind_ativo: value.ind_ativo
                }
            });

            return parametrizacaoId;
        } catch (error) {
            throw error;
        }

    }

    async listar(usuarioLogadoId) {
        try {
            const parametrizacao = parametrizacaoModel.listar()

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.LISTAR,
                des_tabela: 'tab_parametrizacao',
                des_detalhes: {
                    tipo_consulta: 'listar_parametrizacao',
                    total_registros: parametrizacao.length,
                }
            });

            return parametrizacao
        } catch (error) {
            throw error
        }

    }

    async buscarParametrizacaoPorId(id, usuarioLogadoId) {
        try {
            const parametrizacao = await parametrizacaoModel.buscarParametrizacaoPorId(id);

            if (!parametrizacao) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_parametrizacao',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    des_tipo_dia: parametrizacao.des_tipo_dia,
                    hra_inicio: parametrizacao.hra_inicio,
                    hra_fim: parametrizacao.hra_fim,
                    qtd_minutos_intervalo: parametrizacao.qtd_minutos_intervalo,
                    ind_ativo: parametrizacao.ind_ativo
                }
            });

            return parametrizacao;

        } catch (error) {
            throw error;
        }
    }

    async atualizar(id, dados, usuarioLogadoId) {
        try {
            const parametrizacaoExiste = await parametrizacaoModel.buscarParametrizacaoPorId(id);

            if (!parametrizacaoExiste) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const parametrizacao = await parametrizacaoModel.atualizar(id, dados);

            if (!parametrizacao) {
                throw new Error('Erro ao atualizar categoria');
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_parametrizacao',
                num_registro_id: id,
                des_detalhes: {
                    parametriazcao: parametrizacaoExiste.nom_categoria,
                    campos_alterados: Object.keys(dados)
                }
            });

            const parametrizacaoAtualizada = await parametrizacaoModel.buscarParametrizacaoPorId(id);

            return parametrizacaoAtualizada;

        } catch (error) {
            throw error;
        }
    }

    async deletar(id, usuarioLogadoId) {
        try {
            const parametrizacao = await parametrizacaoModel.buscarParametrizacaoPorId(id);

            if (!parametrizacao) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }
            console.log(parametrizacao);
            // Soft delete
            const deletado = await parametrizacaoModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar parametrização');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_parametrizacao',
                num_registro_id: id,
                des_detalhes: {
                    parametrizacao: parametrizacao,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }

    }
}
module.exports = new ParametrizacaoService();