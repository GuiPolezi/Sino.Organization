import { useEffect, useState } from 'react';
import { buscarEquipe } from './api/equipeTecnica.js';
import { buscarExtrasQuadro } from './api/resumoEquipe.js';
import { aparenciaDe } from './boneco/aparencia.js';
import CardQuadro from './card/CardQuadro.jsx';
import CardTecnico from './card/CardTecnico.jsx';
import Cena from './cena/Cena.jsx';
import { useEquipe } from './store.js';
import styles from './Suporte.module.css';

function webglDisponivel() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Navegação rápida e acessível por teclado: um botão por técnico.
function Elenco({ tecnicos, selecionado }) {
  const selecionar = useEquipe((s) => s.selecionar);
  const setHover = useEquipe((s) => s.setHover);

  return (
    <nav className={styles.elenco} aria-label="Técnicos">
      {tecnicos.map(({ id, nome }) => (
        <button
          key={id}
          type="button"
          className={id === selecionado ? styles.ativo : undefined}
          aria-pressed={id === selecionado}
          onClick={() => selecionar(id)}
          onMouseEnter={() => setHover(id)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(id)}
          onBlur={() => setHover(null)}
        >
          {nome}
        </button>
      ))}
    </nav>
  );
}

// Sem WebGL não há bonecos: a equipe aparece em cards 2D que abrem o mesmo card.
function ListaTecnicos({ tecnicos, selecionado }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    <ul className={styles.lista} aria-label="Técnicos">
      {tecnicos.map(({ id, nome, funcao, ausente, avatarIniciais }) => (
        <li key={id}>
          <button
            type="button"
            className={styles.item}
            aria-pressed={id === selecionado}
            onClick={() => selecionar(id)}
          >
            <span className={styles.itemAvatar} style={{ background: aparenciaDe(id).camisa }} aria-hidden="true">
              {avatarIniciais}
            </span>
            <strong>{nome}</strong>
            {funcao && <span>{funcao}</span>}
            {ausente && <span className={styles.itemStatus}>Ausente</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Suporte() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const erro = useEquipe((s) => s.erro);
  const selecionado = useEquipe((s) => s.selecionado);
  const painel = useEquipe((s) => s.painel);
  const abrirQuadro = useEquipe((s) => s.abrirQuadro);
  const [temWebgl] = useState(webglDisponivel);

  useEffect(() => {
    let ativo = true;
    const { setTecnicos, setExtrasQuadro, setErro, limpar } = useEquipe.getState();

    buscarEquipe()
      .then((equipe) => {
        if (!ativo) return;
        setTecnicos(equipe);
        // Sem os extras o quadro continua de pé, só com o que os técnicos trazem.
        buscarExtrasQuadro(equipe)
          .then((extras) => ativo && setExtrasQuadro(extras))
          .catch(() => {});
      })
      .catch(() => ativo && setErro());

    return () => {
      ativo = false;
      limpar();
      // O hover de um boneco troca o cursor do body.
      document.body.style.cursor = '';
    };
  }, []);

  const classes = [styles.palco, (selecionado || painel) && styles.comCard, !temWebgl && styles.plano]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={classes}>
      <title>Suporte · sino.org</title>

      {temWebgl && <Cena />}

      <header className={styles.cabecalho}>
        <a className={styles.voltar} href="/">
          ← sino.org
        </a>
        <h1 className={styles.titulo}>Suporte</h1>
        <p className={styles.subtitulo}>Conheça nossa equipe técnica</p>
        {erro && (
          <p className={styles.aviso} role="alert">
            Não foi possível carregar a equipe. Tente de novo em instantes.
          </p>
        )}
        {!temWebgl && !erro && (
          <p className={styles.aviso}>Seu navegador não mostra a cena em 3D, então a equipe aparece em lista.</p>
        )}
      </header>

      {/* O quadro não entra no elenco: este botão só aparece com o foco do teclado. */}
      <button type="button" className={`sr-only ${styles.atalhoQuadro}`} onClick={abrirQuadro}>
        Abrir o quadro da equipe (visão geral)
      </button>

      {temWebgl ? (
        <Elenco tecnicos={tecnicos} selecionado={selecionado} />
      ) : (
        <ListaTecnicos tecnicos={tecnicos} selecionado={selecionado} />
      )}

      <CardTecnico />
      <CardQuadro />
    </main>
  );
}
