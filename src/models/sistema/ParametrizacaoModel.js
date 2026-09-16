// src/models/ParametrizacaoModel.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/model/ParametrizacaoModel.js
 * @description Modelo de dados para parametrizações.
 * Gerencia operações CRUD, ativação/desativação e soft delete na tabela `tab_parametrizacao`.
 * 
 * @requires ../config/database
 */

const database = require('../../config/database');

/**
 * Classe ParametrizacaoModel.
 * @class ParametrizacaoModel
 */
class ParametrizacaoModel {

    /**
     * Cria uma nova parametrização.
     * 
     * @method criar
     * @memberof ParametrizacaoModel
     * @async
     * @param {Object} dados - Dados da parametrização.
     * @param {string} dados.des_tipo_dia - Tipo do dia (ex: 'UTIL', 'SABADO').
     * @param {string} dados.hra_inicio - Horário de início (formato HH:MM:SS).
     * @param {string} dados.hra_fim - Horário de fim (formato HH:MM:SS).
     * @param {number} dados.qtd_minutos_intervalo - Duração do intervalo em minutos.
     * @param {boolean} dados.ind_ativo - Indicador de ativo (TRUE/FALSE).
     * @returns {Promise<number>} ID da parametrização inserida.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const id = await parametrizacaoModel.criar({
     *   des_tipo_dia: 'UTIL',
     *   hra_inicio: '08:00:00',
     *   hra_fim: '18:00:00',
     *   qtd_minutos_intervalo: 60,
     *   ind_ativo: true
     * });
     */
    async criar(dados) {
        const sql = `
        INSERT INTO tab_parametrizacao (
            des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo
        ) VALUES (?, ?, ?, ?, ?)
        `;
        const valores = [
            dados.des_tipo_dia,
            dados.hra_inicio,
            dados.hra_fim,
            dados.qtd_minutos_intervalo,
            dados.ind_ativo
        ];

        const resultado = await database.query(sql, valores);

        return resultado.insertId;
    }

