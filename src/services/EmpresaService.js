const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const empresaModel = require('../models/EmpresaModel');
const { Console } = require('winston/lib/winston/transports');

class EmpresaService {
    async criar(dados, usuarioLogadoId) {
        try {


            const { error, value } = validators.empresaSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`)
            }

            if (value.ind_ativo === undefined || value.ind_ativo === null || value.ind_ativo === false) {
                value.ind_ativo = true;
            }

            const empresaId = await empresaModel.criar(value);

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

    async listar(usuarioLogadoId) {
        try {
            const empresa = empresaModel.listar()

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
        } catch (error) {
            throw error
        }

    }

    async buscarEmpresaPorId(id, usuarioLogadoId) {
        try {
            const empresa = await empresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
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

    async buscarParametrizacaoPorTipoAtivo(tipo, usuarioLogadoId) {
        try {
            const empresa = await empresaModel.buscarParametrizacaoPorTipoAtivo(tipo);

            if (!empresa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_empresa',
                // num_registro_id: tipo,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_tipo',
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

    async atualizar(id, dados, usuarioLogadoId) {
        try {

            const empresa = await empresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const totalAtivosEmpresas = await empresaModel.contarEmpresasAtivas(id);

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

            const atualizado = await empresaModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar parametrização');
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

            const empresaAtualizada = await empresaModel.buscarEmpresaPorId(id);

            return empresaAtualizada;

        } catch (error) {
            throw error;
        }
    }

    async deletar(id, usuarioLogadoId) {
        try {
            const empresa = await empresaModel.buscarEmpresaPorId(id);

            if (!empresa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            const totalAtivosEmpresas = await empresaModel.contarEmpresasAtivas(id);

            const isUnicoAtivo = (totalAtivosEmpresas === 0)

            if (isUnicoAtivo) {
                throw new Error(
                    `Não é possível deletar o único registro ativo. E necessário mantenha pelo menos uma empresa.`
                );
            }

            // Soft delete
            const deletado = await empresaModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar parametrização');
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