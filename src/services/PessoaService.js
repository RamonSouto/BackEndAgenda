const bcrypt = require('bcryptjs');
const PessoaModel = require('../models/PessoaModel');
const LogService = require('./LogService');
const { PAPEIS_PESSOA, MENSAGENS, ACOES_LOG } = require('../utils/constants');
const validators = require('../utils/validators');
const { limparCPF, limparCEP, limparTelefone, ocultarDadosSensiveis } = require('../utils/formatters');

class PessoaService {
    extrairPapeis(dados) {
        const papeis = [];

        if (dados.ind_medico) papeis.push(PAPEIS_PESSOA.MEDICO);
        if (dados.ind_secretaria) papeis.push(PAPEIS_PESSOA.SECRETARIA);
        if (dados.ind_costureira) papeis.push(PAPEIS_PESSOA.COSTUREIRA);
        if (dados.ind_paciente) papeis.push(PAPEIS_PESSOA.PACIENTE);
        if (dados.ind_administrador) papeis.push(PAPEIS_PESSOA.ADMINISTRADOR);

        return papeis;
    }

    possuiAlgumPapel(dados) {
        return (
            dados.ind_medico ||
            dados.ind_secretaria ||
            dados.ind_costureira ||
            dados.ind_paciente ||
            dados.ind_administrador
        );
    }

    async criar(dados, usuarioLogadoId) {
        try {
            const { error, value } = validators.pessoaSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            value.num_cpf = limparCPF(value.num_cpf);
            value.num_cep = limparCEP(value.num_cep);

            value.num_celular_1 = limparTelefone(value.num_celular_1);
            if (value.num_celular_2) {
                value.num_celular_2 = limparTelefone(value.num_celular_2);
            }

            const cpfExistente = await PessoaModel.buscarPorCPF(value.num_cpf);

            if (cpfExistente) {
                throw new Error(MENSAGENS.ERRO.CPF_EXISTENTE);
            }

            if (value.des_senha) {
                value.des_senha = await bcrypt.hash(value.des_senha, 10);
            }

            const pessoaId = await PessoaModel.criar(value);
            const papeis = this.extrairPapeis(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: pessoaId,
                des_detalhes: {
                    papeis,
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

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    filtros,
                    total_registros: pessoas.length
                }
            });

            return pessoas.map(pessoa => ocultarDadosSensiveis(pessoa));
        } catch (error) {
            throw error;
        }
    }

    async listarPorPapel(papel, usuarioLogadoId) {
        try {
            const pessoas = await PessoaModel.buscarPorPapel(papel);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_pessoas',
                des_detalhes: {
                    tipo_consulta: 'listar_por_papel',
                    papel,
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

            if (dados.num_cpf) {
                dados.num_cpf = limparCPF(dados.num_cpf);

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

            const dadosFinais = {
                ...pessoaExistente,
                ...dados
            };

            if (!this.possuiAlgumPapel(dadosFinais)) {
                throw new Error('A pessoa deve possuir ao menos um papel.');
            }

            const exigeSenha =
                dadosFinais.ind_medico ||
                dadosFinais.ind_secretaria ||
                dadosFinais.ind_costureira ||
                dadosFinais.ind_administrador;

            if (exigeSenha && !dados.des_senha && !pessoaExistente.des_senha) {
                throw new Error('Senha é obrigatória para médico, secretária, costureira ou administrador.');
            }

            if (dados.des_senha) {
                dados.des_senha = await bcrypt.hash(dados.des_senha, 10);
            }

            const atualizado = await PessoaModel.atualizar(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar pessoa');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoaExistente.nom_completo,
                    campos_alterados: Object.keys(dados),
                    papeis_resultantes: this.extrairPapeis(dadosFinais)
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

            const deletado = await PessoaModel.deletar(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_pessoas',
                num_registro_id: id,
                des_detalhes: {
                    pessoa: pessoa.nom_completo,
                    cpf: pessoa.num_cpf,
                    papeis: this.extrairPapeis(pessoa)
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
            const costureiras = await PessoaModel.buscarPorPapel(PAPEIS_PESSOA.COSTUREIRA);
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

    async listarCidades(usuarioLogadoId) {
        try {
            const cidades = await PessoaModel.listarCidades();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.LISTAR,
                des_tabela: 'tab_cidades',
                des_detalhes: {
                    tipo_consulta: 'listar_cidades',
                    total_registros: cidades.length,
                }
            });

            return cidades;
        } catch (error) {
            throw error;
        }
    }

    async buscarCidadeId(id, usuarioLogadoId) {
        try {
            const cidade = await PessoaModel.buscarCidadeId(id);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_cidades',
                des_detalhes: {
                    tipo_consulta: 'buscar_cidade_id',
                    total_registros: cidade.length,
                }
            });

            return cidade;
        } catch (error) {
            throw error;
        }
    }

    async buscarCidadeNome(nome, usuarioLogadoId) {
        try {
            const cidades = await PessoaModel.buscarCidadeNome(nome);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_cidades',
                des_detalhes: {
                    tipo_consulta: 'buscar_cidade_nome',
                    total_registros: cidades.length,
                }
            });

            return cidades;
        } catch (error) {
            throw error;
        }
    }

    async buscarCidadeEstadoId(id, req) {
        try {
            const cidades = await PessoaModel.buscarCidadeEstadoId(id);
            const usuarioLogadoId = req.usuario.id;

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_cidades',
                num_registro_id: id,
                des_detalhes: {
                    tipo_consulta: 'buscar_cidades_estado_id',
                    total_registros: cidades.length,
                }
            });

            return cidades;
        } catch (error) {
            throw error;
        }
    }

    async listarEstados(usuarioLogadoId) {
        try {
            const estados = await PessoaModel.listarEstados();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.LISTAR,
                des_tabela: 'tab_estados',
                des_detalhes: {
                    tipo_consulta: 'listar_estados',
                    total_registros: estados.length,
                }
            });

            return estados;
        } catch (error) {
            throw error;
        }
    }

    async buscarEstadoId(id, usuarioLogadoId) {
        try {
            const estado = await PessoaModel.buscarEstadoId(id);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_estados',
                des_detalhes: {
                    tipo_consulta: 'buscar_estado_id',
                    total_registros: estado.length,
                }
            });

            return estado;
        } catch (error) {
            throw error;
        }
    }

    async buscarEstadoNome(nome, usuarioLogadoId) {
        try {
            const estados = await PessoaModel.buscarEstadoNome(nome);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_estados',
                des_detalhes: {
                    tipo_consulta: 'buscar_estado_nome',
                    total_registros: estados.length,
                }
            });

            return estados;
        } catch (error) {
            throw error;
        }
    }

    async buscarEstadoSgl(sgl, usuarioLogadoId) {
        try {
            const estados = await PessoaModel.buscarEstadoSgl(sgl);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_estados',
                des_detalhes: {
                    tipo_consulta: 'buscar_estado_sigla',
                    total_registros: estados.length,
                }
            });

            return estados;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PessoaService();
