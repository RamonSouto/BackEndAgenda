// src/services/UploadService.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file src/services/UploadService.js
 * @description Serviço de gerenciamento de upload de arquivos.
 * Configura o Multer para armazenamento, validação de tipos e tamanhos,
 * gerencia exclusão, listagem, limpeza da lixeira (uploads/deletados),
 * limpeza de temporários órfãos (uploads/ajustes/tmp-*) e formatação.
 *
 * ⚠️ As pastas `ajustes` e `deletados` contêm fotos pós-cirúrgicas (dados sensíveis)
 * e NÃO devem ser servidas publicamente.
 *
 * @requires multer
 * @requires path
 * @requires crypto
 * @requires fs/promises
 * @requires ../config/env
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const config = require('../config/env');

/** @constant {number} MS_POR_HORA */
const MS_POR_HORA = 60 * 60 * 1000;

/** @constant {number} MS_POR_DIA */
const MS_POR_DIA = 24 * MS_POR_HORA;

/**
 * Classe UploadService.
 * @class UploadService
 */
class UploadService {
    /**
     * Construtor: carrega as configurações de upload de `config/env.js`.
     * Padrões: diretório `./uploads`, 5 MB (5242880 bytes), JPEG/PNG/JPG.
     */
    constructor() {
        this.uploadDir = config.upload.directory;
        this.maxFileSize = config.upload.maxFileSize;
        this.allowedTypes = config.upload.allowedTypes;
    }

    /**
     * Inicializa o serviço criando as subpastas privadas `ajustes` e `deletados`
     * (o diretório base é criado junto, por ser recursivo).
     *
     * @method inicializar
     * @memberof UploadService
     * @async
     * @returns {Promise<void>}
     *
     * @example
     * await UploadService.inicializar();
     */
    async inicializar() {
        try {
            await fs.mkdir(path.join(this.uploadDir, 'ajustes'), { recursive: true });
            await fs.mkdir(path.join(this.uploadDir, 'deletados'), { recursive: true });
            console.log('📁 Diretórios de uploads criados/verificados');
        } catch (error) {
            console.error('Erro ao criar diretório de uploads:', error.message);
        }
    }

