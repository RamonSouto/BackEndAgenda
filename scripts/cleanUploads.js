require('dotenv').config();
const UploadService = require('../src/services/UploadService');

async function cleanUploads() {
    try {
        console.log('🧹 Limpando arquivos antigos...\n');

        await UploadService.inicializar();

        // Limpar arquivos com mais de 90 dias
        const totalDeletados = await UploadService.limparArquivosAntigos(90);

        console.log(`\n✅ Limpeza concluída! ${totalDeletados} arquivo(s) deletado(s)\n`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
        process.exit(1);
    }
}

cleanUploads();
