// src/services/sistema/EmpresaService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/sistema/EmpresaService.js
 * @description Serviço de gerenciamento de empresas.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de empresas, com validação Joi, controle de único ativo e auditoria.
 * 
 * @requires ../models/PessoaModel
 * @requires ./LogService
 * @requires ../utils/constants
 * @requires ../utils/validators
 * @requires ../models/sistema/EmpresaModel
 * @requires winston/lib/winston/transports (importado mas não usado)
 */
const EmpresaModel = require('../../models/sistema/EmpresaModel');
const LogService = require('../LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../../utils/constants');
const validators = require('../../utils/validators');
const { NotFoundError } = require('../../utils/ApiError');

/**
 * Classe EmpresaService.
 * @class EmpresaService
 */
class EmpresaService {
    /**
     * Cria uma nova empresa.
     * 
     * @method criar
     * @memberof EmpresaService
     * @async
     * @param {Object} dados - Dados da empresa.
     * @param {number} usuarioLogadoId - ID do usuário que está criando (para auditoria).
     * @returns {Promise<number>} ID da empresa criada.
     * @throws {Error} Se a validação falhar ou ocorrer erro na persistência.
     * 
     * @description
     * - Valida os dados com o schema `empresaSchema` do Joi.
     * - Define `ind_ativo` como `true` se não estiver definido ou for falsy.
     * - Registra log detalhado com todos os campos da empresa.
     * 
     * @example
     * const empresaId = await empresaService.criar({ nom_fantasia: 'Minha Empresa', ... }, 1);
     */
    async criar(dados, usuarioLogadoId) {
        try {


            const { error, value } = validators.empresaSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`)
            }

            if (value.ind_ativo === undefined || value.ind_ativo === null || value.ind_ativo === false) {
                value.ind_ativo = true;
            }

            const empresaId = await EmpresaModel.criar(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_empresa',
                num_registro_id: empresaId,
                des_detalhes: {
                    id_cidade: value.id_cidade,
                    nom_fantasia: value.nom_fantasia,
                    nom_razao_social: value.nom_razao_social,
                    num_cnpj: value.num_cnpj,
                    num_inscricao_estadual: value.num_inscricao_estadual,
                    dta_abertura: value.dta_abertura,
                    des_logradouro: value.des_logradouro,
                    num_endereco: value.num_endereco,
                    des_complemento: value.des_complemento,
                    num_cep: value.num_cep,
                    nom_bairro: value.nom_bairro,
                    num_celular_1: value.num_celular_1,
                    ind_whatsapp_1: value.ind_whatsapp_1,
                    num_celular_2: value.num_celular_2,
                    ind_whatsapp_2: value.ind_whatsapp_2,
                    des_email_1: value.des_email_1,
                    des_email_2: value.des_email_2,
                    val_cor_principal: value.val_cor_principal,
                    des_url_logo_vertical: value.des_url_logo_vertical,
                    des_url_logo_horizontal: value.des_url_logo_horizontal,
                    des_url_logo_vertical_negativa: value.des_url_logo_vertical_negativa,
                    des_url_logo_horizontal_negativa: value.des_url_logo_horizontal_negativa,
                    ind_ativo: value.ind_ativo
                }
            });

            return empresaId;
        } catch (error) {
            throw error;
        }

    }

    /**
     * Lista todas as empresas.
     * 
     * @method listar
     * @memberof EmpresaService
     * @async
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Array<Object>>} Lista de empresas.
     * @throws {Error} Se ocorrer erro na consulta.
     * 
     * @description
     * - Chama `EmpresaModel.listar()` sem filtros.
     * - ⚠️ **BUG:** `empresa` é uma Promise? O código chama `EmpresaModel.listar()` sem `await`, então retorna uma Promise, não o array.
     * - ⚠️ **BUG:** O log é registrado com `total_registros: empresa.length`, que será `undefined` se `empresa` for Promise.
     * 
     * @example
     * const empresas = await empresaService.listar(1);
     */
    async listar(usuarioLogadoId) {
        try {

            const empresa = await EmpresaModel.listar()

            if (empresa.length > 0) {
                await LogService.registrar({
                    id_usuario: usuarioLogadoId,
                    des_acao: ACOES_LOG.LISTAR,
                    des_tabela: 'tab_empresa',
                    des_detalhes: {
                        tipo_consulta: 'listar_empresa',
                        total_registros: empresa.length,
                    }
                });

                return empresa
            } else {
                throw new NotFoundError('Empresa(s) não encontrada!')
            }

        } catch (error) {
            throw error
        }

    }

    /**
     * Busca uma empresa por ID.
     * 
     * @method buscarEmpresaPorId
     * @memberof EmpresaService
     * @async
     * @param {number} id - ID da empresa.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Object>} Dados da empresa.
     * @throws {Error} Se a empresa não for encontrada.
     * 
     * @description
     * - Registra log com detalhes do registro consultado.
     * 
     * @example
     * const empresa = await empresaService.buscarEmpresaPorId(1, 1);
     */
    async buscarEmpresaPorId(id, usuarioLogadoId) {
        try {

            const empresa = await EmpresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new NotFoundError('Empresa não encontrada!');
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_empresa',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    des_tipo_dia: empresa.des_tipo_dia,
                    hra_inicio: empresa.hra_inicio,
                    hra_fim: empresa.hra_fim,
                    qtd_minutos_intervalo: empresa.qtd_minutos_intervalo,
                    ind_ativo: empresa.ind_ativo
                }
            });

            return empresa;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza uma empresa existente.
     * 
     * @method atualizar
     * @memberof EmpresaService
     * @async
     * @param {number} id - ID da empresa.
     * @param {Object} dados - Dados a serem atualizados.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<Object>} Empresa atualizada.
     * @throws {Error} Se a empresa não existir, ou se for a única ativa e tentar desativar.
     * 
     * @description
     * - ⚠️ **BUG:** Força `ind_ativo = 1` independentemente do valor enviado.
     * - Verifica se é o único registro ativo e impede desativação.
     * - Registra log com campos alterados.
     * 
     * @example
     * const atualizada = await empresaService.atualizar(1, { nom_fantasia: 'Nova' }, 1);
     */
    async atualizar(id, dados, usuarioLogadoId) {
        try {

            const empresa = await EmpresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new NotFoundError('Empresa não encontrada')
            }

            const totalAtivosEmpresas = await EmpresaModel.contarEmpresasAtivas(id);

            const ativoAtual = empresa.ind_ativo;

            const novoAtivo = dados.ind_ativo !== undefined ? dados.ind_ativo : ativoAtual;

            const isUnicoAtivo = (totalAtivosEmpresas === 0)

            if (isUnicoAtivo) {
                if (novoAtivo === false || novoAtivo === 0) {
                    throw new Error(
                        `Não é possível desativar o único registro ativo. E necessário mantenha pelo menos uma empresa ativa.`
                    );
                }
            }

            dados['ind_ativo'] = 1

            const atualizado = await EmpresaModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar empresa');
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_empresa',
                num_registro_id: id,
                des_detalhes: {
                    empresa: empresa,
                    campos_alterados: Object.keys(dados)
                }
            });

            const empresaAtualizada = await EmpresaModel.buscarEmpresaPorId(id);

            return empresaAtualizada;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Deleta uma empresa (soft delete).
     * 
     * @method deletar
     * @memberof EmpresaService
     * @async
     * @param {number} id - ID da empresa.
     * @param {number} usuarioLogadoId - ID do usuário (para auditoria).
     * @returns {Promise<boolean>} `true` se deletado com sucesso.
     * @throws {Error} Se a empresa não existir, ou se for a única ativa e tentar deletar.
     * 
     * @description
     * - Realiza soft delete (marca `ind_ativo = false`).
     * - Verifica se é o único registro ativo – se for, impede a exclusão.
     * - Registra log de auditoria.
     * 
     * @example
     * await empresaService.deletar(1, 1);
     */
    async deletar(id, usuarioLogadoId) {
        try {
            const empresa = await EmpresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new NotFoundError('Empresa não encontrada');
            }

            const totalAtivosEmpresas = await EmpresaModel.contarEmpresasAtivas(id);

            const isUnicoAtivo = (totalAtivosEmpresas === 0)

            if (isUnicoAtivo) {
                throw new Error(
                    `Não é possível deletar o único registro ativo. E necessário mantenha pelo menos uma empresa.`
                );
            }

            // Soft delete
            const deletado = await EmpresaModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar empresa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_empresa',
                num_registro_id: id,
                des_detalhes: {
                    empresa: empresa,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }
}
module.exports = new EmpresaService();