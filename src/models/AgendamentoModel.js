const database = require('../config/database');

class AgendamentoModel {
    async criar(dados) {
        const sql = `
      INSERT INTO tab_agendamentos (
        id_paciente, id_costureira, id_secretaria, dta_agendamento,
        des_observacoes_geral, ind_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

        const valores = [
            dados.id_paciente,
            dados.id_costureira,
            dados.id_secretaria,
            dados.dta_agendamento,
            dados.des_observacoes_geral || null,
            dados.ind_status || 'agendado'
        ];

        const resultado = await database.query(sql, valores);
        return resultado.insertId;
    }

    async buscarPorId(id) {
        const sql = `
      SELECT * FROM vw_agendamentos_completos
      WHERE id = ?
    `;

        const resultado = await database.query(sql, [id]);
        return resultado[0] || null;
    }

    async listar(filtros = {}) {
        let sql = `
      SELECT * FROM vw_agendamentos_completos
      WHERE 1=1
    `;

        const valores = [];

        if (filtros.id_paciente) {
            sql += ' AND paciente_id = ?';
            valores.push(filtros.id_paciente);
        }

        if (filtros.id_costureira) {
            sql += ' AND costureira_id = ?';
            valores.push(filtros.id_costureira);
        }

        if (filtros.id_secretaria) {
            sql += ' AND secretaria_id = ?';
            valores.push(filtros.id_secretaria);
        }

        if (filtros.ind_status) {
            sql += ' AND ind_status = ?';
            valores.push(filtros.ind_status);
        }

        if (filtros.data_inicio && filtros.data_fim) {
            sql += ' AND dta_agendamento BETWEEN ? AND ?';
            valores.push(filtros.data_inicio, filtros.data_fim);
        }

        sql += ' ORDER BY dta_agendamento DESC';

        if (filtros.limite) {
            sql += ' LIMIT ?';
            valores.push(parseInt(filtros.limite));
        }

        return await database.query(sql, valores);
    }

    async verificarCostureiraDisponivel(id_costureira, id_agendamento_atual = null) {
        let sql = `
      SELECT COUNT(*) as total
      FROM tab_agendamentos
      WHERE id_costureira = ?
      AND ind_status IN ('agendado', 'confirmado')
      AND deleted_at IS NULL
    `;

        const valores = [id_costureira];

        if (id_agendamento_atual) {
            sql += ' AND id != ?';
            valores.push(id_agendamento_atual);
        }

        const resultado = await database.query(sql, valores);
        return resultado[0].total === 0;
    }

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
      UPDATE tab_agendamentos 
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    async registrarComparecimento(id, compareceu, observacoes = null) {
        const sql = `
      UPDATE tab_agendamentos 
      SET ind_paciente_compareceu = ?,
          des_observacoes_costureira = ?,
          ind_status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

        const status = compareceu ? 'concluido' : 'falta';
        const valores = [compareceu, observacoes, status, id];

        const resultado = await database.query(sql, valores);
        return resultado.affectedRows > 0;
    }

    async cancelar(id) {
        const sql = `
      UPDATE tab_agendamentos 
      SET ind_status = 'cancelado',
          dta_cancelamento = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async confirmar(id) {
        const sql = `
      UPDATE tab_agendamentos 
      SET ind_status = 'confirmado',
          dta_confirmacao = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async deletar(id) {
        const sql = `
      UPDATE tab_agendamentos 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;

        const resultado = await database.query(sql, [id]);
        return resultado.affectedRows > 0;
    }

    async buscarPorCostureira(id_costureira, apenasAtivos = false) {
        let sql = `
      SELECT * FROM vw_agendamentos_completos
      WHERE costureira_id = ?
    `;

        const valores = [id_costureira];

        if (apenasAtivos) {
            sql += " AND ind_status IN ('agendado', 'confirmado')";
        }

        sql += ' ORDER BY dta_agendamento DESC';

        return await database.query(sql, valores);
    }

    async buscarAgendamentoAtivoCostureira(id_costureira) {
        const sql = `
      SELECT * FROM vw_agendamentos_completos
      WHERE costureira_id = ?
      AND ind_status IN ('agendado', 'confirmado')
      ORDER BY dta_agendamento DESC
      LIMIT 1
    `;

        const resultado = await database.query(sql, [id_costureira]);
        return resultado[0] || null;
    }
}

module.exports = new AgendamentoModel();
