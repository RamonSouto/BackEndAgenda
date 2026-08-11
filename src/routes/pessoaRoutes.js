const express = require('express');
const router = express.Router();
const PessoaController = require('../controllers/PessoaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { apenasAdminMiddleware, secretariaOuAdminMiddleware } = require('../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../middlewares/errorMiddleware');
const { limiterCriacao } = require('../middlewares/rateLimitMiddleware');

router.use(authMiddleware);

/**
 * @route   GET /api/pessoas/costureiras/disponiveis
 * @desc    Listar costureiras com disponibilidade
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/costureiras/disponiveis',
    secretariaOuAdminMiddleware,
    PessoaController.listarCostureirasDisponiveis
);

/**
 * @route   GET /api/pessoas/pacientes
 * @desc    Listar pacientes
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/pacientes',
    secretariaOuAdminMiddleware,
    PessoaController.listarPacientes
);

/**
 * @route   GET /api/pessoas/secretarias
 * @desc    Listar secretárias
 * @access  Privado - Admin
 */
router.get(
    '/secretarias',
    apenasAdminMiddleware,
    PessoaController.listarSecretarias
);

/**
 * @route   GET /api/pessoas/costureiras
 * @desc    Listar costureiras
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/costureiras',
    secretariaOuAdminMiddleware,
    PessoaController.listarCostureiras
);

/**
 * @route   GET /api/pessoas/cpf/:cpf
 * @desc    Buscar pessoa por CPF
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/cpf/:cpf',
    secretariaOuAdminMiddleware,
    PessoaController.buscarPorCPF
);

/**
 * @route   GET /api/pessoas/papel/:papel
 * @desc    Listar pessoas por papel
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/papel/:papel',
    secretariaOuAdminMiddleware,
    PessoaController.listarPorPapel
);

/**
 * @route   POST /api/pessoas
 * @desc    Criar nova pessoa
 * @access  Privado - Secretária (pacientes), Admin (todos)
 */
router.post(
    '/',
    limiterCriacao,
    validarBodyMiddleware,
    PessoaController.criar
);

/**
 * @route   GET /api/pessoas
 * @desc    Listar pessoas com filtros
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/',
    secretariaOuAdminMiddleware,
    PessoaController.listar
);

/** Cidades e Estados */
/**
 * @route   GET /api/pessoas/cidades
 * @desc    Listar cidades
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/cidades',
    PessoaController.listarCidades
);

/**
 * @route   GET /api/pessoas/cidade/id
 * @desc    Buscar cidade por ID
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/cidade/:id',
    PessoaController.buscarCidadeId
);

/**
 * @route   GET /api/pessoas/cidades/nome
 * @desc    Buscar cidade por nome
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/cidades/nome/:nome',
    PessoaController.buscarCidadeNome
);

/**
 * @route   GET /api/pessoas/cidades/estado/:id
 * @desc    Buscar cidade por ID estado
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/cidades/estado/:id',
    PessoaController.buscarCidadeEstadoId
);

/**
 * @route   GET /api/pessoas/estados
 * @desc    Listar estados
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/estados',
    PessoaController.listarEstados
);

/**
 * @route   GET /api/pessoas/estado/id/:id
 * @desc    Buscar estado
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/estado/id/:id',
    PessoaController.buscarEstadoId
);

/**
 * @route   GET /api/pessoas/estado/nome/:nome
 * @desc    Buscar estado por nome
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/estado/nome/:nome',
    PessoaController.buscarEstadoNome
);

/**
 * @route   GET /api/pessoas/estado/sgl/:sgl
 * @desc    Buscar estado por sigla
 * @access  Privado - Secretária, Admin
 */
router.get(
    '/estado/sgl/:sgl',
    PessoaController.buscarEstadoSgl
);





/**
 * @route   GET /api/pessoas/:id
 * @desc    Buscar pessoa por ID
 * @access  Privado
 */
router.get(
    '/:id',
    validarIdMiddleware(),
    PessoaController.buscarPorId
);

/**
 * @route   PUT /api/pessoas/:id
 * @desc    Atualizar pessoa
 * @access  Privado - Admin
 */
router.put(
    '/:id',
    validarIdMiddleware(),
    validarBodyMiddleware,
    apenasAdminMiddleware,
    PessoaController.atualizar
);

/**
 * @route   DELETE /api/pessoas/:id
 * @desc    Deletar pessoa (soft delete)
 * @access  Privado - Admin
 */
router.delete(
    '/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    PessoaController.deletar
);

/**
 * @route   PATCH /api/pessoas/:id/ativar
 * @desc    Ativar pessoa
 * @access  Privado - Admin
 */
router.patch(
    '/:id/ativar',
    validarIdMiddleware(),
    apenasAdminMiddleware,

    PessoaController.ativar
);

/**
 * @route   PATCH /api/pessoas/:id/desativar
 * @desc    Desativar pessoa
 * @access  Privado - Admin
 */
router.patch(
    '/:id/desativar',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    PessoaController.desativar
);

module.exports = router;
