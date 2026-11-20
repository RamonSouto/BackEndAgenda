// conexao.js
const bcrypt = require('bcryptjs/dist/bcrypt');
const { criptografar } = require('./src/utils/cryptoUtils');
const { formatarTelefone } = require('./src/utils/formatters');

class ConexaoTeste {
    teste = async function testarConexao() {
        return await formatarTelefone('62999999999');
        // console.log(await criptografar('ZE71m9y8sX5Y4bmUHt'));
        // console.log(await bcrypt.hash('Admin123', 10));
    }
}


module.exports = new ConexaoTeste();