const ProdutoModel = require('../models/ProdutoModel');
const AgendamentoModel = require('../models/AgendamentoModel');
const LogService = require('./LogService');
const { ACOES_LOG, MENSAGENS } = require('../utils/constants');

class ProdutoService {
    async adicionarProdutoAgendamento(dados, usuarioLogadoId) {
        try {
            // Verificar se agendamento existe
            const agendamento = await AgendamentoModel.buscarPorId(dados.id_agendamento);

            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }

            // Adicionar produto ao agendamento
            const produtoId = await ProdutoModel.adicionarProdutoAgendamento(dados);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_agendamento',
                num_registro_id: produtoId,
                des_detalhes: {
                    agendamento_id: dados.id_agendamento,
                    produto_grade_id: dados.id_produto_grade,
                    paciente: agendamento.paciente_nome
                }
            });

            return produtoId;

        } catch (error) {
            throw error;
        }
    }

    async listarProdutosAgendamento(id_agendamento, usuarioLogadoId) {
        try {
            const produtos = await ProdutoModel.listarProdutosAgendamento(id_agendamento);

            // Buscar fotos de cada produto
            for (const produto of produtos) {
                produto.fotos = await ProdutoModel.listarFotosAjuste(produto.id);
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_agendamento',
                des_detalhes: {
                    tipo_consulta: 'listar_produtos_agendamento',
                    agendamento_id: id_agendamento,
                    total_produtos: produtos.length
                }
            });

            return produtos;

        } catch (error) {
            throw error;
        }
    }

    async atualizarStatusProduto(id, status, usuarioLogadoId) {
        try {
            const atualizado = await ProdutoModel.atualizarStatusProduto(id, status);

            if (!atualizado) {
                throw new Error('Erro ao atualizar status do produto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_agendamento',
                num_registro_id: id,
                des_detalhes: {
                    novo_status: status
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    async adicionarFotoAjuste(dados, usuarioLogadoId) {
        try {
            const fotoId = await ProdutoModel.adicionarFotoAjuste(dados);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.UPLOAD,
                des_tabela: 'tab_fotos_ajustes',
                num_registro_id: fotoId,
                des_detalhes: {
                    produto_agendamento_id: dados.id_produto_agendamento,
                    nome_arquivo: dados.nom_original,
                    tamanho_bytes: dados.num_tamanho_bytes
                }
            });

            return fotoId;

        } catch (error) {
            throw error;
        }
    }

    async listarFotosAjuste(id_produto_agendamento, usuarioLogadoId) {
        try {
            const fotos = await ProdutoModel.listarFotosAjuste(id_produto_agendamento);

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_fotos_ajustes',
                des_detalhes: {
                    tipo_consulta: 'listar_fotos_ajuste',
                    produto_agendamento_id: id_produto_agendamento,
                    total_fotos: fotos.length
                }
            });

            return fotos;

        } catch (error) {
            throw error;
        }
    }

    async deletarFoto(id, usuarioLogadoId) {
        try {
            const foto = await ProdutoModel.buscarFotoPorId(id);

            if (!foto) {
                throw new Error('Foto não encontrada');
            }

            const deletado = await ProdutoModel.deletarFoto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar foto');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_fotos_ajustes',
                num_registro_id: id,
                des_detalhes: {
                    caminho_arquivo: foto.des_caminho_arquivo,
                    nome_original: foto.nom_original
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    async buscarFotoPorId(id) {
        try {
            const foto = await ProdutoModel.buscarFotoPorId(id);

            if (!foto) {
                throw new Error('Foto não encontrada');
            }

            return foto;

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ProdutoService();
