import { create } from 'zustand';
import { MODALIDADES, formatarDataHora } from '../../components/Hero/reunioes/reunioes.js';
import { temaDaReuniao } from './cena/temaHorario.js';

/*
 * A reunião aberta na página (a mesma salva pela tela de Reuniões da home) e o
 * período do dia dela. A página atualiza aqui quando a reunião muda; a cena lê.
 * Os membros, como bonecos, ficam em useEquipe.tecnicos (Suporte/store.js).
 */
export const useReuniao = create((set) => ({
  reuniao: null,
  tema: temaDaReuniao(null),
  setReuniao: (reuniao) => set({ reuniao, tema: temaDaReuniao(reuniao) }),
}));

const inicioDe = (reuniao) => String(reuniao?.dataHora ?? '').slice(11, 16);
const modalidadeDe = (reuniao) => (reuniao?.modalidade === MODALIDADES.DIGITAL ? 'Digital' : 'Presencial');

/** "14:00 – 15:00 · Presencial": o que vai embaixo do título no quadro. */
export function detalheDoQuadro(reuniao) {
  if (!reuniao) return '';
  const fim = reuniao.horaFim ? ` – ${reuniao.horaFim}` : '';
  return `${inicioDe(reuniao)}${fim} · ${modalidadeDe(reuniao)}`;
}

/** "ter., 20 de out. de 2026 · 14:00 – 15:00 · Presencial": o subtítulo da página. */
export function subtituloDa(reuniao) {
  if (!reuniao) return '';
  const fim = reuniao.horaFim ? ` – ${reuniao.horaFim}` : '';
  return `${formatarDataHora(reuniao.dataHora)}${fim} · ${modalidadeDe(reuniao)}`;
}
