// src/middlewares/uploadMiddleware.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module uploadMiddleware
 * @description Middlewares para upload de arquivos utilizando Multer.
 * Fornece funções para upload único, opcional, múltiplo e por campos específicos.
 * Integra-se com `UploadService` para validação, armazenamento e exclusão.
 * 
 * @requires multer
 * @requires ../services/UploadService
 * @requires ../utils/constants
 */
const multer = require('multer');
const UploadService = require('../services/UploadService');
const { MENSAGENS } = require('../utils/constants');

// Configurar multer com as configurações do UploadService
const upload = multer(UploadService.getMulterConfig());

/**
 * Middleware para upload de um único arquivo (obrigatório).
 * 
 * @function uploadSingle
 * @param {string} [fieldName='foto'] - Nome do campo do formulário que contém o arquivo.
 * @param {string} [subpasta='ajuste'] - Subdiretório dentro da pasta de uploads.
 * @returns {Function} Middleware do Express para processar o upload.
 * 
 * @description
 * - Define `req.uploadSubDir` para uso no `UploadService`.
 * - Processa o arquivo com `upload.single()`.
 * - Em caso de erro do Multer (ex: tamanho excedido), retorna 400 com mensagem adequada.
 * - Se nenhum arquivo for enviado, retorna 400.
 * - Valida o arquivo com `UploadService.validarArquivo()`.
 * - Se a validação falhar, deleta o arquivo enviado e retorna 400.
 * - Se tudo OK, chama `next()`.
 * 
 * @example
 * // Em uma rota POST /upload/foto
 * app.post('/upload/foto', uploadSingle('foto', 'perfil'), (req, res) => {
 *   // req.file contém os dados do arquivo
 *   res.json({ arquivo: req.file });
 * });
 * 
 * @throws {Error} Lança erro 400 se arquivo for inválido ou não enviado.
 */
const uploadSingle = (fieldName = 'foto', subpasta = 'ajuste') => {
    return (req, res, next) => {

        req.uploadSubDir = subpasta;

        const uploadHandler = upload.single(fieldName);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Erro do Multer
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'Arquivo muito grande',
                        erro: `Tamanho máximo permitido: ${UploadService.formatarTamanhoArquivo(UploadService.maxFileSize)}`
                    });
                }

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            } else if (err) {
                // Outros erros
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            }

            // Validar arquivo
            if (!req.file) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Nenhum arquivo foi enviado'
                });
            }

            try {
                UploadService.validarArquivo(req.file);
                next();
            } catch (error) {
                // Deletar arquivo inválido
                UploadService.deletarArquivo(req.file.path).catch(console.error);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Arquivo inválido',
                    erro: error.message
                });
            }
        });
    };
};


/**
 * Middleware para upload de um único arquivo (opcional).
 * 
 * @function uploadSingleOptional
 * @param {string} [fieldName='foto'] - Nome do campo do formulário.
 * @param {string} [subpasta='ajuste'] - Subdiretório dentro da pasta de uploads.
 * @returns {Function} Middleware do Express.
 * 
 * @description
 * Similar ao `uploadSingle`, mas **não** exige que o arquivo seja enviado.
 * Se nenhum arquivo for enviado, simplesmente chama `next()` sem validar.
 * Útil para endpoints de atualização onde o arquivo pode ser opcional.
 * 
 * @example
 * // Atualização de perfil: foto pode ou não ser enviada
 * app.put('/perfil', uploadSingleOptional('foto', 'perfil'), (req, res) => {
 *   // Se req.file existir, foi enviado; caso contrário, não.
 *   // req.uploadSubDir está disponível.
 * });
 */
const uploadSingleOptional = (fieldName = 'foto', subpasta = 'ajuste') => {
    return (req, res, next) => {

        req.uploadSubDir = subpasta;

        const uploadHandler = upload.single(fieldName);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'Arquivo muito grande',
                        erro: `Tamanho máximo permitido: ${UploadService.formatarTamanhoArquivo(UploadService.maxFileSize)}`
                    });
                }

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            }

            // Diferente do uploadSingle: NÃO falha se req.file não existir.
            // Isso permite atualizar apenas os campos de texto (ex: num_ordem, ind_principal)
            if (!req.file) {
                return next();
            }

            try {
                UploadService.validarArquivo(req.file);
                next();
            } catch (error) {
                UploadService.deletarArquivo(req.file.path).catch(console.error);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Arquivo inválido',
                    erro: error.message
                });
            }
        });
    };
};

