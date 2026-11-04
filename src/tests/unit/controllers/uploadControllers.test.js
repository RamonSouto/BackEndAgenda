// src/tests/unit/controllers/uploadControllers.test.js
// Pré-requisito: correção do require de UploadService no ImagemController.
jest.mock('../../../services/produto/CorEstampaService', () => ({ adicionarCorEstampa: jest.fn(), atualizarCorEstampa: jest.fn() }));
jest.mock('../../../services/produto/ImagemService', () => ({ adicionarImagemProduto: jest.fn(), atualizarImagemProduto: jest.fn() }));
jest.mock('../../../services/UploadService', () => ({
    caminhoRelativo: jest.fn(() => 'imagem_produto/a.jpg'),
    deletarArquivo: jest.fn().mockResolvedValue()
}));

const path = require('path');
const config = require('../../../config/env');
const CorService = require('../../../services/produto/CorEstampaService');
const ImagemService = require('../../../services/produto/ImagemService');
const UploadService = require('../../../services/UploadService');
const CorCtrl = require('../../../controllers/produto/CorEstampaController');
const ImgCtrl = require('../../../controllers/produto/ImagemController');
const { chamar } = require('../../helpers/chamar');
const { BadRequestError } = require('../../../utils/ApiError');

const U = { id: 1, papeis: ['administrador'] };
const arquivo = (sub, nome) => ({ path: path.join(path.resolve(config.upload.directory), sub, nome) });

describe('CorEstampaController – caminho do upload', () => {
    it.each(['adicionarCorEstampa', 'atualizarCorEstampa'])('%s grava caminho relativo com "/"', async (fn) => {
        CorService[fn].mockResolvedValue(1);
        await chamar(CorCtrl[fn], { params: { id: 1 }, body: { nom_cor_estampa: 'Azul' }, file: arquivo('cor_estampa', 'a.png'), usuario: U });
        const dados = CorService[fn].mock.calls[0][fn === 'adicionarCorEstampa' ? 0 : 1];
        expect(dados.des_imagem_url).toBe('cor_estampa/a.png');
    });

    it('sem arquivo não injeta des_imagem_url', async () => {
        CorService.adicionarCorEstampa.mockResolvedValue(1);
        await chamar(CorCtrl.adicionarCorEstampa, { body: { nom_cor_estampa: 'Azul' }, usuario: U });
        expect(CorService.adicionarCorEstampa.mock.calls[0][0]).not.toHaveProperty('des_imagem_url');
    });

    it('arquivo sobrescreve des_imagem_url vindo do cliente (anti-spoofing)', async () => {
        CorService.adicionarCorEstampa.mockResolvedValue(1);
        await chamar(CorCtrl.adicionarCorEstampa, { body: { des_imagem_url: '../../etc/passwd' }, file: arquivo('cor_estampa', 'b.png'), usuario: U });
        expect(CorService.adicionarCorEstampa.mock.calls[0][0].des_imagem_url).toBe('cor_estampa/b.png');
    });
});

describe('ImagemController', () => {
    const file = arquivo('imagem_produto', 'a.jpg');

    it('adicionar: 201 com caminho do UploadService', async () => {
        ImagemService.adicionarImagemProduto.mockResolvedValue(8);
        const { res } = await chamar(ImgCtrl.adicionarImagemProduto, { body: { id_produto: '1' }, file, usuario: U });
        expect(ImagemService.adicionarImagemProduto).toHaveBeenCalledWith({ id_produto: '1', des_url_imagem: 'imagem_produto/a.jpg' }, 1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(UploadService.deletarArquivo).not.toHaveBeenCalled();
    });

    it('adicionar: erro no Service apaga o arquivo (sem órfão) e repassa o erro', async () => {
        const erro = new BadRequestError('XOR produto/grade');
        ImagemService.adicionarImagemProduto.mockRejectedValue(erro);
        const { next } = await chamar(ImgCtrl.adicionarImagemProduto, { body: {}, file, usuario: U });
        expect(UploadService.deletarArquivo).toHaveBeenCalledWith(file.path);
        expect(next).toHaveBeenCalledWith(erro);
    });

    it('adicionar: falha ao apagar arquivo não mascara o erro original', async () => {
        const erro = new Error('original');
        ImagemService.adicionarImagemProduto.mockRejectedValue(erro);
        UploadService.deletarArquivo.mockRejectedValueOnce(new Error('fs'));
        const { next } = await chamar(ImgCtrl.adicionarImagemProduto, { body: {}, file, usuario: U });
        expect(next).toHaveBeenCalledWith(erro);
    });

    it.each([
        ['com arquivo novo', file, 'imagem_produto/a.jpg'],
        ['sem arquivo', undefined, undefined]
    ])('atualizar %s', async (_, f, esperado) => {
        ImagemService.atualizarImagemProduto.mockResolvedValue({ id: 1 });
        await chamar(ImgCtrl.atualizarImagemProduto, { params: { id: 1 }, body: { ind_principal: 'true' }, file: f, usuario: U });
        expect(ImagemService.atualizarImagemProduto.mock.calls[0][1].des_url_imagem).toBe(esperado);
    });
});
