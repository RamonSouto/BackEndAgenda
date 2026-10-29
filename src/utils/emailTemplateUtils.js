// src/utils/emailTemplateUtils.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/emailTemplateUtils.js
 * @description Motor de template de e-mail com defesa em duas camadas contra HTML Injection:
 * 1) Template do administrador: sanitizado por whitelist (sanitize-html) no SALVAMENTO.
 * 2) Valores dos placeholders (ex.: nome do paciente): escapados (HTML entities) na RENDERIZAÇÃO.
 * Placeholders no formato {{chave}}, restritos a uma whitelist fixa.
 *
 * @requires sanitize-html
 */
const sanitizeHtml = require('sanitize-html');

/** Whitelist de placeholders aceitos. */
const PLACEHOLDERS = Object.freeze([
    'nome_cliente', 'nome_costureira', 'data_agendamento', 'hora_agendamento',
    'nome_empresa', 'telefone_empresa', 'link_acompanhamento'
]);

const REGEX_PLACEHOLDER = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;' };

const OPCOES_SANITIZE = {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'img'],
    allowedAttributes: {
        a: ['href', 'target'],
        img: ['src', 'alt', 'width', 'height'],
        '*': ['style', 'align']
    },
    allowedStyles: {
        '*': {
            color: [/^#[0-9a-f]{3,6}$/i, /^[a-z]+$/i],
            'background-color': [/^#[0-9a-f]{3,6}$/i],
            'text-align': [/^(left|right|center|justify)$/],
            'font-size': [/^\d{1,2}px$/],
            'font-weight': [/^(bold|normal|\d{3})$/],
            padding: [/^[\d\spx]+$/],
            margin: [/^[\d\spx]+$/]
        }
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard'
};

/**
 * Escapa um valor para inserção segura em HTML (texto e atributos).
 *
 * @function escaparHtml
 * @param {*} valor
 * @returns {string}
 *
 * @example
 * escaparHtml('<script>x</script>'); // '&lt;script&gt;x&lt;/script&gt;'
 */
function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"'`=]/g, (c) => ENTIDADES[c]);
}

/**
 * Sanitiza o HTML do template enviado pelo administrador (whitelist).
 *
 * @function sanitizarTemplate
 * @param {string} html
 * @returns {string} HTML seguro.
 *
 * @example
 * sanitizarTemplate('<p onclick="x()">Oi</p><script>alert(1)</script>'); // '<p>Oi</p>'
 */
function sanitizarTemplate(html) {
    return sanitizeHtml(String(html || ''), OPCOES_SANITIZE);
}

/**
 * Retorna placeholders usados que não estão na whitelist.
 *
 * @function placeholdersInvalidos
 * @param {...string} textos - Assunto/corpo.
 * @returns {string[]}
 *
 * @example
 * placeholdersInvalidos('Olá {{nome_cliente}} {{cpf}}'); // ['cpf']
 */
function placeholdersInvalidos(...textos) {
    const invalidos = new Set();
    for (const texto of textos) {
        for (const [, chave] of String(texto || '').matchAll(REGEX_PLACEHOLDER)) {
            if (!PLACEHOLDERS.includes(chave)) invalidos.add(chave);
        }
    }
    return [...invalidos];
}

/**
 * Renderiza o corpo HTML substituindo placeholders por valores ESCAPADOS.
 *
 * @function renderizarHtml
 * @param {string} template - HTML já sanitizado.
 * @param {Object} variaveis
 * @returns {string}
 *
 * @example
 * renderizarHtml('<p>{{nome_cliente}}</p>', { nome_cliente: 'Ana <b>' }); // '<p>Ana &lt;b&gt;</p>'
 */
function renderizarHtml(template, variaveis) {
    return String(template).replace(REGEX_PLACEHOLDER, (_, chave) =>
        PLACEHOLDERS.includes(chave) ? escaparHtml(variaveis[chave]) : '');
}

/**
 * Renderiza o assunto (texto puro), removendo CR/LF (anti header injection).
 *
 * @function renderizarAssunto
 * @param {string} template
 * @param {Object} variaveis
 * @returns {string}
 *
 * @example
 * renderizarAssunto('Olá {{nome_cliente}}', { nome_cliente: 'Ana\r\nBcc: x' }); // 'Olá Ana Bcc: x'
 */
function renderizarAssunto(template, variaveis) {
    return String(template)
        .replace(REGEX_PLACEHOLDER, (_, chave) => (PLACEHOLDERS.includes(chave) ? String(variaveis[chave] ?? '') : ''))
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 255);
}

/**
 * Gera versão texto puro do HTML (melhora entregabilidade/antispam).
 *
 * @function htmlParaTexto
 * @param {string} html
 * @returns {string}
 *
 * @example
 * htmlParaTexto('<p>Oi</p><a href="https://x">link</a>');
 */
function htmlParaTexto(html) {
    const comLinks = String(html).replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
    return sanitizeHtml(comLinks.replace(/<\/(p|div|h\d|li|tr)>|<br\s*\/?>/gi, '\n'),
        { allowedTags: [], allowedAttributes: {} })
        .replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = {
    PLACEHOLDERS, escaparHtml, sanitizarTemplate, placeholdersInvalidos,
    renderizarHtml, renderizarAssunto, htmlParaTexto
};
