const ProdutoModel = require('../models/ProdutoModel');
const AgendamentoModel = require('../models/AgendamentoModel');
const LogService = require('./LogService');
const { ACOES_LOG, MENSAGENS } = require('../utils/constants');
const validators = require('../utils/validators');
const { NotFoundError } = require('../utils/ApiError');

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


    async adicionarCategoria(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.categoriaProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            if (value.id_pai) {
                const existeCategoriaPai = await ProdutoModel.buscarCategoriaPorId(value.id_pai);

                if (!existeCategoriaPai) {
                    throw new Error(MENSAGENS.ERRO.CATEGORIA_PAI);
                }
            }

            const categoriaId = await ProdutoModel.criarCategoriaProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_categorias_produtos',
                num_registro_id: categoriaId,
                des_detalhes: {
                    nom_categoria: value.nom_categoria,
                    id_pai: value.id_pai
                }
            });

            const categoriaProduto = await ProdutoModel.buscarCategoriaPorId(categoriaId)

            return categoriaProduto;

        } catch (error) {
            throw error;
        }
    }

    async listarCategorias(usuarioLogadoId) {
        try {
            const categorias = await ProdutoModel.listarCategorias();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_categorias_produtos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: categorias.length
                }
            });

            return categorias;
        } catch (error) {
            throw error;
        }
    }

    async listarCategoria(id, usuarioLogadoId) {
        // try {
        const categoria = await ProdutoModel.buscarCategoriaPorId(id);

        if (!categoria) {
            // throw new Error('Categoria não encontrada');
            throw new NotFoundError('Categoria não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_categorias_produtos',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                categoria_consultada: categoria.nom_categoria
            }
        });

        return categoria;
        // } catch (error) {
        //     throw error;
        // }
    }

    async atualizarCategoria(id, dados, usuarioLogadoId) {
        try {
            const categoriaExiste = await ProdutoModel.buscarCategoriaPorId(id);

            if (!categoriaExiste) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarCategoria(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_categorias_produtos',
                des_detalhes: {
                    categoria: categoriaExiste.nom_categoria,
                    campos_alterados: Object.keys(dados)
                }
            });

            const categoriaAtualizada = await ProdutoModel.buscarCategoriaPorId(id);

            return categoriaAtualizada;
        } catch (error) {
            throw error;
        }
    }

    async deletarCategoria(id, usuarioLogadoId) {
        try {
            const categoria = await ProdutoModel.buscarCategoriaPorId(id);

            if (!categoria) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarCategoria(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_categorias_produtos',
                num_registro_id: id,
                des_detalhes: {
                    categoria: categoria.nom_categoria,
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }





    async listarTamanhos(usuarioLogadoId) {
        try {
            const tamanhos = await ProdutoModel.listarTamanhos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_tamanhos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: tamanhos.length
                }
            });

            return tamanhos;
        } catch (error) {
            throw error;
        }
    }

    async adicionarTamanho(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.tamanhoProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const tamanhoId = await ProdutoModel.criarTamanhoProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_tamanhos',
                num_registro_id: tamanhoId,
                des_detalhes: {
                    cod_tamanho: value.cod_tamanho,
                    des_tamanho: value.des_tamanho,
                    des_categoria_tamanho: value.des_categoria_tamanho,
                    num_ordem_exibicao: value.num_ordem_exibicao
                }
            });

            const tamanhoProduto = await ProdutoModel.buscarTamanhoPorId(tamanhoId)

            return tamanhoProduto;

        } catch (error) {
            throw error;
        }
    }

    async listarTamanho(id, usuarioLogadoId) {

        const tamanho = await ProdutoModel.buscarTamanhoPorId(id);

        if (!tamanho) {
            throw new NotFoundError('Tamanho não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_tamanhos',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                cod_tamanho: tamanho.cod_tamanho,
                des_tamanho: tamanho.des_tamanho,
                des_categoria_tamanho: tamanho.des_categoria_tamanho,
                num_ordem_exibicao: tamanho.num_ordem_exibicao
            }
        });

        return tamanho;
    }

    async atualizarTamanhos(id, dados, usuarioLogadoId) {
        try {
            const tamanhoExiste = await ProdutoModel.buscarTamanhoPorId(id);


            if (!tamanhoExiste) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarTamanho(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_tamanhos',
                des_detalhes: {
                    cod_tamanho: tamanhoExiste.cod_tamanho,
                    des_tamanho: tamanhoExiste.des_tamanho,
                    campos_alterados: Object.keys(dados)
                }
            });

            const tamanhoAtualizada = await ProdutoModel.buscarTamanhoPorId(id);

            return tamanhoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    async deletarTamanhos(id, usuarioLogadoId) {
        try {
            const tamanho = await ProdutoModel.buscarTamanhoPorId(id);

            if (!tamanho) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarTamanho(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_tamanhos',
                num_registro_id: id,
                des_detalhes: {
                    tamanho: deletado.cod_tamanho,
                    des_tamanho: deletado.des_tamanho
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }





    async listarCoresEstampas(usuarioLogadoId) {
        try {
            const coresEstampas = await ProdutoModel.listarCoresEstampas();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: coresEstampas.length
                }
            });

            return coresEstampas;
        } catch (error) {
            throw error;
        }
    }

    async adicionarCorEstampa(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.corEstampaProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const corEstampaId = await ProdutoModel.criarCorEstampaProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                num_registro_id: corEstampaId,
                des_detalhes: {
                    nom_cor_estampa: value.nom_cor_estampa,
                    ind_tipo: value.ind_tipo,
                    val_codigo_hex: value.val_codigo_hex,
                    des_imagem_url: value.des_imagem_url,
                    num_ordem_exibicao: value.num_ordem_exibicao
                }
            });

            const corEstampaProduto = await ProdutoModel.buscarCorEstampaPorId(corEstampaId)

            return corEstampaProduto;

        } catch (error) {
            throw error;
        }
    }

    async listarCorEstampa(id, usuarioLogadoId) {

        const corEstampa = await ProdutoModel.buscarCorEstampaPorId(id);

        if (!corEstampa) {
            throw new NotFoundError('Cor e Estampa não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_variacoes_cor_estampa',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                nom_cor_estampa: corEstampa.nom_cor_estampa,
                ind_tipo: corEstampa.ind_tipo,
                val_codigo_hex: corEstampa.val_codigo_hex,
                des_imagem_url: corEstampa.des_imagem_url,
                num_ordem_exibicao: corEstampa.num_ordem_exibicao
            }
        });

        return corEstampa;
    }

    async atualizarCorEstampa(id, dados, usuarioLogadoId) {
        try {

            const corEstampaExiste = await ProdutoModel.buscarCorEstampaPorId(id);


            if (!corEstampaExiste) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarCorEstampa(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                des_detalhes: {
                    nom_cor_estampa: corEstampaExiste.nom_cor_estampa,
                    ind_tipo: corEstampaExiste.ind_tipo,
                    campos_alterados: Object.keys(dados)
                }
            });

            const corEstampaAtualizada = await ProdutoModel.buscarCorEstampaPorId(id);

            return corEstampaAtualizada;
        } catch (error) {
            throw error;
        }
    }

    async deletarCorEstampa(id, usuarioLogadoId) {
        try {
            const corEstampa = await ProdutoModel.buscarCorEstampaPorId(id);

            if (!corEstampa) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarCorEstampa(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_variacoes_cor_estampa',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    nom_cor_estampa: deletado.nom_cor_estampa,
                    ind_tipo: deletado.ind_tipo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }





    async listarGradesProdutos(usuarioLogadoId) {
        try {
            const gradesProdutos = await ProdutoModel.listarGradesProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_grade',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: gradesProdutos.length
                }
            });

            return gradesProdutos;
        } catch (error) {
            throw error;
        }
    }

    async adicionarGradeProduto(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.gradeProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const gradeProdutoId = await ProdutoModel.criarGradeProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_grade',
                num_registro_id: gradeProdutoId,
                des_detalhes: {
                    id_produto: value.id_produto,
                    id_variacao_cor_estampa: value.id_variacao_cor_estampa,
                    id_tamanho: value.id_tamanho,
                    num_sku: value.num_sku,
                    val_preco_variacao: value.val_preco_variacao,
                    ind_ativo: value.ind_ativo,
                    num_codigo_barras: value.num_codigo_barras
                }
            });

            const gradeProduto = await ProdutoModel.buscarGradeProdutoPorId(gradeProdutoId)

            return gradeProduto;

        } catch (error) {
            throw error;
        }
    }

    async listarGradeProduto(id, usuarioLogadoId) {

        const gradeProduto = await ProdutoModel.buscarGradeProdutoPorId(id);

        if (!gradeProduto) {
            throw new NotFoundError('Cor e Estampa não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_grade',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_produto: gradeProduto.id_produto,
                id_variacao_cor_estampa: gradeProduto.id_variacao_cor_estampa,
                id_tamanho: gradeProduto.id_tamanho,
                num_sku: gradeProduto.num_sku,
                val_preco_variacao: gradeProduto.val_preco_variacao,
                ind_ativo: gradeProduto.ind_ativo,
                num_codigo_barras: gradeProduto.num_codigo_barras
            }
        });

        return gradeProduto;
    }

    async atualizarGradeProduto(id, dados, usuarioLogadoId) {
        try {

            const gradeProduto = await ProdutoModel.buscarGradeProdutoPorId(id);


            if (!gradeProduto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarGradeProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_grade',
                des_detalhes: {
                    id_produto: gradeProduto.id_produto,
                    id_variacao_cor_estampa: gradeProduto.id_variacao_cor_estampa,
                    id_tamanho: gradeProduto.id_tamanho,
                    num_sku: gradeProduto.num_sku,
                    val_preco_variacao: gradeProduto.val_preco_variacao,
                    ind_ativo: gradeProduto.ind_ativo,
                    num_codigo_barras: gradeProduto.num_codigo_barras,
                    campos_alterados: Object.keys(dados)
                }
            });

            const gradeProdutoAtualizada = await ProdutoModel.buscarGradeProdutoPorId(id);

            return gradeProdutoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    async deletarGradeProduto(id, usuarioLogadoId) {
        try {
            const gradeProduto = await ProdutoModel.buscarGradeProdutoPorId(id);

            if (!gradeProduto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarGradeProduto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produto_grade',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    id_produto: deletado.id_produto,
                    id_variacao_cor_estampa: deletado.id_variacao_cor_estampa,
                    id_tamanho: deletado.id_tamanho,
                    num_sku: deletado.num_sku,
                    val_preco_variacao: deletado.val_preco_variacao,
                    ind_ativo: deletado.ind_ativo,
                    num_codigo_barras: deletado.num_codigo_barras
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }





    async listarProdutos(usuarioLogadoId) {
        try {
            const produtos = await ProdutoModel.listarProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produtos',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: produtos.length
                }
            });

            return produtos;
        } catch (error) {
            throw error;
        }
    }

    async adicionarProduto(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.produtoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const produtoId = await ProdutoModel.criarProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produtos',
                num_registro_id: produtoId,
                des_detalhes: {
                    id_categoria: value.id_categoria,
                    nom_produto: value.nom_produto,
                    num_sku: value.num_sku,
                    des_produto: value.des_produto,
                    ref_produto: value.ref_produto,
                    val_preco_base: value.val_preco_base,
                    ind_ativo: value.ind_ativo
                }
            });

            const produto = await ProdutoModel.buscarProdutoPorId(produtoId)

            return produto;

        } catch (error) {
            throw error;
        }
    }

    async listarProduto(id, usuarioLogadoId) {

        const produto = await ProdutoModel.buscarProdutoPorId(id);

        if (!produto) {
            throw new NotFoundError('Produto não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produtos',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_categoria: produto.id_categoria,
                nom_produto: produto.nom_produto,
                num_sku: produto.num_sku,
                des_produto: produto.des_produto,
                ref_produto: produto.ref_produto,
                val_preco_base: produto.val_preco_base,
                ind_ativo: produto.ind_ativo
            }
        });

        return produto;
    }

    async atualizarProduto(id, dados, usuarioLogadoId) {
        try {

            const produto = await ProdutoModel.buscarProdutoPorId(id);


            if (!produto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produtos',
                des_detalhes: {
                    id_categoria: produto.id_categoria,
                    nom_produto: produto.nom_produto,
                    num_sku: produto.num_sku,
                    des_produto: produto.des_produto,
                    ref_produto: produto.ref_produto,
                    val_preco_base: produto.val_preco_base,
                    ind_ativo: produto.ind_ativo,
                    campos_alterados: Object.keys(dados)
                }
            });

            const produtoAtualizada = await ProdutoModel.buscarProdutoPorId(id);

            return produtoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    async deletarProduto(id, usuarioLogadoId) {
        try {
            const produto = await ProdutoModel.buscarProdutoPorId(id);

            if (!produto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
            }

            // Soft delete
            const deletado = await ProdutoModel.deletarProduto(id);

            if (!deletado) {
                throw new Error('Erro ao deletar pessoa');
            }

            // Registrar log
            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: 'tab_produtos',
                num_registro_id: id,
                des_detalhes: {
                    id: deletado.id,
                    id_categoria: deletado.id_categoria,
                    nom_produto: deletado.nom_produto,
                    num_sku: deletado.num_sku,
                    des_produto: deletado.des_produto,
                    ref_produto: deletado.ref_produto,
                    val_preco_base: deletado.val_preco_base,
                    ind_ativo: deletado.ind_ativo
                }
            });

            return true;

        } catch (error) {
            throw error;
        }
    }





    async listarImagemProdutos(usuarioLogadoId) {
        try {
            const imagemProdutos = await ProdutoModel.listarImagemProdutos();

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CONSULTAR,
                des_tabela: 'tab_produto_imagens',
                des_detalhes: {
                    tipo_consulta: 'listar',
                    total_registros: imagemProdutos.length
                }
            });

            return imagemProdutos;
        } catch (error) {
            throw error;
        }
    }

    async adicionarImagemProduto(dados, usuarioLogadoId) {
        try {

            //Validar dados
            const { error, value } = validators.imagemProdutoSchema.validate(dados);

            if (error) {
                throw new Error(`${MENSAGENS.ERRO.VALIDACAO}: ${error.details[0].message}`);
            }

            const imagemProdutoId = await ProdutoModel.criarImagemProduto(value);

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.CRIAR,
                des_tabela: 'tab_produto_imagens',
                num_registro_id: imagemProdutoId,
                des_detalhes: {
                    tipo_consulta: 'busca_por_id',
                    id_produto_grade: imagemProduto.id_produto_grade,
                    id_produto: imagemProduto.id_produto,
                    des_url_imagem: imagemProduto.des_url_imagem,
                    num_ordem: imagemProduto.num_ordem,
                    ind_principal: imagemProduto.ind_principal
                }
            });

            const imagemProduto = await ProdutoModel.buscarImagemProdutoPorId(produtoId)

            return imagemProduto;

        } catch (error) {
            throw error;
        }
    }

    async listarImagemProduto(id, usuarioLogadoId) {

        const imagemProduto = await ProdutoModel.buscarImagemProdutoPorId(id);

        if (!imagemProduto) {
            throw new NotFoundError('Produto não encontrada');
        }

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: 'tab_produto_imagens',
            des_detalhes: {
                tipo_consulta: 'busca_por_id',
                id_produto_grade: imagemProduto.id_produto_grade,
                id_produto: imagemProduto.id_produto,
                des_url_imagem: imagemProduto.des_url_imagem,
                num_ordem: imagemProduto.num_ordem,
                ind_principal: imagemProduto.ind_principal
            }
        });

        return imagemProduto;
    }

    async atualizarProduto(id, dados, usuarioLogadoId) {
        try {

            const imagemProduto = await ProdutoModel.buscarImagemProdutoPorId(id);


            if (!imagemProduto) {
                throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO)
            }

            const atualizado = await ProdutoModel.atualizarImagemProduto(id, dados);

            if (!atualizado) {
                throw new Error('Erro ao atualizar categoria');
            }

            await LogService.registrar({
                id_usuario: usuarioLogadoId,
                des_acao: ACOES_LOG.EDITAR,
                des_tabela: 'tab_produto_imagens',
                des_detalhes: {
                    id_produto_grade: imagemProduto.id_produto_grade,
                    id_produto: imagemProduto.id_produto,
                    des_url_imagem: imagemProduto.des_url_imagem,
                    num_ordem: imagemProduto.num_ordem,
                    ind_principal: imagemProduto.ind_principal,
                    campos_alterados: Object.keys(dados)
                }
            });

            const imagemProdutoAtualizada = await ProdutoModel.buscarImagemProdutoPorId(id);

            return imagemProdutoAtualizada;
        } catch (error) {
            throw error;
        }
    }

    // async deletarImagemProduto(id, usuarioLogadoId) {
    //     try {
    //         const imagemProduto = await ProdutoModel.buscarImagemProdutoPorId(id);

    //         if (!imagemProduto) {
    //             throw new Error(MENSAGENS.ERRO.NAO_ENCONTRADO);
    //         }

    //         // Soft delete
    //         const deletado = await ProdutoModel.deletarImagemProduto(id);

    //         if (!deletado) {
    //             throw new Error('Erro ao deletar pessoa');
    //         }

    //         // Registrar log
    //         await LogService.registrar({
    //             id_usuario: usuarioLogadoId,
    //             des_acao: ACOES_LOG.DELETAR,
    //             des_tabela: 'tab_produto_imagens',
    //             num_registro_id: id,
    //             des_detalhes: {
    //                 id_produto_grade: imagemProduto.id_produto_grade,
    //                 id_produto: imagemProduto.id_produto,
    //                 des_url_imagem: imagemProduto.des_url_imagem,
    //                 num_ordem: imagemProduto.num_ordem,
    //                 ind_principal: imagemProduto.ind_principal,
    //             }
    //         });

    //         return true;

    //     } catch (error) {
    //         throw error;
    //     }
    // }
}

module.exports = new ProdutoService();