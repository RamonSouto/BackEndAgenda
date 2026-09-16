// src/services/ParametrizacaoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/ParametrizacaoService.js
 * @description Serviço de gerenciamento de parametrizações.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de parametrizações, com validação Joi e regras de negócio para garantir
 * pelo menos um registro ativo por tipo de dia.
 * 
 * @requires ../models/PessoaModel
 * @requires ./LogService
 * @requires ../utils/constants
 * @requires ../utils/validators
 * @requires ../models/ParametrizacaoModel
 * @requires winston/lib/winston/transports (importado mas não usado)
 */

const LogService = require('../LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../../utils/constants');
const validators = require('../../utils/validators');
const parametrizacaoModel = require('../../models/sistema/ParametrizacaoModel');
const { Console } = require('winston/lib/winston/transports');
const { NotFoundError } = require('../../utils/ApiError');
/**
 * Classe ParametrizacaoService.
 * @class ParametrizacaoService
 */
class ParametrizacaoService {

    /**
     * Cria uma nova parametrização.
     * 
     * @method criar
     * @memberof ParametrizacaoService
     * @async
     * @param {Object} dados - Dados da parametrização (des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo).
     * @param {number} usuarioLogadoId - ID do usuário que está criando (para auditoria).
     * @returns {Promise<number>} ID da parametrização criada.
     * @throws {Error} Se a validação falhar ou ocorrer erro na persistência.
     * 
     * @description
     * - Valida os dados com o schema `parametrizacaoSchema` do Joi.
     * - Define `ind_ativo` como `true` se não estiver definido ou for falsy.
     * - Desativa todos os outros registros ativos do mesmo tipo (`desativarPorTipo`).
     * - Registra log detalhado.
     * 
     * @example
     * const id = await parametrizacaoService.criar({ des_tipo_dia: 'UTIL', hra_inicio: '08:00:00', ... }, 1);
     */
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

    /**
     * Lista todas as parametrizações.
     * 
     * @method listar
     * @memberof ParametrizacaoService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Array<Object>>} Lista de parametrizações.
     * @throws {Error} Se ocorrer erro na consulta.
     * 
     * @description
     * - ⚠️ **BUG:** `parametrizacaoModel.listar()` é chamado sem `await`, retornando uma Promise.
     * - O log registra `total_registros: parametrizacao.length`, que será `undefined`.
     * - Retorna a Promise em vez do array.
     * 
     * @example
     * const lista = await parametrizacaoService.listar(1);
     */
    async listar(usuarioLogadoId) {
        try {

            const parametrizacao = await parametrizacaoModel.listar()

            if (parametrizacao.length > 0) {
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
            } else {
                throw new NotFoundError('Nenhum parametro encontrado!');
            }

        } catch (error) {
            throw error
        }

    }

    /**
     * Busca uma parametrização por ID.
     * 
     * @method buscarParametrizacaoPorId
     * @memberof ParametrizacaoService
     * @async
     * @param {number} id - ID da parametrização.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Object>} Dados da parametrização.
     * @throws {Error} Se a parametrização não for encontrada.
     * 
     * @description
     * - Registra log com detalhes do registro consultado.
     * 
     * @example
     * const registro = await parametrizacaoService.buscarParametrizacaoPorId(1, 1);
     */
    async buscarParametrizacaoPorId(id, usuarioLogadoId) {
        try {

            const parametrizacao = await parametrizacaoModel.buscarParametrizacaoPorId(id);

            if (!parametrizacao) {
                throw new NotFoundError('Parametrização não encontrada');
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

    /**
     * Busca uma parametrização ativa por tipo (des_tipo_dia).
     * 
     * @method buscarParametrizacaoPorTipoAtivo
     * @memberof ParametrizacaoService
     * @async
     * @param {string} tipo - Tipo de dia (ex: 'UTIL', 'SABADO').
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Object>} Dados da parametrização ativa para o tipo.
     * @throws {Error} Se não encontrar nenhum registro ativo para o tipo.
     * 
     * @description
     * - Útil para obter a configuração atual de um tipo de dia.
     * 
     * @example
     * const config = await parametrizacaoService.buscarParametrizacaoPorTipoAtivo('UTIL', 1);
     */
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

    /**
     * Atualiza uma parametrização existente.
     * 
     * @method atualizar
     * @memberof ParametrizacaoService
     * @async
     * @param {number} id - ID da parametrização.
     * @param {Object} dados - Dados a serem atualizados.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Object>} Parametrização atualizada.
     * @throws {Error} Se o registro não existir, ou se violar a regra de único ativo.
     * 
     * @description
     * Regras de negócio:
     * 1. Se o registro é o único ativo do seu tipo, não pode mudar de tipo nem ser desativado.
     * 2. Se houver um registro desativado mais recente do mesmo tipo, ao desativar este, ativa aquele.
     * 3. Se o tipo for alterado, desativa todos os outros ativos do novo tipo (para que este seja o único).
     * 4. Se estiver ativando um registro que estava inativo, desativa os outros ativos do mesmo tipo.
     * - Registra log com campos alterados.
     * 
     * @example
     * const atualizado = await parametrizacaoService.atualizar(1, { qtd_minutos_intervalo: 90 }, 1);
     */
    async atualizar(id, dados, usuarioLogadoId) {
        try {

            const registro = await parametrizacaoModel.buscarParametrizacaoPorId(id);


            if (!registro) {
                throw new NotFoundError('Parametrização não encontrada!')
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

    /**
     * Deleta (soft delete) uma parametrização.
     * 
     * @method deletar
     * @memberof ParametrizacaoService
     * @async
     * @param {number} id - ID da parametrização.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<boolean>} `true` se deletado com sucesso.
     * @throws {Error} Se o registro não existir, ou se for o único ativo do tipo (e não houver inativo para ativar).
     * 
     * @description
     * Regras de negócio:
     * 1. Verifica se existe pelo menos um registro inativo do mesmo tipo para ativar, caso este seja o único ativo.
     * 2. Se o registro for ativo e existir um inativo mais recente, desativa este e ativa aquele.
     * 3. Se o registro for inativo, e existir inativo mais recente, faz a substituição (ativa o mais recente).
     * 4. Realiza soft delete (marca `deleted_at`).
     * - Registra log de auditoria.
     * 
     * @example
     * await parametrizacaoService.deletar(1, 1);
     */
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