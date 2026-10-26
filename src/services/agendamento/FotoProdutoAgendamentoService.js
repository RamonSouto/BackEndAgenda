// src/services/agendamento/FotoProdutoAgendamentoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/FotoProdutoAgendamentoService.js
 * @description Regras de negócio das fotos de ajuste:
 * - Acesso: admin/secretária veem tudo; costureira apenas dos próprios agendamentos.
 * - Bloqueio de upload/exclusão com agendamento ou item cancelado.
 * - Limite de fotos por requisição e por item (com lock para concorrência).
 * - Validação de assinatura binária (JPEG/PNG) e renomeação padronizada.
 * - Rename dentro da transação; falhas descartam os arquivos.
 * - Exclusão move o arquivo para uploads/deletados (soft delete).
 *
 * @requires fs/promises
 * @requires path
 * @requires ../../config/database
 * @requires ../../config/env
 * @requires ../../config/logger
 * @requires ../../models/agendamento/FotoProdutoAgendamentoModel
 * @requires ../LogService
 * @requires ../../utils/validators
 * @requires ../../utils/constants
 * @requires ../../utils/ApiError
 * @requires ../../utils/arquivoUtils
 */
const fs = require('fs/promises');
const path = require('path');
const database = require('../../config/database');
const config = require('../../config/env');
const logger = require('../../config/logger');
const FotoModel = require('../../models/agendamento/FotoProdutoAgendamentoModel');
const LogService = require('../LogService');
const validators = require('../../utils/validators');
const {
    ACOES_LOG, PAPEIS_PESSOA, STATUS_AGENDAMENTO, STATUS_PRODUTO_AGENDAMENTO, LIMITES_FOTO
} = require('../../utils/constants');
const { BadRequestError, ForbiddenError, NotFoundError, ValidationError } = require('../../utils/ApiError');
const {
    detectarTipoImagem, gerarNomeFotoAjuste, sanitizarNomeOriginal, resolverCaminhoSeguro
} = require('../../utils/arquivoUtils');

const UPLOAD_ROOT = path.resolve(config.upload.directory);
const PASTA_AJUSTES = 'ajustes';
const PASTA_DELETADOS = 'deletados';
const TABELA = 'tab_agendamento_item_fotos';

class FotoProdutoAgendamentoService {

    /**
     * Indica se o usuário tem acesso irrestrito (admin ou secretária).
     *
     * @method _temAcessoTotal
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @param {Object} usuario - req.usuario.
     * @returns {boolean}
     */
    _temAcessoTotal(usuario) {
        const papeis = usuario?.papeis || [];
        return papeis.includes(PAPEIS_PESSOA.ADMINISTRADOR) || papeis.includes(PAPEIS_PESSOA.SECRETARIA);
    }

    /**
     * Valida se o usuário pode acessar o agendamento do contexto.
     *
     * @method _validarAcesso
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @param {Object} usuario - req.usuario.
     * @param {Object} contexto - Deve conter id_costureira.
     * @returns {void}
     * @throws {ForbiddenError} Se costureira não for a dona ou papel sem acesso.
     */
    _validarAcesso(usuario, contexto) {
        if (this._temAcessoTotal(usuario)) return;

        const ehCostureira = (usuario?.papeis || []).includes(PAPEIS_PESSOA.COSTUREIRA);
        if (ehCostureira && Number(contexto.id_costureira) === Number(usuario.id)) return;

        throw new ForbiddenError('Você só pode acessar fotos dos seus agendamentos');
    }

    /**
     * Bloqueia alteração de fotos quando agendamento ou item estiver cancelado.
     * Agendamento concluído é permitido (foto "depois").
     *
     * @method _validarStatusEditavel
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @param {Object} contexto - Deve conter ind_status_agendamento e ind_status_item.
     * @returns {void}
     * @throws {ValidationError}
     */
    _validarStatusEditavel(contexto) {
        if (contexto.ind_status_agendamento === STATUS_AGENDAMENTO.CANCELADO) {
            throw new ValidationError('Agendamento cancelado não permite alteração de fotos');
        }
        if (contexto.ind_status_item === STATUS_PRODUTO_AGENDAMENTO.CANCELADO) {
            throw new ValidationError('Item cancelado não permite alteração de fotos');
        }
    }

