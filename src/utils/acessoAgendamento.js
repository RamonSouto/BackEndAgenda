// src/utils/acessoAgendamento.js

/**
 * @author Ramon David Souto
 * @version 1.0.0
 * @file src/utils/acessoAgendamento.js
 * @description Regra única de escopo de acesso a agendamentos:
 * administrador, secretária e médico têm acesso amplo; costureira apenas aos próprios.
 * Funções puras (sem I/O) — testáveis isoladamente.
 *
 * @requires ./constants
 * @requires ./ApiError
 */
const { PAPEIS_PESSOA } = require('./constants');
const { ForbiddenError } = require('./ApiError');

const PAPEIS_AMPLOS = [PAPEIS_PESSOA.ADMINISTRADOR, PAPEIS_PESSOA.SECRETARIA, PAPEIS_PESSOA.MEDICO];

/**
 * Indica se o usuário só pode acessar os próprios agendamentos.
 *
 * @function restritoAosProprios
 * @param {Object} usuario - req.usuario.
 * @returns {boolean}
 *
 * @example
 * restritoAosProprios({ papeis: ['costureira'] }); // true
 */
function restritoAosProprios(usuario) {
    const papeis = usuario?.papeis || [];
    return papeis.includes(PAPEIS_PESSOA.COSTUREIRA) && !papeis.some((p) => PAPEIS_AMPLOS.includes(p));
}

/**
 * Lança 403 se o usuário restrito tentar acessar agendamento de outra costureira.
 *
 * @function garantirAcessoAgendamento
 * @param {Object} usuario - req.usuario.
 * @param {Object} agendamento - Deve conter id_costureira.
 * @returns {void}
 * @throws {ForbiddenError}
 *
 * @example
 * garantirAcessoAgendamento(req.usuario, agendamento);
 */
function garantirAcessoAgendamento(usuario, agendamento) {
    if (restritoAosProprios(usuario) && Number(agendamento.id_costureira) !== Number(usuario.id)) {
        throw new ForbiddenError('Você só pode acessar seus próprios agendamentos');
    }
}

module.exports = { restritoAosProprios, garantirAcessoAgendamento };
