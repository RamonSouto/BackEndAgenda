// scripts/renderUml.js — gera PNG via servidor público e converte em JPG
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const axios = require('axios');
const sharp = require('sharp'); // npm i -D sharp

// Alfabeto de codificação base64 próprio do PlantUML
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const codificar = (txt) => {
    const buf = zlib.deflateRawSync(Buffer.from(txt, 'utf8'), { level: 9 });
    let bits = '', out = '';
    for (const b of buf) bits += b.toString(2).padStart(8, '0');
    for (let i = 0; i < bits.length; i += 6) out += ALFABETO[parseInt(bits.slice(i, i + 6).padEnd(6, '0'), 2)];
    return out;
};

(async () => {
    const dir = path.resolve('docs/uml');
    fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
    for (const arq of fs.readdirSync(dir).filter((f) => f.endsWith('.wsd'))) {
        const { data } = await axios.get(
            `https://www.plantuml.com/plantuml/png/${codificar(fs.readFileSync(path.join(dir, arq), 'utf8'))}`,
            { responseType: 'arraybuffer' }
        );
        await sharp(data).flatten({ background: '#fff' }).jpeg({ quality: 92 })
            .toFile(path.join(dir, 'img', arq.replace('.wsd', '.jpg')));
        console.log('✅', arq);
    }
})();
