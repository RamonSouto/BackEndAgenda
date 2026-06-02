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

    validarCPF(cpf) {
        if (!cpf || cpf.length !== 11) return false;
        if (/^(\d)\1+$/.test(cpf)) return false;

        // Algoritmo de validação de CPF
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(10))) return false;

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

    // Schema de validação de produto
    produtoSchema: Joi.object({
        id_categoria: Joi.number().integer().required(),
        nom_produto: Joi.string().min(3).max(200).required(),
        num_sku: Joi.string().min(3).max(50),
        des_produto: Joi.string().min(3).max(255),
        ref_produto: Joi.string().min(3).max(50),
        val_preco_base: Joi.number().precision(2),
        ind_ativo: Joi.boolean().default(true).required()
    }),

    // Schema de validação para categoria de produto
    categoriaProdutoSchema: Joi.object({
        nom_categoria: Joi.string().min(3).max(50).required(),
        id_pai: Joi.number().allow('', null),
    }),

    // Schema de validação para tamanho de produto
    tamanhoProdutoSchema: Joi.object({
        cod_tamanho: Joi.string().min(1).max(10).required(),
        des_tamanho: Joi.string().min(3).max(50).required(),
        des_categoria_tamanho: Joi.string().valid('vestuario', 'calcados', 'acessorios', 'outros').required(),
        num_ordem_exibicao: Joi.number().integer().allow('', null)
    }),

    // Schema de validação para cor e estampa de produto
    corEstampaProdutoSchema: Joi.object({
        nom_cor_estampa: Joi.string().min(3).max(10).required(),
        ind_tipo: Joi.string().valid('cor', 'estampa').required(),
        val_codigo_hex: Joi.string().min(6).max(7).allow('', null),
        des_imagem_url: Joi.string().max(500).allow('', null),
        num_ordem_exibicao: Joi.number().integer().allow('', null)
    }),

    // Schema de validação para grade de produto
    gradeProdutoSchema: Joi.object({
        id_produto: Joi.number().integer().required(),
        id_variacao_cor_estampa: Joi.number().integer().required(),
        id_tamanho: Joi.number().integer().required(),
        num_sku: Joi.string().min(3).max(50).allow('', null),
        val_preco_variacao: Joi.number().precision(2),
        ind_ativo: Joi.boolean().required(),
        num_codigo_barras: Joi.string().min(3).max(13).allow('', null)
    }),

    // Schema de validação para imagem de produto
    imagemProdutoSchema: Joi.object({
        id_produto_grade: Joi.number().integer(),
        id_produto: Joi.number().integer(),
        des_url_imagem: Joi.string().min(3).max(500).required(),
        num_ordem: Joi.number().integer(),
        ind_principal: Joi.boolean().default(false).required()
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