    /**
     * Lista todas as parametrizações ativas (ind_ativo = TRUE).
     * 
     * @method listar
     * @memberof ParametrizacaoModel
     * @async
     * @returns {Promise<Array<Object>>} Lista de parametrizações ativas.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * Filtra apenas registros com `ind_ativo = 1`.
     * 
     * @example
     * const lista = await parametrizacaoModel.listar();
     */
    async listar() {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.ind_ativo = 1
        `;

        const resultado = await database.query(sql);

        return resultado || null;
    }

    /**
     * Busca uma parametrização por ID (excluindo registros deletados).
     * 
     * @method buscarParametrizacaoPorId
     * @memberof ParametrizacaoModel
     * @async
     * @param {number} id - ID da parametrização.
     * @returns {Promise<Object|null>} Dados da parametrização ou `null` se não encontrada ou deletada.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const registro = await parametrizacaoModel.buscarParametrizacaoPorId(1);
     */
    async buscarParametrizacaoPorId(id) {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.id = ? AND p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    /**
     * Busca a parametrização ativa para um determinado tipo de dia.
     * 
     * @method buscarParametrizacaoPorTipoAtivo
     * @memberof ParametrizacaoModel
     * @async
     * @param {string} tipo - Tipo de dia (ex: 'UTIL', 'SABADO').
     * @returns {Promise<Object|null>} Dados da parametrização ativa ou `null` se não houver.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * Retorna o primeiro registro (deve haver apenas um) com `ind_ativo = TRUE` para o tipo.
     * 
     * @example
     * const config = await parametrizacaoModel.buscarParametrizacaoPorTipoAtivo('UTIL');
     */
    async buscarParametrizacaoPorTipoAtivo(tipo) {
        const sql = `
          SELECT id, des_tipo_dia, hra_inicio, hra_fim, qtd_minutos_intervalo, ind_ativo, created_at, updated_at, deleted_at
          FROM tab_parametrizacao p
          WHERE p.des_tipo_dia = ?
          AND   p.ind_ativo = TRUE
          AND   p.deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [tipo]);
        return resultado[0] || null;
    }

    /**
     * Conta quantos registros ativos existem para um tipo, opcionalmente excluindo um ID.
     * 
     * @method contarAtivosPorTipo
     * @memberof ParametrizacaoModel
     * @async
     * @param {string} tipo - Tipo de dia.
     * @param {number|null} [idExcluir=null] - ID a ser excluído da contagem.
     * @returns {Promise<number>} Número de registros ativos.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * Útil para verificar se um registro é o único ativo de um tipo.
     * 
     * @example
     * const total = await parametrizacaoModel.contarAtivosPorTipo('UTIL', 1);
     */
    async contarAtivosPorTipo(tipo, idExcluir = null) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM tab_parametrizacao
            WHERE des_tipo_dia = ?
              AND ind_ativo = TRUE
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado[0]?.total || 0;
    }

    /**
     * Conta quantos registros inativos (ind_ativo = FALSE) existem para um tipo, opcionalmente excluindo um ID.
     * 
     * @method contarDesativadoPorTipo
     * @memberof ParametrizacaoModel
     * @async
     * @param {string} tipo - Tipo de dia.
     * @param {number|null} [idExcluir=null] - ID a ser excluído da contagem.
     * @returns {Promise<number>} Número de registros inativos.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * const total = await parametrizacaoModel.contarDesativadoPorTipo('UTIL', 1);
     */
    async contarDesativadoPorTipo(tipo, idExcluir = null) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM tab_parametrizacao
            WHERE des_tipo_dia = ?
              AND ind_ativo = FALSE
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado[0]?.total || 0;
    }

    /**
     * Busca o ID do registro desativado mais recente para um tipo, excluindo um ID específico.
     * 
     * @method buscarTipoDesativadoMaisRecente
     * @memberof ParametrizacaoModel
     * @async
     * @param {string} tipo - Tipo de dia.
     * @param {number} id - ID a ser excluído da busca.
     * @returns {Promise<number>} ID do registro desativado mais recente.
     * @throws {Error} Se não encontrar nenhum registro (lança erro).
     * 
     * @description
     * ⚠️ **BUG:** Se não houver registros, a subconsulta retorna NULL e a query principal retorna NULL, mas o código tenta acessar `resultado[0].id`, que pode ser `undefined` e causar erro.
     * 
     * @example
     * const id = await parametrizacaoModel.buscarTipoDesativadoMaisRecente('UTIL', 1);
     */
    async buscarTipoDesativadoMaisRecente(tipo, id) {
        let sql = `SELECT id
            FROM tab_parametrizacao tp 
            WHERE tp.des_tipo_dia  = ?
            AND   tp.ind_ativo = 0
            AND   tp.deleted_at IS NULL
            AND   tp.created_at = (SELECT MAX(tp2.created_at )
                                FROM tab_parametrizacao tp2
                                WHERE tp2.des_tipo_dia  = ?
                                AND   tp2.ind_ativo = 0
                                AND   tp2.deleted_at IS NULL
                                AND   tp2.id != ?)
        ;`

        const resultado = await database.query(sql, [tipo, tipo, id]);
        return resultado[0].id;
    }

    /**
     * Desativa todos os registros ativos de um tipo, opcionalmente excluindo um ID.
     * 
     * @method desativarPorTipo
     * @memberof ParametrizacaoModel
     * @async
     * @param {string} tipo - Tipo de dia.
     * @param {number|null} [idExcluir=null] - ID a ser excluído da atualização.
     * @returns {Promise<boolean>} `true` se pelo menos um registro foi atualizado.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * Útil para garantir que apenas um registro por tipo fique ativo.
     * 
     * @example
     * await parametrizacaoModel.desativarPorTipo('UTIL', 5);
     */
    async desativarPorTipo(tipo, idExcluir = null) {
        let sql = `
            UPDATE tab_parametrizacao 
            SET ind_ativo = FALSE 
            WHERE des_tipo_dia = ? 
              AND ind_ativo = TRUE 
              AND deleted_at IS NULL
        `;
        const params = [tipo];
        if (idExcluir) {
            sql += ` AND id != ?`;
            params.push(idExcluir);
        }
        const resultado = await database.query(sql, params);
        return resultado.affectedRows > 0;
    }

    /**
     * Desativa um registro específico (ind_ativo = FALSE).
     * 
     * @method desativarParametrizacao
     * @memberof ParametrizacaoModel
     * @async
     * @param {number} id - ID do registro.
     * @returns {Promise<boolean>} `true` se o registro foi desativado.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await parametrizacaoModel.desativarParametrizacao(1);
     */
    async desativarParametrizacao(id) {
        const sql = `
          UPDATE tab_parametrizacao
          SET ind_ativo = FALSE
          WHERE id = ?
          AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Ativa um registro específico (ind_ativo = TRUE).
     * 
     * @method ativarParametrizacao
     * @memberof ParametrizacaoModel
     * @async
     * @param {number} id - ID do registro.
     * @returns {Promise<boolean>} `true` se o registro foi ativado.
     * @throws {Error} Se a query falhar.
     * 
     * @example
     * await parametrizacaoModel.ativarParametrizacao(2);
     */
    async ativarParametrizacao(id) {
        const sql = `
          UPDATE tab_parametrizacao
          SET ind_ativo = TRUE
          WHERE id = ?
          AND deleted_at IS NULL
        `;
        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    /**
     * Atualiza campos específicos de uma parametrização (exceto `id`).
     * 
     * @method atualizar
     * @memberof ParametrizacaoModel
     * @async
     * @param {number} id - ID do registro.
     * @param {Object} dados - Objeto com os campos a serem atualizados.
     * @returns {Promise<boolean>} `true` se a atualização foi bem-sucedida.
     * @throws {Error} Se nenhum campo for fornecido ou se a query falhar.
     * 
     * @description
     * - Monta dinamicamente a cláusula SET com base nas chaves de `dados`.
     * - Ignora o campo `id` se presente.
     * - Só atualiza registros com `deleted_at IS NULL`.
     * 
     * @example
     * await parametrizacaoModel.atualizar(1, { qtd_minutos_intervalo: 90 });
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
            UPDATE tab_parametrizacao 
            SET ${campos.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    /**
     * Realiza soft delete (marca `deleted_at` com timestamp atual).
     * 
     * @method deletar
     * @memberof ParametrizacaoModel
     * @async
     * @param {number} id - ID do registro.
     * @returns {Promise<boolean>} `true` se a exclusão lógica foi bem-sucedida.
     * @throws {Error} Se a query falhar.
     * 
     * @description
     * - Define `deleted_at = CURRENT_TIMESTAMP`.
     * - Não remove fisicamente o registro.
     * 
     * @example
     * await parametrizacaoModel.deletar(1);
     */
    async deletar(id) {
        const sql = `
            UPDATE tab_parametrizacao 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND deleted_at IS NULL
        `;

        const resultado = await database.query(sql, [id]);

        return resultado.affectedRows > 0;
    }

}

module.exports = new ParametrizacaoModel();