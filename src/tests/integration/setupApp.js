// src/tests/integration/setupApp.js
jest.mock('yamljs', () => ({ load: () => ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }) }));
jest.mock('../../config/database', () => ({ query: jest.fn(), transaction: jest.fn(), connect: jest.fn() }));
jest.mock('../../config/logger', () => {
    const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), log: jest.fn() };
    l.child = () => l;
    return l;
});
jest.mock('../../services/UploadService', () => ({
    getMulterConfig: () => ({ storage: require('multer').memoryStorage() }),
    validarArquivo: jest.fn(), deletarArquivo: jest.fn().mockResolvedValue(),
    formatarTamanhoArquivo: () => '5MB', maxFileSize: 5242880, inicializar: jest.fn()
}));
jest.mock('../../services/agendamento/AgendamentoService', () => ({
    criar: jest.fn(), listarAgendamentos: jest.fn(), buscarAgendamentoCompleto: jest.fn(),
    atualizar: jest.fn(), trocarCostureira: jest.fn(), alterarStatus: jest.fn(),
    deletarAgendamento: jest.fn(), verificarDisponibilidade: jest.fn(),
    criarAgendamentoPublico: jest.fn(), buscarPorUuidPublico: jest.fn()
}));
