require('dotenv').config();
const bcrypt = require('bcryptjs');
const database = require('../src/config/database');

async function seed() {
    try {
        console.log('🌱 Iniciando seed do banco de dados...\n');

        await database.connect();

        // Buscar ID da cidade de Goiânia
        const [goiania] = await database.query(
            'SELECT id FROM tab_cidade WHERE nom_cidade = ?',
            ['Goiânia']
        );

        const cidadeId = goiania.id;

        // Hash de senha padrão
        const senhaHash = await bcrypt.hash('senha123', 10);

        // Inserir Administrador
        console.log('👨‍💼 Inserindo administrador...');
        await database.query(
            `INSERT INTO tab_pessoas (
             id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf,
             num_rg, dta_nascimento, des_logradouro, num_endereco, num_cep,
             nom_bairro, num_celular_1, des_email_1, des_senha, ind_medico,
             ind_secretaria, ind_costureira, ind_paciente, ind_administrador
             )  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
            [
                cidadeId, 'ativo', 'administrador', 'Administrador do Sistema', '12345678909',
                '0000000', '1980-01-01', 'Rua Principal', '100', '74000000',
                'Centro', '62999999999', 'admin@sistema.com', senhaHash, 0,
                0, 0, 0, 1
            ]
        );

        // Inserir Secretária
        console.log('👩‍💼 Inserindo secretária...');
        const secretarias = [
            ['Maria Secretária Silva', '25863990139', '1111111', '62988888888', 'secretaria@sistema.com']
        ];

        for (const [nome, cpf, rg, celular, email] of secretarias) {
            await database.query(
                `INSERT INTO tab_pessoas (
                id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf,
                num_rg, dta_nascimento, des_logradouro, num_endereco, num_cep,
                nom_bairro, num_celular_1, des_email_1, des_senha, ind_medico,
                ind_secretaria, ind_costureira, ind_paciente, ind_administrador
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
                [
                    cidadeId, 'ativo', 'secretaria', 'Maria Secretária Silva', '25863990139',
                    '1111111', '1990-05-15', 'Rua das Flores', '200', '74100000',
                    'Setor Bueno', '62988888888', 'secretaria@sistema.com', senhaHash, 0,
                    1, 0, 0, 0
                ]
            );
        }


        // Inserir Costureiras
        console.log('✂️  Inserindo costureiras...');
        const costureiras = [
            ['Ana Costureira Santos', '45557511164', '2222222', '62977777777', 'costureira1@sistema.com', 'AAAAAA'],
            ['Julia Costureira Oliveira', '95954557179', '3333333', '62966666666', 'costureira2@sistema.com', 'ABABAB'],
            ['Marcia Costureira Silva', '48019407065', '3333333', '62966666666', 'costureira3@sistema.com', 'ACACAC'],
        ];

        for (const [nome, cpf, rg, celular, email, cor] of costureiras) {
            await database.query(
                `INSERT INTO tab_pessoas (
                 id_cidade, ind_status, nom_completo, num_cpf, num_rg,
                 dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
                 num_celular_1, des_email_1, des_senha, ind_medico, ind_secretaria, 
                 ind_costureira, ind_paciente, ind_administrador, val_cor_hex
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
                [
                    cidadeId, 'ativo', nome, cpf, rg,
                    '1985-03-20', 'Avenida Central', '300', '74200000', 'Setor Oeste',
                    celular, email, senhaHash, 0, 0, 1, 0, 0, cor
                ]
            );
        }

        // Inserir Pacientes
        console.log('👤 Inserindo pacientes...');
        const pacientes = [
            ['João Paciente Silva', '21930468164', '4444444', '62955555555', 'paciente1@email.com'],
            ['Maria Paciente Santos', '14098164191', '5555555', '62944444444', 'paciente2@email.com'],
            ['Pedro Paciente Oliveira', '96348700151', '6666666', '62933333333', 'paciente3@email.com']
        ];

        for (const [nome, cpf, rg, celular, email] of pacientes) {
            await database.query(
                `INSERT INTO tab_pessoas (
                 id_cidade, ind_status, nom_completo, num_cpf, num_rg,
                 dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
                 num_celular_1, ind_whatsapp_1, des_email_1, ind_medico, ind_secretaria, 
                 ind_costureira, ind_paciente, ind_administrador
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
                [
                    cidadeId, 'ativo', nome, cpf, rg,
                    '1995-08-10', 'Rua dos Pacientes', '400', '74300000', 'Setor Sul',
                    celular, true, email, 0, 0,
                    0, 1, 0
                ]
            );
        }

        console.log('\n✅ Seed concluído com sucesso!\n');
        console.log('📝 Credenciais de acesso:');
        console.log('   Administrador:');
        console.log('   - CPF: 12345678909');
        console.log('   - Senha: senha123\n');
        console.log('   Secretária:');
        console.log('   - CPF: 11111111111');
        console.log('   - Senha: senha123\n');
        console.log('   Costureira 1:');
        console.log('   - CPF: 22222222222');
        console.log('   - Senha: senha123\n');
        console.log('   Costureira 2:');
        console.log('   - CPF: 33333333333');
        console.log('   - Senha: senha123\n');

        await database.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro no seed:', error);
        await database.close();
        process.exit(1);
    }
}

seed();