/**
 * Middleware para upload de múltiplos arquivos com o mesmo campo.
 * 
 * @function uploadMultiple
 * @param {string} [fieldName='fotos'] - Nome do campo do formulário.
 * @param {number} [maxCount=10] - Número máximo de arquivos permitidos.
 * @returns {Function} Middleware do Express.
 * 
 * @description
 * - Utiliza `upload.array(fieldName, maxCount)`.
 * - Verifica se pelo menos um arquivo foi enviado.
 * - Valida cada arquivo individualmente com `UploadService.validarArquivo()`.
 * - Se algum arquivo for inválido, deleta **todos** os arquivos enviados e retorna 400.
 * - Se o número de arquivos exceder `maxCount`, retorna 400 com mensagem específica.
 * 
 * @example
 * // Upload de até 5 fotos para um produto
 * app.post('/produtos/:id/fotos', uploadMultiple('fotos', 5), (req, res) => {
 *   // req.files é um array de objetos de arquivo
 * });
 */
const uploadMultiple = (fieldName = 'fotos', maxCount = 10) => {
    return (req, res, next) => {
        const uploadHandler = upload.array(fieldName, maxCount);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'Um ou mais arquivos são muito grandes',
                        erro: `Tamanho máximo permitido: ${UploadService.formatarTamanhoArquivo(UploadService.maxFileSize)}`
                    });
                }

                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'Muitos arquivos',
                        erro: `Número máximo de arquivos: ${maxCount}`
                    });
                }

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Nenhum arquivo foi enviado'
                });
            }

            // Validar todos os arquivos
            try {
                for (const file of req.files) {
                    UploadService.validarArquivo(file);
                }
                next();
            } catch (error) {
                // Deletar todos os arquivos se algum for inválido
                Promise.all(
                    req.files.map(file => UploadService.deletarArquivo(file.path))
                ).catch(console.error);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Um ou mais arquivos são inválidos',
                    erro: error.message
                });
            }
        });
    };
};


/**
 * Middleware para upload de múltiplos campos específicos (cada campo pode ter vários arquivos).
 * 
 * @function uploadFields
 * @param {Array<{name: string, maxCount: number}>} fields - Definição dos campos.
 * @param {string} [subpasta='empresa'] - Subdiretório dentro da pasta de uploads.
 * @returns {Function} Middleware do Express.
 * 
 * @description
 * - Utiliza `upload.fields(fields)`.
 * - Todos os campos são opcionais; se nenhum arquivo for enviado, `next()` é chamado sem validação.
 * - Valida cada arquivo recebido (em qualquer campo) com `UploadService.validarArquivo()`.
 * - Se algum arquivo for inválido, deleta **todos** os arquivos enviados e retorna 400.
 * 
 * @example
 * // Upload de logo e banner da empresa
 * const campos = [
 *   { name: 'logo', maxCount: 1 },
 *   { name: 'banner', maxCount: 1 }
 * ];
 * app.post('/empresa/upload', uploadFields(campos, 'empresa'), (req, res) => {
 *   // req.files.logo[0] e req.files.banner[0] (se enviados)
 * });
 */
const uploadFields = (fields, subpasta = 'empresa') => {
    return (req, res, next) => {
        req.uploadSubDir = subpasta;

        const uploadHandler = upload.fields(fields);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            } else if (err) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Erro no upload',
                    erro: err.message
                });
            }

            // req.files é um objeto: { fieldname: [file, ...] }
            // Validar cada arquivo individualmente
            const allFiles = [];
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    allFiles.push(...fileArray);
                });
            }

            // Se nenhum arquivo foi enviado, não há problema (todos opcionais)
            try {
                for (const file of allFiles) {
                    UploadService.validarArquivo(file);
                }
                next();
            } catch (error) {
                // Deletar todos os arquivos enviados se algum for inválido
                Promise.all(
                    allFiles.map(file => UploadService.deletarArquivo(file.path))
                ).catch(console.error);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Arquivo inválido',
                    erro: error.message
                });
            }
        });
    };
};

module.exports = {
    uploadSingle,
    uploadSingleOptional,
    uploadMultiple,
    uploadFields
};
