// src/routes/sistema/empresaRoutes.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/sistema/empresaRoutes.js
 * @description Rotas para gerenciamento de empresas.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de empresas, com acesso restrito a administradores.
 * 
 * @requires express
 * @requires ../middlewares/authMiddleware
 * @requires ../middlewares/permissionMiddleware
 * @requires ../middlewares/errorMiddleware
 * @requires ../middlewares/rateLimitMiddleware
 * @requires ../controllers/EmpresaController
 * @requires ../utils/constants
 * @requires ../middlewares/uploadMiddleware
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const { apenasAdminMiddleware, papelMiddleware } = require('../../middlewares/permissionMiddleware');
const { validarIdMiddleware, validarBodyMiddleware } = require('../../middlewares/errorMiddleware');
const { limiterCriacao } = require('../../middlewares/rateLimitMiddleware');
const EmpresaController = require('../../controllers/sistema/EmpresaController');
const { PAPEIS_PESSOA } = require('../../utils/constants');
const { uploadFields } = require('../../middlewares/uploadMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * Rota para criar uma nova empresa.
 * 
 * @name POST /api/sistema/empresa
 * @function
 * @description Cria uma nova empresa com os dados fornecidos e upload opcional de logos.
 * @access Privado – Apenas administradores (apenasAdminMiddleware)
 * 
 * @param {Object} req.body - Dados da empresa (conforme schema `empresaSchema`).
 * @param {Array} req.files - Arquivos de logo (campos: des_url_logo_vertical, des_url_logo_horizontal, etc.).
 * 
 * @returns {Object} 201 - Empresa criada com sucesso.
 * @returns {Object} 400 - Erro de validação ou upload.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 429 - Muitas tentativas de criação (rate limit).
 * 
 * @example
 * POST /api/sistema/empresa
 * Headers: { "Authorization": "Bearer ..." }
 * Body (multipart/form-data):
 *   - nom_fantasia: "Minha Empresa"
 *   - num_cnpj: "11444777000161"
 *   - des_url_logo_vertical: (arquivo)
 *   - ...
 */
router.post(
    '/empresa',
    limiterCriacao,
    // validarBodyMiddleware,
    apenasAdminMiddleware,
    uploadFields([
        { name: 'des_url_logo_vertical', maxCount: 1 },
        { name: 'des_url_logo_horizontal', maxCount: 1 },
        { name: 'des_url_logo_vertical_negativa', maxCount: 1 },
        { name: 'des_url_logo_horizontal_negativa', maxCount: 1 }
    ], 'empresa'),
    EmpresaController.criar
);

/**
 * Rota para listar todas as empresas.
 * 
 * @name GET /api/sistema/empresa
 * @function
 * @description Retorna a lista de empresas cadastradas.
 * @access Privado – Apenas administradores
 * 
 * @param {Object} req.query - Filtros opcionais (ex: ind_ativo, busca).
 * 
 * @returns {Object} 200 - Lista de empresas.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * 
 * @example
 * GET /api/empresa?ind_ativo=true
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/empresa',
    apenasAdminMiddleware,
    EmpresaController.listarEmpresa
);

/**
 * Rota para buscar uma empresa por ID.
 * 
 * @name GET /api/sistema/empresa/:id
 * @function
 * @description Retorna os dados de uma empresa específica.
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da empresa (validado por `validarIdMiddleware`).
 * 
 * @returns {Object} 200 - Dados da empresa.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Empresa não encontrada.
 * 
 * @example
 * GET /api/sistema/empresa/1
 * Headers: { "Authorization": "Bearer ..." }
 */
router.get(
    '/empresa/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.buscarEmpresaPorId
);

/**
 * Rota para atualizar uma empresa.
 * 
 * @name PUT /api/sistema/empresa/:id
 * @function
 * @description Atualiza os dados de uma empresa existente.
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da empresa.
 * @param {Object} req.body - Dados a serem atualizados.
 * 
 * @returns {Object} 200 - Empresa atualizada.
 * @returns {Object} 400 - Dados inválidos.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Empresa não encontrada.
 * 
 * @example
 * PUT /api/sistema/empresa/1
 * Headers: { "Authorization": "Bearer ..." }
 * Body: { "nom_fantasia": "Nova Fantasia" }
 */
router.put(
    '/empresa/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.atualizar
);

/**
 * Rota para deletar uma empresa (soft delete).
 * 
 * @name DELETE /api/sistema/empresa/:id
 * @function
 * @description Marca uma empresa como inativa (soft delete).
 * @access Privado – Apenas administradores
 * 
 * @param {number} req.params.id - ID da empresa.
 * 
 * @returns {Object} 200 - Empresa deletada com sucesso.
 * @returns {Object} 400 - ID inválido.
 * @returns {Object} 401 - Token inválido ou ausente.
 * @returns {Object} 403 - Usuário não é administrador.
 * @returns {Object} 404 - Empresa não encontrada.
 * 
 * @example
 * DELETE /api/sistema/empresa/1
 * Headers: { "Authorization": "Bearer ..." }
 */
router.delete(
    '/empresa/:id',
    validarIdMiddleware(),
    apenasAdminMiddleware,
    EmpresaController.deletar
);

module.exports = router;