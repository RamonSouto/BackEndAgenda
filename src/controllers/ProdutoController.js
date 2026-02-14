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
}

module.exports = new ProdutoController();
