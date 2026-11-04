// /src/tests/unit/utils/constants.test.js

const C = require('../../../utils/constants');

describe('constants', () => {
    it('todo papel tem coluna e permissões', () => {
        Object.values(C.PAPEIS_PESSOA).forEach((p) => {
            expect(C.COLUNAS_PAPEIS_PESSOA[p]).toBe(`ind_${p}`);
            expect(Array.isArray(C.PERMISSOES[p])).toBe(true);
        });
    });

    it('administrador tem super permissão e paciente nenhuma', () => {
        expect(C.PERMISSOES.administrador).toEqual(['*']);
        expect(C.PERMISSOES.paciente).toEqual([]);
    });

    it('permissões seguem recurso:acao', () => {
        Object.values(C.PERMISSOES).flat().filter((p) => p !== '*')
            .forEach((p) => expect(p).toMatch(/^[a-z_]+:[a-z_]+$/));
    });

    it('status finalizados são concluido, cancelado e falta', () => {
        expect(C.STATUS_AGENDAMENTO_FINALIZADOS).toEqual(['concluido', 'cancelado', 'falta']);
    });

    it.each(['EVENTOS_EMAIL', 'STATUS_EMAIL_OUTBOX', 'STATUS_AGENDAMENTO_FINALIZADOS'])('%s é imutável', (k) => {
        expect(Object.isFrozen(C[k])).toBe(true);
    });
});
