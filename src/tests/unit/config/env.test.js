// /src/tests/unit/config/env.test.js

jest.mock('dotenv', () => ({ config: jest.fn() }));

const ENV_ORIGINAL = { ...process.env };
const carregar = (env) => {
    process.env = { ...env };
    let cfg;
    jest.isolateModules(() => { cfg = require('../../../config/env'); });
    return cfg;
};

describe('config/env', () => {
    afterAll(() => { process.env = ENV_ORIGINAL; });

    it('aplica padrões em development', () => {
        const c = carregar({});
        expect(c.env).toBe('development');
        expect(c.upload.maxFileSize).toBe(5242880);
        expect(c.email.workerEnabled).toBe(true);
        expect(c.email.empresaId).toBeNull();
    });

    it('remove barras finais de APP_PUBLIC_URL', () => {
        expect(carregar({ APP_PUBLIC_URL: 'https://app.com///' }).email.publicUrl).toBe('https://app.com');
    });

    it('EMAIL_WORKER_ENABLED=false desativa worker', () => {
        expect(carregar({ EMAIL_WORKER_ENABLED: 'false' }).email.workerEnabled).toBe(false);
    });

    it('separa ALLOWED_FILE_TYPES', () => {
        expect(carregar({ ALLOWED_FILE_TYPES: 'image/png,image/webp' }).upload.allowedTypes).toEqual(['image/png', 'image/webp']);
    });

    it('production sem variáveis obrigatórias lança erro', () => {
        expect(() => carregar({ NODE_ENV: 'production', JWT_SECRET: 'x' }))
            .toThrow(/DB_PASSWORD, DB_USERNAME, EMAIL_ENCRYPTION_KEY, ALLOWED_ORIGINS/);
    });

    it('production completo carrega', () => {
        expect(() => carregar({
            NODE_ENV: 'production', JWT_SECRET: 'a', DB_PASSWORD: 'b', DB_USERNAME: 'c',
            EMAIL_ENCRYPTION_KEY: 'd', ALLOWED_ORIGINS: 'e'
        })).not.toThrow();
    });
});
