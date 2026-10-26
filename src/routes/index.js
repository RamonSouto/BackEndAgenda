// src/routes/index.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/routes/index.js
 * @description Ponto central de montagem de todas as rotas da API.
 * Define rotas públicas e associa os roteadores específicos a seus prefixos.
 * 
 * @requires express
 * @requires ./authRoutes
 * @requires ./pessoaRoutes
 * @requires ./produtoRoutes
 * @requires ./relatorioRoutes
 * @requires ./parametrizacaoRoutes
 * @requires ./empresaRoutes
 */
const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./authRoutes');

// Módulo de Agendamento
const tipoAgendamentoRoutes = require('./agendamento/tipoAgendamentoRoutes');
const agendamentoRoutes = require('./agendamento/agendamentoRoutes');
const agendamentoProdutoRoutes = require('./agendamento/agendamentoProdutoRoutes')
const fotoProdutoAgendamentoRoutes = require('./agendamento/fotoProdutoAgendamentoRoutes');

// const publicAgendamentoRoutes = require('./agendamento/publicAgendamentoRoutes');

// Módulo de Pessoa
const pessoaRoutes = require('./pessoaRoutes');
// const agendamentoRoutes = require('./agendamentoRoutes');

// Módulo de Produtos
const produtoRoutes = require('./produto/produtoRoutes');
const categoriaRoutes = require('./produto/categoriaRoutes');
const tamanhoRoutes = require('./produto/tamanhoRoutes');
const corEstampaRoutes = require('./produto/corEstampaRoutes')
const gradeRoutes = require('./produto/gradeRoutes')
const imagemRoutes = require('./produto/imagemRoutes')
const tipoServicoRoutes = require('./produto/tipoServicoRoutes')
const produtoServicoRoutes = require('./produto/produtoServicoRoutes')
const precoProdutoServicoRoutes = require('./produto/precoProdutoServicoRoutes')

//Módulo do Sistema
const cidadeRoutes = require('./sistema/cidadeRoutes');
const estadoRoutes = require('./sistema/estadoRoutes');
const empresaRoutes = require('./sistema/empresaRoutes');
const parametrizacaoRoutes = require('./sistema/parametrizacaoRoutes');

const relatorioRoutes = require('./relatorioRoutes');

/**
 * Rota de health check.
 * 
 * @name GET /api/health
 * @function
 * @description Verifica se a API está online e retorna métricas básicas.
 * @returns {Object} 200 - Objeto com status, timestamp, uptime e ambiente.
 * 
 * @example
 * GET /api/health
 * // Resposta:
 * {
 *   "sucesso": true,
 *   "mensagem": "API está funcionando",
 *   "timestamp": "2025-10-05T14:30:00.000Z",
 *   "uptime": 123.456,
 *   "ambiente": "development"
 * }
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        sucesso: true,
        mensagem: 'API está funcionando',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ambiente: process.env.NODE_ENV || 'development'
    });
});

/**
 * Rota raiz da API.
 * 
 * @name GET /api
 * @function
 * @description Retorna informações gerais sobre a API e lista as rotas disponíveis.
 * @returns {Object} 200 - Objeto com mensagem, versão, documentação e rotas disponíveis.
 * 
 * @example
 * GET /api
 * // Resposta:
 * {
 *   "sucesso": true,
 *   "mensagem": "Bem-vindo à API de Agenda de Ajustes Pós-Cirúrgicos",
 *   "versao": "1.0.0",
 *   "documentacao": "/api/docs",
 *   "rotas_disponiveis": {
 *     "auth": "/api/auth",
 *     "pessoas": "/api/pessoas",
 *     "agendamentos": "/api/agendamentos",
 *     "produtos": "/api/produtos",
 *     "relatorios": "/api/relatorios"
 *   }
 * }
 */
router.get('/', (req, res) => {
    res.status(200).json({
        sucesso: true,
        mensagem: 'Bem-vindo à API de Agenda de Ajustes Pós-Cirúrgicos',
        versao: '1.0.0',
        documentacao: '/api/docs',
        rotas_disponiveis: {
            auth: '/api/auth',
            pessoas: '/api/pessoas',
            agendamentos: '/api/agendamentos',
            produtos: '/api/produtos',
            relatorios: '/api/relatorios'
        }
    });
});

// Registrar rotas
router.use('/auth', authRoutes);

// Módulo de Pessoa
router.use('/pessoas', pessoaRoutes);

// Módulo de Agendamento
router.use('/agendamentos', fotoProdutoAgendamentoRoutes);
router.use('/agendamentos', tipoAgendamentoRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/agendamentos', agendamentoProdutoRoutes);
// router.use('/public/agendamentos', publicAgendamentoRoutes);

// Módulo de Produtos
router.use('/produtos', produtoRoutes);
router.use('/produtos', categoriaRoutes);
router.use('/produtos', tamanhoRoutes);
router.use('/produtos', corEstampaRoutes);
router.use('/produtos', gradeRoutes);
router.use('/produtos', imagemRoutes);
router.use('/produtos', tipoServicoRoutes);
router.use('/produtos', produtoServicoRoutes);
router.use('/produtos', precoProdutoServicoRoutes);

// Módulo de Sistema
router.use('/sistema', cidadeRoutes)
router.use('/sistema', estadoRoutes)
router.use('/sistema', empresaRoutes);
router.use('/sistema', parametrizacaoRoutes);


router.use('/relatorios', relatorioRoutes);

module.exports = router;
