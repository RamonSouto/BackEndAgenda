module.exports = {
    TIPO_PESSOA: {
        MEDICO: 'medico',
        SECRETARIA: 'secretaria',
        COSTUREIRA: 'costureira',
        PACIENTE: 'paciente',
        ADMINISTRADOR: 'administrador'
    },

    STATUS_PESSOA: {
        ATIVO: 'ativo',
        INATIVO: 'inativo'
    },

    STATUS_AGENDAMENTO: {
        AGENDADO: 'agendado',
        CONFIRMADO: 'confirmado',
        CONCLUIDO: 'concluido',
        CANCELADO: 'cancelado',
        FALTA: 'falta'
    },

    STATUS_PRODUTO_AGENDAMENTO: {
        PENDENTE: 'pendente',
        PRODUCAO: 'producao',
        CONCLUIDO: 'concluido',
        CANCELADO: 'cancelado'
    },

    ACOES_LOG: {
        LOGIN: 'login',
        LOGOUT: 'logout',
        CRIAR: 'criar',
        EDITAR: 'editar',
        DELETAR: 'deletar',
        CONSULTAR: 'consultar',
        UPLOAD: 'upload',
        AGENDAMENTO_CRIAR: 'agendamento_criar',
        AGENDAMENTO_EDITAR: 'agendamento_editar',
        AGENDAMENTO_CANCELAR: 'agendamento_cancelar',
        COMPARECIMENTO: 'registrar_comparecimento',
        OBSERVACAO: 'adicionar_observacao'
    },

    PERMISSOES: {
        [this.TIPO_PESSOA?.ADMINISTRADOR]: ['*'], // Todas as permissões
        [this.TIPO_PESSOA?.SECRETARIA]: [
            'paciente:consultar',
            'paciente:criar',
            'agendamento:criar',
            'agendamento:editar_proprio',
            'agendamento:deletar_proprio',
            'agendamento:visualizar'
        ],
        [this.TIPO_PESSOA?.COSTUREIRA]: [
            'agendamento:visualizar_proprio',
            'agendamento:criar',
            'agendamento:editar_proprio',
            'agendamento:comparecimento',
            'agendamento:observacao',
            'foto:upload'
        ],
        [this.TIPO_PESSOA?.PACIENTE]: [],
        [this.TIPO_PESSOA?.MEDICO]: [
            'agendamento:visualizar',
            'relatorio:visualizar'
        ]
    },

    MENSAGENS: {
        ERRO: {
            SERVIDOR: 'Erro interno do servidor',
            NAO_AUTORIZADO: 'Não autorizado',
            NAO_ENCONTRADO: 'Recurso não encontrado',
            VALIDACAO: 'Erro de validação',
            CPF_EXISTENTE: 'CPF já cadastrado',
            CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
            CONTA_BLOQUEADA: 'Conta bloqueada por excesso de tentativas',
            COSTUREIRA_OCUPADA: 'Costureira já possui um agendamento ativo',
            PRAZO_CANCELAMENTO: 'Não é possível cancelar com menos de 2 horas de antecedência'
        },
        SUCESSO: {
            CRIADO: 'Registro criado com sucesso',
            ATUALIZADO: 'Registro atualizado com sucesso',
            DELETADO: 'Registro deletado com sucesso',
            LOGIN: 'Login realizado com sucesso'
        }
    }
};
