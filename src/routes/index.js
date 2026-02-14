const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./authRoutes');
const pessoaRoutes = require('./pessoaRoutes');
const agendamentoRoutes = require('./agendamentoRoutes');
const produtoRoutes = require('./produtoRoutes');
const relatorioRoutes = require('./relatorioRoutes');

/**
 * Rota de health check
 * GET /api/health
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
 * Rota de informações da API
 * GET /api
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
router.use('/pessoas', pessoaRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/produtos', produtoRoutes);
router.use('/relatorios', relatorioRoutes);

module.exports = router;
