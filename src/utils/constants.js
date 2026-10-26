// src/utils/constants.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/constants.js
 * @description Centraliza todas as constantes da aplicação.
 * Define papéis de usuário, status, permissões, ações de log e mensagens padronizadas.
 * 
 * @module constants
 */

/**
 * Papéis (roles) de pessoa no sistema.
 * 
 * @constant {Object} PAPEIS_PESSOA
 * @property {string} MEDICO - Papel de médico.
 * @property {string} SECRETARIA - Papel de secretária.
 * @property {string} COSTUREIRA - Papel de costureira.
 * @property {string} PACIENTE - Papel de paciente.
 * @property {string} ADMINISTRADOR - Papel de administrador.
 * 
 * @example
 * const { PAPEIS_PESSOA } = require('./constants');
 * if (usuario.papel === PAPEIS_PESSOA.ADMINISTRADOR) { ... }
 */
const PAPEIS_PESSOA = {
    MEDICO: 'medico',
    SECRETARIA: 'secretaria',
    COSTUREIRA: 'costureira',
    PACIENTE: 'paciente',
    ADMINISTRADOR: 'administrador'
};

/**
 * Mapeamento de papéis para colunas booleanas na tabela `tab_pessoas`.
 * 
 * @constant {Object} COLUNAS_PAPEIS_PESSOA
 * @property {string} medico - Nome da coluna 'ind_medico'.
 * @property {string} secretaria - Nome da coluna 'ind_secretaria'.
 * @property {string} costureira - Nome da coluna 'ind_costureira'.
 * @property {string} paciente - Nome da coluna 'ind_paciente'.
 * @property {string} administrador - Nome da coluna 'ind_administrador'.
 * 
 * @example
 * const coluna = COLUNAS_PAPEIS_PESSOA[PAPEIS_PESSOA.MEDICO]; // 'ind_medico'
 */
const COLUNAS_PAPEIS_PESSOA = {
    [PAPEIS_PESSOA.MEDICO]: 'ind_medico',
    [PAPEIS_PESSOA.SECRETARIA]: 'ind_secretaria',
    [PAPEIS_PESSOA.COSTUREIRA]: 'ind_costureira',
    [PAPEIS_PESSOA.PACIENTE]: 'ind_paciente',
    [PAPEIS_PESSOA.ADMINISTRADOR]: 'ind_administrador'
};

/**
 * Status de uma pessoa (ativação/desativação).
 * 
 * @constant {Object} STATUS_PESSOA
 * @property {string} ATIVO - Status ativo.
 * @property {string} INATIVO - Status inativo.
 */
const STATUS_PESSOA = {
    ATIVO: 'ativo',
    INATIVO: 'inativo'
};

/**
 * Status de um agendamento.
 * 
 * @constant {Object} STATUS_AGENDAMENTO
 * @property {string} AGENDADO - Agendado (pendente de confirmação).
 * @property {string} CONFIRMADO - Confirmado pelo paciente.
 * @property {string} CONCLUIDO - Concluído (atendimento realizado).
 * @property {string} CANCELADO - Cancelado.
 * @property {string} FALTA - Paciente faltou.
 */
const STATUS_AGENDAMENTO = {
    AGENDADO: 'agendado',
    CONFIRMADO: 'confirmado',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado',
    FALTA: 'falta'
};

/**
 * Status de um produto dentro de um agendamento.
 * 
 * @constant {Object} STATUS_PRODUTO_AGENDAMENTO
 * @property {string} PENDENTE - Aguardando início.
 * @property {string} PRODUCAO - Em produção/ajuste.
 * @property {string} CONCLUIDO - Concluído.
 * @property {string} CANCELADO - Cancelado.
 */
const STATUS_PRODUTO_AGENDAMENTO = {
    PENDENTE: 'pendente',
    PRODUCAO: 'producao',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado'
};

/**
 * Tipos de ações registradas nos logs de auditoria.
 * 
 * @constant {Object} ACOES_LOG
 * @property {string} LOGIN - Login do usuário.
 * @property {string} LOGOUT - Logout do usuário.
 * @property {string} CRIAR - Criação de registro.
 * @property {string} EDITAR - Edição de registro.
 * @property {string} DELETAR - Exclusão de registro.
 * @property {string} CONSULTAR - Consulta a registro.
 * @property {string} LISTAR - Listagem de registros.
 * @property {string} UPLOAD - Upload de arquivo.
 * @property {string} AGENDAMENTO_CRIAR - Criação de agendamento.
 * @property {string} AGENDAMENTO_EDITAR - Edição de agendamento.
 * @property {string} AGENDAMENTO_CANCELAR - Cancelamento de agendamento.
 * @property {string} COMPARECIMENTO - Registro de comparecimento.
 * @property {string} OBSERVACAO - Adição de observação.
 */
