import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';
import desktop1024 from '../../assets/images/sistemas/desktop-1024.webp';
import desktop1920 from '../../assets/images/sistemas/desktop-1920.webp';
import { MEDIA, matches } from '../../utils/media.js';
import { abrirApp, fecharApp } from './animacoes.js';
import JanelaApp from './JanelaApp.jsx';
import { tocarClique } from './somDeClique.js';
import { APPS, appPorId, areaEmPorcentagem } from './systems.js';
import styles from './Computador.module.css';

gsap.registerPlugin(Draggable, Flip);

const TROCA_DE_MODO = { duration: 0.5, ease: 'power3.inOut' };
const PROXIMO_MODO = {
  janela: (modo) => (modo === 'janela' ? 'maximizada' : 'janela'),
  telaCheia: (modo) => (modo === 'tela-cheia' ? 'maximizada' : 'tela-cheia'),
};

const reduzido = () => matches(MEDIA.reducedMotion);

/*
 * Computador da seção Sistemas: monitor, base, teclado e mouse em CSS, com o
 * wallpaper e os ícones na tela. `appAtivo` (id ou null) diz qual aplicativo
 * deve estar aberto; a troca anima fechando o atual e abrindo o próximo. A tela usa o cursor nativo
 * (data-cursor="nativo") e faz o "tic" de clique do Windows antigo.
 */
export default function Computador({ appAtivo, onAbrir, onFechar }) {
  const tela = useRef(null);
  const janela = useRef(null);
  const barra = useRef(null);
  const botoes = useRef({});
  const animando = useRef(false);
  const animacao = useRef(null);
  const estadoFlip = useRef(null);
  const flip = useRef(null);
  const devolverFoco = useRef(null);
  const [exibido, setExibido] = useState(null);
  const [modo, setModo] = useState('maximizada');
  // Muda ao fim de cada animação, para conferir de novo se o alvo mudou no meio.
  const [pulso, setPulso] = useState(0);

  // Fecha o app exibido quando o alvo muda; a abertura fica no efeito abaixo.
  useEffect(() => {
    if (animando.current || exibido === appAtivo) return;
    if (!exibido) {
      setExibido(appAtivo);
      return;
    }
    flip.current?.kill();
    // Quem estava com o foco dentro da janela volta para o ícone do app.
    const icone = botoes.current[exibido];
    const tinhaFoco = janela.current?.contains(document.activeElement);
    animando.current = true;
    animacao.current = fecharApp({
      janela: janela.current,
      reduzido: reduzido(),
      aoTerminar: () => {
        animando.current = false;
        if (tinhaFoco) devolverFoco.current = icone;
        setModo('maximizada');
        setExibido(null);
      },
    });
  }, [appAtivo, exibido, pulso]);

  // A janela acabou de montar: nasce do ícone. Ao desmontar, o foco que estava
  // nela volta para o ícone (só agora, com a lista de ícones fora do `inert`).
  useLayoutEffect(() => {
    if (!exibido) {
      devolverFoco.current?.focus({ preventScroll: true });
      devolverFoco.current = null;
      return;
    }
    // Aberto pela tela (clique ou teclado no ícone): o foco segue para a janela.
    if (tela.current.contains(document.activeElement)) janela.current.focus({ preventScroll: true });
    animando.current = true;
    animacao.current = abrirApp({
      janela: janela.current,
      reduzido: reduzido(),
      aoTerminar: () => {
        animando.current = false;
        setPulso((n) => n + 1);
      },
    });
  }, [exibido]);

  useEffect(
    () => () => {
      animacao.current?.kill();
      flip.current?.kill();
    },
    [],
  );

  // Troca de modo: o Flip anima do retângulo antigo para o novo.
  useLayoutEffect(() => {
    const estado = estadoFlip.current;
    estadoFlip.current = null;
    if (!estado || !janela.current) return;
    if (reduzido()) return;
    flip.current = Flip.from(estado, { ...TROCA_DE_MODO });
  }, [modo]);

  // Só no modo janela ela pode ser arrastada (pela barra, sem sair da tela).
  useLayoutEffect(() => {
    if (modo !== 'janela' || !exibido || !janela.current) return undefined;
    const [arrasto] = Draggable.create(janela.current, {
      type: 'x,y',
      trigger: barra.current,
      bounds: tela.current,
      edgeResistance: 0.85,
    });
    return () => arrasto.kill();
  }, [modo, exibido]);

  const aoAcionar = (acao) => {
    if (acao === 'fechar') {
      onFechar();
      return;
    }
    if (animando.current || !janela.current) return;
    // Clique no meio de outra troca: parte de onde a janela está agora.
    flip.current?.kill();
    estadoFlip.current = Flip.getState(janela.current);
    gsap.set(janela.current, { clearProps: 'width,height,transform' });
    setModo(PROXIMO_MODO[acao](modo));
  };

  const app = appPorId(exibido);

  return (
    <div className={styles.computador}>
      <div className={styles.sombra} data-sys="periferico" aria-hidden="true" />
      {/* data-ripple-bloqueio: mouse e clique sobre as peças do computador não fazem ondas na água. */}
      <div className={styles.pe} data-sys="monitor" data-ripple-bloqueio aria-hidden="true" />

      <div className={styles.monitor} data-sys="monitor" data-ripple-bloqueio>
        <span className={styles.camera} aria-hidden="true" />

        <div
          ref={tela}
          className={styles.tela}
          data-cursor="nativo"
          onPointerDown={tocarClique}
        >
          <div className={styles.fundo}>
            <img
              className={styles.wallpaper}
              src={desktop1920}
              srcSet={`${desktop1024} 1024w, ${desktop1920} 1920w`}
              sizes="(min-width: 1024px) 53vw, 92vw"
              alt=""
              draggable="false"
            />
          </div>

          {/* Com a janela cobrindo a tela, os ícones por baixo saem do foco e do clique. */}
          <ul className={styles.icones} aria-label="Aplicativos" inert={Boolean(app) && modo !== 'janela'}>
            {APPS.map(({ id, nome, area }) => {
              const { left, top, width, height } = areaEmPorcentagem(area);
              return (
                <li key={id}>
                  <button
                    ref={(el) => {
                      botoes.current[id] = el;
                    }}
                    type="button"
                    className={styles.icone}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                    aria-label={`Abrir ${nome}`}
                    onClick={() => onAbrir(id)}
                  />
                </li>
              );
            })}
          </ul>

          {app && (
            <JanelaApp
              key={app.id}
              ref={janela}
              barraRef={barra}
              app={app}
              modo={modo}
              onAcao={aoAcionar}
            />
          )}
        </div>

        <div className={styles.queixo} aria-hidden="true" />
      </div>

      <div className={styles.teclado} data-sys="periferico" data-ripple-bloqueio aria-hidden="true" />
      <div className={styles.mouse} data-sys="periferico" data-ripple-bloqueio aria-hidden="true" />
    </div>
  );
}
