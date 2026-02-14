/**
 * Mock do banco de dados para testes unitários
 */
class MockDatabase {
    constructor() {
        this.data = new Map();
        this.queryHistory = [];
    }

    /**
     * Mock do método query
     */
    async query(sql, params = []) {
        this.queryHistory.push({ sql, params });

        // Simular diferentes tipos de queries
        if (sql.includes('SELECT')) {
            return this.mockSelect(sql, params);
        }

        if (sql.includes('INSERT')) {
            return this.mockInsert(sql, params);
        }

        if (sql.includes('UPDATE')) {
            return this.mockUpdate(sql, params);
        }

        if (sql.includes('DELETE')) {
            return this.mockDelete(sql, params);
        }

        return [[]];
    }

    mockSelect(sql, params) {
        // Retornar dados mockados baseado no tipo de select
        if (sql.includes('tab_pessoas')) {
            return [[
                {
                    id: 1,
                    nom_completo: 'Teste Usuario',
                    num_cpf: '00000000000',
                    ind_tipo_pessoa: 'administrador',
                    des_email_1: 'teste@teste.com'
                }
            ]];
        }

        if (sql.includes('tab_agendamentos')) {
            return [[
                {
                    id: 1,
                    dta_agendamento: new Date().toISOString(),
                    ind_status: 'agendado'
                }
            ]];
        }

        return [[]];
    }

    mockInsert(sql, params) {
        const id = Math.floor(Math.random() * 1000) + 1;
        return [{ insertId: id, affectedRows: 1 }];
    }

    mockUpdate(sql, params) {
        return [{ affectedRows: 1, changedRows: 1 }];
    }

    mockDelete(sql, params) {
        return [{ affectedRows: 1 }];
    }

    /**
     * Limpa o histórico de queries
     */
    clearHistory() {
        this.queryHistory = [];
    }

    /**
     * Obtém histórico de queries
     */
    getHistory() {
        return this.queryHistory;
    }
}

module.exports = MockDatabase;