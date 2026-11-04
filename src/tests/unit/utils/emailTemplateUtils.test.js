// src/tests/unit/utils/emailTemplateUtils.test.js
const T = require('../../../utils/emailTemplateUtils');

describe('emailTemplateUtils', () => {
    it('PLACEHOLDERS é imutável e contém exatamente a whitelist', () => {
        expect(Object.isFrozen(T.PLACEHOLDERS)).toBe(true);
        expect([...T.PLACEHOLDERS].sort()).toEqual([
            'data_agendamento', 'hora_agendamento', 'link_acompanhamento', 'nome_cliente',
            'nome_costureira', 'nome_empresa', 'telefone_empresa'
        ]);
    });

    describe('escaparHtml', () => {
        it.each([
            ['<script>x</script>', '&lt;script&gt;x&lt;/script&gt;'],
            ['&', '&amp;'],
            [`"'=\``, '&quot;&#39;&#61;&#96;'],
            [null, ''], [undefined, ''], [0, '0']
        ])('%p → %p', (e, s) => expect(T.escaparHtml(e)).toBe(s));
    });

    describe('sanitizarTemplate', () => {
        it('remove script, handlers e javascript:', () => {
            const out = T.sanitizarTemplate('<p onclick="x()">Oi</p><script>alert(1)</script><a href="javascript:x">l</a>');
            expect(out).not.toMatch(/script|onclick|javascript/i);
            expect(out).toContain('<p>Oi</p>');
        });
        it('mantém https e mailto em links', () => {
            expect(T.sanitizarTemplate('<a href="https://a.com">a</a>')).toContain('href="https://a.com"');
            expect(T.sanitizarTemplate('<a href="mailto:x@y.com">m</a>')).toContain('mailto:x@y.com');
        });
        it('remove http e URL relativa ao protocolo', () => {
            expect(T.sanitizarTemplate('<a href="http://a.com">a</a>')).not.toContain('http://');
            expect(T.sanitizarTemplate('<a href="//a.com">a</a>')).not.toContain('//a.com');
        });
        it('img só aceita https', () => {
            expect(T.sanitizarTemplate('<img src="http://x/a.png">')).not.toContain('http://');
            expect(T.sanitizarTemplate('<img src="https://x/a.png">')).toContain('https://x/a.png');
        });
        it('filtra estilos fora da whitelist', () => {
            const out = T.sanitizarTemplate('<p style="color:#fff;position:absolute">x</p>');
            expect(out).toContain('color:#fff');
            expect(out).not.toContain('position');
        });
        it('descarta tags não permitidas', () => {
            expect(T.sanitizarTemplate('<iframe src="https://x"></iframe><p>ok</p>')).toBe('<p>ok</p>');
        });
        it.each([null, undefined, ''])('entrada vazia %p → ""', (v) => expect(T.sanitizarTemplate(v)).toBe(''));
    });

    describe('placeholdersInvalidos', () => {
        it('aponta os de fora da whitelist sem duplicar e em vários textos', () => {
            expect(T.placeholdersInvalidos('{{nome_cliente}} {{cpf}}', '{{ cpf }} {{senha}}')).toEqual(['cpf', 'senha']);
        });
        it('retorna [] para textos válidos ou vazios', () => {
            expect(T.placeholdersInvalidos('{{nome_empresa}}', null, undefined)).toEqual([]);
        });
    });

    describe('renderizarHtml', () => {
        it('escapa valores, remove os desconhecidos e tolera variável ausente', () => {
            expect(T.renderizarHtml('<p>{{nome_cliente}}|{{cpf}}|{{nome_empresa}}</p>', { nome_cliente: 'Ana <b>', cpf: '1' }))
                .toBe('<p>Ana &lt;b&gt;||</p>');
        });
        it('aceita espaços dentro das chaves', () => {
            expect(T.renderizarHtml('{{ nome_cliente }}', { nome_cliente: 'Ana' })).toBe('Ana');
        });
        it('escapa valor injetado em atributo', () => {
            expect(T.renderizarHtml('<a href="{{link_acompanhamento}}">x</a>', { link_acompanhamento: '" onclick="x' }))
                .toBe('<a href="&quot; onclick&#61;&quot;x">x</a>');
        });
    });

    describe('renderizarAssunto', () => {
        it('bloqueia header injection', () => {
            expect(T.renderizarAssunto('Olá {{nome_cliente}}', { nome_cliente: 'Ana\r\nBcc: x' })).toBe('Olá Ana Bcc: x');
        });
        it('não escapa HTML, remove os desconhecidos e faz trim', () => {
            expect(T.renderizarAssunto('  {{cpf}}{{nome_cliente}}  ', { nome_cliente: 'A&B' })).toBe('A&B');
        });
        it('variável ausente vira ""', () => {
            expect(T.renderizarAssunto('X {{nome_empresa}}', {})).toBe('X');
        });
        it('limita a 255 caracteres', () => {
            expect(T.renderizarAssunto('{{nome_cliente}}', { nome_cliente: 'a'.repeat(300) })).toHaveLength(255);
        });
    });

    describe('htmlParaTexto', () => {
        it('converte links e preserva quebras', () => {
            expect(T.htmlParaTexto('<p>Oi</p><a href="https://x">link</a>')).toBe('Oi\nlink (https://x)');
        });
        it('br vira quebra, colapsa 3+ quebras e decodifica &amp;', () => {
            expect(T.htmlParaTexto('A<br>B<br/><br/><br/>C &amp; D')).toBe('A\nB\n\nC & D');
        });
        it('remove todas as tags', () => {
            expect(T.htmlParaTexto('<div><strong>X</strong></div>')).toBe('X');
        });
    });
});
