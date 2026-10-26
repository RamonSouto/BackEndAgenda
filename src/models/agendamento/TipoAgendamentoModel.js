// src/models/agendamento/tipoAgendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/tipoAgendamentoModel.js
 * @description Model de acesso a dados da tabela tab_tipo_agendamento.
 * Camada pura de persistência (sem regra de negócio).
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

class TipoAgendamentoModel {

    /**
     * Cria um novo tipo de agendamento.
     * @async
     * @param {{des_tipo_agendamento: string, ind_ativo?: boolean}} dados
     * @returns {Promise<Object>}
     */
    static async criar(dados) {
        const sql = `
        INSERT INTO tab_tipo_agendamento (
            des_tipo_agendamento, 
            ind_ativo
        ) VALUES (?, ?)
        `;
        const valores = [
            dados.des_tipo_agendamento,
            dados.ind_ativo
        ]

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Lista todos os tipos de agendamento ativos (não deletados).
     * @async
     * @param {boolean} [apenasAtivos=true]
     * @returns {Promise<Array>}
     */
    static async listar() {
        const sql = `
            SELECT id, des_tipo_agendamento, ind_ativo, created_at, updated_at, deleted_at
            FROM tab_tipo_agendamento;
        `;

        const resultado = await database.query(sql);
        return resultado || null;
    }

    /**
     * Busca um tipo de agendamento por ID.
     * @async
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async buscarPorId(id) {

        const sql = `
            SELECT id, des_tipo_agendamento, ind_ativo, created_at, updated_at, deleted_at
            FROM tab_tipo_agendamento 
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Atualiza um tipo de agendamento existente.
     * @async
     * @param {number} id
     * @param {Object} dados
     * @returns {Promise<Object|null>}
     */
    static async atualizar(id, dados) {
        const campos = [];
        const valores = [];

        Object.keys(dados).forEach(campo => {
            if (dados[campo] !== undefined && campo !== 'id') {
                campos.push(`${campo} = ?`);
                valores.push(dados[campo]);
            }
        });

        if (campos.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }

        valores.push(id);

        const sql = `
            UPDATE tab_tipo_agendamento 
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;


        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    /**
     * Soft delete de um tipo de agendamento.
     * @async
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async deletar(id) {

        const sql = `
            UPDATE tab_tipo_agendamento 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }
}

module.exports = TipoAgendamentoModel;
