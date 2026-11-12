// src/tests/unit/services/PessoaService.test.js
jest.mock('../../../models/PessoaModel', () => ({
    criar: jest.fn(), buscarPorId: jest.fn(), buscarPorCPF: jest.fn(), buscarPorPapel: jest.fn(),
    listar: jest.fn(), atualizar: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../config/logger', () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async (s) => `hash:${s}`) }));
jest.mock('../../../models/agendamento/AgendamentoModel', () => ({ buscarAgendamentoAtivoCostureira: jest.fn() }));

const bcrypt = require('bcryptjs');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
const AgendamentoModel = require('../../../models/agendamento/AgendamentoModel');
const Service = require('../../../services/PessoaService');

const CPF = '11144477735';
const payload = (extra = {}) => ({
    id_cidade: 1, nom_completo: 'Ana', num_cpf: CPF, num_rg: '123', dta_nascimento: '1990-01-01',
    des_logradouro: 'Rua A', num_endereco: '10', num_cep: '74000000', nom_bairro: 'Centro',
    num_celular_1: '(62) 98888-7777', des_email_1: 'ana@x.com', ind_paciente: true, ...extra
});
const pessoaDb = (extra = {}) => ({ id: 1, nom_completo: 'Ana', num_cpf: CPF, des_senha: 'h', ind_paciente: 1, ...extra });

beforeEach(() => jest.clearAllMocks());

describe('PessoaService – helpers', () => {
    it('extrairPapeis', () => {
        expect(Service.extrairPapeis({ ind_medico: 1, ind_administrador: true })).toEqual(['medico', 'administrador']);
        expect(Service.extrairPapeis({
            ind_medico: 1, ind_secretaria: 1, ind_costureira: 1, ind_paciente: 1, ind_administrador: 1
        })).toHaveLength(5);
    });
    it('possuiAlgumPapel', () => {
        expect(Service.possuiAlgumPapel({ ind_paciente: 1 })).toBeTruthy();
        expect(Service.possuiAlgumPapel({})).toBeFalsy();
    });
});

describe('PessoaService.criar', () => {
    beforeEach(() => {
        PessoaModel.buscarPorCPF.mockResolvedValue(null);
        PessoaModel.criar.mockResolvedValue(1);
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb());
    });

    it('paciente: sanitiza telefone, cria, loga e oculta sensíveis', async () => {
        const r = await Service.criar(payload(), 99);
        expect(PessoaModel.criar).toHaveBeenCalledWith(expect.objectContaining({ num_celular_1: '62988887777', ind_status: 'ativo' }));
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            id_usuario: 99, des_acao: 'criar', num_registro_id: 1,
            des_detalhes: expect.objectContaining({ papeis: ['paciente'] })
        }));
        expect(r).not.toHaveProperty('des_senha');
        // expect(r).not.toHaveProperty('num_cpf');
    });
    it('sanitiza celular 2', async () => {
        await Service.criar(payload({ num_celular_2: '(62) 3333-4444' }), 1);
        expect(PessoaModel.criar.mock.calls[0][0].num_celular_2).toBe('6233334444');
    });
    it('aplica hash na senha', async () => {
        await Service.criar(payload({ ind_secretaria: true, des_senha: '123456' }), 1);
        expect(PessoaModel.criar).toHaveBeenCalledWith(expect.objectContaining({ des_senha: 'hash:123456' }));
    });
    it.each([
        [{ nom_completo: undefined }, /^Erro de validação:/],
        [{ ind_paciente: false }, /pelo menos um papel/],
        [{ ind_paciente: false, ind_medico: true }, /Senha é obrigatória/],
        [{ ind_costureira: true, des_senha: '123456' }, /cor para a costureira/],
        [{ num_cpf: '11111111111' }, /Erro de validação/]
    ])('validação %j', async (extra, msg) => {
        await expect(Service.criar(payload(extra), 1)).rejects.toThrow(msg);
        expect(PessoaModel.criar).not.toHaveBeenCalled();
    });
    it('CPF duplicado', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue({ id: 2 });
        await expect(Service.criar(payload(), 1)).rejects.toThrow('CPF já cadastrado');
    });
    it.failing('CPF/CEP com máscara deveriam ser aceitos (limpeza ocorre APÓS o Joi)', async () => {
        await expect(Service.criar(payload({ num_cpf: '111.444.777-35', num_cep: '74000-000' }), 1)).resolves.toBeDefined();
    });
    it.failing('CPF duplicado deveria ser ConflictError (409)', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue({ id: 2 });
        await expect(Service.criar(payload(), 1)).rejects.toMatchObject({ statusCode: 409 });
    });
});

