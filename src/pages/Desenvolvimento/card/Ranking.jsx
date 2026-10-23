import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { tempoParaMostrar } from '../mappers/categoria.js';
import { girarAoPassar } from './giroDaEstrela.js';
import Retrato from './Retrato.jsx';
import styles from './Ranking.module.css';

gsap.registerPlugin(useGSAP);

/** @import { Ranking as DadosRanking } from '../mappers/categoria.js' */

// Quanto o slide que sai fica na tela (a animação .slide[data-saindo] do CSS).
const SAIDA_MS = 450;
// Arrasto horizontal, em px, que troca de slide no toque.
const ARRASTO = 40;
// A menor barra de quem tem valor: um traço, para não sumir no eixo.
const MIN_FRACAO = 0.04;

// Estrela de cinco pontas, de -50 a 50; as pontas arredondam no traço (CSS).
const ESTRELA = `M${Array.from({ length: 10 }, (_, i) => {
  const raio = i % 2 === 0 ? 44 : 19;
  const angulo = (i * Math.PI) / 5 - Math.PI / 2;
  return `${(raio * Math.cos(angulo)).toFixed(2)} ${(raio * Math.sin(angulo)).toFixed(2)}`;
}).join('L')}Z`;

const primeiroNome = (nome) => nome.split(' ')[0];

// No tempo, o valor vem em horas: aparece em horas abaixo de 1 dia e em dias a partir dele.
function Valor({ ranking, valor }) {
  if (valor === null) return '—';
  if (ranking.id !== 'tempo') return <Contagem valor={valor} />;
  const { numero, unidade } = tempoParaMostrar(valor);
  if (numero === null) return unidade;
  return (
    <>
      <Contagem valor={numero} /> {unidade}
    </>
  );
}

/*
 * Uma pessoa no gráfico: a barra cresce do eixo e o rosto vai em cima dela.
 * A altura é um scaleY e a subida do rosto, um translateY, os dois na mesma
 * fração: só transformações, que rodam no compositor (ver CardQuadro.jsx sobre o
 * piscar da tela). O primeiro lugar leva a estrela; com o mouse sobre ele, ela
 * surge de trás do rosto e gira, e ao sair freia até pousar com uma ponta para
 * cima (giroDaEstrela.js).
 */
function Coluna({ tecnico, ranking, valor, fracao, indice, melhor }) {
  const raiz = useRef(null);
  const pulo = useRef(null);
  const estrela = useRef(null);

  useGSAP(
    () => {
      if (!melhor) return;
      gsap.matchMedia().add(MEDIA.motion, () => {
        const alvo = raiz.current;
        const surgir = () =>
          gsap.fromTo(
            pulo.current,
            { y: 18, scale: 0.3, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.4)', overwrite: true },
          );
        alvo.addEventListener('pointerenter', surgir);
        const pararGiro = girarAoPassar(alvo, estrela.current, 72);
        return () => {
          alvo.removeEventListener('pointerenter', surgir);
          pararGiro();
          gsap.set(pulo.current, { clearProps: 'all' });
        };
      });
    },
    { dependencies: [melhor], scope: raiz },
  );

  return (
    <li ref={raiz} className={styles.coluna} style={{ '--fracao': fracao, '--i': indice }} data-melhor={melhor || undefined}>
      <div className={styles.trilho}>
        <span className={styles.barra} />
        <div className={styles.cabeca}>
          {melhor && (
            <span className={styles.estrela} aria-hidden="true">
              <span ref={pulo} className={styles.pulo}>
                <svg ref={estrela} viewBox="-50 -50 100 100" focusable="false">
                  <path d={ESTRELA} />
                </svg>
              </span>
            </span>
          )}
          <span className={styles.nome}>{primeiroNome(tecnico.nome)}</span>
          <Retrato tecnico={tecnico} className={styles.retrato} />
        </div>
      </div>
      <strong className={styles.valor}>
        <Valor ranking={ranking} valor={valor} />
      </strong>
    </li>
  );
}

function Slide({ ranking, membros, saindo }) {
  const maior = Math.max(0, ...ranking.itens.map(({ valor }) => valor ?? 0));
  const fracao = (valor) => (valor && maior ? Math.max(valor / maior, MIN_FRACAO) : 0);

  return (
    <ul
      className={styles.slide}
      style={{ '--colunas': ranking.itens.length }}
      data-saindo={saindo || undefined}
      aria-hidden={saindo || undefined}
    >
      {ranking.itens.map((item, indice) => (
        <Coluna
          key={item.id}
          tecnico={membros.find(({ id }) => id === item.id)}
          ranking={ranking}
          valor={item.valor}
          fracao={fracao(item.valor)}
          indice={indice}
          melhor={item.id === ranking.melhor}
        />
      ))}
    </ul>
  );
}

