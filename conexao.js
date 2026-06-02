
const bcrypt = require('bcryptjs/dist/bcrypt');
// const db = require('./src/config/database');
// const PessoaModel = require('./src/models/PessoaModel');
// const PessoaService = require('./src/services/PessoaService');
// const validators = require('./src/utils/validators')

// const TestHelpers = {
//     generatePessoaData(tipo = 'paciente') {
//         const base = {
//             id_cidade: 5418,
//             ind_tipo_pessoa: tipo,
//             ind_status: 'ativo',
//             nom_completo: `Teste ${tipo} ${Date.now()}`,
//             num_cpf: '12345678909',
//             num_rg: '1234567',
//             dta_nascimento: '1990-01-15',
//             des_logradouro: 'Rua Teste',
//             num_endereco: '123',
//             num_cep: '74000000',
//             nom_bairro: 'Centro',
//             num_celular_1: '62999999999',
//             ind_whatsapp_1: true,
//             des_email_1: `teste.${Date.now()}@email.com`
//         };

//         if (['secretaria', 'costureira', 'administrador', 'medico'].includes(tipo)) {
//             base.des_senha = 'senha123';
//         }

//         return base;
//     }
// };

async function testarConexao() {
    console.log(await bcrypt.hash('admin123', 10));
    // try {


    // const dadosPessoa = TestHelpers.generatePessoaData('paciente');
    // const dadosValidos = { ...dadosPessoa, num_cpf: '12345678909' };

    // const result = await PessoaService.criar(dadosPessoa, 1)

    // await db.connect();

    // const resultado = await db.query('SELECT * FROM tab_cidade WHERE nom_cidade like "GOIÂNIA"');
    // console.log('✅ Resultado da consulta: ', resultado);

    // const numCpf = '00000000000';
    // const buscaCPF = await PessoaModel.buscarPorCPF(numCpf)

    // console.log('✅ Resultado busca do CPF: ', buscaCPF);

    // } catch (error) {
    //     console.error('❌ Falha na conexão com o banco de dados:', error.message);
    //     process.exit(1);
    // } finally {
    //     await db.close();
    //     process.exit(0);
    // }
}

testarConexao();