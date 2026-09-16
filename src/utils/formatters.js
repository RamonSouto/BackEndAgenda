// src/utils/formatters.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @module formatters
 * @description Utilitários para formatação, limpeza e sanitização de dados
 * específicos do domínio brasileiro (CPF, CEP, telefone, datas) e remoção
 * de campos sensíveis.
 * 
 * @requires date-fns
 * @requires date-fns/locale/ptBR
 */

const { format, parseISO } = require('date-fns');
const { ptBR } = require('date-fns/locale');

module.exports = {
    /**
     * Formata uma string numérica para o padrão de CPF (XXX.XXX.XXX-XX).
     * 
     * @function formatarCPF
     * @param {string} cpf - CPF contendo apenas 11 dígitos numéricos.
     * @returns {string} CPF formatado com pontos e traço.
     * 
     * @example
     * formatarCPF('12345678901'); // '123.456.789-01'
     * 
     * @warning A função não sanitiza a entrada. Se houver caracteres não numéricos,
     * a regex falhará. Utilize `limparCPF()` antes se necessário.
     */
    formatarCPF(cpf) {
        const num = limparCPF(cpf);
        return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    /**
     * Formata uma string numérica para o padrão de CEP (XXXXX-XXX).
     * 
     * @function formatarCEP
     * @param {string} cep - CEP contendo apenas 8 dígitos numéricos.
     * @returns {string} CEP formatado com hífen.
     * 
     * @example
     * formatarCEP('12345678'); // '12345-678'
     */
    formatarCEP(cep) {
        const num = limparCEP(cep);
        return num.replace(/(\d{5})(\d{3})/, '$1-$2');
    },

    /**
     * Formata uma string numérica para o padrão de telefone brasileiro.
     * Suporta 10 dígitos (fixo) e 11 dígitos (celular com 9º).
     * 
     * @function formatarTelefone
     * @param {string} telefone - Telefone contendo apenas dígitos (10 ou 11).
     * @returns {string} Telefone formatado como (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
     * 
     * @example
     * formatarTelefone('1133334444'); // '(11) 3333-4444'
     * formatarTelefone('11988887777'); // '(11) 98888-7777'
     * 
     * @warning Se o comprimento não for 10 ou 11, o comportamento é indefinido.
     * Recomenda-se usar `limparTelefone()` primeiro.
     */
    formatarTelefone(telefone) {
        const num = limparTelefone(telefone);
        if (num.length === 11) {
            return num.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return num.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    },

    /**
     * Formata uma data para o formato especificado (padrão: dd/MM/yyyy).
     * Aceita string ISO 8601 ou objeto Date nativo.
     * 
     * @function formatarData
     * @param {string|Date} data - Data no formato ISO (ex: '2025-10-05T10:00:00') ou objeto Date.
     * @param {string} [formato='dd/MM/yyyy'] - Padrão de formatação (ex: 'yyyy-MM-dd').
     * @returns {string|null} Data formatada ou null se a entrada for falsy.
     * 
     * @example
     * formatarData('2025-10-05T14:30:00'); // '05/10/2025'
     * formatarData(new Date(2025, 9, 5), 'yyyy-MM-dd'); // '2025-10-05'
     * 
     * @throws {RangeError} Se a string ISO for inválida (não tratado explicitamente).
     */
    formatarData(data, formato = 'dd/MM/yyyy') {
        if (!data) return null;
        return format(typeof data === 'string' ? parseISO(data) : data, formato, { locale: ptBR });
    },

    /**
     * Formata uma data/hora para o formato especificado (padrão: dd/MM/yyyy HH:mm).
     * 
     * @function formatarDataHora
     * @param {string|Date} data - Data no formato ISO ou objeto Date.
     * @param {string} [formato='dd/MM/yyyy HH:mm'] - Padrão de formatação.
     * @returns {string|null} Data e hora formatadas ou null se entrada for falsy.
     * 
     * @example
     * formatarDataHora('2025-10-05T14:30:00'); // '05/10/2025 14:30'
     */
    formatarDataHora(data, formato = 'dd/MM/yyyy HH:mm') {
        if (!data) return null;
        return format(typeof data === 'string' ? parseISO(data) : data, formato, { locale: ptBR });
    },

    /**
     * Remove todos os caracteres não numéricos de uma string CPF.
     * 
     * @function limparCPF
     * @param {string} cpf - String contendo o CPF (com ou sem máscara).
     * @returns {string} Apenas os dígitos numéricos.
     * 
     * @example
     * limparCPF('123.456.789-01'); // '12345678901'
     */
    limparCPF(cpf) {
        return cpf.replace(/[^\d]/g, '');
    },

    /**
     * Remove todos os caracteres não numéricos de uma string CEP.
     * 
     * @function limparCEP
     * @param {string} cep - String contendo o CEP (com ou sem hífen).
     * @returns {string} Apenas os dígitos numéricos.
     * 
     * @example
     * limparCEP('12345-678'); // '12345678'
     */
    limparCEP(cep) {
        return cep.replace(/[^\d]/g, '');
    },

    /**
     * Remove todos os caracteres não numéricos de uma string telefone.
     * 
     * @function limparTelefone
     * @param {string} telefone - String contendo o telefone (com parênteses, traços, etc.).
     * @returns {string} Apenas os dígitos numéricos.
     * 
     * @example
     * limparTelefone('(11) 98888-7777'); // '11988887777'
     */
    limparTelefone(telefone) {
        return telefone.replace(/[^\d]/g, '');
    },

    /**
     * Cria uma cópia profunda do objeto, removendo todos os campos sensíveis
     * especificados, em qualquer nível de aninhamento.
     * 
     * @function ocultarDadosSensiveis
     * @param {Object|Array} objeto - Dados a serem sanitizados.
     * @param {string[]} [campos=['des_senha', 'senha_hash', 'cpf']] - Lista de nomes de campos a remover.
     * @returns {Object|Array} Nova estrutura sem os campos proibidos.
     * 
     * @example
     * const usuario = { 
     *   id: 1, 
     *   nome: 'João', 
     *   des_senha: '123', 
     *   cpf: '12345678901',
     *   endereco: { rua: 'A' } 
     * };
     * ocultarDadosSensiveis(usuario);
     * // Retorna: { id: 1, nome: 'João', endereco: { rua: 'A' } }
     */
    ocultarDadosSensiveis(objeto, campos = ['des_senha', 'senha_hash', 'num_cpf', 'cpf']) {
        const camposSet = new Set(campos);
        const jsonString = JSON.stringify(objeto, (key, value) => {
            if (camposSet.has(key)) {
                return undefined;
            }
            return value;
        });
        return JSON.parse(jsonString);
    }
};