// O ranking para leitores de tela: quem, quanto e quem está em primeiro.
function Leitura({ ranking }) {
  const texto = (valor) => {
    if (valor === null) return 'sem tickets fechados';
    if (ranking.id !== 'tempo') return `${valor} tickets`;
    const { numero, unidade } = tempoParaMostrar(valor);
    if (numero === null) return 'menos de 1 hora';
    return `${numero} ${unidade === 'h' ? (numero === 1 ? 'hora' : 'horas') : unidade.toLowerCase()}`;
  };
  return (
    <ol className="sr-only">
      {ranking.itens.map(({ id, nome, valor }) => (
        <li key={id}>
          {nome}: {texto(valor)}
          {id === ranking.melhor && ' (primeiro lugar)'}
        </li>
      ))}
    </ol>
  );
}

/**
 * Ranking do card da categoria: três slides (atribuídos, fechados e tempo
 * médio) sobre o mesmo fundo de gráfico, com os eixos x e y parados. Trocar de
 * slide desliza o gráfico para o lado da troca enquanto o novo entra com as
 * barras crescendo uma a uma; trocar de período só muda a altura das barras.
 * Setas, pontos, as setas do teclado e o arrasto no toque trocam o slide.
 *
 * @param {object} props
 * @param {DadosRanking[]} props.rankings
 * @param {import('../../Suporte/tipos.js').Tecnico[]} props.membros
 * @param {string} [props.className]
 * @param {import('react').CSSProperties} [props.style]
 */
export default function Ranking({ rankings, membros, className = '', style }) {
  const [indice, setIndice] = useState(0);
  const [saindo, setSaindo] = useState(null);
  const [direcao, setDirecao] = useState(1);
  const toque = useRef(null);

  useEffect(() => {
    if (saindo === null) return undefined;
    const espera = setTimeout(() => setSaindo(null), SAIDA_MS);
    return () => clearTimeout(espera);
  }, [saindo]);

  const ir = (novo) => {
    if (novo === indice || novo < 0 || novo >= rankings.length) return;
    setDirecao(novo > indice ? 1 : -1);
    setSaindo(indice);
    setIndice(novo);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') ir(indice + 1);
    else if (event.key === 'ArrowLeft') ir(indice - 1);
    else return;
    event.preventDefault();
  };
  const onPointerDown = (event) => {
    toque.current = event.pointerType === 'mouse' ? null : event.clientX;
  };
  const onPointerUp = (event) => {
    if (toque.current === null) return;
    const arrasto = event.clientX - toque.current;
    toque.current = null;
    if (Math.abs(arrasto) >= ARRASTO) ir(indice + (arrasto < 0 ? 1 : -1));
  };

  const ranking = rankings[indice];
  // O slide que sai mantém a key: o React só o marca como saindo, sem remontar.
  const slides = saindo !== null && saindo !== indice ? [saindo, indice] : [indice];

  return (
    <section
      className={`${styles.ranking} ${className}`}
      style={{ ...style, '--direcao': direcao }}
      aria-roledescription="carrossel"
      aria-label="Ranking dos desenvolvedores"
      onKeyDown={onKeyDown}
    >
      <div className={styles.topo}>
        <div className={styles.legenda}>
          <small>Rank</small>
          <h3 key={ranking.id} aria-live="polite">
            {ranking.titulo}
          </h3>
        </div>
        <p className={styles.aba} aria-hidden="true">
          Ranking
        </p>
      </div>

      <div
        className={styles.plano}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          toque.current = null;
        }}
      >
        <span className={styles.grade} aria-hidden="true" />
        <span className={styles.eixoY} aria-hidden="true">
          <i>y</i>
        </span>
        <span className={styles.eixoX} aria-hidden="true">
          <i>x</i>
        </span>
        <div className={styles.slides}>
          {slides.map((i) => (
            <Slide key={rankings[i].id} ranking={rankings[i]} membros={membros} saindo={i !== indice} />
          ))}
        </div>
        <Leitura ranking={ranking} />
      </div>

      <nav className={styles.paginas} aria-label="Slides do ranking">
        <button type="button" className={styles.seta} aria-label="Slide anterior" disabled={indice === 0} onClick={() => ir(indice - 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        {rankings.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={styles.ponto}
            aria-label={item.titulo}
            aria-current={i === indice || undefined}
            onClick={() => ir(i)}
          />
        ))}
        <button
          type="button"
          className={styles.seta}
          aria-label="Próximo slide"
          disabled={indice === rankings.length - 1}
          onClick={() => ir(indice + 1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </section>
  );
}
