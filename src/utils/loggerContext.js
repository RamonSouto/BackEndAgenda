// src/utils/loggerContext.js
/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/loggerContext.js
 * @description Contexto assíncrono para propagar requestId em toda a cadeia
 * de chamadas (inclusive dentro de services/models) sem passar req.logger.
 */
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const runWithContext = (context, callback) => storage.run(context, callback);

const getContext = () => storage.getStore() || {};

const setContext = (patch) => {
    const current = storage.getStore() || {};
    storage.enterWith({ ...current, ...patch });
};

module.exports = { runWithContext, getContext, setContext };