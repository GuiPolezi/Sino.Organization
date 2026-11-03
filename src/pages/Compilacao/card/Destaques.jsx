import { useState } from 'react';
import { useRetratoCorpo } from '../../Suporte/boneco/Retratos.jsx';
import { useEquipe } from '../../Suporte/store.js';
import { SLIDES, primeiroLugar, topoDoGrafico } from '../destaques.js';
import { useCidadesEmAtuacao } from '../useAtuacao.js';
import styles from './Destaques.module.css';

const primeiroNome = (nome) => nome.split(' ')[0];
const formato = new Intl.NumberFormat('pt-BR');

function Estrela() {
  return (
    <svg className={styles.estrela} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.8l3 6.7 7.2.8-5.4 4.9 1.5 7.2L12 17.7l-6.3 3.7 1.5-7.2L1.8 9.3l7.2-.8z" />
    </svg>
  );
}

// O boneco de quem ficou em primeiro, em pé, com o nome num balão de vidro. Clicar abre o card da pessoa.
function Boneco({ pessoa }) {
  const url = useRetratoCorpo(pessoa.id);
  const selecionar = useEquipe((s) => s.selecionar);
  const nome = primeiroNome(pessoa.nome);
  return (
    <button type="button" className={styles.pessoa} onClick={() => selecionar(pessoa.id)} aria-label={`Abrir o card de ${nome}`}>
      <span className={styles.balao}>
        {nome}
        <Estrela />
      </span>
      {url ? (
        <img className={styles.corpo} src={url} alt="" draggable="false" />
      ) : (
        <span className={styles.iniciais} aria-hidden="true">
          {pessoa.avatarIniciais}
        </span>
      )}
    </button>
  );
}

function Grafico({ primeiro }) {
  if (!primeiro) return <p className={styles.vazio}>Ninguém em destaque ainda</p>;
  const { pessoa, valor } = primeiro;
  return (
    <>
      <div className={styles.barra} style={{ '--fracao': valor / topoDoGrafico(valor) }}>
        <b>{formato.format(valor)}</b>
        <i />
      </div>
      <Boneco pessoa={pessoa} />
    </>
  );
}

/*
 * "Destaques": um slide por conta (normas do mês, fila, cidades), cada um só com
 * quem ficou em primeiro. Os slides ficam empilhados na mesma célula, para o
 * bloco ter sempre a altura do maior e não pular ao trocar.
 */
export default function Destaques({ ranking, tecnicos }) {
  const [atual, setAtual] = useState(0);
  const cidades = useCidadesEmAtuacao(tecnicos.map(({ id }) => id));
  const pessoas = new Map(tecnicos.map((tecnico) => [tecnico.id, tecnico]));

  // ranking já vem do mais ao menos produtivo: no empate, vence quem compilou mais.
  const comPessoa = ({ id }) => pessoas.get(id);
  const primeiros = {
    compiladas: primeiroLugar(ranking, ({ normasMes }) => normasMes),
    fila: primeiroLugar(ranking, ({ emFila }) => emFila),
    cidades: primeiroLugar(ranking, ({ id }) => cidades[id] ?? 0),
  };

  const ir = (passo) => setAtual((indice) => (indice + passo + SLIDES.length) % SLIDES.length);

  return (
    <div className={styles.destaques} role="region" aria-roledescription="carrossel" aria-label="Destaques">
      <div className={styles.slides}>
        {SLIDES.map(({ chave, titulo }, i) => {
          const primeiro = primeiros[chave];
          const ativo = i === atual;
          return (
            <article
              key={chave}
              className={styles.slide}
              data-ativo={ativo || undefined}
              inert={!ativo}
              aria-hidden={!ativo}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${SLIDES.length}`}
            >
              <h4 className={styles.titulo}>{titulo}</h4>
              <div className={styles.grafico}>
                <Grafico primeiro={primeiro && { ...primeiro, pessoa: comPessoa(primeiro.pessoa) ?? primeiro.pessoa }} />
              </div>
            </article>
          );
        })}
      </div>

      <nav className={styles.paginas} aria-label="Trocar de destaque">
        <button type="button" className={styles.seta} onClick={() => ir(-1)} aria-label="Destaque anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        {SLIDES.map(({ chave, titulo }, i) => (
          <button
            key={chave}
            type="button"
            className={styles.ponto}
            aria-label={titulo}
            aria-current={i === atual || undefined}
            onClick={() => setAtual(i)}
          >
            <i />
          </button>
        ))}
        <button type="button" className={styles.seta} onClick={() => ir(1)} aria-label="Próximo destaque">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
