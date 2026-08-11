const PessoaService = require('../services/PessoaService');
const { MENSAGENS, PAPEIS_PESSOA } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

class PessoaController {
    criar = asyncHandler(async (req, res) => {
        const pessoa = await PessoaService.criar(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: pessoa
        });
    });

    buscarPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const pessoa = await PessoaService.buscarPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });

    buscarPorCPF = asyncHandler(async (req, res) => {
        const { cpf } = req.params;
        const pessoa = await PessoaService.buscarPorCPF(cpf, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: pessoa
        });
    });

    listar = asyncHandler(async (req, res) => {
        const filtros = {
            papel: req.query.papel,
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

    listarPorPapel = asyncHandler(async (req, res) => {
        const { papel } = req.params;

        const papeisValidos = Object.values(PAPEIS_PESSOA);
        if (!papeisValidos.includes(papel)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: `Papel inválido. Papéis válidos: ${papeisValidos.join(', ')}`
            });
        }

        const pessoas = await PessoaService.listarPorPapel(papel, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pessoas.length,
            dados: pessoas
        });
    });

    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const pessoa = await PessoaService.atualizar(id, req.body, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: pessoa
        });
    });

    deletar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.deletar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });

    ativar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.ativarDesativar(id, 'ativo', req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa ativada com sucesso'
        });
    });

    desativar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await PessoaService.ativarDesativar(id, 'inativo', req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pessoa desativada com sucesso'
        });
    });

    listarCostureirasDisponiveis = asyncHandler(async (req, res) => {
        const costureiras = await PessoaService.listarCostureirasDisponiveis(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: costureiras.length,
            disponiveis: costureiras.filter(c => c.disponivel).length,
            dados: costureiras
        });
    });

    listarPacientes = asyncHandler(async (req, res) => {
        const pacientes = await PessoaService.listarPorPapel(PAPEIS_PESSOA.PACIENTE, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pacientes.length,
            dados: pacientes
        });
    });

    listarSecretarias = asyncHandler(async (req, res) => {
        const secretarias = await PessoaService.listarPorPapel(PAPEIS_PESSOA.SECRETARIA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: secretarias.length,
            dados: secretarias
        });
    });

    listarCostureiras = asyncHandler(async (req, res) => {
        const costureiras = await PessoaService.listarPorPapel(PAPEIS_PESSOA.COSTUREIRA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: costureiras.length,
            dados: costureiras
        });
    });

    listarCidades = asyncHandler(async (req, res) => {
        const cidades = await PessoaService.listarCidades(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            cidades: cidades.length,
            dados: cidades
        });
    });

    buscarCidadeId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const cidade = await PessoaService.buscarCidadeId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: cidade
        });
    });

    buscarCidadeNome = asyncHandler(async (req, res) => {
        const { nome } = req.params;
        const cidades = await PessoaService.buscarCidadeNome(nome, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: cidades
        });
    });

    buscarCidadeEstadoId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const cidades = await PessoaService.buscarCidadeEstadoId(id, req);

        return res.status(200).json({
            sucesso: true,
            dados: cidades
        });
    });

    listarEstados = asyncHandler(async (req, res) => {
        const estados = await PessoaService.listarEstados(req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            estados: estados.length,
            dados: estados
        });
    });

    buscarEstadoId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const estado = await PessoaService.buscarEstadoId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: estado
        });
    });

    buscarEstadoNome = asyncHandler(async (req, res) => {
        const { nome } = req.params;
        const estados = await PessoaService.buscarEstadoNome(nome, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: estados
        });
    });

    buscarEstadoSgl = asyncHandler(async (req, res) => {
        const { sgl } = req.params;
        const estados = await PessoaService.buscarEstadoSgl(sgl, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            dados: estados
        });
    });
}

module.exports = new PessoaController();
