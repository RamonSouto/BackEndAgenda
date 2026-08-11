const ParametrizacaoService = require('../services/ParametrizacaoService');
const { MENSAGENS, TIPO_PESSOA } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

class ParametrizacaoController {

    /**
     * Criar nova parametrizacao
     * POST /api/parametrizacao
     */
    criar = asyncHandler(async (req, res) => {
        const parametrizacao = await ParametrizacaoService.criar(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: parametrizacao
        });
    });

    /**
     * Listar Parametrização
     * GET /api/parametrizacao/
     */
    listarParametrizacao = asyncHandler(async (req, res) => {

        const parametrizacao = await ParametrizacaoService.listar(req.usuario.id)

        return res.status(200).json({
            sucesso: true,
            mensagem: parametrizacao.length,
            dados: parametrizacao
        })
    });

    /**
     * Buscar Parametrização por ID
     * GET /api/parametrizacao/:id
     */
    buscarParametrizacaoPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const pessoa = await ParametrizacaoService.buscarParametrizacaoPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });

    /**
     * Atualizar Parametrização por ID
     * GET /api/parametrizacao/:id
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const parametrizacao = await ParametrizacaoService.atualizar(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: parametrizacao
        });
    });

    /**
     * Deletar Parametrização (soft delete)
     * DELETE /api/parametrizacao/:id
     */
    deletar = asyncHandler(async (req, res) => {

        const { id } = req.params;
        await ParametrizacaoService.deletar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });
}

module.exports = new ParametrizacaoController();