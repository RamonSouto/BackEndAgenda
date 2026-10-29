// src/models/sistema/EmailTemplateModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/sistema/EmailTemplateModel.js
 * @description Persistência dos templates de e-mail por empresa/evento (tab_email_template).
 *
 * @requires ../../config/database
 */
const database = require('../../config/database');

class EmailTemplateModel {

    /**
     * Busca template de um evento.
     *
     * @method buscarPorEvento
     * @param {number} idEmpresa - ID da empresa.
     * @param {string} evento - Evento (EVENTOS_EMAIL).
     * @returns {Promise<Object|null>}
     */
    async buscarPorEvento(idEmpresa, evento) {
        const sql = `
            SELECT id, id_empresa, ind_evento, des_assunto, des_corpo_html, ind_ativo, updated_at
            FROM tab_email_template
            WHERE id_empresa = ? AND ind_evento = ?
        `;
        const resultado = await database.query(sql, [idEmpresa, evento]);
        return resultado[0] || null;
    }

    /**
     * Lista os templates da empresa.
     *
     * @method listar
     * @param {number} idEmpresa - ID da empresa.
     * @returns {Promise<Array<Object>>}
     */
    async listar(idEmpresa) {
        const sql = `
            SELECT id, ind_evento, des_assunto, des_corpo_html, ind_ativo, updated_at
            FROM tab_email_template WHERE id_empresa = ? ORDER BY ind_evento
        `;
        return database.query(sql, [idEmpresa]);
    }

    /**
     * Cria ou atualiza o template do evento (upsert pela chave única).
     *
     * @method salvar
     * @param {number} idEmpresa - ID da empresa.
     * @param {string} evento - Evento.
     * @param {Object} dados - { des_assunto, des_corpo_html, ind_ativo } já sanitizados.
     * @param {number} usuarioId - Usuário que alterou.
     * @returns {Promise<boolean>}
     */
    async salvar(idEmpresa, evento, dados, usuarioId) {
        const sql = `
            INSERT INTO tab_email_template
                (id_empresa, ind_evento, des_assunto, des_corpo_html, ind_ativo, id_usuario_alteracao)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                des_assunto = VALUES(des_assunto),
                des_corpo_html = VALUES(des_corpo_html),
                ind_ativo = VALUES(ind_ativo),
                id_usuario_alteracao = VALUES(id_usuario_alteracao)
        `;
        const resultado = await database.query(sql, [
            idEmpresa, evento, dados.des_assunto, dados.des_corpo_html, dados.ind_ativo, usuarioId
        ]);
        return resultado.affectedRows > 0;
    }
}

module.exports = new EmailTemplateModel();
