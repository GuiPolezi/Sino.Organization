/*
 * Tema por horário: o cenário acompanha a hora de INÍCIO da reunião.
 *   amanhecer  05:00–08:59  céu rosado e dourado, sol baixo à esquerda
 *   dia        09:00–16:29  céu azul, sol alto
 *   entardecer 16:30–18:59  céu laranja e lilás, sol baixo à direita, luminária acesa
 *   noite      19:00–04:59  céu azul-marinho, lua e estrelas, vaga-lumes, luminária acesa
 * Cada tema traz as cores do céu, o tom aplicado à natureza e as luzes da cena.
 */

export const TEMAS = {
  amanhecer: {
    periodo: 'amanhecer',
    rotulo: 'Amanhecer',
    ceu: ['#7FB2E6', '#F6C3A8', '#FFE5B5'],
    astro: { tipo: 'sol', x: 0.18, y: 0.5, cor: '#FFE7A8', halo: 'rgba(255,214,150,' },
    estrelas: false,
    natureza: { brilho: 0.92, tom: '#FFB27A', forca: 0.12 },
    nuvem: '#FFE9DE',
    luz: { ceu: '#FFE8D6', chao: '#B9A8C0', hemi: 1.15, sol: '#FFD2A6', solInt: 1.3, fundo: 0.35 },
    luminaria: false,
    vagalumes: false,
    bichos: true,
  },
  dia: {
    periodo: 'dia',
    rotulo: 'Dia',
    ceu: ['#62B7EA', '#9ED8F5', '#DDF4FF'],
    astro: { tipo: 'sol', x: 0.3, y: 0.26, cor: '#FFF4B8', halo: 'rgba(255,240,170,' },
    estrelas: false,
    natureza: { brilho: 1, tom: '#FFFFFF', forca: 0 },
    nuvem: '#FFFFFF',
    luz: { ceu: '#FFF7F0', chao: '#B9B2C9', hemi: 1.35, sol: '#FFFFFF', solInt: 1.5, fundo: 0.35 },
    luminaria: false,
    vagalumes: false,
    bichos: true,
  },
  entardecer: {
    periodo: 'entardecer',
    rotulo: 'Entardecer',
    ceu: ['#4C5BA6', '#E98A6A', '#FFC56E'],
    astro: { tipo: 'sol', x: 0.78, y: 0.52, cor: '#FFB25C', halo: 'rgba(255,150,80,' },
    estrelas: false,
    natureza: { brilho: 0.78, tom: '#FF8A4C', forca: 0.2 },
    nuvem: '#FFC7A8',
    luz: { ceu: '#FFD0B0', chao: '#9C86A8', hemi: 1.05, sol: '#FFB27A', solInt: 1.2, fundo: 0.3 },
    luminaria: true,
    vagalumes: false,
    bichos: true,
  },
  noite: {
    periodo: 'noite',
    rotulo: 'Noite',
    ceu: ['#0A1433', '#1C2B5C', '#3A4C80'],
    astro: { tipo: 'lua', x: 0.7, y: 0.22, cor: '#F4F1DC', halo: 'rgba(200,215,255,' },
    estrelas: true,
    natureza: { brilho: 0.38, tom: '#3A55A0', forca: 0.35 },
    nuvem: '#7D8BB0',
    luz: { ceu: '#A9BAF0', chao: '#3A3552', hemi: 0.78, sol: '#9DB3FF', solInt: 0.45, fundo: 0.2 },
    luminaria: true,
    vagalumes: true,
    bichos: false,
  },
};

const RE_HORA = /(?:^|T)(\d{1,2}):(\d{2})/;

/**
 * Hora decimal (0–24). Aceita 'HH:MM' ou o 'YYYY-MM-DDTHH:mm' das reuniões, que
 * já está no horário de Brasília (reunioes.js): a hora é lida do texto, sem
 * passar pelo fuso do navegador. Sem hora válida, devolve null.
 * @param {string} valor
 */
export function horaDe(valor) {
  const m = RE_HORA.exec(String(valor ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h + min / 60 : null;
}

/** @param {number} h hora decimal */
export function temaDaHora(h) {
  if (h >= 5 && h < 9) return TEMAS.amanhecer;
  if (h >= 9 && h < 16.5) return TEMAS.dia;
  if (h >= 16.5 && h < 19) return TEMAS.entardecer;
  return TEMAS.noite;
}

/**
 * Tema da reunião pela hora de início (dataHora). Sem hora, o de dia.
 * @param {{ dataHora?: string } | null} reuniao
 */
export function temaDaReuniao(reuniao) {
  const h = horaDe(reuniao?.dataHora);
  return h === null ? TEMAS.dia : temaDaHora(h);
}
