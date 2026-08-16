const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const parametrizacaoModel = require('../models/parametrizacaoModel');
const { Console } = require('winston/lib/winston/transports');

class ParametrizacaoService {
    async criar(dados, usuarioLogadoId) {
        try {
            const { error, value } = validators.parametrizacaoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`)
            }

            if (value.ind_ativo === undefined || value.ind_ativo === null || value.ind_ativo === false) {
                value.ind_ativo = true;
            }

            await parametrizacaoModel.desativarPorTipo(value.des_tipo_dia);

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

    async buscarParametrizacaoPorTipoAtivo(tipo, usuarioLogadoId) {
        try {
            const parametrizacao = await parametrizacaoModel.buscarParametrizacaoPorTipoAtivo(tipo);

            if (!parametrizacao) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_parametrizacao',
                // num_registro_id: tipo,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_tipo',
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

            const registro = await parametrizacaoModel.buscarParametrizacaoPorId(id);


            if (!registro) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const tipoAtual = registro.des_tipo_dia;
            const ativoAtual = registro.ind_ativo;

            // Determina os novos valores (caso não informados, mantém os atuais)
            const novoTipo = dados.des_tipo_dia !== undefined ? dados.des_tipo_dia : tipoAtual;
            const novoAtivo = dados.ind_ativo !== undefined ? dados.ind_ativo : ativoAtual;

            // 1. Se o registro é o único ativo do tipo atual, não pode mudar seu tipo nem desativá-lo
            const totalAtivosTipoAtual = await parametrizacaoModel.contarAtivosPorTipo(tipoAtual, id);

            const isUnicoAtivo = (totalAtivosTipoAtual === 0); // porque excluímos o próprio, se ele for ativo, contagem 0 significa que é o único

            const desativadoMaisNovo = await parametrizacaoModel.buscarTipoDesativadoMaisRecente(tipoAtual, id);

            if (isUnicoAtivo && desativadoMaisNovo >= 1) {

                await parametrizacaoModel.desativarParametrizacao(id)

                await parametrizacaoModel.ativarParametrizacao(desativadoMaisNovo);
            }

            if (isUnicoAtivo && desativadoMaisNovo === 0) {

                if (novoTipo !== tipoAtual) {
                    throw new Error(
                        `Não é possível alterar o tipo do único registro ativo para "${tipoAtual}". ` +
                        `Mantenha pelo menos um ativo para esse tipo.`
                    );
                }
                if (novoAtivo === false) {
                    throw new Error(
                        `Não é possível desativar o único registro ativo para o tipo "${tipoAtual}". ` +
                        `Mantenha pelo menos um ativo para esse tipo.`
                    );
                }
            }

            // 2. Se o tipo for alterado, o registro deve permanecer ativo (senão o novo tipo ficaria sem ativo)
            if (novoTipo !== tipoAtual && novoAtivo === false) {
                throw new Error(
                    `Ao alterar o tipo de "${tipoAtual}" para "${novoTipo}", o registro deve permanecer ativo, ` +
                    `pois não há garantia de outro ativo para o novo tipo.`
                );
            }

            // Se o tipo for alterado, desativa todos os ativos do novo tipo (pois este será o único)
            if (novoTipo !== tipoAtual) {
                // Mesmo tipo: se estiver ativando (de 0 para 1), desativa os outros ativos do mesmo tipo
                await parametrizacaoModel.desativarPorTipo(novoTipo, null);
            } else {
                if (novoAtivo === true && ativoAtual === false) {
                    // Se estiver desativando e não é único, ok (já validado)
                    await parametrizacaoModel.desativarPorTipo(tipoAtual, id);
                }
            }

            const atualizado = await parametrizacaoModel.atualizar(id, dados);
            if (!atualizado) {
                throw new Error('Erro ao atualizar parametrização');
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_parametrizacao',
                num_registro_id: id,
                des_detalhes: {
                    parametriazcao: registro.des_tipo_dia,
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

            const totalInativo = await parametrizacaoModel.contarDesativadoPorTipo(parametrizacao.des_tipo_dia, id);


            if (totalInativo === 0) {
                throw new Error(
                    `Não é possível excluir o único registro ativo para o tipo "${parametrizacao.des_tipo_dia}". ` +
                    `Mantenha pelo menos um ativo para esse tipo.`
                );
            }

            if (totalInativo >= 1 && parametrizacao.ind_ativo === 1) {

                const desativadoMaisNovo = await parametrizacaoModel.buscarTipoDesativadoMaisRecente(parametrizacao.des_tipo_dia, id);

                await parametrizacaoModel.desativarParametrizacao(id)

                await parametrizacaoModel.ativarParametrizacao(desativadoMaisNovo);

            }

            if (totalInativo >= 1 && parametrizacao.ind_ativo === 0) {

                const desativadoMaisNovo = await parametrizacaoModel.buscarTipoDesativadoMaisRecente(parametrizacao.des_tipo_dia, id);

                await parametrizacaoModel.desativarParametrizacao(id)

                await parametrizacaoModel.ativarParametrizacao(desativadoMaisNovo);
            }

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