    /**
     * Remove arquivos do disco sem lançar erro (best effort).
     *
     * @method _descartarArquivos
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @async
     * @param {string[]} caminhos - Caminhos absolutos.
     * @returns {Promise<void>}
     */
    async _descartarArquivos(caminhos) {
        await Promise.all(caminhos.map((caminho) =>
            fs.rm(caminho, { force: true }).catch((err) =>
                logger.error('Falha ao descartar arquivo', { caminho, erro: err.message })
            )
        ));
    }

    /**
     * Registra auditoria sem derrubar a operação principal (já commitada).
     *
     * @method _registrarLog
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @async
     * @param {Object} dados - Payload do LogService.registrar.
     * @returns {Promise<void>}
     */
    async _registrarLog(dados) {
        try {
            await LogService.registrar(dados);
        } catch (err) {
            logger.error('Falha ao registrar auditoria de foto', { erro: err.message, acao: dados.des_acao });
        }
    }

    /**
     * Mapeia o registro para resposta pública (sem caminho físico interno).
     *
     * @method _mapearFoto
     * @memberof FotoProdutoAgendamentoService
     * @private
     * @param {Object} foto
     * @returns {Object}
     */
    _mapearFoto(foto) {
        return {
            id: foto.id,
            id_produto_agendamento: foto.id_produto_agendamento,
            ind_tipo_foto: foto.ind_tipo_foto,
            nom_original: foto.nom_original,
            num_tamanho_bytes: foto.num_tamanho_bytes,
            created_at: foto.created_at,
            url_arquivo: `/api/agendamentos/fotos/${foto.id}/arquivo`
        };
    }

    /**
     * Valida que o item pertence ao agendamento e que o usuário tem acesso.
     * Usado como pré-checagem antes do Multer gravar arquivos.
     *
     * @method validarAcessoItem
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>} Contexto do item.
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * await FotoProdutoAgendamentoService.validarAcessoItem(1, 3, req.usuario);
     */
    async validarAcessoItem(idAgendamento, idItem, usuario) {
        const contexto = await FotoModel.buscarContextoItem(idItem);

        if (!contexto || Number(contexto.id_agendamento) !== Number(idAgendamento)) {
            throw new NotFoundError('Item não encontrado neste agendamento');
        }

        this._validarAcesso(usuario, contexto);
        return contexto;
    }

