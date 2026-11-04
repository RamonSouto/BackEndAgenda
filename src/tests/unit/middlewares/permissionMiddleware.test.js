// src/tests/unit/middlewares/permissionMiddleware.test.js
const pm = require('../../../middlewares/permissionMiddleware');
const { mockRes, usuarios } = require('../../helpers/factories');

const run = (mw, usuario, params = {}) => {
    const res = mockRes(); const next = jest.fn();
    mw({ usuario, params }, res, next);
    return { res, next };
};

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => { }));
afterEach(() => jest.restoreAllMocks());

describe('permissionMiddleware', () => {
    it('admin (*) acessa qualquer permissão', () => {
        expect(run(pm.permissionMiddleware('qualquer:coisa'), usuarios.admin).next).toHaveBeenCalled();
    });
    it('aceita se possuir ao menos uma permissão da lista', () => {
        expect(run(pm.permissionMiddleware(['x', 'agendamento:visualizar_proprio']), usuarios.costureira).next).toHaveBeenCalled();
    });
    it('aceita permissão string via flags', () => {
        expect(run(pm.permissionMiddleware('relatorio:visualizar'), { id: 1, ind_medico: 1 }).next).toHaveBeenCalled();
    });
    it('403 sem permissão', () => {
        expect(run(pm.permissionMiddleware('relatorio:visualizar'), usuarios.costureira).res.status).toHaveBeenCalledWith(403);
    });
    it('403 com papel desconhecido', () => {
        expect(run(pm.permissionMiddleware('foto:upload'), { id: 1, papeis: ['inexistente'] }).res.status).toHaveBeenCalledWith(403);
    });
    it('401 sem usuário', () => {
        expect(run(pm.permissionMiddleware('x'), undefined).res.status).toHaveBeenCalledWith(401);
    });
    it('401 com papeis vazio', () => {
        expect(run(pm.permissionMiddleware('x'), { id: 1, papeis: [] }).res.status).toHaveBeenCalledWith(401);
    });
    it('paciente não tem permissões', () => {
        expect(run(pm.permissionMiddleware('agendamento:visualizar'), usuarios.paciente).res.status).toHaveBeenCalledWith(403);
    });
    it('500 em exceção', () => {
        expect(run(pm.permissionMiddleware('x'), { id: 1, papeis: { length: 1 } }).res.status).toHaveBeenCalledWith(500);
    });
});

describe('papelMiddleware e atalhos', () => {
    it.each([
        ['apenasAdminMiddleware', 'admin', true], ['apenasAdminMiddleware', 'secretaria', false],
        ['secretariaOuAdminMiddleware', 'secretaria', true], ['secretariaOuAdminMiddleware', 'costureira', false],
        ['costureiraOuAdminMiddleware', 'costureira', true], ['costureiraOuAdminMiddleware', 'medico', false],
        ['costureiraAdminSecretariaMiddleware', 'secretaria', true], ['costureiraAdminSecretariaMiddleware', 'paciente', false]
    ])('%s com %s → %p', (mw, papel, permitido) => {
        const { next, res } = run(pm[mw], usuarios[papel]);
        permitido ? expect(next).toHaveBeenCalled() : expect(res.status).toHaveBeenCalledWith(403);
    });
    it('aceita papel string', () => {
        expect(run(pm.papelMiddleware('medico'), { id: 1, ind_medico: true }).next).toHaveBeenCalled();
    });
    it('401 sem usuário', () => {
        expect(run(pm.papelMiddleware('medico'), undefined).res.status).toHaveBeenCalledWith(401);
    });
    it('401 sem papéis', () => {
        expect(run(pm.papelMiddleware('medico'), { id: 1, papeis: [] }).res.status).toHaveBeenCalledWith(401);
    });
    it('500 em exceção', () => {
        expect(run(pm.papelMiddleware('medico'), { id: 1, papeis: { length: 1 } }).res.status).toHaveBeenCalledWith(500);
    });
});

describe('recursoProprio', () => {
    it('permite o próprio recurso', () => {
        expect(run(pm.recursoProprio('id'), usuarios.costureira, { id: '3' }).next).toHaveBeenCalled();
    });
    it('param padrão "id"', () => {
        expect(run(pm.recursoProprio(), { id: 7, ind_paciente: 1 }, { id: '7' }).next).toHaveBeenCalled();
    });
    it('bloqueia recurso alheio', () => {
        expect(run(pm.recursoProprio('id'), usuarios.costureira, { id: '4' }).res.status).toHaveBeenCalledWith(403);
    });
    it('admin acessa qualquer recurso', () => {
        expect(run(pm.recursoProprio('id'), usuarios.admin, { id: '999' }).next).toHaveBeenCalled();
    });
    it('500 sem usuário', () => {
        expect(run(pm.recursoProprio('id'), undefined, { id: '1' }).res.status).toHaveBeenCalledWith(500);
    });
});

describe('extrairPapeisUsuario', () => {
    it('extrai das flags booleanas quando não há array', () => {
        expect(pm.extrairPapeisUsuario({ ind_medico: 1, ind_costureira: 1 })).toEqual(['medico', 'costureira']);
    });
    it('todas as flags', () => {
        expect(pm.extrairPapeisUsuario({
            ind_medico: 1, ind_secretaria: 1, ind_costureira: 1, ind_paciente: 1, ind_administrador: 1
        })).toEqual(['medico', 'secretaria', 'costureira', 'paciente', 'administrador']);
    });
    it('usa array papeis quando preenchido', () => {
        expect(pm.extrairPapeisUsuario({ papeis: ['medico'], ind_paciente: 1 })).toEqual(['medico']);
    });
    it('papeis vazio cai nas flags', () => {
        expect(pm.extrairPapeisUsuario({ papeis: [], ind_paciente: 1 })).toEqual(['paciente']);
    });
    it('null → []', () => expect(pm.extrairPapeisUsuario(null)).toEqual([]));
});
