// src/utils/validators.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module validators
 * @description Centraliza funções de validação de domínio (CPF, CNPJ) e schemas Joi
 * para validação de dados de entrada em toda a aplicação.
 * 
 * @requires joi
 */
const Joi = require('joi');

const validators = {

    /**
     * Valida um CPF (com ou sem máscara).
     * 
     * @function validarCPF
     * @param {string} cpf - CPF a ser validado (pode conter pontos e traço).
     * @returns {boolean} `true` se o CPF for válido, `false` caso contrário.
     * 
     * @example
     * validarCPF('123.456.789-09'); // false (CPF inválido)
     * validarCPF('11144477735');    // true (CPF válido)
     */
    validarCPF(cpf) {

        if (typeof cpf !== 'string' && typeof cpf !== 'number') return false;
        cpf = String(cpf);

        cpf = cpf.replace(/[^\d]/g, '');

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        const calcularDigito = (base, pesoInicial) => {
            let soma = 0;
            for (let i = 0; i < base.length; i++) {
                soma += parseInt(base.charAt(i), 10) * (pesoInicial - i);
            }
            const resto = (soma * 10) % 11;
            return resto === 10 ? 0 : resto;
        };

        const primeiroDV = calcularDigito(cpf.substring(0, 9), 10);
        if (primeiroDV !== parseInt(cpf.charAt(9), 10)) {
            return false;
        }

        const segundoDV = calcularDigito(cpf.substring(0, 10), 11);
        if (segundoDV !== parseInt(cpf.charAt(10), 10)) {
            return false;
        }

        return true;
    },


    /**
     * Valida um CNPJ (com ou sem máscara).
     * 
     * @function validarCNPJ
     * @param {string} cnpj - CNPJ a ser validado (pode conter pontos, barras, hífen).
     * @returns {boolean} `true` se o CNPJ for válido, `false` caso contrário.
     * 
     * @example
     * validarCNPJ('12.345.678/0001-95'); // false (inválido)
     * validarCNPJ('11444777000161');      // true (CNPJ válido)
     */
    validarCNPJ(cnpj) {
        // 1. Proteção contra entradas nulas/indefinidas
        if (!cnpj || typeof cnpj !== 'string') return false;

        // 2. Remove caracteres não numéricos
        const numeros = cnpj.replace(/\D/g, '');

        // 3. Verifica comprimento e dígitos repetidos
        if (numeros.length !== 14) return false;
        if (/^(\d)\1{13}$/.test(numeros)) return false;

        // 4. Cálculo do primeiro dígito verificador
        let soma = 0;
        let peso = 5;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso--;
            if (peso < 2) peso = 9;
        }
        let resto = soma % 11;
        const digito1 = resto < 2 ? 0 : 11 - resto;
        if (parseInt(numeros.charAt(12)) !== digito1) return false;

        // 5. Cálculo do segundo dígito verificador
        soma = 0;
        peso = 6;
        for (let i = 0; i < 13; i++) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso--;
            if (peso < 2) peso = 9;
        }
        resto = soma % 11;
        const digito2 = resto < 2 ? 0 : 11 - resto;
        if (parseInt(numeros.charAt(13)) !== digito2) return false;

        return true;
    },


    valoresIguais(a, b) {
        // Normaliza null/undefined
        const na = a === undefined ? null : a;
        const nb = b === undefined ? null : b;

        if (na === nb) return true;

        // Datas
        if (na instanceof Date || nb instanceof Date) {
            const da = na ? new Date(na).getTime() : null;
            const db = nb ? new Date(nb).getTime() : null;
            return da === db;
        }

        // Números (request costuma vir string)
        if (
            (typeof na === 'number' || !isNaN(Number(na))) &&
            (typeof nb === 'number' || !isNaN(Number(nb))) &&
            na !== '' && nb !== '' && na !== null && nb !== null
        ) {
            return Number(na) === Number(nb);
        }

        // Booleanos
        if (typeof na === 'boolean' || typeof nb === 'boolean') {
            return Boolean(na) === Boolean(nb);
        }

        // Objetos/arrays
        if (typeof na === 'object' && typeof nb === 'object') {
            return JSON.stringify(na) === JSON.stringify(nb);
        }

        // Strings
        return String(na) === String(nb);
    },

    /**
     * Sistema
     */
    /**
     * Schema para validação de login (CPF + senha).
     * 
     * @type {Joi.ObjectSchema}
     */
    loginSchema: Joi.object({
        num_cpf: Joi.string().length(11).required(),
        des_senha: Joi.string().required()
    }),

    /**
     * Schema para validação de dados de empresa.
     * 
     * @type {Joi.ObjectSchema}
     * @property {number} id_cidade - ID da cidade (obrigatório).
     * @property {boolean} ind_ativo - Indica se está ativo (padrão: true).
     * @property {string} nom_fantasia - Nome fantasia (até 100 caracteres).
     * @property {string} nom_razao_social - Razão social (até 100 caracteres).
     * @property {string} num_cnpj - CNPJ com 14 dígitos (validado).
     * @property {string|null} num_inscricao_estadual - Inscrição estadual (opcional).
     * @property {Date} dta_abertura - Data de abertura (não pode ser futura).
     * @property {string} des_logradouro - Logradouro.
     * @property {string} num_endereco - Número do endereço.
     * @property {string} des_complemento - Complemento (opcional).
     * @property {string} num_cep - CEP com 8 dígitos.
     * @property {string} nom_bairro - Bairro.
     * @property {string} num_celular_1 - Celular principal (obrigatório).
     * @property {boolean} ind_whatsapp_1 - WhatsApp principal (padrão: true).
     * @property {string} num_celular_2 - Celular secundário (opcional).
     * @property {boolean} ind_whatsapp_2 - WhatsApp secundário (padrão: true).
     * @property {string} des_email_1 - E-mail principal (obrigatório).
     * @property {string} des_email_2 - E-mail secundário (opcional).
     * @property {string} val_cor_principal - Cor principal (hex, sem #, opcional).
     * @property {string} des_url_logo_vertical - URL da logo vertical (opcional).
     * @property {string} des_url_logo_horizontal - URL da logo horizontal (opcional).
     * @property {string} des_url_logo_vertical_negativa - URL da logo vertical negativa (opcional).
     * @property {string} des_url_logo_horizontal_negativa - URL da logo horizontal negativa (opcional).
     */
    empresaSchema: Joi.object({
        id_cidade: Joi.number().integer().required(),
        ind_ativo: Joi.alternatives()
            .try(Joi.boolean(), Joi.string().valid('1', '0'))
            .custom((value, helpers) => {
                if (typeof value === 'string') return value === '1';
                return value;
            })
            .default(true).required(),
        nom_fantasia: Joi.string().max(100).required(),
        nom_razao_social: Joi.string().max(100).required(),
        num_cnpj: Joi.string().length(14).required().custom((value, helpers) => {
            if (!validators.validarCNPJ(value)) {
                return helpers.error('any.invalid', { message: 'CNPJ inválido' });
            }
            return value;
        }),
        num_inscricao_estadual: Joi.string().max(20).default(null).allow(null),
        dta_abertura: Joi.date().max('now').required(),
        des_logradouro: Joi.string().max(255).required(),
        num_endereco: Joi.string().max(10),
        des_complemento: Joi.string().max(100).allow('', null),
        num_cep: Joi.string().length(8).required(),
        nom_bairro: Joi.string().max(100).required(),
        num_celular_1: Joi.string().max(15).required(),
        ind_whatsapp_1: Joi.boolean().default(true),
        num_celular_2: Joi.string().max(15).allow('', null),
        ind_whatsapp_2: Joi.boolean().default(true).required(),
        des_email_1: Joi.string().email().max(255).required(),
        des_email_2: Joi.string().email().max(255).allow('', null),
        val_cor_principal: Joi.string().max(6).allow('', null),
        des_url_logo_vertical: Joi.string().max(255).allow('', null),
        des_url_logo_horizontal: Joi.string().max(255).allow('', null),
        des_url_logo_vertical_negativa: Joi.string().max(255).allow('', null),
        des_url_logo_horizontal_negativa: Joi.string().max(255).allow('', null)
    }),

    /**
     * Schema para validação de parametrização de horários.
     * 
     * @type {Joi.ObjectSchema}
     */
    parametrizacaoSchema: Joi.object({
        des_tipo_dia: Joi.string().trim().uppercase().required().valid('UTIL', 'SABADO'),
        hra_inicio: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('O campo tem que estar no formato váido HH:MM:SS').required(),
        hra_fim: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('O campo tem que estar no formato váido HH:MM:SS').required(),
        qtd_minutos_intervalo: Joi.number().integer().required(),
        ind_ativo: Joi.boolean().required(),
    }),



    /**
     * Produto
     */
    /**
     * Schema para validação de produto.
     * 
     * @type {Joi.ObjectSchema}
     */
    produtoSchema: Joi.object({
        id_categoria: Joi.number().integer().required(),
        nom_produto: Joi.string().min(3).max(200).required(),
        num_sku: Joi.string().min(3).max(50),
        des_produto: Joi.string().min(3).max(255),
        ref_produto: Joi.string().min(3).max(50),
        val_preco_base: Joi.number().precision(2),
        ind_ativo: Joi.boolean().default(true).required()
    }),

    /**
     * Schema para validação de tipo de serviço (ajuste).
     * 
     * @type {Joi.ObjectSchema}
     */
    tipoServicoSchema: Joi.object({
        des_tipo_ajuste: Joi.string().min(3).max(200).required(),
        ind_ativo: Joi.boolean().default(true).required()
    }),

    /**
     * Schema para validação de associação produto-serviço.
     * 
     * @type {Joi.ObjectSchema}
     */
    produtoServicoSchema: Joi.object({
        id_produto: Joi.number().integer().required(),
        id_tipo_servico: Joi.number().integer().required(),
        ind_ativo: Joi.boolean().default(true).required()
    }),

    /**
     * Schema para validação de preço de produto-serviço.
     * 
     * @type {Joi.ObjectSchema}
     */
    precoProdutoServicoSchema: Joi.object({
        id_produto_servico: Joi.number().integer().required(),
        val_preco: Joi.number().positive().required(),
        dta_inicio: Joi.date().required(),
    }),

    /**
     * Schema para validação de categoria de produto.
     * 
     * @type {Joi.ObjectSchema}
     */
    categoriaProdutoSchema: Joi.object({
        nom_categoria: Joi.string().min(3).max(50).required(),
        id_pai: Joi.number().allow('', null),
    }),

    /**
     * Schema para validação de tamanho de produto.
     * 
     * @type {Joi.ObjectSchema}
     */
    tamanhoProdutoSchema: Joi.object({
        cod_tamanho: Joi.string().min(1).max(10).required(),
        des_tamanho: Joi.string().min(3).max(50).required(),
        des_categoria_tamanho: Joi.string().valid('vestuario', 'calcados', 'acessorios', 'outros').required(),
        num_ordem_exibicao: Joi.number().integer().allow('', null)
    }),

    /**
     * Schema para validação de cor/estampa de produto.
     * 
     * @type {Joi.ObjectSchema}
     */
    corEstampaProdutoSchema: Joi.object({
        nom_cor_estampa: Joi.string().min(3).max(50).required(),
        ind_tipo: Joi.string().valid('cor', 'estampa').required(),
        val_codigo_hex: Joi.string().min(6).max(7).allow('', null),
        des_imagem_url: Joi.string().max(500).allow('', null),
        num_ordem_exibicao: Joi.number().integer().allow('', null)
    }),

    /**
     * Schema para validação de grade de produto (variação).
     * 
     * @type {Joi.ObjectSchema}
     */
    gradeProdutoSchema: Joi.object({
        id_produto: Joi.number().integer().required(),
        id_variacao_cor_estampa: Joi.number().integer().required(),
        id_tamanho: Joi.number().integer().required(),
        num_sku: Joi.string().min(3).max(50).allow('', null),
        val_preco_variacao: Joi.number().precision(2),
        ind_ativo: Joi.boolean().required(),
        num_codigo_barras: Joi.string().min(3).max(13).allow('', null)
    }),

    /**
     * Schema para validação de imagem de produto.
     * Possui regra exclusiva: deve ter `id_produto_grade` ou `id_produto`, não ambos.
     * 
     * @type {Joi.ObjectSchema}
     */
    imagemProdutoSchema: Joi.object({
        id_produto_grade: Joi.allow(null, '', 'null', 'undefined').optional(),
        id_produto: Joi.allow(null, '', 'null', 'undefined').optional(),
        des_titulo_imagem: Joi.string().min(3).max(500),
        des_imagem: Joi.string().min(3).max(500),
        des_url_imagem: Joi.string().min(3).max(500).required(),
        num_ordem: Joi.number().integer(),
        ind_principal: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false).required(),
    }).custom((value, helpers) => {
        const { id_produto_grade, id_produto } = value;

        const temGrade = id_produto_grade !== undefined && id_produto_grade !== null && id_produto_grade !== '';
        const temProduto = id_produto !== undefined && id_produto !== null && id_produto !== '';

        if (!temGrade && !temProduto) {
            return helpers.error('any.invalid', {
                message: 'É necessário informar id_produto_grade ou id_produto (pelo menos um).'
            });
        }

        if (temGrade && temProduto) {
            return helpers.error('any.invalid', {
                message: 'Informe apenas um dos campos: id_produto_grade ou id_produto, não ambos.'
            });
        }

        return value;
    }),



    /**
     * Pessoa
     */
    /**
     * Schema para validação de dados de pessoa (física).
     * Possui validações condicionais: pelo menos um papel, senha obrigatória
     * para certos papéis, e cor obrigatória para costureira.
     * 
     * @type {Joi.ObjectSchema}
     */
    pessoaSchema: Joi.object({
        id_cidade: Joi.number().integer().required(),
        ind_status: Joi.string().valid('ativo', 'inativo').default('ativo'),

        ind_medico: Joi.boolean().default(false),
        ind_secretaria: Joi.boolean().default(false),
        ind_costureira: Joi.boolean().default(false),
        ind_paciente: Joi.boolean().default(false),
        ind_administrador: Joi.boolean().default(false),
        nom_completo: Joi.string().max(255).required(),
        num_cpf: Joi.string().length(11).required().custom((value, helpers) => {
            if (!validators.validarCPF(value)) {
                return helpers.error('any.invalid', { message: 'CPF inválido' });
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
        des_senha: Joi.string().min(6).allow('', null),
        val_cor_hex: Joi.string().min(6).max(6).allow('', null)
    }).custom((value, helpers) => {
        const possuiAlgumPapel =
            value.ind_medico ||
            value.ind_secretaria ||
            value.ind_costureira ||
            value.ind_paciente ||
            value.ind_administrador;

        if (!possuiAlgumPapel) {
            return helpers.error('any.invalid', {
                message: 'É necessário informar pelo menos um papel para a pessoa.'
            });
        }

        const exigeSenha =
            value.ind_medico ||
            value.ind_secretaria ||
            value.ind_costureira ||
            value.ind_administrador;

        if (exigeSenha && !value.des_senha) {
            return helpers.error('any.invalid', {
                message: 'Senha é obrigatória para médico, secretária, costureira ou administrador.'
            });
        }

        const exigeCor = value.ind_costureira;

        if (exigeCor && !value.val_cor_hex) {
            return helpers.error('any.invalid', { message: 'É necessário informar uma cor para a costureira' })
        }

        return value;
    }),



    /**
     * Agendamento
     */
    // Adicionar dentro do objeto `validators`, junto aos demais schemas de Produto/Sistema

    /**
     * Item de serviço dentro de um agendamento (produto + serviço + tipo).
     * Reutilizado tanto no agendamento completo quanto na adição unitária de item.
     */
    itemAgendamentoSchema: Joi.object({
        id_produto_grade: Joi.number().integer().required(),
        id_produto_servico: Joi.number().integer().required(),
        id_tipo_agendamento: Joi.number().integer().required(),
        des_ajuste_produto: Joi.string().max(1000).allow('', null),
        val_desconto_servico: Joi.number().min(0).precision(2).default(0)
    }),

    /**
     * Schema para criação de agendamento completo (cabeçalho + itens).
     * Uso: rota interna POST /api/agendamentos
     *
     * @type {Joi.ObjectSchema}
     */
    agendamentoSchema: Joi.object({
        id_paciente: Joi.number().integer().required(),
        id_costureira: Joi.number().integer().required(),
        id_secretaria: Joi.number().integer().allow(null),
        dta_agendamento: Joi.date().greater('now').required()
            .messages({ 'date.greater': 'A data do agendamento deve ser futura' }),
        des_observacoes_geral: Joi.string().max(2000).allow('', null),
        des_observacoes_costureira: Joi.string().max(2000).allow('', null)
    }),

    /**
     * Schema para adicionar/atualizar um item isolado (tab_produto_agendamento)
     * em um agendamento já existente.
     *
     * @type {Joi.ObjectSchema}
     */
    produtoAgendadoSchema: Joi.object({
        id_agendamento: Joi.number().integer().required(),
        id_produto_grade: Joi.number().integer().required(),
        id_produto_servico: Joi.number().integer().required(),
        id_tipo_agendamento: Joi.number().integer().required(),
        des_ajuste_produto: Joi.string().max(1000).allow('', null),
        val_desconto_servico: Joi.number().min(0).precision(2).default(0)
    }),

    /**
     * Schema para upload de fotos de ajuste (tab_agendamento_item_fotos).
     * O arquivo em si é validado pelo uploadMiddleware/UploadService;
     * aqui validamos apenas os metadados de negócio.
     *
     * @type {Joi.ObjectSchema}
     */
    // fotoProdutoAgendamentoSchema: Joi.object({
    //     id_produto_agendamento: Joi.number().integer().required(),
    //     ind_tipo_foto: Joi.string().valid('antes', 'depois').required()
    // }),
    /**
     * Schema para upload de fotos de ajuste (tab_agendamento_item_fotos).
     * O arquivo é validado pelo uploadMiddleware (tamanho/MIME) e pelo
     * service (assinatura binária). Aqui validamos apenas metadados.
     *
     * @type {Joi.ObjectSchema}
     */
    fotoProdutoAgendamentoSchema: Joi.object({
        id_agendamento: Joi.number().integer().positive().required(),
        id_item: Joi.number().integer().positive().required(),
        ind_tipo_foto: Joi.string().trim().lowercase().valid('antes', 'depois').required()
            .messages({
                'any.only': "ind_tipo_foto deve ser 'antes' ou 'depois'",
                'any.required': 'ind_tipo_foto é obrigatório'
            })
    }),

    /**
     * Schema para agendamento criado pela página PÚBLICA (sem autenticação).
     * Diferente do agendamentoSchema interno:
     * - Não recebe id_paciente (o paciente é localizado por CPF no Service).
     * - Não recebe id_secretaria (não existe secretária no fluxo público).
     * - Limita a 1 único item por agendamento público (reduz superfície de abuso).
     *
     * @type {Joi.ObjectSchema}
     */
    publicAgendamentoSchema: Joi.object({
        num_cpf: Joi.string().length(11).required().custom((value, helpers) => {
            if (!validators.validarCPF(value)) {
                return helpers.error('any.invalid', { message: 'CPF inválido' });
            }
            return value;
        }),
        id_costureira: Joi.number().integer().required(),
        dta_agendamento: Joi.date().greater('now').required()
            .messages({ 'date.greater': 'A data do agendamento deve ser futura' }),
        des_observacoes_geral: Joi.string().max(1000).allow('', null),
    }),

    /**
     * Schema para o tipo de agendamento (tab_tipo_agendamento).
     *
     * @type {Joi.ObjectSchema}
     */
    tipoAgendamentoSchema: Joi.object({
        des_tipo_agendamento: Joi.string().min(3).max(50).required(),
        ind_ativo: Joi.boolean().default(true)
    }),



};

module.exports = validators;