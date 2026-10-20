/*
 * Configuração da sala de reunião para a cena compartilhada (Suporte/store.js e
 * Suporte/boneco/useComportamento.js). Só dados: a página aplica antes de a cena nascer.
 */

// Área por onde os bonecos andam: dentro do tapete de 14 × 10 m, antes da parede de vidro
// (os círculos dela começam a 4,35 m do centro). Funda o bastante para o corredor atrás da
// mesa caber uma pessoa. A sala é fixa: em retrato vale a mesma área (a câmera recua).
export const AREA_REUNIAO = { rx: 6.2, rz: 4.1 };

export const CENA_REUNIAO = {
  areaPaisagem: AREA_REUNIAO,
  areaRetrato: AREA_REUNIAO,
  margemTapete: 0.8,
  recuo: 1,
  // No celular em pé a sala inteira (14 m) não cabe no recuo padrão (2×, ~8 m de largura):
  // recua até ~3× para mostrar a mesa e os pufes (~11,8 m numa tela de aspecto 0,46).
  encaixeRetrato: 1.35,
  recuoMaxRetrato: 3,
};

// Numa reunião quase todo mundo senta logo e fica bastante tempo (segundos).
export const RITMO_REUNIAO = {
  chance: 0.85,
  duracao: [30, 70],
  descanso: [3, 8],
  inicial: [0.3, 4],
};
