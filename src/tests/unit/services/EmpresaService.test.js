// /src/tests/unit/services/EmpresaService.test.js

jest.mock('../../../models/sistema/EmpresaModel', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarEmpresaPorId: jest.fn(),
    contarEmpresasAtivas: jest.fn(), atualizar: jest.fn(), deletar: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));

const Model = require('../../../models/sistema/EmpresaModel');
const LogService = require('../../../services/LogService');
const { NotFoundError } = require('../../../utils/ApiError');
const Service = require('../../../services/sistema/EmpresaService');

const payload = (extra = {}) => ({
    id_cidade: 1, ind_ativo: true, nom_fantasia: 'Ateliê', nom_razao_social: 'Ateliê Ltda',
    num_cnpj: '11444777000161', dta_abertura: '2020-01-01', des_logradouro: 'Rua A', num_endereco: '10',
    num_cep: '74000000', nom_bairro: 'Centro', num_celular_1: '62999999999', ind_whatsapp_2: true,
    des_email_1: 'contato@atelie.com', ...extra
});
const empresa = { id: 1, nom_fantasia: 'Ateliê', ind_ativo: 1 };

beforeEach(() => {
    jest.clearAllMocks();
    Model.criar.mockResolvedValue(7);
    Model.listar.mockResolvedValue([empresa]);
    Model.buscarEmpresaPorId.mockResolvedValue(empresa);
    Model.contarEmpresasAtivas.mockResolvedValue(1);
    Model.atualizar.mockResolvedValue(true);
    Model.deletar.mockResolvedValue(true);
});