describe('PessoaService – consultas', () => {
    it('buscarPorId encontrado/não encontrado', async () => {
        PessoaModel.buscarPorId.mockResolvedValueOnce(pessoaDb()).mockResolvedValueOnce(null);
        await expect(Service.buscarPorId(1, 9)).resolves.not.toHaveProperty('des_senha');
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'consultar', num_registro_id: 1 }));
        await expect(Service.buscarPorId(2, 9)).rejects.toThrow('Recurso não encontrado');
    });
    it.each(['123', null, undefined])('buscarPorCPF inválido: %p', async (cpf) => {
        await expect(Service.buscarPorCPF(cpf, 1)).rejects.toThrow('CPF inválido');
        expect(PessoaModel.buscarPorCPF).not.toHaveBeenCalled();
    });
    it('buscarPorCPF não encontrada (limpa máscara)', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(null);
        await expect(Service.buscarPorCPF('111.444.777-35', 1)).rejects.toThrow('Pessoa não encontrada');
        expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith(CPF);
    });
    it('buscarPorCPF sucesso: audita e oculta sensíveis', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(pessoaDb({ id: 3 }));
        const r = await Service.buscarPorCPF(CPF, 1);
        expect(r).toMatchObject({ id: 3 });
        //expect(r).not.toHaveProperty('num_cpf');
        expect(r).not.toHaveProperty('des_senha');
        expect(LogService.registrar.mock.calls[0][0]).toMatchObject({
            id_usuario: 1, num_registro_id: 3, des_detalhes: { tipo_consulta: 'buscar_por_cpf', cpf: CPF }
        });
    });
    it.each([['listar', 'listar', {}], ['listarPorPapel', 'buscarPorPapel', 'paciente']])('%s oculta sensíveis e loga total', async (metodo, modelo, arg) => {
        PessoaModel[modelo].mockResolvedValue([pessoaDb(), pessoaDb({ id: 2 })]);
        const r = await Service[metodo](arg, 1);
        expect(r).toHaveLength(2);
        r.forEach((p) => expect(p).not.toHaveProperty('des_senha'));
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.total_registros).toBe(2);
    });
    it.each([['listar', 'listar'], ['listarPorPapel', 'buscarPorPapel']])('%s propaga erro', async (metodo, modelo) => {
        PessoaModel[modelo].mockRejectedValue(new Error('db'));
        await expect(Service[metodo]('x', 1)).rejects.toThrow('db');
    });
    it('listar usa filtros padrão', async () => {
        PessoaModel.listar.mockResolvedValue([]);
        await Service.listar(undefined, 1);
        expect(PessoaModel.listar).toHaveBeenCalledWith({});
    });
});

