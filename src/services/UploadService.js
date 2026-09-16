// src/services/UploadService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/UploadService.js
 * @description Serviço de gerenciamento de upload de arquivos.
 * Configura o Multer para armazenamento, validação de tipos e tamanhos,
 * gerencia exclusão, listagem, limpeza de arquivos antigos e formatação.
 * 
 * @requires multer
 * @requires path
 * @requires fs/promises
 * @requires ../config/env
 * @requires ../utils/constants
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/env');
const { MENSAGENS } = require('../utils/constants');

/**
 * Classe UploadService.
 * @class UploadService
 */
class UploadService {
    /**
     * Construtor – inicializa as configurações de upload a partir das variáveis de ambiente.
     */
    constructor() {
        this.uploadDir = config.upload.directory;
        this.maxFileSize = config.upload.maxFileSize;
        this.allowedTypes = config.upload.allowedTypes;
    }

    /**
     * Inicializa o serviço criando o diretório de uploads (se não existir).
     * 
     * @method inicializar
     * @memberof UploadService
     * @async
     * @returns {Promise<void>}
     * @description Cria o diretório base de uploads recursivamente.
     * Loga sucesso ou erro no console.
     * 
     * @example
     * await uploadService.inicializar();
     */
    async inicializar() {
        try {
            // Criar diretório de uploads se não existir
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('📁 Diretório de uploads criado/verificado');
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
     * - Cria subdiretórios com base em `req.uploadSubDir` (definido pelo middleware de upload).
     * - Gera nomes de arquivo com prefixos baseados na subpasta e IDs do produto/grade.
     * - Remove caracteres especiais do nome original e adiciona timestamp + random.
     */
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

    /**
     * Retorna o filtro de arquivos para validação de MIME type.
     * 
     * @method getFileFilter
     * @memberof UploadService
     * @returns {Function} Função de filtro do Multer.
     * @description Verifica se o MIME type do arquivo está na lista de `allowedTypes`.
     * Se não estiver, retorna erro com mensagem descritiva.
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
     * @returns {Object} Objeto de configuração para o Multer.
     * @description Combina storage, limites de tamanho e filtro de arquivos.
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
     * @returns {Promise<boolean>} `true` se deletado com sucesso, `false` em caso de erro.
     * 
     * @example
     * await uploadService.deletarArquivo('uploads/imagem.jpg');
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
     * Verifica se um arquivo existe no sistema de arquivos.
     * 
     * @method verificarArquivoExiste
     * @memberof UploadService
     * @async
     * @param {string} caminho - Caminho relativo ao diretório raiz do projeto.
     * @returns {Promise<boolean>} `true` se o arquivo existe, `false` caso contrário.
     * 
     * @example
     * const existe = await uploadService.verificarArquivoExiste('uploads/imagem.jpg');
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
     * @returns {Promise<Object>} Objeto com `tamanho`, `criado_em`, `modificado_em`.
     * @throws {Error} Se não for possível ler as informações.
     * 
     * @example
     * const info = await uploadService.obterInformacoesArquivo('uploads/imagem.jpg');
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
     * Formata o tamanho de um arquivo em bytes para uma string legível.
     * 
     * @method formatarTamanhoArquivo
     * @memberof UploadService
     * @param {number} bytes - Tamanho em bytes.
     * @returns {string} Tamanho formatado (ex: "1.5 MB").
     * 
     * @example
     * uploadService.formatarTamanhoArquivo(1536000); // "1.46 MB"
     */
    formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Valida um arquivo (tamanho, tipo, existência).
     * 
     * @method validarArquivo
     * @memberof UploadService
     * @param {Object} file - Objeto do arquivo (do Multer).
     * @returns {boolean} `true` se válido.
     * @throws {Error} Se o arquivo for inválido (não enviado, tamanho excedido, tipo não permitido).
     * 
     * @example
     * try {
     *   UploadService.validarArquivo(req.file);
     * } catch (error) {
     *   // tratar erro
     * }
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
     * Lista arquivos de um subdiretório com suas informações.
     * 
     * @method listarArquivosDiretorio
     * @memberof UploadService
     * @async
     * @param {string} [subDir='ajustes'] - Subdiretório dentro da pasta de uploads.
     * @returns {Promise<Array<Object>>} Lista de objetos com nome, caminho, tamanho, etc.
     * @throws {Error} Se não for possível listar o diretório.
     * 
     * @example
     * const arquivos = await uploadService.listarArquivosDiretorio('produtos');
     */
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

    /**
     * Limpa arquivos antigos (baseado na data de criação) de um diretório.
     * 
     * @method limparArquivosAntigos
     * @memberof UploadService
     * @async
     * @param {number} [diasAntigos=90] - Idade mínima em dias para exclusão.
     * @returns {Promise<number>} Número de arquivos deletados.
     * @description Lista arquivos do diretório padrão 'ajustes' e deleta os mais antigos que o limite.
     * Loga o progresso no console.
     * 
     * @example
     * const total = await uploadService.limparArquivosAntigos(30);
     */
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

    /**
     * Salva uma foto de ajuste (antes/depois) associada a um produto de agendamento.
     * 
     * @method salvarFotoAjuste
     * @memberof UploadService
     * @async
     * @param {number} idProdutoAgendamento - ID do produto de agendamento.
     * @param {Object} arquivo - Objeto do arquivo (do Multer).
     * @param {string} indTipoFoto - Tipo da foto ('antes' ou 'depois').
     * @returns {Promise<number>} ID do registro criado na tabela `tab_fotos_ajustes`.
     * @description
     * - Define o caminho relativo no formato 'Ajustes/nome_arquivo'.
     * - Utiliza o modelo `FotoAjusteModel` para persistir.
     * 
     * @example
     * const id = await uploadService.salvarFotoAjuste(1, req.file, 'antes');
     */
    async salvarFotoAjuste(idProdutoAgendamento, arquivo, indTipoFoto) {
        const FotoAjusteModel = require('../models/FotoAjusteModel');

        const caminhoRelativo = path.join('Ajustes', arquivo.filename);

        return FotoAjusteModel.criar({
            id_produto_agendamento: idProdutoAgendamento,
            des_caminho_arquivo: caminhoRelativo,
            nom_original: arquivo.originalname,
            num_tamanho_bytes: arquivo.size,
            ind_tipo_foto: indTipoFoto // 'antes' ou 'depois'
        });
    }
}

module.exports = new UploadService();
