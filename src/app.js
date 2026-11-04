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
        this.app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
        this.configureMiddlewares();
        if (config.env !== 'production') {
            this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // não expõe o mapa da API em prod
        }
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
     * Os middlewares são aplicados na seguinte ordem
     * (`trust proxy` é definido no construtor):
     * 1. **helmet** – headers de segurança HTTP.
     * 2. **cors** – origens permitidas via `ALLOWED_ORIGINS`.
     * 3. **requestLoggerMiddleware** – requestId e log HTTP.
     * 4. **limiterGeral** – rate limiting por IP.
     * 5. **express.json** – parser JSON (limite 1 MB).
     * 6. **express.urlencoded** – parser de formulários (limite 1 MB).
     * 7. **sanitizarInputMiddleware** – trim recursivo e bloqueio de prototype pollution.
     * 8. **express.static** – whitelist de pastas públicas (LGPD).
     */
    configureMiddlewares() {
        // Segurança
        this.app.use(helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" }
        }));

        const origens = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

        // CORS
        this.app.use(cors({
            origin: origens.length ? origens : false,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
            exposedHeaders: ['X-Request-Id'],
            credentials: true
        }));

        // Correlação/log HTTP + rate limiting
        this.app.use(requestLoggerMiddleware);
        this.app.use(limiterGeral);

        // Body parser
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

        // Sanitizar input
        this.app.use(sanitizarInputMiddleware);


        // Servir arquivos estáticos (uploads) — WHITELIST (LGPD)
        // Somente pastas sem dados pessoais são públicas.
        // uploads/ajustes e uploads/deletados contêm fotos pós-cirúrgicas (dado sensível de saúde)
        // e são entregues apenas via GET /api/agendamentos/fotos/:id/arquivo (autenticado).
        const uploadsDir = path.join(__dirname, '../uploads');
        const staticOptions = {
            dotfiles: 'deny',
            index: false,
            fallthrough: true,
            maxAge: `7d`
        };

        ['cor_estampa', 'imagem_produto', 'empresa'].forEach((pasta) => {
            this.app.use(`/uploads/${pasta}`, express.static(path.join(uploadsDir, pasta), staticOptions));
        });

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