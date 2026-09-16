// src/app.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file app.js
 * @description Configuração principal da aplicação Express.
 * Orquestra middlewares, rotas, tratamento de erros e documentação.
 * 
 * @requires express
 * @requires cors
 * @requires helmet
 * @requires path
 * @requires ./config/env
 * @requires ./middlewares/authMiddleware
 * @requires ./middlewares/logMiddleware
 * @requires ./middlewares/errorMiddleware
 * @requires ./middlewares/rateLimitMiddleware
 * @requires ./middlewares/requestLoggerMiddleware
 * @requires ./routes
 * @requires swagger-ui-express
 * @requires yamljs
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/env');
const requestLoggerMiddleware = require('./middlewares/requestLoggerMiddleware');

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
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

/**
 * Classe responsável pela configuração da aplicação Express.
 * 
 * @class App
 */
class App {
    constructor() {
        this.app = express();
        this.app.set('trust proxy', true);
        this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        this.configureMiddlewares();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    /**
     * Configura todos os middlewares da aplicação.
     * 
     * @method configureMiddlewares
     * @returns {void}
     * 
     * @description
     * Os middlewares são aplicados na seguinte ordem:
     * 1. **helmet** – segurança (headers HTTP).
     * 2. **cors** – compartilhamento de recursos entre origens.
     * 3. **limiterGeral** – rate limiting por IP.
     * 4. **express.json** – parser de JSON com limite de 10MB.
     * 5. **express.urlencoded** – parser de formulários URL-encoded.
     * 6. **sanitizarInputMiddleware** – limpeza de dados de entrada (trim).
     * 7. **express.static** – servir arquivos estáticos da pasta `uploads`.
     * 8. **logMiddleware** – registro de logs de requisições.
     * 9. **trust proxy** – reconfiguração (redundante).
     */
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

        this.app.use(requestLoggerMiddleware);

        // Log de requisições
        this.app.use(logMiddleware);

        // Trust proxy (para obter IP real em ambientes de produção)
        this.app.set('trust proxy', 1);

        console.log('✅ Middlewares configurados');
    }

    /**
     * Configura as rotas da aplicação.
     * 
     * @method configureRoutes
     * @returns {void}
     * 
     * @description
     * - Rota raiz (`/`) com informações da API.
     * - Todas as rotas da API são prefixadas com `/api` e importadas do módulo `routes`.
     */
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

    /**
     * Configura o tratamento de erros.
     * 
     * @method configureErrorHandling
     * @returns {void}
     * 
     * @description
     * - `notFoundMiddleware`: captura requisições para rotas não mapeadas (404).
     * - `errorMiddleware`: middleware global de erros (4 parâmetros).
     */
    configureErrorHandling() {
        // Rota não encontrada (404)
        this.app.use(notFoundMiddleware);

        // Middleware de tratamento de erros
        this.app.use(errorMiddleware);

        console.log('✅ Tratamento de erros configurado');
    }

    /**
     * Retorna a instância do Express configurada.
     * 
     * @method getApp
     * @returns {Express} Instância do Express.
     */
    getApp() {
        return this.app;
    }
}

module.exports = new App().getApp();