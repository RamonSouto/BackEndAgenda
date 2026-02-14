const bcrypt = require('bcryptjs');
const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { TIPO_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const { limparCPF, limparCEP, limparTelefone, ocultarDadosSensiveis } = require('../utils/formatters');

class PessoaService {
    async criar(dados, usuarioLogadoId) {
        try {
            // Validar dados
            const { error, value } = validators.pessoaSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            // Limpar dados
            value.num_cpf = limparCPF(value.num_cpf);
            value.num_cep = limparCEP(value.num_cep);
            value.num_celular_1 = limparTelefone(value.num_celular_1);
            if (value.num_celular_2) {
                value.num_celular_2 = limparTelefone(value.num_celular_2);
            }

            // Verificar se CPF já existe
            const cpfExistente = await PessoaModel.buscarPorCPF(value.num_cpf);
            if (cpfExistente) {
                throw new Error(MENSAGENS.ERRO.CPF_EXISTENTE);
            }

            // Hash da senha se fornecida
            if (value.des_senha) {
                value.des_senha = await bcrypt.hash(value.des_senha, 10);
            }

            // Criar pessoa
            const pessoaId = await PessoaModel.criar(value);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: pessoaId,
                des_detalhes: {
                    tipo_pessoa: value.ind_tipo_pessoa,
                    nome: value.nom_completo,
                    cpf: value.num_cpf
                }
            });

            const pessoa = await PessoaModel.buscarPorId(pessoaId);
            return ocultarDadosSensiveis(pessoa);

        } catch (error) {
            throw error;
        }
    }

    async buscarPorId(id, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_id',
                    pessoa_consultada: pessoa.nom_completo
                }
            });

            return ocultarDadosSensiveis(pessoa);

        } catch (error) {
            throw error;
        }
    }

    async buscarPorCPF(cpf, usuarioLogadoId) {
        try {
            const cpfLimpo = limparCPF(cpf);

            if (!validators.cpfValido(cpfLimpo)) {
                throw new Error('CPF inválido');
            }

            const pessoa = await PessoaModel.buscarPorCPF(cpfLimpo);

            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }

            // Registrar log de consulta
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: pessoa.id,
                des_detalhes: {
                    tipo_consulta: 'buscar_por_cpf',
                    cpf: cpfLimpo,
                    pessoa_consultada: pessoa.nom_completo
                }
            });

            return ocultarDadosSensiveis(pessoa);

        } catch (error) {
            throw error;
        }
    }

    async listar(filtros = {}, usuarioLogadoId) {
        try {
            const pessoas = await PessoaModel.listar(filtros);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    filtros: filtros,
                    total_registros: pessoas.length
                }
            });

            return pessoas.map(pessoa => ocultarDadosSensiveis(pessoa));

        } catch (error) {
            throw error;
        }
    }

    async listarPorTipo(tipo, usuarioLogadoId) {
        try {
            const pessoas = await PessoaModel.buscarPorTipo(tipo);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar_por_tipo',
                    tipo_pessoa: tipo,
                    total_registros: pessoas.length
                }
            });

            return pessoas.map(pessoa => ocultarDadosSensiveis(pessoa));

        } catch (error) {
            throw error;
        }
    }

    async atualizar(id, dados, usuarioLogadoId) {
        try {
            const pessoaExistente = await PessoaModel.buscarPorId(id);

            if (!pessoaExistente) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Limpar dados se fornecidos
            if (dados.num_cpf) {
                dados.num_cpf = limparCPF(dados.num_cpf);

                // Verificar se novo CPF já existe em outra pessoa
                if (dados.num_cpf !== pessoaExistente.num_cpf) {
                    const cpfExistente = await PessoaModel.buscarPorCPF(dados.num_cpf);
                    if (cpfExistente) {
                        throw new Error(MENSAGENS.ERRO.CPF_EXISTENTE);
                    }
                }
            }

            if (dados.num_cep) {
                dados.num_cep = limparCEP(dados.num_cep);
            }

            if (dados.num_celular_1) {
                dados.num_celular_1 = limparTelefone(dados.num_celular_1);
            }

            if (dados.num_celular_2) {
                dados.num_celular_2 = limparTelefone(dados.num_celular_2);
            }

            // Hash da senha se fornecida
            if (dados.des_senha) {
                dados.des_senha = await bcrypt.hash(dados.des_senha, 10);
            }

            // Atualizar pessoa
            const atualizado = await PessoaModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoaExistente.nom_completo,
                    campos_alterados: Object.keys(dados)
                }
            });

            const pessoaAtualizada = await PessoaModel.buscarPorId(id);
            return ocultarDadosSensiveis(pessoaAtualizada);

        } catch (error) {
            throw error;
        }
    }

    async deletar(id, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await PessoaModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoa.nom_completo,
                    cpf: pessoa.num_cpf,
                    tipo: pessoa.ind_tipo_pessoa
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    async ativarDesativar(id, status, usuarioLogadoId) {
        try {
            const pessoa = await PessoaModel.buscarPorId(id);

            if (!pessoa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            await PessoaModel.atualizar(id, { ind_status: status });

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    acao: status === 'ativo' ? 'ativar' : 'desativar',
                    pessoa: pessoa.nom_completo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    async listarCostureirasDisponiveis(usuarioLogadoId) {
        try {
            const costureiras = await PessoaModel.buscarPorTipo(TIPO_PESSOA.COSTUREIRA);
            const AgendamentoModel = require('../models/AgendamentoModel');

            const costureirasComStatus = await Promise.all(
                costureiras.map(async (costureira) => {
                    const agendamentoAtivo = await AgendamentoModel.buscarAgendamentoAtivoCostureira(costureira.id);

                    return {
                        ...ocultarDadosSensiveis(costureira),
                        disponivel: !agendamentoAtivo,
                        agendamento_ativo: agendamentoAtivo || null
                    };
                })
            );

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar_costureiras_disponiveis',
                    total: costureirasComStatus.length,
                    disponiveis: costureirasComStatus.filter(c => c.disponivel).length
                }
            });

            return costureirasComStatus;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PessoaService();
