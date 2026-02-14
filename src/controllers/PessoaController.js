const PessoaService = require('../services/PessoaService');
const { MENSAGENS, TIPO_PESSOA } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

class PessoaController {
    /**
     * Criar nova pessoa
     * POST /api/pessoas
     */
    criar = asyncHandler(async (req, res) => {
        const pessoa = await PessoaService.criar(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: pessoa
        });
    });

    /**
     * Buscar pessoa por ID
     * GET /api/pessoas/:id
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const pessoa = await PessoaService.buscarPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });

    /**
     * Buscar pessoa por CPF
     * GET /api/pessoas/cpf/:cpf
     */
    buscarPorCPF = asyncHandler(async (req, res) => {
        const { cpf } = req.params;
        const pessoa = await PessoaService.buscarPorCPF(cpf, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });

    /**
     * Listar pessoas com filtros
     * GET /api/pessoas
     */
    listar = asyncHandler(async (req, res) => {
        const filtros = {
            ind_tipo_pessoa: req.query.tipo,
            ind_status: req.query.status,
            busca: req.query.busca
        };

        const pessoas = await PessoaService.listar(filtros, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pessoas.length,
            dados: pessoas
        });
    });

    /**
     * Listar pessoas por tipo
     * GET /api/pessoas/tipo/:tipo
     */
    listarPorTipo = asyncHandler(async (req, res) => {
        const { tipo } = req.params;

        // Validar tipo
        const tiposValidos = Object.values(TIPO_PESSOA);
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: `Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}`
            });
        }

        const pessoas = await PessoaService.listarPorTipo(tipo, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pessoas.length,
            dados: pessoas
        });
    });

    /**
     * Atualizar pessoa
     * PUT /api/pessoas/:id
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const pessoa = await PessoaService.atualizar(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: pessoa
        });
    });

    /**
     * Deletar pessoa (soft delete)
     * DELETE /api/pessoas/:id
     */
    deletar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.deletar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });

    /**
     * Ativar pessoa
     * PATCH /api/pessoas/:id/ativar
     */
    ativar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.ativarDesativar(id, 'ativo', req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa ativada com sucesso'
        });
    });

    /**
     * Desativar pessoa
     * PATCH /api/pessoas/:id/desativar
     */
    desativar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.ativarDesativar(id, 'inativo', req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa desativada com sucesso'
        });
    });

    /**
     * Listar costureiras com disponibilidade
     * GET /api/pessoas/costureiras/disponiveis
     */
    listarCostureirasDisponiveis = asyncHandler(async (req, res) => {
        const costureiras = await PessoaService.listarCostureirasDisponiveis(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: costureiras.length,
            disponiveis: costureiras.filter(c => c.disponivel).length,
            dados: costureiras
        });
    });

    /**
     * Listar pacientes
     * GET /api/pessoas/pacientes
     */
    listarPacientes = asyncHandler(async (req, res) => {
        const pacientes = await PessoaService.listarPorTipo(TIPO_PESSOA.PACIENTE, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pacientes.length,
            dados: pacientes
        });
    });

    /**
     * Listar secretárias
     * GET /api/pessoas/secretarias
     */
    listarSecretarias = asyncHandler(async (req, res) => {
        const secretarias = await PessoaService.listarPorTipo(TIPO_PESSOA.SECRETARIA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: secretarias.length,
            dados: secretarias
        });
    });

    /**
     * Listar costureiras
     * GET /api/pessoas/costureiras
     */
    listarCostureiras = asyncHandler(async (req, res) => {
        const costureiras = await PessoaService.listarPorTipo(TIPO_PESSOA.COSTUREIRA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: costureiras.length,
            dados: costureiras
        });
    });
}

module.exports = new PessoaController();
