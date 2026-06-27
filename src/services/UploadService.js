const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/env');
const { MENSAGENS } = require('../utils/constants');

class UploadService {
    constructor() {
        this.uploadDir = config.upload.directory;
        this.maxFileSize = config.upload.maxFileSize;
        this.allowedTypes = config.upload.allowedTypes;
    }

    async inicializar() {
        try {
            // Criar diretório de uploads se não existir
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('📁 Diretório de uploads criado/verificado');
        } catch (error) {
            console.error('Erro ao criar diretório de uploads:', error.message);
        }
    }

    getStorage() {
        return multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    const pasta = req.uploadSubDir || 'imagem_ajuste'
                    const subDir = path.join(this.uploadDir, pasta);

                    await fs.mkdir(subDir, { recursive: true });
                    cb(null, subDir);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                let prefix = 'img';

                const subDir = req.uploadSubDir || '';
                const idProduto = req.body && req.body.id_produto;
                const idProdutoGrade = req.body && req.body.id_produto_grade;

                if (subDir === 'imagem_produto') {
                    if (idProduto && !idProdutoGrade) {
                        prefix = 'img-prod';
                    } else if (idProdutoGrade && !idProduto) {
                        prefix = 'img-grad';
                    } else {
                        // Caso ambos sejam enviados ou nenhum (fallback)
                        prefix = 'img-prod'; // ou outro padrão
                    }
                } else if (subDir === 'avatar_usuario') {
                    prefix = 'img-avat';
                } else if (subDir === 'imagem_ajuste') {
                    prefix = 'img-ajus';
                }

                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname);
                const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-]/g, '').replace(/\s+/g, '-');

                cb(null, `${prefix}-${name}-${uniqueSuffix}${ext}`);
            }
        });
    }
    // getStorage() {
    //     return multer.diskStorage({
    //         destination: async (req, file, cb) => {
    //             const subDir = path.join(this.uploadDir, 'ajustes');
    //             await fs.mkdir(subDir, { recursive: true });
    //             cb(null, subDir);
    //         },
    //         filename: (req, file, cb) => {
    //             const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    //             const ext = path.extname(file.originalname);
    //             const name = path.basename(file.originalname, ext);
    //             cb(null, `${name}-${uniqueSuffix}${ext}`);
    //         }
    //     });
    // }

    getFileFilter() {
        return (req, file, cb) => {
            if (this.allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${this.allowedTypes.join(', ')}`), false);
            }
        };
    }

    getMulterConfig() {
        return {
            storage: this.getStorage(),
            limits: {
                fileSize: this.maxFileSize
            },
            fileFilter: this.getFileFilter()
        };
    }

    async deletarArquivo(caminho) {
        try {
            const caminhoCompleto = path.join(process.cwd(), caminho);
            await fs.unlink(caminhoCompleto);
            return true;
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error.message);
            return false;
        }
    }

    async verificarArquivoExiste(caminho) {
        try {
            const caminhoCompleto = path.join(process.cwd(), caminho);
            await fs.access(caminhoCompleto);
            return true;
        } catch (error) {
            return false;
        }
    }

    async obterInformacoesArquivo(caminho) {
        try {
            const caminhoCompleto = path.join(process.cwd(), caminho);
            const stats = await fs.stat(caminhoCompleto);
            return {
                tamanho: stats.size,
                criado_em: stats.birthtime,
                modificado_em: stats.mtime
            };
        } catch (error) {
            throw new Error('Erro ao obter informações do arquivo');
        }
    }

    formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    validarArquivo(file) {
        if (!file) {
            throw new Error('Nenhum arquivo foi enviado');
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`Arquivo muito grande. Tamanho máximo: ${this.formatarTamanhoArquivo(this.maxFileSize)}`);
        }

        if (!this.allowedTypes.includes(file.mimetype)) {
            throw new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${this.allowedTypes.join(', ')}`);
        }

        return true;
    }

    async listarArquivosDiretorio(subDir = 'ajustes') {
        try {
            const dirPath = path.join(this.uploadDir, subDir);
            const arquivos = await fs.readdir(dirPath);

            const arquivosComInfo = await Promise.all(
                arquivos.map(async (arquivo) => {
                    const caminhoCompleto = path.join(dirPath, arquivo);
                    const stats = await fs.stat(caminhoCompleto);

                    return {
                        nome: arquivo,
                        caminho: path.join(subDir, arquivo),
                        tamanho: stats.size,
                        tamanho_formatado: this.formatarTamanhoArquivo(stats.size),
                        criado_em: stats.birthtime,
                        modificado_em: stats.mtime
                    };
                })
            );

            return arquivosComInfo;

        } catch (error) {
            throw new Error('Erro ao listar arquivos do diretório');
        }
    }

    async limparArquivosAntigos(diasAntigos = 90) {
        try {
            const arquivos = await this.listarArquivosDiretorio();
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - diasAntigos);

            let totalDeletados = 0;

            for (const arquivo of arquivos) {
                if (new Date(arquivo.criado_em) < dataLimite) {
                    await this.deletarArquivo(arquivo.caminho);
                    totalDeletados++;
                }
            }

            console.log(`🗑️  ${totalDeletados} arquivos antigos foram deletados`);

            return totalDeletados;

        } catch (error) {
            console.error('Erro ao limpar arquivos antigos:', error.message);
            return 0;
        }
    }
}

module.exports = new UploadService();
