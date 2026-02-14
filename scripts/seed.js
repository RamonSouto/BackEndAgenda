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
            id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
            dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
            num_celular_1, des_email_1, des_senha
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
            [
                cidadeId, 'ativo', 'administrador', 'Administrador do Sistema',
                '00000000000', '0000000', '1980-01-01', 'Rua Principal', '100',
                '74000000', 'Centro', '62999999999', 'admin@sistema.com', senhaHash
            ]
        );

        // Inserir Secretária
        console.log('👩‍💼 Inserindo secretária...');
        await database.query(
            `INSERT INTO tab_pessoas (
            id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
            dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
            num_celular_1, des_email_1, des_senha
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
            [
                cidadeId, 'ativo', 'secretaria', 'Maria Secretária Silva',
                '11111111111', '1111111', '1990-05-15', 'Rua das Flores', '200',
                '74100000', 'Setor Bueno', '62988888888', 'secretaria@sistema.com', senhaHash
            ]
        );

        // Inserir Costureiras
        console.log('✂️  Inserindo costureiras...');
        const costureiras = [
            ['Ana Costureira Santos', '22222222222', '2222222', '62977777777', 'costureira1@sistema.com'],
            ['Julia Costureira Oliveira', '33333333333', '3333333', '62966666666', 'costureira2@sistema.com']
        ];

        for (const [nome, cpf, rg, celular, email] of costureiras) {
            await database.query(
                `INSERT INTO tab_pessoas (
              id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
              dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
              num_celular_1, des_email_1, des_senha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
                [
                    cidadeId, 'ativo', 'costureira', nome, cpf, rg,
                    '1985-03-20', 'Avenida Central', '300', '74200000',
                    'Setor Oeste', celular, email, senhaHash
                ]
            );
        }

        // Inserir Pacientes
        console.log('👤 Inserindo pacientes...');
        const pacientes = [
            ['João Paciente Silva', '44444444444', '4444444', '62955555555', 'paciente1@email.com'],
            ['Maria Paciente Santos', '55555555555', '5555555', '62944444444', 'paciente2@email.com'],
            ['Pedro Paciente Oliveira', '66666666666', '6666666', '62933333333', 'paciente3@email.com']
        ];

        for (const [nome, cpf, rg, celular, email] of pacientes) {
            await database.query(
                `INSERT INTO tab_pessoas (
              id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
              dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
              num_celular_1, ind_whatsapp_1, des_email_1
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nom_completo = nom_completo`,
                [
                    cidadeId, 'ativo', 'paciente', nome, cpf, rg,
                    '1995-08-10', 'Rua dos Pacientes', '400', '74300000',
                    'Setor Sul', celular, true, email
                ]
            );
        }

        console.log('\n✅ Seed concluído com sucesso!\n');
        console.log('📝 Credenciais de acesso:');
        console.log('   Administrador:');
        console.log('   - CPF: 00000000000');
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
