// /scripts/cleanUploads.js

/**
 * @author Ramon David Souto
 * @version 1.1.0
 * @file scripts/cleanUploads.js
 * @description Limpeza definitiva de uploads/deletados (>90 dias da exclusão)
 * e de temporários órfãos em uploads/ajustes (>24h). Nunca toca fotos ativas.
 *
 * @requires dotenv
 * @requires ../src/services/UploadService
 */
require('dotenv').config();
const UploadService = require('../src/services/UploadService');

// async function cleanUploads() {
//     try {
//         console.log('🧹 Limpando arquivos antigos...\n');

//         await UploadService.inicializar();

//         // Limpar arquivos com mais de 90 dias
//         const totalDeletados = await UploadService.limparArquivosAntigos(90);

//         console.log(`\n✅ Limpeza concluída! ${totalDeletados} arquivo(s) deletado(s)\n`);
//         process.exit(0);

//     } catch (error) {
//         console.error('❌ Erro na limpeza:', error);
//         process.exit(1);
//     }
// }

// cleanUploads();


async function cleanUploads() {
    try {
        await UploadService.inicializar();
        const deletados = await UploadService.limparArquivosAntigos(Number(process.env.CLEAN_DIAS) || 90);
        const temporarios = await UploadService.limparTemporarios(24);
        console.log(`✅ Removidos: ${deletados} de deletados/, ${temporarios} temporário(s) órfão(s)`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
        process.exit(1);
    }
}

cleanUploads();