describe('PessoaService.atualizar', () => {
    beforeEach(() => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb());
        PessoaModel.atualizar.mockResolvedValue(true);
    });

    it('não encontrado', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.atualizar(1, {}, 1)).rejects.toThrow('Recurso não encontrado');
    });
    it('sanitiza campos, aplica hash e loga', async () => {
        await Service.atualizar(1, { num_cep: '74000-000', num_celular_2: '(62) 3333-4444', des_senha: 'nova123' }, 9);
        expect(PessoaModel.atualizar).toHaveBeenCalledWith(1, { num_cep: '74000000', num_celular_2: '6233334444', des_senha: 'hash:nova123' });
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'editar', id_usuario: 9 }));
    });
    it('sanitiza celular 1', async () => {
        await Service.atualizar(1, { num_celular_1: '(62) 98888-7777' }, 1);
        expect(PessoaModel.atualizar).toHaveBeenCalledWith(1, { num_celular_1: '62988887777' });
    });
    it('mesmo CPF não verifica duplicidade', async () => {
        await Service.atualizar(1, { num_cpf: '111.444.777-35' }, 1);
        expect(PessoaModel.buscarPorCPF).not.toHaveBeenCalled();
    });
    it('CPF novo livre segue fluxo', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(null);
        await expect(Service.atualizar(1, { num_cpf: '52998224725' }, 1)).resolves.toBeDefined();
        expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith('52998224725');
    });
    it('CPF novo duplicado', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue({ id: 2 });
        await expect(Service.atualizar(1, { num_cpf: '52998224725' }, 1)).rejects.toThrow('CPF já cadastrado');
    });
    it('remover todos os papéis', async () => {
        await expect(Service.atualizar(1, { ind_paciente: false }, 1)).rejects.toThrow('ao menos um papel');
    });
    it('papel que exige senha sem senha existente', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb({ des_senha: null }));
        await expect(Service.atualizar(1, { ind_medico: true }, 1)).rejects.toThrow(/Senha é obrigatória/);
    });
    it('senha existente dispensa nova', async () => {
        await expect(Service.atualizar(1, { ind_medico: true }, 1)).resolves.toBeDefined();
        expect(bcrypt.hash).not.toHaveBeenCalled();
    });
    it('falha na persistência', async () => {
        PessoaModel.atualizar.mockResolvedValue(false);
        await expect(Service.atualizar(1, { nom_completo: 'X' }, 1)).rejects.toThrow('Erro ao atualizar pessoa');
    });
    it.failing('dados inválidos deveriam ser rejeitados (sem validação Joi no update)', async () => {
        await expect(Service.atualizar(1, { des_email_1: 'nao-e-email' }, 1)).rejects.toThrow();
    });
    it.failing('tornar costureira sem cor deveria falhar', async () => {
        await expect(Service.atualizar(1, { ind_costureira: true }, 1)).rejects.toThrow(/cor/);
    });
});

describe('PessoaService – deletar / ativarDesativar', () => {
    it('deletar', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb());
        PessoaModel.deletar.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        await expect(Service.deletar(1, 9)).resolves.toBe(true);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'deletar' }));
        await expect(Service.deletar(1, 9)).rejects.toThrow('Erro ao deletar pessoa');
    });
    it('deletar inexistente', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.deletar(1, 9)).rejects.toThrow('Recurso não encontrado');
    });
    it.each([['ativo', 'ativar'], ['inativo', 'desativar']])('ativarDesativar(%s)', async (status, acao) => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb());
        await expect(Service.ativarDesativar(1, status, 9)).resolves.toBe(true);
        expect(PessoaModel.atualizar).toHaveBeenCalledWith(1, { ind_status: status });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes.acao).toBe(acao);
    });
    it('ativarDesativar inexistente', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(null);
        await expect(Service.ativarDesativar(1, 'ativo', 9)).rejects.toThrow('Recurso não encontrado');
    });
    it.failing('status inválido deveria ser rejeitado', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(pessoaDb());
        await expect(Service.ativarDesativar(1, 'banido', 9)).rejects.toThrow();
    });
});

describe('PessoaService.listarCostureirasDisponiveis', () => {
    it('marca disponibilidade e loga', async () => {
        PessoaModel.buscarPorPapel.mockResolvedValue([pessoaDb({ id: 1 }), pessoaDb({ id: 2 })]);
        AgendamentoModel.buscarAgendamentoAtivoCostureira.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 50 });
        const r = await Service.listarCostureirasDisponiveis(9);
        expect(PessoaModel.buscarPorPapel).toHaveBeenCalledWith('costureira');
        expect(r[0]).toMatchObject({ disponivel: true, agendamento_ativo: null });
        expect(r[1]).toMatchObject({ disponivel: false, agendamento_ativo: { id: 50 } });
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).toMatchObject({ total: 2, disponiveis: 1 });
    });
    it('propaga erro', async () => {
        PessoaModel.buscarPorPapel.mockRejectedValue(new Error('db'));
        await expect(Service.listarCostureirasDisponiveis(9)).rejects.toThrow('db');
    });
});