describe('criar', () => {
    it('valida, persiste e audita', async () => {
        await expect(Service.criar(payload(), 9)).resolves.toBe(7);
        const enviado = Model.criar.mock.calls[0][0];
        expect(enviado.dta_abertura).toBeInstanceOf(Date);
        expect(enviado.num_inscricao_estadual).toBeNull();
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'criar', des_tabela: 'tab_empresa', num_registro_id: 7, id_usuario: 9
        }));
    });
    it.each([['"1"', '1', true], ['"0" (forçado para true)', '0', true], ['false (forçado para true)', false, true]])(
        'ind_ativo %s → %s', async (_, entrada, esperado) => {
            await Service.criar(payload({ ind_ativo: entrada }), 9);
            expect(Model.criar.mock.calls[0][0].ind_ativo).toBe(esperado);
        });
    it.each([
        ['CNPJ inválido', { num_cnpj: '11444777000100' }],
        ['data futura', { dta_abertura: '2999-01-01' }],
        ['e-mail inválido', { des_email_1: 'x' }],
        ['CEP curto', { num_cep: '7400' }]
    ])('%s → erro de validação', async (_, extra) => {
        await expect(Service.criar(payload(extra), 9)).rejects.toThrow(/^Erro de validação/);
        expect(Model.criar).not.toHaveBeenCalled();
    });
    it.failing('mensagem de CNPJ deveria ser "CNPJ inválido" (helpers.message)', async () => {
        await expect(Service.criar(payload({ num_cnpj: '11444777000100' }), 9)).rejects.toThrow('CNPJ inválido');
    });
    it.failing('validação deveria ser BadRequestError (400)', async () => {
        await expect(Service.criar({}, 9)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.failing('ind_ativo ausente deveria usar default (required() anula default)', async () => {
        const { ind_ativo, ...semAtivo } = payload();
        await expect(Service.criar(semAtivo, 9)).resolves.toBe(7);
    });
    it.failing('ind_whatsapp_2 ausente deveria usar default', async () => {
        const { ind_whatsapp_2, ...semWpp } = payload();
        await expect(Service.criar(semWpp, 9)).resolves.toBe(7);
    });
    it.failing('criar com ind_ativo=false deveria respeitar o valor enviado', async () => {
        await Service.criar(payload({ ind_ativo: false }), 9);
        expect(Model.criar.mock.calls[0][0].ind_ativo).toBe(false);
    });
});

describe('listar / buscarEmpresaPorId', () => {
    it('listar audita', async () => {
        await expect(Service.listar(9)).resolves.toEqual([empresa]);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'listar', des_detalhes: { tipo_consulta: 'listar_empresa', total_registros: 1 }
        }));
    });
    it('listar vazio → 404', async () => {
        Model.listar.mockResolvedValue([]);
        await expect(Service.listar(9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('buscarEmpresaPorId encontrado / 404', async () => {
        await expect(Service.buscarEmpresaPorId(1, 9)).resolves.toEqual(empresa);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'consultar', num_registro_id: 1 }));
        Model.buscarEmpresaPorId.mockResolvedValue(null);
        await expect(Service.buscarEmpresaPorId(1, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it.failing('log de consulta não deveria ter campos de parametrização', async () => {
        await Service.buscarEmpresaPorId(1, 9);
        expect(LogService.registrar.mock.calls[0][0].des_detalhes).not.toHaveProperty('hra_inicio');
    });
});

describe('atualizar', () => {
    it('atualiza e retorna registro recarregado', async () => {
        await expect(Service.atualizar(1, { nom_fantasia: 'Novo' }, 9)).resolves.toEqual(empresa);
        expect(Model.buscarEmpresaPorId).toHaveBeenCalledTimes(2);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'editar', id_usuario: 9 }));
    });
    it('inexistente → 404', async () => {
        Model.buscarEmpresaPorId.mockResolvedValue(null);
        await expect(Service.atualizar(1, {}, 9)).rejects.toBeInstanceOf(NotFoundError);
        expect(Model.atualizar).not.toHaveBeenCalled();
    });
    it.each([false, 0])('única ativa não pode ser desativada (ind_ativo=%s)', async (v) => {
        Model.contarEmpresasAtivas.mockResolvedValue(0);
        await expect(Service.atualizar(1, { ind_ativo: v }, 9)).rejects.toThrow(/único registro ativo/);
        expect(Model.atualizar).not.toHaveBeenCalled();
    });
    it('falha na persistência', async () => {
        Model.atualizar.mockResolvedValue(false);
        await expect(Service.atualizar(1, { nom_fantasia: 'X' }, 9)).rejects.toThrow('Erro ao atualizar empresa');
    });
    it.failing('desativar com outras ativas deveria persistir ind_ativo=false', async () => {
        await Service.atualizar(1, { ind_ativo: false }, 9);
        expect(Model.atualizar.mock.calls[0][1].ind_ativo).toBe(false);
    });
    it.failing('não deveria mutar o objeto recebido', async () => {
        const dados = { nom_fantasia: 'X' };
        await Service.atualizar(1, dados, 9);
        expect(dados).toEqual({ nom_fantasia: 'X' });
    });
    it.failing('deveria validar dados (CNPJ inválido)', async () => {
        await expect(Service.atualizar(1, { num_cnpj: '123' }, 9)).rejects.toMatchObject({ statusCode: 400 });
    });
    it.failing('desativar única ativa deveria ser ConflictError (409)', async () => {
        Model.contarEmpresasAtivas.mockResolvedValue(0);
        await expect(Service.atualizar(1, { ind_ativo: false }, 9)).rejects.toMatchObject({ statusCode: 409 });
    });
    it.failing('ind_ativo "0" (string) também deveria ser bloqueado para única ativa', async () => {
        Model.contarEmpresasAtivas.mockResolvedValue(0);
        await expect(Service.atualizar(1, { ind_ativo: '0' }, 9)).rejects.toThrow();
    });
});

describe('deletar', () => {
    it('soft delete e auditoria', async () => {
        await expect(Service.deletar(1, 9)).resolves.toBe(true);
        expect(Model.deletar).toHaveBeenCalledWith(1);
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            des_acao: 'deletar', num_registro_id: 1, des_detalhes: { empresa }
        }));
    });
    it('inexistente → 404', async () => {
        Model.buscarEmpresaPorId.mockResolvedValue(null);
        await expect(Service.deletar(1, 9)).rejects.toBeInstanceOf(NotFoundError);
    });
    it('única ativa não pode ser deletada', async () => {
        Model.contarEmpresasAtivas.mockResolvedValue(0);
        await expect(Service.deletar(1, 9)).rejects.toThrow(/único registro ativo/);
        expect(Model.deletar).not.toHaveBeenCalled();
    });
    it('falha na persistência', async () => {
        Model.deletar.mockResolvedValue(false);
        await expect(Service.deletar(1, 9)).rejects.toThrow('Erro ao deletar empresa');
    });
    it.failing('única ativa deveria ser ConflictError (409)', async () => {
        Model.contarEmpresasAtivas.mockResolvedValue(0);
        await expect(Service.deletar(1, 9)).rejects.toMatchObject({ statusCode: 409 });
    });
});