    /**
     * Anexa múltiplas fotos a um item agendado, de forma transacional.
     *
     * @method adicionarFotos
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {Object} params
     * @param {number} params.idAgendamento
     * @param {number} params.idItem
     * @param {string} params.ind_tipo_foto - 'antes' | 'depois' (um tipo por requisição).
     * @param {Array<Object>} params.arquivos - req.files do Multer.
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<{ids: number[], total: number}>}
     * @throws {BadRequestError|NotFoundError|ForbiddenError|ValidationError}
     *
     * @example
     * await FotoProdutoAgendamentoService.adicionarFotos(
     *   { idAgendamento: 1, idItem: 3, ind_tipo_foto: 'antes', arquivos: req.files }, req.usuario
     * );
     */
    async adicionarFotos({ idAgendamento, idItem, ind_tipo_foto, arquivos }, usuario) {
        const temporarios = (arquivos || []).map((a) => path.resolve(a.path));
        const definitivos = [];

        try {
            const { error, value } = validators.fotoProdutoAgendamentoSchema.validate({
                id_agendamento: idAgendamento,
                id_item: idItem,
                ind_tipo_foto
            });
            if (error) throw new BadRequestError(error.details[0].message);

            if (!arquivos?.length) throw new BadRequestError('Nenhum arquivo foi enviado');
            if (arquivos.length > LIMITES_FOTO.MAX_POR_REQUISICAO) {
                throw new BadRequestError(`Máximo de ${LIMITES_FOTO.MAX_POR_REQUISICAO} arquivos por requisição`);
            }

            // Assinatura binária: não confiar no mimetype do cliente
            const tipos = await Promise.all(temporarios.map(detectarTipoImagem));
            const indiceInvalido = tipos.findIndex((t) => !t);
            if (indiceInvalido !== -1) {
                throw new BadRequestError(
                    `Arquivo "${sanitizarNomeOriginal(arquivos[indiceInvalido].originalname)}" não é um JPEG/PNG válido`
                );
            }

            const ids = await database.transaction(async (conn) => {
                // Lock no item: serializa uploads concorrentes e garante o limite por item
                const contexto = await FotoModel.buscarContextoItem(value.id_item, conn, true);

                if (!contexto || Number(contexto.id_agendamento) !== value.id_agendamento) {
                    throw new NotFoundError('Item não encontrado neste agendamento');
                }
                this._validarAcesso(usuario, contexto);
                this._validarStatusEditavel(contexto);

                const totalAtual = await FotoModel.contarPorItem(value.id_item, conn);
                if (totalAtual + arquivos.length > LIMITES_FOTO.MAX_POR_ITEM) {
                    throw new ValidationError(
                        `Limite de ${LIMITES_FOTO.MAX_POR_ITEM} fotos por item. ` +
                        `Existem ${totalAtual}; é possível enviar mais ${LIMITES_FOTO.MAX_POR_ITEM - totalAtual}.`
                    );
                }

                const novosIds = [];
                for (let i = 0; i < arquivos.length; i++) {
                    const nome = gerarNomeFotoAjuste(value.id_agendamento, value.id_item, value.ind_tipo_foto, tipos[i].ext);
                    const destino = path.join(UPLOAD_ROOT, PASTA_AJUSTES, nome);

                    await fs.rename(temporarios[i], destino);
                    definitivos.push(destino);

                    novosIds.push(await FotoModel.criar({
                        id_produto_agendamento: value.id_item,
                        des_caminho_arquivo: `${PASTA_AJUSTES}/${nome}`,
                        nom_original: sanitizarNomeOriginal(arquivos[i].originalname),
                        num_tamanho_bytes: arquivos[i].size,
                        ind_tipo_foto: value.ind_tipo_foto
                    }, conn));
                }
                return novosIds;
            });

            await this._registrarLog({
                id_usuario: usuario.id,
                des_acao: ACOES_LOG.UPLOAD,
                des_tabela: TABELA,
                num_registro_id: value.id_item,
                des_detalhes: {
                    id_agendamento: value.id_agendamento,
                    id_item: value.id_item,
                    ind_tipo_foto: value.ind_tipo_foto,
                    ids_fotos: ids
                }
            });

            logger.info('Fotos de ajuste anexadas', {
                id_agendamento: value.id_agendamento, id_item: value.id_item, total: ids.length
            });

            return { ids, total: ids.length };
        } catch (error) {
            await this._descartarArquivos([...temporarios, ...definitivos]);
            throw error;
        }
    }

    /**
     * Lista as fotos de um item.
     *
     * @method listarPorItem
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {number} idAgendamento
     * @param {number} idItem
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Array<Object>>}
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * const fotos = await FotoProdutoAgendamentoService.listarPorItem(1, 3, req.usuario);
     */
    async listarPorItem(idAgendamento, idItem, usuario) {
        await this.validarAcessoItem(idAgendamento, idItem, usuario);

        const fotos = await FotoModel.listarPorItem(idItem);

        await this._registrarLog({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.LISTAR,
            des_tabela: TABELA,
            num_registro_id: idItem,
            des_detalhes: { id_agendamento: idAgendamento, total_registros: fotos.length }
        });

        return fotos.map((f) => this._mapearFoto(f));
    }

