const mockReq = (over = {}) => ({
    body: {}, params: {}, query: {},
    usuario: { id: 1, tipo: 'administrador' },
    ip: '1.1.1.1',
    get: jest.fn(() => 'jest-agent'),
    ...over
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.sendFile = jest.fn();
    res.headersSent = false;
    return res;
};

// Mesmo contrato do asyncHandler real: repassa erros para next
const asyncHandlerMock = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { mockReq, mockRes, asyncHandlerMock };
