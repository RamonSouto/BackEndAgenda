// src/tests/helpers/chamar.js
// asyncHandler não retorna a Promise; aguardamos o ciclo de eventos.
const { mockRes } = require('./factories');

async function chamar(handler, req) {
    const res = mockRes();
    const next = jest.fn();
    handler(req, res, next);
    await new Promise(setImmediate);
    return { res, next };
}

module.exports = { chamar };
