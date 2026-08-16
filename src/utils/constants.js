const PAPEIS_PESSOA = {
    MEDICO: 'medico',
    SECRETARIA: 'secretaria',
    COSTUREIRA: 'costureira',
    PACIENTE: 'paciente',
    ADMINISTRADOR: 'administrador'
};

const COLUNAS_PAPEIS_PESSOA = {
    [PAPEIS_PESSOA.MEDICO]: 'ind_medico',
    [PAPEIS_PESSOA.SECRETARIA]: 'ind_secretaria',
    [PAPEIS_PESSOA.COSTUREIRA]: 'ind_costureira',
    [PAPEIS_PESSOA.PACIENTE]: 'ind_paciente',
    [PAPEIS_PESSOA.ADMINISTRADOR]: 'ind_administrador'
};

const STATUS_PESSOA = {
    ATIVO: 'ativo',
    INATIVO: 'inativo'
};

const STATUS_AGENDAMENTO = {
    AGENDADO: 'agendado',
    CONFIRMADO: 'confirmado',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado',
    FALTA: 'falta'
};

const STATUS_PRODUTO_AGENDAMENTO = {
    PENDENTE: 'pendente',
    PRODUCAO: 'producao',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado'
};

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
        'agendamento:criar',
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

module.exports = {
    PAPEIS_PESSOA,
    COLUNAS_PAPEIS_PESSOA,
    STATUS_PESSOA,
    STATUS_AGENDAMENTO,
    STATUS_PRODUTO_AGENDAMENTO,
    ACOES_LOG,
    PERMISSOES,
    MENSAGENS
};
