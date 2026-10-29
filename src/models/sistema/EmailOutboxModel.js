// src/models/sistema/EmailOutboxModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/sistema/EmailOutboxModel.js
 * @description Persistência da fila de e-mails (tab_email_outbox).
 * O "claim" de lote é atômico (UPDATE ... LIMIT com token), permitindo
 * múltiplas instâncias do worker sem envio duplicado e sem SELECT FOR UPDATE longo.
 *
 * @requires ../../config/database
 */
const database = require('../../config/database');

/**
 * Normaliza inteiro para uso seguro em LIMIT/OFFSET (sem placeholder).
 *
 * @private
 * @param {*} valor
 * @param {number} min
 * @param {number} max
 * @param {number} padrao
 * @returns {number}
 */
const inteiroSeguro = (valor, min, max, padrao) => {
    const n = Number.parseInt(valor, 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : padrao;
};

class EmailOutboxModel {

    /**
     * Enfileira um e-mail. Idempotente pela chave única.
     *
     * @method criar
     * @param {Object} dados - Campos da outbox.
     * @returns {Promise<number>} ID inserido (0 se duplicado).
     */
    async criar(dados) {
        const sql = `
            INSERT INTO tab_email_outbox
                (id_empresa, id_agendamento, ind_evento, des_chave_idempotencia,
                 des_destinatario, des_assunto, des_corpo_html, des_corpo_texto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE id = id
        `;
        const resultado = await database.query(sql, [
            dados.id_empresa, dados.id_agendamento ?? null, dados.ind_evento, dados.des_chave_idempotencia,
            dados.des_destinatario, dados.des_assunto, dados.des_corpo_html, dados.des_corpo_texto
        ]);
        return resultado.affectedRows === 1 ? resultado.insertId : 0;
    }

    /**
     * Reivindica atomicamente um lote de mensagens prontas para envio.
     *
     * @method reivindicarLote
     * @param {string} token - UUID do lote.
     * @param {number} limite - Tamanho do lote (1-100).
     * @returns {Promise<Array<Object>>} Mensagens reivindicadas.
     */
    async reivindicarLote(token, limite) {
        const lim = inteiroSeguro(limite, 1, 100, 10);
        await database.query(`
            UPDATE tab_email_outbox
            SET ind_status = 'processando', des_lock_token = ?, dta_lock = NOW()
            WHERE ind_status = 'pendente' AND dta_proxima_tentativa <= NOW()
            ORDER BY id
            LIMIT ${lim}
        `, [token]);

        return database.query(`
            SELECT id, id_empresa, ind_evento, des_destinatario, des_assunto,
                   des_corpo_html, des_corpo_texto, num_tentativas
            FROM tab_email_outbox WHERE des_lock_token = ? AND ind_status = 'processando'
        `, [token]);
    }

    /**
     * Marca mensagem como enviada.
     *
     * @method marcarEnviado
     * @param {number} id - ID da mensagem.
     * @param {string|null} messageId - ID retornado pelo SMTP.
     * @returns {Promise<boolean>}
     */
    async marcarEnviado(id, messageId) {
        const resultado = await database.query(`
            UPDATE tab_email_outbox
            SET ind_status = 'enviado', des_message_id = ?, dta_envio = NOW(),
                num_tentativas = num_tentativas + 1, des_lock_token = NULL, des_ultimo_erro = NULL
            WHERE id = ?
        `, [messageId, id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Registra falha: reagenda (pendente) ou finaliza (falha definitiva).
     *
     * @method registrarFalha
     * @param {number} id - ID da mensagem.
     * @param {string} erro - Mensagem de erro (truncada).
     * @param {number|null} atrasoMinutos - Minutos até a próxima tentativa; null = falha definitiva.
     * @returns {Promise<boolean>}
     */
    async registrarFalha(id, erro, atrasoMinutos) {
        const definitiva = atrasoMinutos === null;
        const minutos = definitiva ? 0 : inteiroSeguro(atrasoMinutos, 1, 1440, 5);
        const resultado = await database.query(`
            UPDATE tab_email_outbox
            SET ind_status = ?, num_tentativas = num_tentativas + 1,
                des_ultimo_erro = ?, des_lock_token = NULL,
                dta_proxima_tentativa = DATE_ADD(NOW(), INTERVAL ${minutos} MINUTE)
            WHERE id = ?
        `, [definitiva ? 'falha' : 'pendente', String(erro).slice(0, 1000), id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Devolve para a fila mensagens travadas (worker morreu no meio do envio).
     *
     * @method liberarTravados
     * @param {number} minutos - Tempo máximo em 'processando'.
     * @returns {Promise<number>} Linhas liberadas.
     */
    async liberarTravados(minutos = 10) {
        const m = inteiroSeguro(minutos, 1, 1440, 10);
        const resultado = await database.query(`
            UPDATE tab_email_outbox
            SET ind_status = 'pendente', des_lock_token = NULL
            WHERE ind_status = 'processando' AND dta_lock < DATE_SUB(NOW(), INTERVAL ${m} MINUTE)
        `);
        return resultado.affectedRows;
    }

    /**
     * Lista mensagens com filtros e paginação (sem corpo – payload leve).
     *
     * @method listar
     * @param {Object} filtros - { ind_status, id_agendamento, pagina, limite } validados.
     * @returns {Promise<Array<Object>>}
     */
    async listar(filtros) {
        const condicoes = ['1 = 1'];
        const valores = [];
        if (filtros.ind_status) { condicoes.push('ind_status = ?'); valores.push(filtros.ind_status); }
        if (filtros.id_agendamento) { condicoes.push('id_agendamento = ?'); valores.push(filtros.id_agendamento); }

        const limite = inteiroSeguro(filtros.limite, 1, 100, 20);
        const offset = (inteiroSeguro(filtros.pagina, 1, 100000, 1) - 1) * limite;

        return database.query(`
            SELECT id, id_agendamento, ind_evento, des_destinatario, des_assunto, ind_status,
                   num_tentativas, dta_proxima_tentativa, des_ultimo_erro, dta_envio, created_at
            FROM tab_email_outbox
            WHERE ${condicoes.join(' AND ')}
            ORDER BY id DESC
            LIMIT ${limite} OFFSET ${offset}
        `, valores);
    }

    /**
     * Recoloca uma mensagem com falha na fila.
     *
     * @method reprocessar
     * @param {number} id - ID da mensagem.
     * @returns {Promise<boolean>}
     */
    async reprocessar(id) {
        const resultado = await database.query(`
            UPDATE tab_email_outbox
            SET ind_status = 'pendente', num_tentativas = 0, dta_proxima_tentativa = NOW(), des_lock_token = NULL
            WHERE id = ? AND ind_status = 'falha'
        `, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Remove mensagens enviadas antigas (LGPD: minimização de dados).
     *
     * @method purgarEnviados
     * @param {number} dias - Retenção em dias.
     * @returns {Promise<number>} Linhas removidas.
     */
    async purgarEnviados(dias) {
        const d = inteiroSeguro(dias, 7, 3650, 90);
        const resultado = await database.query(`
            DELETE FROM tab_email_outbox
            WHERE ind_status = 'enviado' AND dta_envio < DATE_SUB(NOW(), INTERVAL ${d} DAY)
            LIMIT 1000
        `);
        return resultado.affectedRows;
    }
}

module.exports = new EmailOutboxModel();
