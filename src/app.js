const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/env');

// Middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const logMiddleware = require('./middlewares/logMiddleware');
const {
    notFoundMiddleware,
    errorMiddleware,
    sanitizarInputMiddleware
} = require('./middlewares/errorMiddleware');
const { limiterGeral } = require('./middlewares/rateLimitMiddleware');

// Routes
const routes = require('./routes');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');

class App {
    constructor() {
        this.app = express();
        this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        this.configureMiddlewares();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    configureMiddlewares() {
        // Segurança
        this.app.use(helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" }
        }));

        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));

        // Rate limiting
        this.app.use(limiterGeral);

        // Body parser
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Sanitizar input
        this.app.use(sanitizarInputMiddleware);

        // Servir arquivos estáticos (uploads)
        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

        // Log de requisições
        this.app.use(logMiddleware);

        // Trust proxy (para obter IP real em ambientes de produção)
        this.app.set('trust proxy', 1);

        console.log('✅ Middlewares configurados');
    }

    configureRoutes() {
        // Rota raiz
        this.app.get('/', (req, res) => {
            res.status(200).json({
                sucesso: true,
                mensagem: 'API de Agenda de Ajustes Pós-Cirúrgicos',
                versao: '1.0.0',
                autor: 'Ramon',
                documentacao: '/api',
                status: 'online',
                timestamp: new Date().toISOString()
            });
        });

        // Rotas da API
        this.app.use('/api', routes);

        console.log('✅ Rotas configuradas');
    }

    configureErrorHandling() {
        // Rota não encontrada (404)
        this.app.use(notFoundMiddleware);

        // Middleware de tratamento de erros
        this.app.use(errorMiddleware);

        console.log('✅ Tratamento de erros configurado');
    }

    getApp() {
        return this.app;
    }
}

module.exports = new App().getApp();