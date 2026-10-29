// src/config/logger.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file logger.js
 * @description Configuração centralizada do logger estruturado da aplicação.
 * Utiliza Winston com rotação diária de arquivos, separando logs por nível
 * (error, combined) e exibindo saída colorida no console em desenvolvimento.
 *
 * Aplica o princípio SRP (Single Responsibility Principle): esta classe
 * tem a única responsabilidade de configurar e expor a instância do logger.
 * Os módulos consumidores (middlewares, services, controllers) dependem
 * apenas da interface do logger (info, warn, error, debug), respeitando
 * o DIP (Dependency Inversion Principle) — caso a lib de log seja
 * substituída, apenas este arquivo precisa ser alterado.
 *
 * @requires winston
 * @requires winston-daily-rotate-file
 * @requires ./env
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('./env');

/**
 * Classe responsável por construir e configurar a instância do logger.
 *
 * @class LoggerFactory
 */
class LoggerFactory {
    /**
     * Cria a instância do logger com os transports apropriados.
     *
     * @static
     * @method criar
     * @memberof LoggerFactory
     * @returns {winston.Logger} Instância configurada do logger.
     *
     * @description
     * Transports configurados:
     * - **Console**: exibição colorida e legível, ativo em qualquer ambiente
     *   (com nível reduzido em produção).
     * - **DailyRotateFile (combined)**: registra todos os logs (info, warn,
     *   error, debug), rotacionados diariamente, comprimidos e com retenção
     *   configurável.
     * - **DailyRotateFile (error)**: arquivo exclusivo para erros, facilitando
     *   auditoria e troubleshooting.
     *
     * O formato utilizado é JSON estruturado (timestamp, level, message,
     * metadata), ideal para ingestão futura em ferramentas de observabilidade
     * (ex: ELK, Grafana Loki, Datadog).
     */
    static criar() {
        const { level, directory, maxSize, maxFiles, datePattern } = config.logger;

        // Formato estruturado em JSON, com timestamp e stack trace de erros
        const formatoEstruturado = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        );

        // Formato legível para console (desenvolvimento)
        const formatoConsole = winston.format.combine(
            winston.format.colorize(),
            winston.format.json(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaString = Object.keys(meta).length
                    ? ` ${JSON.stringify(meta)}`
                    : '';
                return `[${timestamp}] ${level}: ${message}${metaString}`;
            })
        );

        const transporteErro = new DailyRotateFile({
            filename: path.join(directory, 'error-%DATE%.log'),
            datePattern,
            level: 'error',
            maxSize,
            maxFiles,
            zippedArchive: true
        });

        const transporteCombinado = new DailyRotateFile({
            filename: path.join(directory, 'combined-%DATE%.log'),
            datePattern,
            maxSize,
            maxFiles,
            zippedArchive: true
        });

        // Logs de eventos internos do winston-daily-rotate-file (útil para debug)
        transporteErro.on('error', (err) => console.error('❌ Erro no transport de log (error):', err));
        transporteCombinado.on('error', (err) => console.error('❌ Erro no transport de log (combined):', err));

        const logger = winston.createLogger({
            level,
            format: formatoEstruturado,
            defaultMeta: { servico: 'agenda-ajustes-api' },
            transports: [
                transporteErro,
                transporteCombinado,
                new winston.transports.Console({
                    format: formatoConsole,
                    level: config.env === 'production' ? 'warn' : 'debug'
                })
            ],
            exitOnError: false
        });

        return logger;
    }
}

/**
 * Instância única (Singleton) do logger, seguindo o mesmo padrão adotado
 * em `database.js` (module.exports de uma instância já construída).
 *
 * @type {winston.Logger}
 */

module.exports = LoggerFactory.criar();