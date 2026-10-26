// src/routes/agendamento/fotoProdutoAgendamentoRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/agendamento/fotoProdutoAgendamentoRoutes.js
 * @description Rotas privadas das fotos de ajuste dos itens agendados.
 * DEVE ser montado ANTES de agendamentoProdutoRoutes em routes/index.js,
 * pois '/:idAgendamento/:idAgendadoProduto' capturaria '/fotos/:id'.
 *
 * @requires express
 * @requires ../../controllers/agendamento/FotoProdutoAgendamentoController
 * @requires ../../middlewares/authMiddleware
 * @requires ../../middlewares/permissionMiddleware
 * @requires ../../middlewares/errorMiddleware
 * @requires ../../middlewares/rateLimitMiddleware
 * @requires ../../middlewares/uploadMiddleware
 * @requires ../../utils/constants
 */
const router = require('express').Router();
const FotoController = require('../../controllers/agendamento/FotoProdutoAgendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { costureiraAdminSecretariaMiddleware, secretariaOuAdminMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterUpload } = require('../../middlewares/rateLimitMiddleware');
const { uploadMultiple } = require('../../middlewares/uploadMiddleware');
const { LIMITES_FOTO } = require('../../utils/constants');

router.use(authMiddleware);

/**
 * @route POST /api/agendamentos/:idAgendamento/itens/:idItem/fotos
 * @method POST
 * @description Anexa até 10 fotos (um tipo por requisição) a um item agendado.
 * @access Privado – Costureira (somente agendamentos dela), Secretária e Administrador
 * @param {number} req.params.idAgendamento - ID do agendamento.
 * @param {number} req.params.idItem - ID do item agendado.
 * @param {File[]} req.files - Arquivos (campo 'fotos').
 * @param {string} req.body.ind_tipo_foto - 'antes' | 'depois'.
 * @returns {Object} 201 - IDs das fotos criadas.
 * @returns {Object} 400 - Arquivo inválido, ausente ou tipo de foto inválido.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado ou agendamento de outra costureira.
 * @returns {Object} 404 - Item não pertence ao agendamento.
 * @returns {Object} 422 - Agendamento/item cancelado ou limite por item excedido.
 * @returns {Object} 429 - Muitos uploads.
 *
 * @example
 * POST /api/agendamentos/1/itens/3/fotos
 * Body (multipart/form-data): fotos: (arquivos), ind_tipo_foto: antes
 */
router.post(
    '/:idAgendamento/itens/:idItem/fotos',
    validarIdMiddleware('idAgendamento'),
    validarIdMiddleware('idItem'),
    costureiraAdminSecretariaMiddleware,
    limiterUpload,
    FotoController.validarAcessoUpload,
    uploadMultiple('fotos', LIMITES_FOTO.MAX_POR_REQUISICAO, 'ajustes'),
    FotoController.adicionar
);

/**
 * @route GET /api/agendamentos/:idAgendamento/itens/:idItem/fotos
 * @method GET
 * @description Lista as fotos de um item agendado.
 * @access Privado – Costureira (somente agendamentos dela), Secretária e Administrador
 * @returns {Object} 200 - Lista de fotos.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Item não encontrado.
 *
 * @example
 * GET /api/agendamentos/1/itens/3/fotos
 */
router.get(
    '/:idAgendamento/itens/:idItem/fotos',
    validarIdMiddleware('idAgendamento'),
    validarIdMiddleware('idItem'),
    costureiraAdminSecretariaMiddleware,
    FotoController.listarPorItem
);

/**
 * @route GET /api/agendamentos/fotos/:id/arquivo
 * @method GET
 * @description Entrega o binário da foto (autenticado, sem cache – dado de saúde/LGPD).
 * @access Privado – Costureira (somente agendamentos dela), Secretária e Administrador
 * @returns {Object} 200 - Imagem.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Foto/arquivo não encontrado.
 *
 * @example
 * GET /api/agendamentos/fotos/10/arquivo
 */
router.get(
    '/fotos/:id/arquivo',
    validarIdMiddleware('id'),
    costureiraAdminSecretariaMiddleware,
    FotoController.baixarArquivo
);

/**
 * @route GET /api/agendamentos/fotos/:id
 * @method GET
 * @description Busca os metadados de uma foto.
 * @access Privado – Costureira (somente agendamentos dela), Secretária e Administrador
 * @returns {Object} 200 - Dados da foto.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Foto não encontrada.
 *
 * @example
 * GET /api/agendamentos/fotos/10
 */
router.get(
    '/fotos/:id',
    validarIdMiddleware('id'),
    costureiraAdminSecretariaMiddleware,
    FotoController.buscarPorId
);

/**
 * @route DELETE /api/agendamentos/fotos/:id
 * @method DELETE
 * @description Soft delete da foto; o arquivo é movido para uploads/deletados.
 * @access Privado – Secretária e Administrador
 * @returns {Object} 200 - Foto removida.
 * @returns {Object} 401 - Token inválido/ausente.
 * @returns {Object} 403 - Papel não autorizado.
 * @returns {Object} 404 - Foto não encontrada.
 * @returns {Object} 422 - Agendamento/item cancelado.
 *
 * @example
 * DELETE /api/agendamentos/fotos/10
 */
router.delete(
    '/fotos/:id',
    validarIdMiddleware('id'),
    secretariaOuAdminMiddleware,
    FotoController.deletar
);

module.exports = router;
