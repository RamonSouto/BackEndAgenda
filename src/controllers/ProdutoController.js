const ProdutoService = require('../services/ProdutoService');
const UploadService = require('../services/UploadService');
const { MENSAGENS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const path = require('path');

class ProdutoController {
    /**
     * Adicionar produto ao agendamento
     * POST /api/produtos/agendamento
     */
    adicionarProdutoAgendamento = asyncHandler(async (req, res) => {
        const produtoId = await ProdutoService.adicionarProdutoAgendamento(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: produtoId }
        });
    });

    /**
     * Listar produtos de um agendamento
     * GET /api/produtos/agendamento/:id_agendamento
     */
    listarProdutosAgendamento = asyncHandler(async (req, res) => {
        const { id_agendamento } = req.params;
        const produtos = await ProdutoService.listarProdutosAgendamento(
            id_agendamento,
            req.usuario.id
        );

        return res.status(200).json({
            sucesso: true,
            total: produtos.length,
            dados: produtos
        });
    });

    /**
     * Atualizar status de produto
     * PATCH /api/produtos/:id/status
     */
    atualizarStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Campo status é obrigatório'
            });
        }

        await ProdutoService.atualizarStatusProduto(id, status, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO
        });
    });

    /**
     * Upload de foto de ajuste
     * POST /api/produtos/:id_produto_agendamento/fotos
     */
    uploadFoto = asyncHandler(async (req, res) => {
        const { id_produto_agendamento } = req.params;

        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum arquivo foi enviado'
            });
        }

        const dadosFoto = {
            id_produto_agendamento: parseInt(id_produto_agendamento),
            des_caminho_arquivo: req.file.path.replace(/\\/g, '/'), // Normalizar path
            nom_original: req.file.originalname,
            num_tamanho_bytes: req.file.size
        };

        const fotoId = await ProdutoService.adicionarFotoAjuste(dadosFoto, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Foto enviada com sucesso',
            dados: {
                id: fotoId,
                nome_arquivo: req.file.filename,
                caminho: dadosFoto.des_caminho_arquivo,
                tamanho: UploadService.formatarTamanhoArquivo(req.file.size)
            }
        });
    });

    /**
     * Upload múltiplo de fotos de ajuste
     * POST /api/produtos/:id_produto_agendamento/fotos/multiplas
     */
    uploadFotosMultiplas = asyncHandler(async (req, res) => {
        const { id_produto_agendamento } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum arquivo foi enviado'
            });
        }

        const fotosIds = [];

        for (const file of req.files) {
            const dadosFoto = {
                id_produto_agendamento: parseInt(id_produto_agendamento),
                des_caminho_arquivo: file.path.replace(/\\/g, '/'),
                nom_original: file.originalname,
                num_tamanho_bytes: file.size
            };

            const fotoId = await ProdutoService.adicionarFotoAjuste(dadosFoto, req.usuario.id);
            fotosIds.push({
                id: fotoId,
                nome_arquivo: file.filename,
                tamanho: UploadService.formatarTamanhoArquivo(file.size)
            });
        }

        return res.status(201).json({
            sucesso: true,
            mensagem: `${fotosIds.length} foto(s) enviada(s) com sucesso`,
            dados: fotosIds
        });
    });

    /**
     * Listar fotos de ajuste
     * GET /api/produtos/:id_produto_agendamento/fotos
     */
    listarFotos = asyncHandler(async (req, res) => {
        const { id_produto_agendamento } = req.params;
        const fotos = await ProdutoService.listarFotosAjuste(
            id_produto_agendamento,
            req.usuario.id
        );

        return res.status(200).json({
            sucesso: true,
            total: fotos.length,
            dados: fotos
        });
    });

    /**
     * Deletar foto de ajuste
     * DELETE /api/produtos/fotos/:id
     */
    deletarFoto = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Buscar informações da foto antes de deletar
        const foto = await ProdutoService.buscarFotoPorId(id);

        // Deletar registro do banco
        await ProdutoService.deletarFoto(id, req.usuario.id);

        // Deletar arquivo físico
        await UploadService.deletarArquivo(foto.des_caminho_arquivo);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });

    /**
     * Download de foto de ajuste
     * GET /api/produtos/fotos/:id/download
     */
    downloadFoto = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const foto = await ProdutoService.buscarFotoPorId(id);

        const caminhoCompleto = path.join(process.cwd(), foto.des_caminho_arquivo);

        // Verificar se arquivo existe
        const existe = await UploadService.verificarArquivoExiste(foto.des_caminho_arquivo);

        if (!existe) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Arquivo não encontrado'
            });
        }

        return res.download(caminhoCompleto, foto.nom_original);
    });

    /**
     * Visualizar foto de ajuste
     * GET /api/produtos/fotos/:id/visualizar
     */
    visualizarFoto = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const foto = await ProdutoService.buscarFotoPorId(id);

        const caminhoCompleto = path.join(process.cwd(), foto.des_caminho_arquivo);

        // Verificar se arquivo existe
        const existe = await UploadService.verificarArquivoExiste(foto.des_caminho_arquivo);

        if (!existe) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Arquivo não encontrado'
            });
        }

        return res.sendFile(caminhoCompleto);
    });

    /** CATEGORIA DE PRODUTOS */
    /**
     * Adicionar categoria
     * POST /api/produtos/categoria
     */
    adicionarCategoria = asyncHandler(async (req, res) => {
        const categoriaId = await ProdutoService.adicionarCategoria(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: categoriaId }
        })
    });


    /**
     * Listar categorias
     * GET /api/produtos/categoria
     */
    listarCategorias = asyncHandler(async (req, res) => {

        const categorias = await ProdutoService.listarCategorias(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: categorias.length,
            dados: categorias
        });
    });

    /**
     * Listar categoria
     * GET /api/produtos/categoria/:id
     */
    listarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const categoria = await ProdutoService.listarCategoria(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: categoria
        });
    });

    /**
     * Atualizar categoriaa
     * PUT /api/produtos/categoria/:id
     */
    atualizarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const categoria = await ProdutoService.atualizarCategoria(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: categoria
        });
    });

    /**
     * Deletar categoriaa(soft delete)
     * DELETE /api/produtos/categoria/:id
     */
    deletarCategoria = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarCategoria(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * Adicionar tamanho
     * POST /api/produtos/tamanho
     */
    adicionarTamanho = asyncHandler(async (req, res) => {
        const categoriaId = await ProdutoService.adicionarTamanho(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: categoriaId }
        })
    });


    /**
     * Listar categorias
     * GET /api/produtos/categoria
     */
    listarTamanhos = asyncHandler(async (req, res) => {

        const categorias = await ProdutoService.listarTamanhos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: categorias.length,
            dados: categorias
        });
    });

    /**
     * Listar categoria
     * GET /api/produtos/categoria/:id
     */
    listarTamanho = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await ProdutoService.listarTamanho(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: tamanho
        });
    });

    /**
     * Atualizar categoriaa
     * PUT /api/produtos/categoria/:id
     */
    atualizarTamanhos = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await ProdutoService.atualizarTamanhos(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: tamanho
        });
    });

    /**
     * Deletar categoriaa(soft delete)
     * DELETE /api/produtos/categoria/:id
     */
    deletarTamanhos = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarTamanhos(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * Adicionar cor e estampa
     * POST /api/produtos/cor_estampa
     */
    adicionarCorEstampa = asyncHandler(async (req, res) => {
        const corEstampaId = await ProdutoService.adicionarCorEstampa(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: corEstampaId }
        })
    });


    /**
     * Listar Cores e Estampas
     * GET /api/produtos/cor_estampa
     */
    listarCoresEstampas = asyncHandler(async (req, res) => {

        const corEstampa = await ProdutoService.listarCoresEstampas(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: corEstampa.length,
            dados: corEstampa
        });
    });

    /**
     * Listar Cor e Estampa
     * GET /api/produtos/cor_estampa/:id
     */
    listarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const tamanho = await ProdutoService.listarCorEstampa(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: tamanho
        });
    });

    /**
     * Atualizar Cor e Estampa
     * PUT /api/produtos/cor_estampa/:id
     */
    atualizarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const corEstampa = await ProdutoService.atualizarCorEstampa(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: corEstampa
        });
    });

    /**
     * Deletar Cor e Estampa(soft delete)
     * DELETE /api/produtos/cor_estampa/:id
     */
    deletarCorEstampa = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarCorEstampa(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * Adicionar Grade de Produto
     * POST /api/produtos/grade_produto
     */
    adicionarGradeProduto = asyncHandler(async (req, res) => {
        const gradeProdutoId = await ProdutoService.adicionarGradeProduto(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: gradeProdutoId }
        })
    });


    /**
     * Listar Grades de Produtos
     * GET /api/produtos/grade_produto
     */
    listarGradesProdutos = asyncHandler(async (req, res) => {

        const gradesProdutos = await ProdutoService.listarGradesProdutos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: gradesProdutos.length,
            dados: gradesProdutos
        });
    });

    /**
     * Listar Grade de Produto
     * GET /api/produtos/grade_produto/:id
     */
    listarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const gradeProduto = await ProdutoService.listarGradeProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: gradeProduto
        });
    });

    /**
     * Atualizar Grade de Produto
     * PUT /api/produtos/grade_produto/:id
     */
    atualizarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const gradeProduto = await ProdutoService.atualizarGradeProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: gradeProduto
        });
    });

    /**
     * Deletar Grade de Produto(soft delete)
     * DELETE /api/produtos/grade_produto/:id
     */
    deletarGradeProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarGradeProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * Adicionar Produto
     * POST /api/produtos/produto
     */
    adicionarProduto = asyncHandler(async (req, res) => {

        const produtoId = await ProdutoService.adicionarProduto(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: produtoId }
        })
    });


    /**
     * Listar Produtos
     * GET /api/produtos/produto
     */
    listarProdutos = asyncHandler(async (req, res) => {

        const produtos = await ProdutoService.listarProdutos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: produtos.length,
            dados: produtos
        });
    });

    /**
     * Listar Produto
     * GET /api/produtos/produto/:id
     */
    listarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.listarProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: produto
        });
    });

    /**
     * Atualizar Produto
     * PUT /api/produtos/produto/:id
     */
    atualizarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.atualizarProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produto
        });
    });

    /**
     * Deletar Produto(soft delete)
     * DELETE /api/produtos/produto/:id
     */
    deletarProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * Adicionar Imagem Produto
     * POST /api/produtos/imagemProduto
     */
    adicionarImagemProduto = asyncHandler(async (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum arquivo foi enviado'
            });
        }

        req.body.des_url_imagem = req.file.path;

        const temGrade = req.body.id_produto_grade !== undefined && req.body.id_produto_grade !== null && req.body.id_produto_grade !== '';

        const temProduto = req.body.id_produto !== undefined && req.body.id_produto !== null && req.body.id_produto !== '';

        if (!temGrade && !temProduto) {
            return res.status(500).json({
                sucesso: false,
                mensagem: `${MENSAGENS.ERRO.VALIDACAO} É necessário informar ID produto Grade ou ID produto (pelo menos um).`,
                dados: { body: req.body }
            })
        }

        if (temGrade && temProduto) {
            return res.status(500).json({
                sucesso: false,
                mensagem: `${MENSAGENS.ERRO.VALIDACAO} Informe apenas um dos campos: ID produto Grade ou ID produto.`,
                dados: { body: req.body }
            })
        }

        const produtoId = await ProdutoService.adicionarImagemProduto(
            req.body,
            req.usuario.id
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: produtoId }
        })
    });

    /**
     * Listar Imagens Produtos
     * GET /api/produtos/imagemProduto
     */
    listarImagemProdutos = asyncHandler(async (req, res) => {

        const produtos = await ProdutoService.listarImagemProdutos(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: produtos.length,
            dados: produtos
        });
    });

    /**
     * Buscar Imagem Produto ID
     * GET /api/produtos/imagemProduto/:id
     */
    buscarImagemProdutoId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.buscarImagemProdutoID(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: produto
        });
    });

    /**
     * Buscar Imagem Produto Grade ID
     * GET /api/produtos/imagemProdutoGrade/:id
     */
    buscarImagemProdutoGradeId = asyncHandler(async (req, res) => {

        const { id } = req.params;

        const produto = await ProdutoService.buscarImagemProdutoGradeID(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: produto
        });
    });

    /**
     * Atualizar Imagem Produto
     * PUT /api/produtos/imagemProduto/:id
     */
    atualizarImagemProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;
        const produto = await ProdutoService.atualizarImagemProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produto
        });
    });

    /**
     * Deletar Imagem Produto(soft delete)
     * DELETE /api/produtos/imagemProduto/:id
     */
    deletarImagemProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarImagemProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new ProdutoController();
