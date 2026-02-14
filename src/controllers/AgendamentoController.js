const AgendamentoService = require('../services/AgendamentoService');
const { MENSAGENS, STATUS_AGENDAMENTO } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

class AgendamentoController {
    /**
     * Criar novo agendamento
     * POST /api/agendamentos
     */
    criar = asyncHandler(async (req, res) => {
        const agendamento = await AgendamentoService.criar(req.body, req.usuario.id);

        return res.status(201).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.CRIADO,
            dados: agendamento
        });
    });

    /**
     * Buscar agendamento por ID
     * GET /api/agendamentos/:id
     */
    buscarPorId = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const agendamento = await AgendamentoService.buscarPorId(
            id,
            req.usuario.id,
            req.usuario.tipo
        );

        return res.status(200).json({
            sucesso: true,
            dados: agendamento
        });
    });

    /**
     * Listar agendamentos com filtros
     * GET /api/agendamentos
     */
    listar = asyncHandler(async (req, res) => {
        const filtros = {
            id_paciente: req.query.id_paciente,
            id_costureira: req.query.id_costureira,
            id_secretaria: req.query.id_secretaria,
            ind_status: req.query.status,
            data_inicio: req.query.data_inicio,
            data_fim: req.query.data_fim,
            limite: req.query.limite
        };

        const agendamentos = await AgendamentoService.listar(
            filtros,
            req.usuario.id,
            req.usuario.tipo
        );

        return res.status(200).json({
            sucesso: true,
            total: agendamentos.length,
            dados: agendamentos
        });
    });

    /**
     * Atualizar agendamento
     * PUT /api/agendamentos/:id
     */
    atualizar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const agendamento = await AgendamentoService.atualizar(
            id,
            req.body,
            req.usuario.id,
            req.usuario.tipo
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.ATUALIZADO,
            dados: agendamento
        });
    });

    /**
     * Cancelar agendamento
     * PATCH /api/agendamentos/:id/cancelar
     */
    cancelar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await AgendamentoService.cancelar(id, req.usuario.id, req.usuario.tipo);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Agendamento cancelado com sucesso'
        });
    });

    /**
     * Confirmar agendamento
     * PATCH /api/agendamentos/:id/confirmar
     */
    confirmar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await AgendamentoService.confirmar(id, req.usuario.id);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Agendamento confirmado com sucesso'
        });
    });

    /**
     * Deletar agendamento (soft delete)
     * DELETE /api/agendamentos/:id
     */
    deletar = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await AgendamentoService.deletar(id, req.usuario.id, req.usuario.tipo);

        return res.status(200).json({
            sucesso: true,
            mensagem: MENSAGENS.SUCESSO.DELETADO
        });
    });

    /**
     * Registrar comparecimento do paciente
     * POST /api/agendamentos/:id/comparecimento
     */
    registrarComparecimento = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { ind_paciente_compareceu, des_observacoes_costureira } = req.body;

        if (ind_paciente_compareceu === undefined) {
            return res.status(400).json({
                sucesso: false,
                mensagem: MENSAGENS.ERRO.VALIDACAO,
                erro: 'Campo ind_paciente_compareceu é obrigatório'
            });
        }

        const agendamento = await AgendamentoService.registrarComparecimento(
            id,
            ind_paciente_compareceu,
            des_observacoes_costureira,
            req.usuario.id
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Comparecimento registrado com sucesso',
            dados: agendamento
        });
    });

    /**
     * Listar agendamentos de uma costureira
     * GET /api/agendamentos/costureira/:id_costureira
     */
    listarPorCostureira = asyncHandler(async (req, res) => {
        const { id_costureira } = req.params;
        const apenas_ativos = req.query.apenas_ativos === 'true';

        const agendamentos = await AgendamentoService.listarPorCostureira(
            id_costureira,
            apenas_ativos,
            req.usuario.id
        );

        return res.status(200).json({
            sucesso: true,
            total: agendamentos.length,
            dados: agendamentos
        });
    });

    /**
     * Listar meus agendamentos (costureira)
     * GET /api/agendamentos/meus
     */
    listarMeus = asyncHandler(async (req, res) => {
        const apenas_ativos = req.query.apenas_ativos === 'true';

        const agendamentos = await AgendamentoService.listarPorCostureira(
            req.usuario.id,
            apenas_ativos,
            req.usuario.id
        );

        return res.status(200).json({
            sucesso: true,
            total: agendamentos.length,
            dados: agendamentos
        });
    });

    /**
     * Estatísticas de agendamentos
     * GET /api/agendamentos/estatisticas
     */
    estatisticas = asyncHandler(async (req, res) => {
        const { data_inicio, data_fim } = req.query;

        const filtros = {};
        if (data_inicio) filtros.data_inicio = data_inicio;
        if (data_fim) filtros.data_fim = data_fim;

        const agendamentos = await AgendamentoService.listar(
            filtros,
            req.usuario.id,
            req.usuario.tipo
        );

        // Calcular estatísticas
        const total = agendamentos.length;
        const porStatus = agendamentos.reduce((acc, ag) => {
            acc[ag.ind_status] = (acc[ag.ind_status] || 0) + 1;
            return acc;
        }, {});

        const comparecimentos = agendamentos.filter(ag => ag.ind_paciente_compareceu !== null).length;
        const compareceram = agendamentos.filter(ag => ag.ind_paciente_compareceu === true).length;
        const faltas = agendamentos.filter(ag => ag.ind_paciente_compareceu === false).length;

        const taxaComparecimento = comparecimentos > 0
            ? ((compareceram / comparecimentos) * 100).toFixed(2)
            : 0;

        return res.status(200).json({
            sucesso: true,
            dados: {
                total,
                por_status: porStatus,
                comparecimentos: {
                    total: comparecimentos,
                    compareceram,
                    faltas,
                    taxa_comparecimento: `${taxaComparecimento}%`
                }
            }
        });
    });
}

module.exports = new AgendamentoController();
