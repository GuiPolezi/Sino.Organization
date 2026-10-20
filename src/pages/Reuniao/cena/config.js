/*
 * Configuração da sala de reunião para a cena compartilhada (Suporte/store.js e
 * Suporte/boneco/useComportamento.js). Só dados: a página aplica antes de a cena nascer.
 */

// Área por onde os bonecos andam: dentro do tapete de 14 × 10 m, antes da parede de vidro.
// A sala é fixa: em retrato vale a mesma área (a câmera recua para caber).
export const AREA_REUNIAO = { rx: 6.2, rz: 3.4 };

export const CENA_REUNIAO = {
  areaPaisagem: AREA_REUNIAO,
  areaRetrato: AREA_REUNIAO,
  margemTapete: 0.8,
  recuo: 1,
};

// Numa reunião quase todo mundo senta logo e fica bastante tempo (segundos).
export const RITMO_REUNIAO = {
  chance: 0.85,
  duracao: [30, 70],
  descanso: [3, 8],
  inicial: [0.3, 4],
};
