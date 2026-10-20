/*
 * Configuração da sala de reunião para a cena compartilhada (Suporte/store.js e
 * Suporte/boneco/useComportamento.js). Só dados: a página aplica antes de a cena nascer.
 */

// Área por onde os bonecos andam: quase o tapete inteiro (14 × 10 m), a ~0,5 m da borda.
// No fundo ela passa um pouco do vidro: quem segura ali são os círculos da parede
// (começam a 4,35 m do centro). A sala é fixa: em retrato vale a mesma área (a câmera recua).
export const AREA_REUNIAO = { rx: 6.5, rz: 4.5 };

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
  // Até 12 lugares em volta da mesa: com 1 m, quase todo o chão perto dela ficava proibido.
  longeDaChegada: 0.55,
};
