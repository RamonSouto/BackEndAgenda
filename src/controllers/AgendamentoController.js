// src/controllers/AgendamentoController.js
const AgendamentoService = require('../services/AgendamentoService');
const { formatarDataHora } = require('../utils/formatters');

class AgendamentoController {
    // ==========================
    // AGENDAMENTO
    // ==========================

    async criar(req, res, next) {
        try {
            const agendamento = await AgendamentoService.criar(req.body, req.usuario);
            res.status(201).json({
                sucesso: true,
                mensagem: 'Agendamento criado com sucesso',
                dados: agendamento
            });
        } catch (error) {
            next(error);
        }
    }

    async listar(req, res, next) {
        try {
            const filtros = {
                id_paciente: req.query.id_paciente,
                id_costureira: req.query.id_costureira,
                ind_status: req.query.ind_status,
                dta_inicio: req.query.dta_inicio,
                dta_fim: req.query.dta_fim,
                limit: req.query.limit,
                offset: req.query.offset
            };

            const agendamentos = await AgendamentoService.listar(filtros);
            res.status(200).json({
                sucesso: true,
                total: agendamentos.length,
                dados: agendamentos
            });
        } catch (error) {
            next(error);
        }
    }

    async buscarPorId(req, res, next) {
        try {
            const agendamento = await AgendamentoService.buscarPorId(req.params.id);
            res.status(200).json({ sucesso: true, dados: agendamento });
        } catch (error) {
            next(error);
        }
    }

    async atualizar(req, res, next) {
        try {
            const agendamento = await AgendamentoService.atualizar(
                req.params.id,
                req.body,
                req.usuario
            );
            res.status(200).json({
                sucesso: true,
                mensagem: 'Agendamento atualizado com sucesso',
                dados: agendamento
            });
        } catch (error) {
            next(error);
        }
    }

    async confirmar(req, res, next) {
        try {
            const agendamento = await AgendamentoService.confirmar(req.params.id, req.usuario);
            res.status(200).json({
                sucesso: true,
                mensagem: 'Agendamento confirmado com sucesso',
                dados: agendamento
            });
        } catch (error) {
            next(error);
        }
    }

    async registrarComparecimento(req, res, next) {
        try {
            const { compareceu } = req.body;
            const agendamento = await AgendamentoService.registrarComparecimento(
                req.params.id,
                Boolean(compareceu),
                req.usuario
            );
            res.status(200).json({
                sucesso: true,
                mensagem: 'Comparecimento registrado com sucesso',
                dados: agendamento
            });
        } catch (error) {
            next(error);
        }
    }

    async cancelar(req, res, next) {
        try {
            const resultado = await AgendamentoService.cancelar(req.params.id, req.usuario);
            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    }

    // ==========================
    // PRODUTO AGENDADO
    // ==========================

    async adicionarProduto(req, res, next) {
        try {
            const agendamento = await AgendamentoService.adicionarProduto(
                req.params.id,
                req.body,
                req.usuario
            );
            res.status(201).json({
                sucesso: true,
                mensagem: 'Produto adicionado ao agendamento com sucesso',
                dados: agendamento
            });
        } catch (error) {
            next(error);
        }
    }

    async atualizarProduto(req, res, next) {
        try {
            const produto = await AgendamentoService.atualizarProduto(
                req.params.idProduto,
                req.body,
                req.usuario
            );
            res.status(200).json({
                sucesso: true,
                mensagem: 'Produto atualizado com sucesso',
                dados: produto
            });
        } catch (error) {
            next(error);
        }
    }

    async atualizarStatusProduto(req, res, next) {
        try {
            const { status } = req.body;
            const produto = await AgendamentoService.atualizarStatusProduto(
                req.params.idProduto,
                status,
                req.usuario
            );
            res.status(200).json({
                sucesso: true,
                mensagem: 'Status do produto atualizado com sucesso',
                dados: produto
            });
        } catch (error) {
            next(error);
        }
    }

    async removerProduto(req, res, next) {
        try {
            const resultado = await AgendamentoService.removerProduto(
                req.params.idProduto,
                req.usuario
            );
            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    }

    // ==========================
    // FOTOS DE AJUSTE
    // ==========================

    async uploadFotos(req, res, next) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Nenhum arquivo enviado'
                });
            }

            const { ind_tipo_foto } = req.body;

            const fotos = await AgendamentoService.salvarFotos(
                req.params.idProduto,
                req.files,
                ind_tipo_foto,
                req.usuario
            );

            res.status(201).json({
                sucesso: true,
                mensagem: 'Fotos enviadas com sucesso',
                dados: fotos
            });
        } catch (error) {
            next(error);
        }
    }

    async listarFotos(req, res, next) {
        try {
            const fotos = await AgendamentoService.listarFotos(req.params.idProduto);
            res.status(200).json({
                sucesso: true,
                total: fotos.length,
                dados: fotos
            });
        } catch (error) {
            next(error);
        }
    }

    async removerFoto(req, res, next) {
        try {
            const resultado = await AgendamentoService.removerFoto(
                req.params.idFoto,
                req.usuario
            );
            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    }

    // ==========================
    // RELATÓRIOS
    // ==========================

    async dashboard(req, res, next) {
        try {
            const dados = await AgendamentoService.contarPorStatus();
            res.status(200).json({ sucesso: true, dados });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AgendamentoController();