// src/tests/helpers/factories.js
const jwt = require('jsonwebtoken');

const usuarios = {
    admin: { id: 1, papeis: ['administrador'] },
    secretaria: { id: 2, papeis: ['secretaria'] },
    costureira: { id: 3, papeis: ['costureira'] },
    medico: { id: 4, papeis: ['medico'] },
    paciente: { id: 5, papeis: ['paciente'] }
};

const token = (u) => jwt.sign({ id: u.id, cpf: '11144477735', papeis: u.papeis },
    process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

const agendamento = (over = {}) => ({
    id: 10, id_paciente: 5, id_costureira: 3, id_secretaria: null,
    dta_agendamento: '2030-01-07 10:00:00', ind_status: 'agendado',
    des_url_externa: '3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d',
    nom_paciente: 'Ana', nom_costureira: 'Maria', ...over
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

module.exports = { usuarios, token, agendamento, mockRes };
