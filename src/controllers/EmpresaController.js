const EmpresaService = require('../services/EmpresaService');
const { MENSAGENS, TIPO_PESSOA } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const path = require('path');

class EmpresaController {

    /**
     * Criar nova Empresa
     * POST /api/empresa
     */
    criar = asyncHandler(async (req, res) => {

        const dados = { ...req.body };

        if (req.files) {
            const camposImagem = [
                'des_url_logo_vertical',
                'des_url_logo_horizontal',
                'des_url_logo_vertical_negativa',
                'des_url_logo_horizontal_negativa'
            ]

            for (const campo of camposImagem) {
                if (req.files[campo] && req.files[campo].length > 0) {
                    const file = req.files[campo][0];
                    dados[campo] = file.path;
                }
            }
        }

        const empresa = await EmpresaService.criar(dados, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: empresa
        });
    });

    /**
     * Listar Empresa
     * GET /api/empresa/
     */
    listarEmpresa = asyncHandler(async (req, res) => {

        const empresa = await EmpresaService.listar(req.usuario.id)

        return res.status(200).json({
            sucesso: true,
            mensagem: empresa.length,
            dados: empresa
        })
    });

    /**
     * Buscar Empresa por ID
     * GET /api/empresa/:id
     */
    buscarEmpresaPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const empresa = await EmpresaService.buscarEmpresaPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: empresa
        });
    });

    /**
     * Atualizar Empresa por ID
     * GET /api/empresa/:id
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const empresa = await EmpresaService.atualizar(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: empresa
        });
    });

    /**
     * Deletar Empresa (soft delete)
     * DELETE /api/empresa/:id
     */
    deletar = asyncHandler(async (req, res) => {

        const { id } = req.params;
        await EmpresaService.deletar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });
}

module.exports = new EmpresaController();