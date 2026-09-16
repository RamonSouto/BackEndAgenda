// /src/controllers/sistema/EmpresaController.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/controllers/sistema/EmpresaController.js
 * @description Controlador de operações de empresas.
 * Gerencia criação, listagem, busca, atualização e exclusão (soft delete)
 * de empresas, com suporte a upload de logos.
 * 
 * @requires ../../services/sistema/EmpresaService
 * @requires ../../utils/constants
 * @requires ../../middlewares/errorMiddleware
 * @requires path
 */
const EmpresaService = require('../../services/sistema/EmpresaService');
const { MENSAGENS, TIPO_PESSOA } = require('../../utils/constants');
const { asyncHandler } = require('../../middlewares/errorMiddleware');
const path = require('path');

/**
 * Classe EmpresaController.
 * @class EmpresaController
 */
class EmpresaController {

    /**
     * Cria uma nova empresa.
     * 
     * @name criar
     * @function
     * @memberof EmpresaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.body - Dados da empresa.
     * @param {Object} req.files - Arquivos enviados (logos).
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com a empresa criada.
     * 
     * @throws {Error} - Repassa erros para o middleware de erros via asyncHandler.
     * 
     * @description
     * - Processa os campos de imagem (logos) e substitui os paths no corpo da requisição.
     * - Chama `EmpresaService.criar` para persistir os dados.
     * - Retorna status 201 (Criado) em caso de sucesso.
     * 
     * @example
     * POST /api/sistema/empresa
     * Body (multipart/form-data):
     *   - nom_fantasia: "Minha Empresa"
     *   - num_cnpj: "11444777000161"
     *   - des_url_logo_vertical: (arquivo)
     * // Resposta 201:
     * { "sucesso": true, "mensagem": "Registro criado com sucesso", "dados": { ... } }
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
     * Lista todas as empresas.
     * 
     * @name listarEmpresa
     * @function
     * @memberof EmpresaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com a lista de empresas.
     * 
     * @description
     * - Chama `EmpresaService.listar` para obter todas as empresas.
     * - ⚠️ **BUG:** A mensagem de resposta retorna o número de empresas (`empresa.length`) em vez de uma string.
     * - ⚠️ **BUG:** Não há suporte a paginação ou filtros.
     * 
     * @example
     * GET /api/sistema/empresa
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": 5, "dados": [...] }
     */
    listarEmpresa = asyncHandler(async (req, res) => {

        const empresas = await EmpresaService.listar(req.usuario.id)

        return res.status(200).json({
            sucesso: true,
            mensagem: empresas.length,
            dados: empresas
        })


    });

    /**
    * Busca uma empresa por ID.
    * 
    * @name buscarEmpresaPorId
    * @function
    * @memberof EmpresaController
    * @async
    * 
    * @param {Object} req - Objeto de requisição do Express.
    * @param {Object} req.params - Parâmetros da rota.
    * @param {number|string} req.params.id - ID da empresa.
    * @param {Object} req.usuario - Usuário autenticado.
    * @param {number} req.usuario.id - ID do usuário.
    * @param {Object} res - Objeto de resposta do Express.
    * 
    * @returns {Promise<void>} - Envia resposta JSON com os dados da empresa.
    * 
    * @throws {Error} - Se a empresa não for encontrada ou não houver permissão.
    * 
    * @example
    * GET /api/sistema/empresa/1
    * Headers: { "Authorization": "Bearer ..." }
    * // Resposta 200:
    * { "sucesso": true, "dados": { "id": 1, "nom_fantasia": "Minha Empresa", ... } }
    */
    buscarEmpresaPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const empresa = await EmpresaService.buscarEmpresaPorId(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: empresa.length,
            dados: empresa
        });
    });

    /**
     * Atualiza uma empresa existente.
     * 
     * @name atualizar
     * @function
     * @memberof EmpresaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da empresa.
     * @param {Object} req.body - Dados a serem atualizados.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia resposta JSON com os dados atualizados.
     * 
     * @throws {Error} - Se a empresa não for encontrada, dados inválidos ou sem permissão.
     * 
     * @description
     * - ⚠️ **BUG:** O corpo da requisição não é validado antes de ser passado ao serviço.
     * - ⚠️ **BUG:** A rota não suporta upload de novos arquivos durante a atualização.
     * 
     * @example
     * PUT /api/sistema/empresa/1
     * Headers: { "Authorization": "Bearer ..." }
     * Body: { "nom_fantasia": "Nova Fantasia", "ind_ativo": true }
     * // Resposta 200:
     * { "sucesso": true, "dados": { ... } }
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
     * Deleta uma empresa (soft delete).
     * 
     * @name deletar
     * @function
     * @memberof EmpresaController
     * @async
     * 
     * @param {Object} req - Objeto de requisição do Express.
     * @param {Object} req.params - Parâmetros da rota.
     * @param {number|string} req.params.id - ID da empresa.
     * @param {Object} req.usuario - Usuário autenticado.
     * @param {number} req.usuario.id - ID do usuário.
     * @param {Object} res - Objeto de resposta do Express.
     * 
     * @returns {Promise<void>} - Envia mensagem de sucesso.
     * 
     * @throws {Error} - Se a empresa não for encontrada ou sem permissão.
     * 
     * @description
     * - Realiza soft delete (marca `ind_ativo = false`).
     * - A exclusão física não é realizada.
     * 
     * @example
     * DELETE /api/sistema/empresa/1
     * Headers: { "Authorization": "Bearer ..." }
     * // Resposta 200:
     * { "sucesso": true, "mensagem": "Registro deletado com sucesso" }
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