const ACOES_LOG = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CRIAR: 'criar',
    EDITAR: 'editar',
    DELETAR: 'deletar',
    CONSULTAR: 'consultar',
    LISTAR: 'listar',
    UPLOAD: 'upload',
    AGENDAMENTO_CRIAR: 'agendamento_criar',
    AGENDAMENTO_EDITAR: 'agendamento_editar',
    AGENDAMENTO_CANCELAR: 'agendamento_cancelar',
    COMPARECIMENTO: 'registrar_comparecimento',
    OBSERVACAO: 'adicionar_observacao'
};

/**
 * Permissões associadas a cada papel.
 * 
 * @constant {Object} PERMISSOES
 * @property {string[]} administrador - ['*'] (super permissão).
 * @property {string[]} secretaria - Permissões de secretária.
 * @property {string[]} costureira - Permissões de costureira.
 * @property {string[]} paciente - [] (sem permissões).
 * @property {string[]} medico - Permissões de médico.
 * 
 * @description
 * - `'*'` indica super permissão (acesso a tudo).
 * - As permissões seguem o padrão `recurso:acao` (ex: `paciente:consultar`).
 */
const PERMISSOES = {
    [PAPEIS_PESSOA.ADMINISTRADOR]: ['*'],
    [PAPEIS_PESSOA.SECRETARIA]: [
        'paciente:consultar',
        'paciente:criar',
        'agendamento:criar',
        'agendamento:editar_proprio',
        'agendamento:deletar_proprio',
        'agendamento:visualizar'
    ],
    [PAPEIS_PESSOA.COSTUREIRA]: [
        'agendamento:visualizar_proprio',
        'agendamento:editar_proprio',
        'agendamento:comparecimento',
        'agendamento:observacao',
        'foto:upload'
    ],
    [PAPEIS_PESSOA.PACIENTE]: [],
    [PAPEIS_PESSOA.MEDICO]: [
        'agendamento:visualizar',
        'relatorio:visualizar'
    ]
};

/**
 * Mensagens padronizadas de erro e sucesso.
 * 
 * @constant {Object} MENSAGENS
 * @property {Object} ERRO - Mensagens de erro.
 * @property {Object} SUCESSO - Mensagens de sucesso.
 * 
 * @description
 * As mensagens são utilizadas em respostas da API para garantir consistência.
 */
const MENSAGENS = {
    ERRO: {
        SERVIDOR: 'Erro interno do servidor',
        NAO_AUTORIZADO: 'Não autorizado',
        NAO_ENCONTRADO: 'Recurso não encontrado',
        VALIDACAO: 'Erro de validação',
        CPF_EXISTENTE: 'CPF já cadastrado',
        CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
        CONTA_BLOQUEADA: 'Conta bloqueada por excesso de tentativas',
        COSTUREIRA_OCUPADA: 'Costureira já possui um agendamento ativo neste horario',
        PRAZO_CANCELAMENTO: 'Não é possível cancelar com menos de 2 horas de antecedência',
        CATEGORIA_PAI: 'Categoria pai não encontrado',
        CATEGORIA_FILHO: 'Não é possível excluir esta categoria, pois há outras subcategoria(s) vinculada(s) a ela'
    },
    SUCESSO: {
        CRIADO: 'Registro criado com sucesso',
        ATUALIZADO: 'Registro atualizado com sucesso',
        DELETADO: 'Registro deletado com sucesso',
        LOGIN: 'Login realizado com sucesso'
    }
};
/**
 * Limites de fotos de ajuste por item agendado.
 *
 * @constant {Object} LIMITES_FOTO
 * @property {number} MAX_POR_REQUISICAO - Máximo de arquivos por upload.
 * @property {number} MAX_POR_ITEM - Máximo de fotos ativas por item.
 */
const LIMITES_FOTO = {
    MAX_POR_REQUISICAO: 10,
    MAX_POR_ITEM: 10
};

module.exports = {
    PAPEIS_PESSOA,
    COLUNAS_PAPEIS_PESSOA,
    STATUS_PESSOA,
    STATUS_AGENDAMENTO,
    STATUS_PRODUTO_AGENDAMENTO,
    ACOES_LOG,
    PERMISSOES,
    MENSAGENS,
    LIMITES_FOTO
};
