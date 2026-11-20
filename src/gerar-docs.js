#!/usr/bin/env node
/**
 * @file gerar-docs.js
 * @description Gera arquivos .md (Config.md, Controller.md, etc.) a partir
 *              das pastas de código, seguindo o formato do projeto.
 *
 * Uso:
 *   node gerar-docs.js
 *
 * Requisitos: Node.js >= 14 (sem dependências externas)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============== Configuração ==============

const RAIZ_PROJETO = process.cwd();

/** Pasta de origem → arquivo .md de destino. */
const PASTAS = {
    config: { saida: 'Config.md', titulo: 'Arquitetura da pasta Config' },
    controllers: { saida: 'Controller.md', titulo: 'Arquitetura da pasta Controller' },
    middlewares: { saida: 'Middleware.md', titulo: 'Arquitetura da pasta Middleware' },
    models: { saida: 'Model.md', titulo: 'Arquitetura da pasta Model' },
    routes: { saida: 'Route.md', titulo: 'Arquitetura da pasta Route' },
    services: { saida: 'Service.md', titulo: 'Arquitetura da pasta Service' }, // extra (remova se não quiser)
    utils: { saida: 'Util.md', titulo: 'Arquitetura da pasta Util' },    // extra
    workers: { saida: 'Worker.md', titulo: 'Arquitetura da pasta Worker' },  // extra
};

/** Arquivos soltos na raiz → Index.md. */
const RAIZ_ARQUIVOS = {
    saida: 'Index.md',
    titulo: 'Arquitetura da raiz do projeto',
    itens: ['app.js'],
};

const IGNORAR_PASTAS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const IGNORAR_ARQUIVOS = new Set(['package-lock.json', 'yarn.lock']);

// ============== Helpers ==============

function contarJs(dir) {
    let total = 0;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORAR_PASTAS.has(item.name)) continue;
        const p = path.join(dir, item.name);
        if (item.isDirectory()) total += contarJs(p);
        else if (item.isFile() && item.name.endsWith('.js')) total += 1;
    }
    return total;
}

/** Gera as linhas da árvore (sem o nó raiz, como no seu exemplo). */
function gerarFilhos(dir, prefixo) {
    const linhas = [];
    const itens = fs.readdirSync(dir, { withFileTypes: true })
        .filter((i) => !IGNORAR_PASTAS.has(i.name) && !IGNORAR_ARQUIVOS.has(i.name));

    // Pastas primeiro, depois arquivos
    itens.sort((a, b) => {
        const aDir = a.isDirectory(), bDir = b.isDirectory();
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    itens.forEach((item, idx) => {
        const ultimo = idx === itens.length - 1;
        const ramo = ultimo ? '└── ' : '├── ';
        const p = path.join(dir, item.name);

        if (item.isDirectory()) {
            const qtd = contarJs(p);
            linhas.push(`${prefixo}${ramo}📁 ${item.name} - ${qtd}`);
            const novoPrefixo = prefixo + (ultimo ? '    ' : '│   ');
            linhas.push(...gerarFilhos(p, novoPrefixo));
        } else if (item.isFile() && item.name.endsWith('.js')) {
            linhas.push(`${prefixo}${ramo}📄 ${item.name}`);
        }
    });

    return linhas;
}

/** Coleta recursivamente os .js → [{ relativo, conteudo }]. */
function coletarArquivos(dir, base) {
    const out = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORAR_PASTAS.has(item.name)) continue;
        const p = path.join(dir, item.name);
        if (item.isDirectory()) out.push(...coletarArquivos(p, base));
        else if (item.isFile() && item.name.endsWith('.js')) {
            const rel = path.relative(base, p).replace(/\\/g, '/');
            out.push({ relativo: rel, conteudo: fs.readFileSync(p, 'utf8') });
        }
    }
    return out.sort((a, b) => a.relativo.localeCompare(b.relativo));
}

/** Monta o conteúdo Markdown de uma pasta. */
function gerarMd(srcDir, titulo) {
    const arvore = gerarFilhos(srcDir, '');
    const arquivos = coletarArquivos(srcDir, srcDir);
    const nomePasta = path.basename(srcDir);

    const partes = [];
    partes.push(`# ${titulo}`, '');
    partes.push('```txt');
    partes.push(arvore.join('\n'));
    partes.push('```', '');

    for (const { relativo, conteudo } of arquivos) {
        partes.push('```js');
        partes.push(`// src/${nomePasta}/${relativo}`);
        partes.push('');
        partes.push(conteudo.trimEnd());
        partes.push('```', '');
    }

    return partes.join('\n').trimEnd() + '\n';
}

function gerarIndex() {
    const existentes = RAIZ_ARQUIVOS.itens.filter((f) =>
        fs.existsSync(path.join(RAIZ_PROJETO, f))
    );
    if (existentes.length === 0) return null;

    const partes = [`# ${RAIZ_ARQUIVOS.titulo}`, ''];
    partes.push('```txt');
    partes.push(existentes.map((f) => `└── 📄 ${f}`).join('\n'));
    partes.push('```', '');

    for (const nome of existentes) {
        const conteudo = fs.readFileSync(path.join(RAIZ_PROJETO, nome), 'utf8');
        partes.push('```js');
        partes.push(`// src/${nome}`);
        partes.push('');
        partes.push(conteudo.trimEnd());
        partes.push('```', '');
    }
    return partes.join('\n').trimEnd() + '\n';
}

// ============== Execução ==============

function main() {
    console.log('📚 Gerando documentação Markdown...\n');

    for (const [pasta, cfg] of Object.entries(PASTAS)) {
        const caminho = path.join(RAIZ_PROJETO, pasta);
        if (!fs.existsSync(caminho)) {
            console.warn(`⚠️  Pasta ignorada (não existe): ${pasta}/`);
            continue;
        }
        fs.writeFileSync(path.join(RAIZ_PROJETO, cfg.saida), gerarMd(caminho, cfg.titulo), 'utf8');
        console.log(`✅ ${cfg.saida.padEnd(16)} ← ${pasta}/`);
    }

    const index = gerarIndex();
    if (index) {
        fs.writeFileSync(path.join(RAIZ_PROJETO, RAIZ_ARQUIVOS.saida), index, 'utf8');
        console.log(`✅ ${RAIZ_ARQUIVOS.saida.padEnd(16)} ← raiz`);
    }

    console.log('\n🎉 Concluído!');
}

main();