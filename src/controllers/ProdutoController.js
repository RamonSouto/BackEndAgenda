// /src/controllers/ProdutoController.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/ProdutoController.js
 * @description Controlador de operações relacionadas a produtos,
 * incluindo gerenciamento de produtos em agendamentos, upload de fotos,
 * CRUD de categorias, tamanhos, cores/estampas, grades, imagens,
 * tipos de serviço, associações produto-serviço e preços.
 * 
 * @requires ../services/ProdutoService
 * @requires ../services/UploadService
 * @requires ../utils/constants
 * @requires ../middlewares/errorMiddleware
 * @requires path
 */
const ProdutoService = require('../services/ProdutoService');
const UploadService = require('../services/UploadService');
const { MENSAGENS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const path = require('path');

/**
 * Classe ProdutoController.
 * @class ProdutoController
 */
class ProdutoController {
    /**
     * ===========================================
     * PRODUTOS EM AGENDAMENTO
     * ===========================================
     */

    /**
     * Adiciona um produto a um agendamento.
     * 
     * @name adicionarProdutoAgendamento
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.body - Dados do produto no agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia resposta 201 com ID do produto.
     * 
     * @throws {Error} - Repassa erros ao middleware via asyncHandler.
     * 
     * @example
     * POST /api/produtos/agendamento
     * Body: { id_agendamento: 1, id_produto_grade: 5, ... }
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
     * Lista os produtos de um agendamento.
     * 
     * @name listarProdutosAgendamento
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number} req.params.id_agendamento - ID do agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de produtos com total.
     * 
     * @example
     * GET /api/produtos/agendamento/1
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
     * Atualiza o status de um produto de agendamento.
     * 
     * @name atualizarStatus
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto de agendamento.
     * @param {Object} req.body - Corpo da requisição.
     * @param {string} req.body.status - Novo status.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @throws {Error} 400 - Se o campo status não for fornecido.
     * 
     * @example
     * PATCH /api/produtos/1/status
     * Body: { status: 'concluido' }
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
     * ===========================================
     * FOTOS DE AJUSTE
     * ===========================================
     */

    /**
     * Faz upload de uma única foto de ajuste para um produto de agendamento.
     * 
     * @name uploadFoto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
     * @param {Object} req.file - Arquivo enviado (campo 'foto').
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com dados da foto.
     * 
     * @throws {Error} 400 - Se nenhum arquivo for enviado.
     * 
     * @example
     * POST /api/produtos/1/fotos
     * Body (multipart/form-data): foto: (arquivo)
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
     * Faz upload de múltiplas fotos de ajuste para um produto de agendamento.
     * 
     * @name uploadFotosMultiplas
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
     * @param {Object[]} req.files - Arquivos enviados (campo 'fotos').
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com lista de IDs e informações.
     * 
     * @throws {Error} 400 - Se nenhum arquivo for enviado.
     * 
     * @example
     * POST /api/produtos/1/fotos/multiplas
     * Body (multipart/form-data): fotos: (arquivo1), fotos: (arquivo2)
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
     * Lista todas as fotos de ajuste de um produto de agendamento.
     * 
     * @name listarFotos
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id_produto_agendamento - ID do produto de agendamento.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de fotos com total.
     * 
     * @example
     * GET /api/produtos/1/fotos
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
     * Deleta uma foto de ajuste (registro e arquivo físico).
     * 
     * @name deletarFoto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/fotos/1
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
     * Faz o download de uma foto de ajuste.
     * 
     * @name downloadFoto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia o arquivo para download.
     * 
     * @throws {Error} 404 - Se o arquivo não existir.
     * 
     * @example
     * GET /api/produtos/fotos/1/download
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
     * Visualiza (exibe inline) uma foto de ajuste.
     * 
     * @name visualizarFoto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da foto.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia o arquivo para visualização.
     * 
     * @throws {Error} 404 - Se o arquivo não existir.
     * 
     * @example
     * GET /api/produtos/fotos/1/visualizar
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




    /**
     * ===========================================
     * CATEGORIAS DE PRODUTOS
     * ===========================================
     */



    /**
     * ===========================================
     * TAMANHOS
     * ===========================================
     */


    /**
     * ===========================================
     * CORES E ESTAMPAS
     * ===========================================
     */



    /**
     * ===========================================
     * GRADES DE PRODUTOS
     * ===========================================
     */





    /**
     * ===========================================
     * PRODUTOS
     * ===========================================
     */

    /**
     * Adiciona um produto.
     * 
     * @name adicionarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com ID.
     * 
     * @example
     * POST /api/produtos/produto
     * Body: { id_categoria: 1, nom_produto: 'Camisa Polo', ... }
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
     * Lista todos os produtos.
     * 
     * @name listarProdutos
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de produtos com total.
     * 
     * @example
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
     * Busca um produto por ID.
     * 
     * @name listarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados do produto.
     * 
     * @example
     * GET /api/produtos/produto/1
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
     * Atualiza um produto.
     * 
     * @name atualizarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Produto atualizado.
     * 
     * @example
     * PUT /api/produtos/produto/1
     * Body: { nom_produto: 'Camisa Polo Azul' }
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
     * Deleta (soft delete) um produto.
     * 
     * @name deletarProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID do produto.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/produto/1
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
     * ===========================================
     * IMAGENS DE PRODUTOS
     * ===========================================
     */

    /**
     * Adiciona uma imagem a um produto ou grade.
     * 
     * @name adicionarImagemProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.body - Dados da imagem (id_produto_grade ou id_produto).
     * @param {Object} req.file - Arquivo enviado (campo 'foto').
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Resposta 201 com ID da imagem.
     * 
     * @throws {Error} 400 - Se nenhum arquivo for enviado.
     * @throws {Error} 500 - Se não for informado produto ou grade ou ambos.
     * 
     * @example
     * POST /api/produtos/imagemProduto
     * Body (multipart/form-data): foto: (arquivo), id_produto: 1
     */
    adicionarImagemProduto = asyncHandler(async (req, res) => {
        console.log(req.body);
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

        const produtoId = await ProdutoService.adicionarImagemProduto(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: { id: produtoId }
        })
    });

    /**
     * Lista todas as imagens de produtos.
     * 
     * @name listarImagemProdutos
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de imagens com total.
     * 
     * @example
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
     * Busca uma imagem por ID.
     * 
     * @name buscarImagemProdutoId
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da imagem.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Dados da imagem.
     * 
     * @example
     * GET /api/produtos/imagemProduto/1
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
     * Busca imagens associadas a uma grade de produto.
     * 
     * @name buscarImagemProdutoGradeId
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da grade.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Lista de imagens da grade.
     * 
     * @example
     * GET /api/produtos/imagemProdutoGrade/1
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
     * Atualiza uma imagem de produto.
     * 
     * @name atualizarImagemProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da imagem.
     * @param {Object} req.body - Dados para atualizar.
     * @param {Object} req.file - Novo arquivo (opcional).
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Imagem atualizada.
     * 
     * @example
     * PUT /api/produtos/imagemProduto/1
     * Body (multipart/form-data): foto: (novo arquivo), ind_principal: true
     */
    atualizarImagemProduto = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Se um novo arquivo foi enviado, sobrescreve o campo des_url_imagem
        // vindo do form-data (que chega como string em req.body).
        if (req.file) {
            req.body.des_url_imagem = req.file.path.replace(/\\/g, '/'); // normaliza path Windows/Linux
        }

        const produto = await ProdutoService.atualizarImagemProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produto
        });
    });
    // atualizarImagemProduto = asyncHandler(async (req, res) => {
    //     console.log(req.body);
    //     const { id } = req.params;
    //     const produto = await ProdutoService.atualizarImagemProduto(id, req.body, req.usuario.id);

    //     return res.status(200).json({
    //         sucesso: true,
    //         mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
    //         dados: produto
    //     });
    // });

    /**
     * Deleta (soft delete) uma imagem de produto.
     * 
     * @name deletarImagemProduto
     * @function
     * @memberof ProdutoController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros.
     * @param {number} req.params.id - ID da imagem.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Mensagem de sucesso.
     * 
     * @example
     * DELETE /api/produtos/imagemProduto/1
     */
    deletarImagemProduto = asyncHandler(async (req, res) => {

        const { id } = req.params;

        await ProdutoService.deletarImagemProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });





    /**
     * ===========================================
     * TIPOS DE SERVIÇO
     * ===========================================
     */







    /**
     * ===========================================
     * PRODUTO-SERVIÇO
     * ===========================================
     */







    /**
     * ===========================================
     * PREÇOS DE PRODUTO-SERVIÇO
     * ===========================================
     */



}

module.exports = new ProdutoController();