    /**
     * Busca os metadados de uma foto.
     *
     * @method buscarPorId
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {number} id
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<Object>}
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * const foto = await FotoProdutoAgendamentoService.buscarPorId(10, req.usuario);
     */
    async buscarPorId(id, usuario) {
        const foto = await FotoModel.buscarPorId(id);
        if (!foto) throw new NotFoundError('Foto não encontrada');

        this._validarAcesso(usuario, foto);
        return this._mapearFoto(foto);
    }

    /**
     * Resolve o arquivo físico para download autenticado (dado sensível de saúde).
     *
     * @method obterArquivo
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {number} id
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<{caminho: string}>} Caminho absoluto validado.
     * @throws {NotFoundError|ForbiddenError}
     *
     * @example
     * const { caminho } = await FotoProdutoAgendamentoService.obterArquivo(10, req.usuario);
     */
    async obterArquivo(id, usuario) {
        const foto = await FotoModel.buscarPorId(id);
        if (!foto) throw new NotFoundError('Foto não encontrada');

        this._validarAcesso(usuario, foto);

        const caminho = resolverCaminhoSeguro(UPLOAD_ROOT, foto.des_caminho_arquivo);
        try {
            await fs.access(caminho);
        } catch {
            logger.error('Arquivo físico de foto ausente', { id_foto: id });
            throw new NotFoundError('Arquivo não encontrado');
        }

        await this._registrarLog({
            id_usuario: usuario.id,
            des_acao: ACOES_LOG.CONSULTAR,
            des_tabela: TABELA,
            num_registro_id: id,
            des_detalhes: { tipo_consulta: 'download_arquivo' }
        });

        return { caminho };
    }

    /**
     * Soft delete da foto: move o arquivo para uploads/deletados (atualizando o mtime
     * para que a limpeza conte a partir da exclusão) e atualiza o caminho no banco.
     *
     * @method deletar
     * @memberof FotoProdutoAgendamentoService
     * @async
     * @param {number} id
     * @param {Object} usuario - req.usuario.
     * @returns {Promise<boolean>}
     * @throws {NotFoundError|ValidationError}
     *
     * @example
     * await FotoProdutoAgendamentoService.deletar(10, req.usuario);
     */
    async deletar(id, usuario) {
        let origem = null;
        let destino = null;
        let movido = false;

        try {
            const foto = await database.transaction(async (conn) => {
                const registro = await FotoModel.buscarPorId(id, conn, true);
                if (!registro) throw new NotFoundError('Foto não encontrada');

                this._validarStatusEditavel(registro);

                origem = resolverCaminhoSeguro(UPLOAD_ROOT, registro.des_caminho_arquivo);
                const nome = path.basename(origem);
                destino = path.join(UPLOAD_ROOT, PASTA_DELETADOS, nome);
                let novoCaminho = `${PASTA_DELETADOS}/${nome}`;

                try {
                    await fs.mkdir(path.dirname(destino), { recursive: true });
                    await fs.rename(origem, destino);
                    movido = true;
                    const agora = new Date();
                    await fs.utimes(destino, agora, agora);
                } catch (err) {
                    if (err.code !== 'ENOENT') throw err;
                    logger.warn('Arquivo físico ausente na exclusão; prosseguindo com soft delete', { id_foto: id });
                    novoCaminho = null;
                }

                await FotoModel.deletar(id, novoCaminho, conn);
                return registro;
            });

            await this._registrarLog({
                id_usuario: usuario.id,
                des_acao: ACOES_LOG.DELETAR,
                des_tabela: TABELA,
                num_registro_id: id,
                des_detalhes: {
                    id_agendamento: foto.id_agendamento,
                    id_item: foto.id_produto_agendamento,
                    ind_tipo_foto: foto.ind_tipo_foto
                }
            });

            return true;
        } catch (error) {
            if (movido) {
                await fs.rename(destino, origem).catch((err) =>
                    logger.error('Falha ao reverter movimentação de foto', { id_foto: id, erro: err.message })
                );
            }
            throw error;
        }
    }
}

module.exports = new FotoProdutoAgendamentoService();
