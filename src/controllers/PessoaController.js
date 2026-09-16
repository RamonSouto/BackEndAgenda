// /src/controllers/PessoaController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/PessoaController.js
 * @description Controlador de operações de pessoas.
 * Gerencia criação, listagem, busca (por ID, CPF, papel), atualização,
 * exclusão (soft delete), ativação/desativação, além de consultas auxiliares
 * de cidades e estados.
 * 
 * @requires ../services/PessoaService
 * @requires ../utils/constants
 * @requires ../middlewares/errorMiddleware
 */
const PessoaService = require('../services/PessoaService');
const { MENSAGENS, PAPEIS_PESSOA } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * Classe PessoaController.
 * @class PessoaController
 */
class PessoaController {
    /**
     * Cria uma nova pessoa.
     * 
     * @name criar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.body - Dados da pessoa (conforme schema `pessoaSchema`).
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com a pessoa criada.
     * 
     * @throws {Error} - Repassa erros para o middleware de erros via asyncHandler.
     * 
     * @example
     * POST /api/pessoas
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "nom_completo": "João Silva", "num_cpf": "11144477735", ... }
     * // Resposta 201:
     * { "sucesso": true, "mensagem": "Registro criado com sucesso", "dados": { ... } }
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
     * Busca uma pessoa por ID.
     * 
     * @name buscarPorId
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da pessoa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com os dados da pessoa.
     * 
     * @throws {Error} - Se a pessoa não for encontrada ou não houver permissão.
     * 
     * @example
     * GET /api/pessoas/1
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "dados": { "id": 1, "nom_completo": "João Silva", ... } }
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
     * Busca uma pessoa por CPF.
     * 
     * @name buscarPorCPF
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {string} req.params.cpf - CPF da pessoa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com os dados da pessoa.
     * 
     * @throws {Error} - Se a pessoa não for encontrada ou não houver permissão.
     * 
     * @example
     * GET /api/pessoas/cpf/11144477735
     * Headers: { "Authorization": "Bearer ..." }
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
     * Lista pessoas com filtros opcionais.
     * 
     * @name listar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.query - Filtros (papel, status, busca).
     * @param {string} [req.query.papel] - Papel da pessoa.
     * @param {string} [req.query.status] - Status (ativo/inativo).
     * @param {string} [req.query.busca] - Texto para busca em nome/CPF.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de pessoas.
     * 
     * @example
     * GET /api/pessoas?papel=medico&status=ativo
     */
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

    /**
     * Lista pessoas por papel.
     * 
     * @name listarPorPapel
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {string} req.params.papel - Papel (ex: 'paciente', 'costureira').
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de pessoas com o papel.
     * 
     * @throws {Error} - Se o papel for inválido.
     * 
     * @example
     * GET /api/pessoas/papel/paciente
     */
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

    /**
     * Atualiza uma pessoa existente.
     * 
     * @name atualizar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da pessoa.
     * @param {Object} req.body - Dados a serem atualizados.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia a pessoa atualizada.
     * 
     * @throws {Error} - Se a pessoa não for encontrada ou sem permissão.
     * 
     * @example
     * PUT /api/pessoas/1
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "nom_completo": "Novo Nome" }
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
     * Deleta uma pessoa (soft delete).
     * 
     * @name deletar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da pessoa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @throws {Error} - Se a pessoa não for encontrada ou sem permissão.
     * 
     * @example
     * DELETE /api/pessoas/1
     * Headers: { "Authorization": "Bearer ..." }
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
     * Ativa uma pessoa (ind_status = 'ativo').
     * 
     * @name ativar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da pessoa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @example
     * PATCH /api/pessoas/1/ativar
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
     * Desativa uma pessoa (ind_status = 'inativo').
     * 
     * @name desativar
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da pessoa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @example
     * PATCH /api/pessoas/1/desativar
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
     * Lista costureiras com disponibilidade.
     * 
     * @name listarCostureirasDisponiveis
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de costureiras com flag `disponivel`.
     * 
     * @example
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
     * Lista pacientes.
     * 
     * @name listarPacientes
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de pacientes.
     * 
     * @example
     * GET /api/pessoas/pacientes
     */
    listarPacientes = asyncHandler(async (req, res) => {
        const pacientes = await PessoaService.listarPorPapel(PAPEIS_PESSOA.PACIENTE, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: pacientes.length,
            dados: pacientes
        });
    });

    /**
     * Lista secretárias.
     * 
     * @name listarSecretarias
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de secretárias.
     * 
     * @example
     * GET /api/pessoas/secretarias
     */
    listarSecretarias = asyncHandler(async (req, res) => {
        const secretarias = await PessoaService.listarPorPapel(PAPEIS_PESSOA.SECRETARIA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: secretarias.length,
            dados: secretarias
        });
    });

    /**
     * Lista costureiras.
     * 
     * @name listarCostureiras
     * @function
     * @memberof PessoaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta.
     * 
     * @returns {Promise<void>} - Envia lista de costureiras.
     * 
     * @example
     * GET /api/pessoas/costureiras
     */
    listarCostureiras = asyncHandler(async (req, res) => {
        const costureiras = await PessoaService.listarPorPapel(PAPEIS_PESSOA.COSTUREIRA, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            total: costureiras.length,
            dados: costureiras
        });
    });








}

module.exports = new PessoaController();
