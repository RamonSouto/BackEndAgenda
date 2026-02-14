const Joi = require('joi');

const validators = {
    // Validação de CPF
    cpfValido(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let soma = 0;
        let resto;

        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }

        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;

        soma = 0;
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }

        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;

        return true;
    },

    // Schema de validação para cadastro de pessoa
    pessoaSchema: Joi.object({
        id_cidade: Joi.number().integer().required(),
        ind_status: Joi.string().valid('ativo', 'inativo').default('ativo'),
        ind_tipo_pessoa: Joi.string().valid('medico', 'secretaria', 'costureira', 'paciente', 'administrador').required(),
        nom_completo: Joi.string().max(255).required(),
        num_cpf: Joi.string().length(11).required().custom((value, helpers) => {
            if (!validators.cpfValido(value)) {
                return helpers.error('any.invalid');
            }
            return value;
        }),
        num_rg: Joi.string().max(20).required(),
        dta_nascimento: Joi.date().max('now').required(),
        des_logradouro: Joi.string().max(255).required(),
        num_endereco: Joi.string().max(10).required(),
        des_complemento: Joi.string().max(100).allow('', null),
        num_cep: Joi.string().length(8).required(),
        nom_bairro: Joi.string().max(100).required(),
        num_celular_1: Joi.string().max(15).required(),
        ind_whatsapp_1: Joi.boolean().default(true),
        num_celular_2: Joi.string().max(15).allow('', null),
        ind_whatsapp_2: Joi.boolean().default(true),
        des_email_1: Joi.string().email().max(255).required(),
        des_email_2: Joi.string().email().max(255).allow('', null),
        des_senha: Joi.string().min(6).when('ind_tipo_pessoa', {
            is: Joi.valid('secretaria', 'costureira', 'administrador', 'medico'),
            then: Joi.required(),
            otherwise: Joi.allow('', null)
        })
    }),

    // Schema de validação para agendamento
    agendamentoSchema: Joi.object({
        id_paciente: Joi.number().integer().required(),
        id_costureira: Joi.number().integer().required(),
        id_secretaria: Joi.number().integer().required(),
        dta_agendamento: Joi.date().greater('now').required(),
        des_observacoes_geral: Joi.string().allow('', null),
        des_observacoes_costureira: Joi.string().allow('', null),
        produtos: Joi.array().items(
            Joi.object({
                id_produto_grade: Joi.number().integer().required(),
                des_ajuste_produto: Joi.string().allow('', null)
            })
        ).min(1)
    }),

    // Schema de validação para login
    loginSchema: Joi.object({
        num_cpf: Joi.string().length(11).required(),
        des_senha: Joi.string().required()
    }),

    // Schema de validação para atualização de comparecimento
    comparecimentoSchema: Joi.object({
        ind_paciente_compareceu: Joi.boolean().required(),
        des_observacoes_costureira: Joi.string().allow('', null)
    })
};

module.exports = validators;
