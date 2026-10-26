// src/models/agendamento/ProdutoAgendamentoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/models/agendamento/ProdutoAgendamentoModel.js
 * @description Modelo de dados para itens de serviço vinculados a um
 * agendamento (tab_produto_agendamento). Também resolve o preço vigente
 * do serviço consultando tab_preco_produto_servico.
 * 
 * @requires ../../config/database
 */
const database = require('../../config/database');

const exec = async (sql, params, connection = null) => {
    if (connection) {
        const [rows] = await connection.execute(sql, params);
        return rows;
    }
    return database.query(sql, params);
};

class AgendamentoProdutoModel {
    /**
     * Busca o preço vigente de um serviço-produto: o registro com a maior
     * `dta_inicio` que seja menor ou igual à data atual.
     * 
     * @method buscarPrecoVigente
     * @param {number} id_produto_servico
     * @param {Object|null} [connection]
     * @returns {Promise<Object|null>} { val_preco } ou null se não houver preço cadastrado.
     */
    async buscarPrecoVigente(id_produto_servico, connection = null) {
        const sql = `
            SELECT val_preco
            FROM tab_preco_produto_servico
            WHERE id_produto_servico = ?
              AND dta_inicio <= CURDATE()
              AND deleted_at IS NULL
            ORDER BY dta_inicio DESC
            LIMIT 1
        `;
        const resultado = await exec(sql, [id_produto_servico], connection);
        return resultado[0] || null;
    }

    /**
     * Cria um item de agendamento.
     * 
     * @method criar
     * @param {Object} dados
     * @param {number} dados.id_agendamento
     * @param {number} dados.id_tipo_agendamento
     * @param {number} dados.id_produto_grade
     * @param {number} dados.id_produto_servico
     * @param {string} [dados.des_ajuste_produto]
     * @param {number} dados.val_preco_servico
     * @param {number} [dados.val_desconto_servico]
     * @param {Object|null} [connection]
     * @returns {Promise<number>} ID inserido.
     */
    async criar(dados) {

        const sql = `
            INSERT INTO tab_agendamento_item
                (id_agendamento, id_tipo_agendamento, id_produto_grade, id_produto_servico,
                 des_ajuste_produto, val_preco_servico, val_desconto_servico, ind_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const valores = [
            dados.id_agendamento,
            dados.id_tipo_agendamento,
            dados.id_produto_grade,
            dados.id_produto_servico,
            dados.des_ajuste_produto ?? null,
            dados.val_preco_servico,
            dados.val_desconto_servico ?? 0,
            dados.ind_status = 'pendente'
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Busca item por ID.
     * 
     * @method buscarPorId
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async buscarPorId(id) {
        const sql = `
            SELECT pa.*, 
                   pg.num_sku,
                   p.nom_produto, 
                   ts.des_tipo_ajuste
            FROM tab_agendamento_item pa
            INNER JOIN tab_produto_grade pg ON (pa.id_produto_grade = pg.id)
            INNER JOIN tab_produtos p ON (pg.id_produto = p.id)
            INNER JOIN tab_produto_servico ps ON (pa.id_produto_servico = ps.id)
            INNER JOIN tab_tipo_servico ts ON (ps.id_tipo_servico = ts.id)
            WHERE pa.id = ? 
            AND pa.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado[0] || null;
    }

    /**
     * Lista todos os itens de um agendamento.
     * 
     * @method listarPorAgendamento
     * @param {number} id_agendamento
     * @returns {Promise<Array<Object>>}
     */
    async listarPorAgendamento(id_agendamento) {
        const sql = `
            SELECT pa.*, pg.num_sku, p.nom_produto, ts.des_tipo_ajuste
            FROM tab_agendamento_item pa
            INNER JOIN tab_produto_grade pg ON (pa.id_produto_grade = pg.id)
            INNER JOIN tab_produtos p ON (pg.id_produto = p.id)
            INNER JOIN tab_produto_servico ps ON (pa.id_produto_servico = ps.id)
            INNER JOIN tab_tipo_servico ts ON (ps.id_tipo_servico = ts.id)
            WHERE pa.id_agendamento = ? AND pa.deleted_at IS NULL
        `;
        return database.query(sql, [id_agendamento]);
    }

    /**
     * Atualiza campos de um item (status, desconto, descrição do ajuste).
     * 
     * @method atualizar
     * @param {number} id
     * @param {Object} dados
     * @returns {Promise<boolean>}
     */
    async atualizar(id, dados) {
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
            UPDATE tab_agendamento_item
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    /**
     * Deleta (soft delete) um item de agendamento.
     * 
     * @method deletar
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deletar(idAgendamento, idAgendadoProduto) {
        const sql = `
            UPDATE tab_agendamento_item
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ? 
            AND id_agendamento = ?
            AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [idAgendadoProduto, idAgendamento]);

        return resultado.affectedRows > 0;
    }
}

module.exports = new AgendamentoProdutoModel();
