import gsap from 'gsap';

// Graus por segundo com a estrela girando solta.
const VELOCIDADE = 150;
// A estrela de quatro pontas fica igual a cada quarto de volta: é onde ela pousa (por padrão).
const QUARTO = 90;
// Duração da freada; sem velocidade para herdar, ela leva PARADA_DO_REPOUSO_S.
const MIN_PARADA_S = 0.6;
const MAX_PARADA_S = 1.8;
const PARADA_DO_REPOUSO_S = 0.8;

/*
 * Curva de Hermite da freada: sai de `de` na velocidade `v0` (graus/s) e chega
 * em `ate` parada. Com v0 · duração ≤ 3 · distância ela nunca passa do ponto
 * nem anda para trás, e a velocidade de partida é exatamente v0, seja qual for
 * a distância: é isso que deixa a freada sem tranco.
 */
function curvaDePouso(de, ate, v0, duracao) {
  const distancia = ate - de;
  const impulso = v0 * duracao;
  return {
    angulo: (s) => de + distancia * (3 * s ** 2 - 2 * s ** 3) + impulso * (s ** 3 - 2 * s ** 2 + s),
    velocidade: (s) => (distancia * (6 * s - 6 * s ** 2) + impulso * (3 * s ** 2 - 4 * s + 1)) / duracao,
  };
}

/*
 * O próximo quarto de volta à frente e quanto tempo levar até ele. O tempo
 * natural é o de uma freada constante (2·d/v); fica entre MIN e MAX_PARADA_S e
 * nunca passa de 3·d/v, o limite em que a curva começaria a passar do ponto.
 */
function planejarPouso(angulo, velocidade, simetria) {
  let destino = Math.ceil(angulo / simetria) * simetria;
  if (velocidade <= 0) return { destino, duracao: PARADA_DO_REPOUSO_S };

  // Perto demais para frear sem passar do ponto: segue até o quarto seguinte.
  while ((3 * (destino - angulo)) / velocidade < MIN_PARADA_S) destino += simetria;
  const distancia = destino - angulo;
  const limite = Math.min(MAX_PARADA_S, (3 * distancia) / velocidade);
  return { destino, duracao: gsap.utils.clamp(MIN_PARADA_S, limite, (2 * distancia) / velocidade) };
}

/**
 * Ao passar o mouse, a estrela acelera até girar solta; ao sair, freia até pousar
 * no próximo quarto de volta, numa posição igual à de partida. A velocidade nunca
 * salta nem muda de sentido: a freada parte da velocidade em que a estrela
 * estava, e uma nova passada no meio da freada retoma dali. `alvo` é a área do
 * mouse e não gira, para o giro não tirar a estrela de baixo do ponteiro.
 *
 * @param {HTMLElement} alvo
 * @param {SVGElement} estrela
 * @param {number} [simetria] graus em que a estrela fica igual: 90 na de quatro pontas, 72 na de cinco
 * @returns {() => void} desfaz tudo
 */
export function girarAoPassar(alvo, estrela, simetria = QUARTO) {
  const giro = { velocidade: 0 };
  const girarPara = gsap.quickSetter(estrela, 'rotation', 'deg');
  let angulo = 0;
  let parada = null;
  let solta = false;

  const avancar = (_tempo, deltaMs) => {
    angulo += (giro.velocidade * deltaMs) / 1000;
    girarPara(angulo);
  };

  const entrar = () => {
    // A freada usa ease 'none': o progresso do tween é a posição na curva.
    const herdada = parada ? parada.data.velocidade(parada.progress()) : 0;
    parada?.kill();
    parada = null;
    // Também interrompe a entrada da estrela, se ainda estiver girando.
    gsap.killTweensOf(estrela, 'rotation');
    angulo = gsap.getProperty(estrela, 'rotation');
    giro.velocidade = Math.max(herdada, 0);
    if (!solta) gsap.ticker.add(avancar);
    solta = true;
    gsap.to(giro, { velocidade: VELOCIDADE, duration: 0.9, ease: 'power2.out', overwrite: true });
    gsap.to(estrela, { scale: 1.08, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
  };

  const sair = () => {
    if (!solta) return;
    gsap.killTweensOf(giro);
    gsap.ticker.remove(avancar);
    solta = false;

    const { velocidade } = giro;
    giro.velocidade = 0;
    const { destino, duracao } = planejarPouso(angulo, velocidade, simetria);
    const curva = curvaDePouso(angulo, destino, velocidade, duracao);
    const progresso = { s: 0 };

    parada = gsap.to(progresso, {
      s: 1,
      duration: duracao,
      ease: 'none',
      data: curva,
      onUpdate: () => {
        angulo = curva.angulo(progresso.s);
        girarPara(angulo);
      },
      onComplete: () => {
        parada = null;
        // Volta ao intervalo de uma volta; pela simetria, nada muda na tela.
        angulo = destino % 360;
        girarPara(angulo);
      },
    });
    gsap.to(estrela, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
  };

  alvo.addEventListener('pointerenter', entrar);
  alvo.addEventListener('pointerleave', sair);

  return () => {
    alvo.removeEventListener('pointerenter', entrar);
    alvo.removeEventListener('pointerleave', sair);
    gsap.ticker.remove(avancar);
    parada?.kill();
    gsap.killTweensOf([giro, estrela]);
    gsap.set(estrela, { rotation: 0, scale: 1 });
  };
}
