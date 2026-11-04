// src/tests/setup/env.js
process.env.TZ = 'America/Sao_Paulo';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo_de_teste';
process.env.EMAIL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.EMAIL_WORKER_ENABLED = 'false';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';