// src/routes/pessoaRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/pessoaRoutes.js
 * @description Rotas para gerenciamento de pessoas.
 * Gerencia listagens por tipo (pacientes, costureiras, secretárias),
 * busca por CPF/papel, CRUD completo e operações de ativação/desativação.
 * Inclui também rotas auxiliares para cidades e estados.
 * 
 * @requires express
 * @requires ../controllers/PessoaController
 * @requires ../middlewares/authMiddleware
 * @requires ../middlewares/permissionMiddleware
 * @requires ../middlewares/errorMiddleware
 * @requires ../middlewares/rateLimitMiddleware
 */

const express = require('express');
const router = express.Router();
const PessoaController = require('../controllers/PessoaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { limiterCriacao } = require('../middlewares/rateLimitMiddleware');

router.use(authMiddleware);

/**
 * Rota para listar costureiras com disponibilidade.
 * 
 * @name GET /api/pessoas/costureiras/disponiveis
 * @function
 * @description Retorna lista de costureiras disponíveis para agendamento.
 * @access Privado – Secretárias e Administradores (secretariaOuAdminMiddleware)
 * 
 * @param {Object} req.query - Filtros opcionais (ex: data, horário).
 * 
 * @returns {Object} 200 - Lista de costureiras disponíveis.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas/costureiras/disponiveis?data=2025-10-10
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/costureiras/disponiveis',
    secretariaOuAdminMiddleware,
    PessoaController.listarCostureirasDisponiveis
);

/**
 * Rota para listar pacientes.
 * 
 * @name GET /api/pessoas/pacientes
 * @function
 * @description Retorna lista de pacientes cadastrados.
 * @access Privado – Secretárias e Administradores
 * 
 * @param {Object} req.query - Filtros (ex: nome, status).
 * 
 * @returns {Object} 200 - Lista de pacientes.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas/pacientes?ind_status=ativo
 */
router.get(
    '/pacientes',
    secretariaOuAdminMiddleware,
    PessoaController.listarPacientes
);

/**
 * Rota para listar secretárias.
 * 
 * @name GET /api/pessoas/secretarias
 * @function
 * @description Retorna lista de secretárias cadastradas.
 * @access Privado – Apenas Administradores (apenasAdminMiddleware)
 * 
 * @returns {Object} 200 - Lista de secretárias.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas/secretarias
 */
router.get(
    '/secretarias',
    apenasAdminMiddleware,
    PessoaController.listarSecretarias
);

/**
 * Rota para listar costureiras.
 * 
 * @name GET /api/pessoas/costureiras
 * @function
 * @description Retorna lista de costureiras cadastradas.
 * @access Privado – Secretárias e Administradores
 * 
 * @param {Object} req.query - Filtros (ex: ind_ativo).
 * 
 * @returns {Object} 200 - Lista de costureiras.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas/costureiras?ind_ativo=true
 */
router.get(
    '/costureiras',
    secretariaOuAdminMiddleware,
    PessoaController.listarCostureiras
);

/**
 * Rota para buscar pessoa por CPF.
 * 
 * @name GET /api/pessoas/cpf/:cpf
 * @function
 * @description Busca uma pessoa pelo número do CPF.
 * @access Privado – Secretárias e Administradores
 * 
 * @param {string} req.params.cpf - CPF (pode conter máscara ou apenas números).
 * 
 * @returns {Object} 200 - Dados da pessoa.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * GET /api/pessoas/cpf/11144477735
 */
router.get(
    '/cpf/:cpf',
    secretariaOuAdminMiddleware,
    PessoaController.buscarPorCPF
);

/**
 * Rota para listar pessoas por papel.
 * 
 * @name GET /api/pessoas/papel/:papel
 * @function
 * @description Retorna lista de pessoas com um determinado papel (ex: 'paciente', 'costureira').
 * @access Privado – Secretárias e Administradores
 * 
 * @param {string} req.params.papel - Nome do papel (ex: 'paciente').
 * 
 * @returns {Object} 200 - Lista de pessoas com o papel.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas/papel/paciente
 */
router.get(
    '/papel/:papel',
    secretariaOuAdminMiddleware,
    PessoaController.listarPorPapel
);

/**
 * Rota para criar uma nova pessoa.
 * 
 * @name POST /api/pessoas
 * @function
 * @description Cadastra uma nova pessoa (paciente, costureira, etc.).
 * @access Privado – Qualquer usuário autenticado (sem restrição de papel)
 * 
 * @param {Object} req.body - Dados da pessoa (conforme schema `pessoaSchema`).
 * 
 * @returns {Object} 201 - Pessoa criada.
 * @returns {Object} 400 - Erro de validação ou corpo vazio.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 429 - Muitas tentativas de criação.
 * 
 * @example
 * POST /api/pessoas
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "nom_completo": "João Silva", "num_cpf": "11144477735", ... }
 */
router.post(
    '/',
    limiterCriacao,
    validarBodyMiddleware,
    PessoaController.criar
);

/**
 * Rota para listar pessoas com filtros.
 * 
 * @name GET /api/pessoas
 * @function
 * @description Retorna lista de pessoas com paginação e filtros opcionais.
 * @access Privado – Secretárias e Administradores
 * 
 * @param {Object} req.query - Filtros (ex: nome, papel, status, pagina, limite).
 * 
 * @returns {Object} 200 - Lista de pessoas.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * 
 * @example
 * GET /api/pessoas?papel=medico&pagina=1&limite=10
 */
router.get(
    '/',
    secretariaOuAdminMiddleware,
    PessoaController.listar
);

















/**
 * Rota para buscar pessoa por ID.
 * 
 * @name GET /api/pessoas/:id
 * @function
 * @description Retorna dados de uma pessoa específica.
 * @access Privado – Qualquer usuário autenticado (⚠️ sem restrição adicional)
 * 
 * @param {number} req.params.id - ID da pessoa.
 * 
 * @returns {Object} 200 - Dados da pessoa.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * GET /api/pessoas/1
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    PessoaController.buscarPorId
);

/**
 * Rota para atualizar pessoa.
 * 
 * @name PUT /api/pessoas/:id
 * @function
 * @description Atualiza os dados de uma pessoa existente.
 * @access Privado – Apenas Administradores
 * 
 * @param {number} req.params.id - ID da pessoa.
 * @param {Object} req.body - Dados a serem atualizados.
 * 
 * @returns {Object} 200 - Pessoa atualizada.
 * @returns {Object} 400 - Dados inválidos ou corpo vazio.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * PUT /api/pessoas/1
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "nom_completo": "Novo Nome" }
 */
router.put(
    '/:id',
    validarIdMiddleware(),
    validarBodyMiddleware,
    apenasAdminMiddleware,
    PessoaController.atualizar
);

/**
 * Rota para deletar pessoa (soft delete).
 * 
 * @name DELETE /api/pessoas/:id
 * @function
 * @description Marca uma pessoa como deletada (soft delete).
 * @access Privado – Apenas Administradores
 * 
 * @param {number} req.params.id - ID da pessoa.
 * 
 * @returns {Object} 200 - Pessoa deletada.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * DELETE /api/pessoas/1
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    PessoaController.deletar
);

/**
 * Rota para ativar pessoa.
 * 
 * @name PATCH /api/pessoas/:id/ativar
 * @function
 * @description Ativa uma pessoa (ind_status = 'ativo').
 * @access Privado – Apenas Administradores
 * 
 * @param {number} req.params.id - ID da pessoa.
 * 
 * @returns {Object} 200 - Pessoa ativada.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * PATCH /api/pessoas/1/ativar
 */
router.patch(
    '/:id/ativar',
    validarIdMiddleware(),
    apenasAdminMiddleware,

    PessoaController.ativar
);

/**
 * Rota para desativar pessoa.
 * 
 * @name PATCH /api/pessoas/:id/desativar
 * @function
 * @description Desativa uma pessoa (ind_status = 'inativo').
 * @access Privado – Apenas Administradores
 * 
 * @param {number} req.params.id - ID da pessoa.
 * 
 * @returns {Object} 200 - Pessoa desativada.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Pessoa não encontrada.
 * 
 * @example
 * PATCH /api/pessoas/1/desativar
 */
router.patch(
    '/:id/desativar',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    PessoaController.desativar
);


module.exports = router;