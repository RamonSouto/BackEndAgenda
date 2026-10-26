// src/services/agendamento/FotoProdutoAgendamentoService.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/services/agendamento/FotoProdutoAgendamentoService.js
 * @description Regras de negócio para fotos de "antes/depois" de itens
 * de agendamento. Delega gravação/exclusão física de arquivos ao UploadService.
 * 
 * @requires ../../models/agendamento/FotoProdutoAgendamentoModel
 * @requires ../../models/agendamento/ProdutoAgendamentoModel
 * @requires ../UploadService
 * @requires ../LogService
 * @requires ../../utils/constants
 * @requires ../../utils/ApiError
 */
const FotoProdutoAgendamentoModel = require('../../models/agendamento/FotoProdutoAgendamentoModel');
const ProdutoAgendamentoModel = require('../../models/agendamento/ProdutoAgendamentoModel');
const UploadService = require('../UploadService');
const LogService = require('../LogService');
const { ACOES_LOG } = require('../../utils/constants');
const { NotFoundError, BadRequestError } = require('../../utils/ApiError');

class FotoProdutoAgendamentoService {
    /**
     * Adiciona uma foto de ajuste a um item de agendamento.
     * O arquivo já deve ter sido processado/salvo pelo uploadMiddleware antes
     * de chegar aqui (req.file). Se o item não existir, o arquivo físico
     * já enviado é removido (evita lixo em disco).
     * 
     * @method adicionarFoto
     * @async
     * @param {Object} dados
     * @param {number} dados.id_produto_agendamento
     * @param {string} dados.ind_tipo_foto - 'antes' | 'depois'.
     * @param {Object} file - req.file do multer.
     * @param {number} usuarioLogadoId
     * @returns {Promise<Object>} Foto criada.
     * @throws {NotFoundError|BadRequestError}
     */
    async adicionarFoto(dados, file, usuarioLogadoId) {
        if (!file) {
            throw new BadRequestError('Nenhum arquivo foi enviado');
        }

        const item = await ProdutoAgendamentoModel.buscarPorId(dados.id_produto_agendamento);
        if (!item) {
            await UploadService.deletarArquivo(file.path).catch(() => { });
            throw new NotFoundError('Item de agendamento não encontrado');
        }

        const fotoId = await FotoProdutoAgendamentoModel.criar({
            id_produto_agendamento: dados.id_produto_agendamento,
            ind_tipo_foto: dados.ind_tipo_foto,
            des_caminho_arquivo: file.path,
            nom_original: file.originalname,
            num_tamanho_bytes: file.size
        });

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.UPLOAD,
            des_tabela: 'tab_fotos_ajustes',
            num_registro_id: fotoId,
            des_detalhes: { id_produto_agendamento: dados.id_produto_agendamento, ind_tipo_foto: dados.ind_tipo_foto }
        });

        return FotoProdutoAgendamentoModel.buscarPorId(fotoId);
    }

    /**
     * Lista fotos de um item de agendamento.
     * 
     * @method listarPorProdutoAgendamento
     * @async
     * @param {number} id_produto_agendamento
     * @param {number} usuarioLogadoId
     * @returns {Promise<Array<Object>>}
     */
    async listarPorProdutoAgendamento(id_produto_agendamento, usuarioLogadoId) {
        const fotos = await FotoProdutoAgendamentoModel.listarPorProdutoAgendamento(id_produto_agendamento);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.LISTAR,
            des_tabela: 'tab_fotos_ajustes',
            des_detalhes: { id_produto_agendamento, total_registros: fotos.length }
        });

        return fotos;
    }

    /**
     * Deleta (soft delete + remoção física) uma foto de ajuste.
     * 
     * @method deletarFoto
     * @async
     * @param {number} id
     * @param {number} usuarioLogadoId
     * @returns {Promise<boolean>}
     * @throws {NotFoundError}
     */
    async deletarFoto(id, usuarioLogadoId) {
        const foto = await FotoProdutoAgendamentoModel.buscarPorId(id);
        if (!foto) {
            throw new NotFoundError('Foto não encontrada');
        }

        const deletado = await FotoProdutoAgendamentoModel.deletar(id);
        if (!deletado) {
            throw new Error('Erro ao deletar foto');
        }

        await UploadService.deletarArquivo(foto.des_caminho_arquivo).catch(console.error);

        await LogService.registrar({
            id_usuario: usuarioLogadoId,
            des_acao: ACOES_LOG.DELETAR,
            des_tabela: 'tab_fotos_ajustes',
            num_registro_id: id,
            des_detalhes: { id_produto_agendamento: foto.id_produto_agendamento, ind_tipo_foto: foto.ind_tipo_foto }
        });

        return true;
    }
}

module.exports = new FotoProdutoAgendamentoService();
