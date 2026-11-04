// /src/tests/unit/utils/loggerContext.test.js

const { runWithContext, getContext, setContext } = require('../../../utils/loggerContext');

describe('loggerContext', () => {
    it('fora de contexto retorna {}', () => expect(getContext()).toEqual({}));

    it('propaga contexto por chamadas assíncronas', async () => {
        await runWithContext({ requestId: 'abc' }, async () => {
            await new Promise((r) => setTimeout(r, 5));
            expect(getContext()).toEqual({ requestId: 'abc' });
        });
    });

    it('contextos concorrentes são isolados', async () => {
        const ler = (id, ms) => runWithContext({ requestId: id }, async () => {
            await new Promise((r) => setTimeout(r, ms));
            return getContext().requestId;
        });
        await expect(Promise.all([ler('a', 10), ler('b', 1)])).resolves.toEqual(['a', 'b']);
    });

    it('setContext mescla dados ao contexto atual', () => {
        runWithContext({ requestId: 'abc' }, () => {
            setContext({ userId: 7 });
            expect(getContext()).toEqual({ requestId: 'abc', userId: 7 });
        });
    });

    it('retorna o valor do callback', () => {
        expect(runWithContext({}, () => 42)).toBe(42);
    });
});
