// /src/config/env.js

const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

module.exports = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    apiUrl: process.env.API_URL || 'http://localhost:3000',

    database: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USERNAME || 'sge_user',
        password: process.env.DB_PASSWORD || 'sge_password_2026',
        database: process.env.DB_DATABASE || 'agenda-ajuste',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret_change_me',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },

    auth: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockTime: parseInt(process.env.LOCK_TIME) || 30 // minutos
    },

    upload: {
        directory: process.env.UPLOAD_DIR || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',')
    },

    whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL,
        apiKey: process.env.WHATSAPP_API_KEY
    },
    logger: {
        level: process.env.LOG_LEVEL || 'info',          // debug | info | warn | error
        directory: process.env.LOG_DIR || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d',     // retenção de 14 dias
        datePattern: 'YYYY-MM-DD'
    },
    email: {
        encryptionKey: process.env.EMAIL_ENCRYPTION_KEY,
        empresaId: parseInt(process.env.EMAIL_EMPRESA_ID) || null,
        publicUrl: (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/+$/, ''),
        workerEnabled: process.env.EMAIL_WORKER_ENABLED !== 'false',
        workerIntervalMs: parseInt(process.env.EMAIL_WORKER_INTERVAL_MS) || 15000,
        workerBatch: parseInt(process.env.EMAIL_WORKER_BATCH) || 10,
        retencaoDias: parseInt(process.env.EMAIL_OUTBOX_RETENCAO_DIAS) || 90
    },
};
