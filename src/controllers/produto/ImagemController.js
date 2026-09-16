// /src/controllers/produto/ImagemController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/produto/ImagemController.js
 * @description Controlador de operações relacionadas a categorias,
 * 
 * @requires ../../services/produto/ImagemService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 */

const ImagemService = require('../../services/produto/ImagemService');
const { MENSAGENS } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');

/**
 * Classe ImagemController.
 * @class ImagemController
 */
class ImagemController {
    /**
     * Adiciona uma imagem a um produto ou grade.
     * 
     * @name adicionarImagemProduto
     * @function
     * @memberof ImagemController
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

        const produtoId = await ImagemService.adicionarImagemProduto(req.body, req.usuario.id);

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
     * @memberof ImagemController
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

        const produtos = await ImagemService.listarImagemProdutos(req.usuario.id);

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
     * @memberof ImagemController
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

        const produto = await ImagemService.buscarImagemProdutoID(id, req.usuario.id);

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
     * @memberof ImagemController
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

        const produto = await ImagemService.buscarImagemProdutoGradeID(id, req.usuario.id);

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
     * @memberof ImagemController
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

        const produto = await ImagemService.atualizarImagemProduto(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: produto
        });
    });


    /**
     * Deleta (soft delete) uma imagem de produto.
     * 
     * @name deletarImagemProduto
     * @function
     * @memberof ImagemController
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

        await ImagemService.deletarImagemProduto(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO,
        });
    });
}

module.exports = new ImagemController();