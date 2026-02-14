const { format, parseISO } = require('date-fns');
const { ptBR } = require('date-fns/locale');

module.exports = {
    formatarCPF(cpf) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    formatarCEP(cep) {
        return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    },

    formatarTelefone(telefone) {
        if (telefone.length === 11) {
            return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    },

    formatarData(data, formato = 'dd/MM/yyyy') {
        if (!data) return null;
        return format(typeof data === 'string' ? parseISO(data) : data, formato, { locale: ptBR });
    },

    formatarDataHora(data, formato = 'dd/MM/yyyy HH:mm') {
        if (!data) return null;
        return format(typeof data === 'string' ? parseISO(data) : data, formato, { locale: ptBR });
    },

    limparCPF(cpf) {
        return cpf.replace(/[^\d]/g, '');
    },

    limparCEP(cep) {
        return cep.replace(/[^\d]/g, '');
    },

    limparTelefone(telefone) {
        return telefone.replace(/[^\d]/g, '');
    },

    ocultarDadosSensiveis(objeto, campos = ['des_senha', 'senha_hash']) {
        const copia = { ...objeto };
        campos.forEach(campo => {
            if (copia[campo]) {
                delete copia[campo];
            }
        });
        return copia;
    }
};
