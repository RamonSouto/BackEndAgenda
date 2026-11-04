// src/tests/unit/utils/acessoAgendamento.test.js
const { restritoAosProprios, garantirAcessoAgendamento } = require('../../../utils/acessoAgendamento');
const { ForbiddenError } = require('../../../utils/ApiError');
const { usuarios } = require('../../helpers/factories');

describe('acessoAgendamento', () => {
    describe('restritoAosProprios', () => {
        it.each([
            ['costureira pura', usuarios.costureira, true],
            ['costureira + secretária', { id: 3, papeis: ['costureira', 'secretaria'] }, false],
            ['costureira + médico', { id: 3, papeis: ['costureira', 'medico'] }, false],
            ['administrador', usuarios.admin, false],
            ['paciente', usuarios.paciente, false],
            ['sem papéis', { id: 9, papeis: [] }, false],
            ['usuário indefinido', undefined, false]
        ])('%s → %s', (_, usuario, esperado) => {
            expect(restritoAosProprios(usuario)).toBe(esperado);
        });
    });

    describe('garantirAcessoAgendamento', () => {
        it('permite costureira dona do agendamento (id como string)', () => {
            expect(() => garantirAcessoAgendamento(usuarios.costureira, { id_costureira: '3' })).not.toThrow();
        });
        it('bloqueia costureira em agendamento de outra', () => {
            expect(() => garantirAcessoAgendamento(usuarios.costureira, { id_costureira: 99 })).toThrow(ForbiddenError);
        });
        it('permite admin em qualquer agendamento', () => {
            expect(() => garantirAcessoAgendamento(usuarios.admin, { id_costureira: 99 })).not.toThrow();
        });
    });
});