    /**
     * Retorna a configuração de storage do Multer.
     *
     * @method getStorage
     * @memberof UploadService
     * @returns {multer.StorageEngine} Configuração de storage.
     * @description
     * - Cria o subdiretório com base em `req.uploadSubDir` (definido pelo uploadMiddleware).
     * - Em `ajustes`, gera um nome temporário SEM extensão (`tmp-...`). O
     *   FotoProdutoAgendamentoService valida a assinatura binária e renomeia depois.
     * - Nas demais pastas, gera um prefixo pela subpasta/IDs, sanitiza o nome e adiciona timestamp + random.
     */
    getStorage() {
        return multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    const pasta = req.uploadSubDir || 'imagem_ajuste';
                    const subDir = path.join(this.uploadDir, pasta);

                    await fs.mkdir(subDir, { recursive: true });
                    cb(null, subDir);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                // Fotos de ajuste: nome temporário; o FotoProdutoAgendamentoService renomeia após validar
                if (req.uploadSubDir === 'ajustes') {
                    return cb(null, `tmp-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`);
                }

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
                        // Ambos ou nenhum enviados (fallback)
                        prefix = 'img-prod';
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

    /**
     * Retorna o filtro de arquivos para validação de MIME type.
     * Primeira barreira apenas: o MIME vem do cliente. Para fotos de ajuste,
     * a validação definitiva é feita por assinatura binária no service.
     *
     * @method getFileFilter
     * @memberof UploadService
     * @returns {Function} Função de filtro do Multer.
     */
    getFileFilter() {
        return (req, file, cb) => {
            if (this.allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${this.allowedTypes.join(', ')}`), false);
            }
        };
    }

    /**
     * Retorna a configuração completa do Multer.
     *
     * @method getMulterConfig
     * @memberof UploadService
     * @returns {Object} Objeto de configuração (storage, limites, filtro).
     *
     * @example
     * const upload = multer(UploadService.getMulterConfig());
     */
    getMulterConfig() {
        return {
            storage: this.getStorage(),
            limits: {
                fileSize: this.maxFileSize
            },
            fileFilter: this.getFileFilter()
        };
    }

    /**
     * Deleta um arquivo do sistema de arquivos.
     *
     * @method deletarArquivo
     * @memberof UploadService
     * @async
     * @param {string} caminho - Caminho relativo ao diretório raiz do projeto.
     * @returns {Promise<boolean>} `true` se deletado, `false` em caso de erro.
     *
     * @example
     * await UploadService.deletarArquivo('uploads/imagem_produto/img.jpg');
     */
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

    /**
     * Verifica se um arquivo existe.
     *
     * @method verificarArquivoExiste
     * @memberof UploadService
     * @async
     * @param {string} caminho - Caminho relativo ao diretório raiz do projeto.
     * @returns {Promise<boolean>}
     *
     * @example
     * const existe = await UploadService.verificarArquivoExiste('uploads/imagem_produto/img.jpg');
     */
    async verificarArquivoExiste(caminho) {
        try {
            const caminhoCompleto = path.join(process.cwd(), caminho);
            await fs.access(caminhoCompleto);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtém informações de um arquivo (tamanho, datas de criação/modificação).
     *
     * @method obterInformacoesArquivo
     * @memberof UploadService
     * @async
     * @param {string} caminho - Caminho relativo ao diretório raiz.
     * @returns {Promise<Object>} `{ tamanho, criado_em, modificado_em }`.
     * @throws {Error} Se não for possível ler as informações.
     *
     * @example
     * const info = await UploadService.obterInformacoesArquivo('uploads/imagem_produto/img.jpg');
     */
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

    /**
     * Formata um tamanho em bytes para uma string legível.
     *
     * @method formatarTamanhoArquivo
     * @memberof UploadService
     * @param {number} bytes - Tamanho em bytes.
     * @returns {string} Tamanho formatado.
     *
     * @example
     * UploadService.formatarTamanhoArquivo(1536000); // "1.46 MB"
     */
    formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Valida um arquivo (existência, tamanho, tipo).
     *
     * @method validarArquivo
     * @memberof UploadService
     * @param {Object} file - Objeto do arquivo (Multer).
     * @returns {boolean} `true` se válido.
     * @throws {Error} Se não enviado, tamanho excedido ou tipo não permitido.
     *
     * @example
     * UploadService.validarArquivo(req.file);
     */
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

    /**
     * Lista os arquivos (não recursivo, ignora subpastas) de um subdiretório de uploads.
     * Retorna `[]` se a pasta não existir. Arquivos removidos durante a leitura são ignorados.
     *
     * @method listarArquivosDiretorio
     * @memberof UploadService
     * @async
     * @param {string} [subDir='deletados'] - Subdiretório dentro da pasta de uploads.
     * @returns {Promise<Array<{nome: string, caminho_absoluto: string, tamanho: number, tamanho_formatado: string, modificado_em: Date}>>}
     * @throws {Error} 'Erro ao listar arquivos do diretório' (exceto ENOENT).
     *
     * @example
     * const arquivos = await UploadService.listarArquivosDiretorio('deletados');
     */
    async listarArquivosDiretorio(subDir = 'deletados') {
        const dirPath = path.join(this.uploadDir, subDir);
        let entradas;

        try {
            entradas = await fs.readdir(dirPath, { withFileTypes: true });
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw new Error('Erro ao listar arquivos do diretório');
        }

        const arquivos = await Promise.all(
            entradas
                .filter((entrada) => entrada.isFile())
                .map(async (entrada) => {
                    const caminhoAbsoluto = path.resolve(dirPath, entrada.name);
                    try {
                        const stats = await fs.stat(caminhoAbsoluto);
                        return {
                            nome: entrada.name,
                            caminho_absoluto: caminhoAbsoluto,
                            tamanho: stats.size,
                            tamanho_formatado: this.formatarTamanhoArquivo(stats.size),
                            modificado_em: stats.mtime
                        };
                    } catch (error) {
                        if (error.code === 'ENOENT') return null; // removido durante a listagem
                        throw new Error('Erro ao listar arquivos do diretório');
                    }
                })
        );

        return arquivos.filter(Boolean);
    }

    /**
     * Remove de vez os arquivos de `uploads/deletados` cujo mtime é anterior ao limite.
     * O mtime é atualizado na exclusão lógica (FotoProdutoAgendamentoService.deletar),
     * então a contagem começa na data da exclusão. Fotos ativas nunca são tocadas.
     *
     * @method limparArquivosAntigos
     * @memberof UploadService
     * @async
     * @param {number} [diasAntigos=90] - Dias desde a exclusão.
     * @returns {Promise<number>} Total removido.
     *
     * @example
     * const total = await UploadService.limparArquivosAntigos(90);
     */
    async limparArquivosAntigos(diasAntigos = 90) {
        const limite = Date.now() - diasAntigos * MS_POR_DIA;
        const arquivos = await this.listarArquivosDiretorio('deletados');
        let total = 0;

        for (const arquivo of arquivos) {
            if (arquivo.modificado_em.getTime() < limite) {
                await fs.rm(arquivo.caminho_absoluto, { force: true });
                total++;
            }
        }

        return total;
    }

    /**
     * Remove os temporários órfãos (`tmp-*`) de `uploads/ajustes`, que sobram, por exemplo,
     * quando o processo cai entre o upload e o rename.
     *
     * @method limparTemporarios
     * @memberof UploadService
     * @async
     * @param {number} [horas=24] - Idade mínima em horas.
     * @returns {Promise<number>} Total removido.
     *
     * @example
     * const total = await UploadService.limparTemporarios(24);
     */
    async limparTemporarios(horas = 24) {
        const limite = Date.now() - horas * MS_POR_HORA;
        const arquivos = await this.listarArquivosDiretorio('ajustes');
        let total = 0;

        for (const arquivo of arquivos) {
            if (arquivo.nome.startsWith('tmp-') && arquivo.modificado_em.getTime() < limite) {
                await fs.rm(arquivo.caminho_absoluto, { force: true });
                total++;
            }
        }

        return total;
    }
}

module.exports = new UploadService();
