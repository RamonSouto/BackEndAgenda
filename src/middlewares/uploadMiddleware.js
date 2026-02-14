const multer = require('multer');
const UploadService = require('../services/UploadService');
const { MENSAGENS } = require('../utils/constants');

// Configurar multer com as configurações do UploadService
const upload = multer(UploadService.getMulterConfig());

/**
 * Middleware para upload de arquivo único
 * @param {string} fieldName - Nome do campo do formulário
 */
const uploadSingle = (fieldName = 'foto') => {
    return (req, res, next) => {
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
 * Middleware para upload de múltiplos arquivos
 * @param {string} fieldName - Nome do campo do formulário
 * @param {number} maxCount - Número máximo de arquivos
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

module.exports = {
    uploadSingle,
    uploadMultiple
};
