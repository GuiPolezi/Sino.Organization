import { useEffect, useRef } from 'react';
import { EQUIPE, iniciais, matiz } from './MembrosAvatares.jsx';
import { useRetratoReuniao } from './RetratosReunioes.jsx';
import { adicionarMembro, chaveMembro } from './reunioes.js';
import styles from './SeletorMembrosProvisorio.module.css';

/*
 * PROVISÓRIO — TODO(seleção de personagens): será trocado pelo modal com
 * todos os personagens. Por enquanto, uma lista simples das equipes para o
 * formulário poder ser salvo (a reunião precisa de pelo menos um membro).
 */

// Pessoas das equipes, sem repetir, em ordem alfabética.
const PESSOAS = [...new Map([...EQUIPE.values()].map((p) => [p.id, p])).values()].sort((a, b) =>
  a.name.localeCompare(b.name, 'pt-BR'),
);

function Pessoa({ pessoa, marcada, onAlternar }) {
  const url = useRetratoReuniao(pessoa.id);
  return (
    <li>
      <button type="button" className={styles.pessoa} aria-pressed={marcada} onClick={onAlternar}>
        <span className={styles.avatar} style={{ '--matiz': matiz(pessoa.id) }} aria-hidden="true">
          {url ? <img src={url} alt="" draggable="false" /> : iniciais(pessoa.name)}
        </span>
        <span className={styles.texto}>
          <span className={styles.nome}>{pessoa.name}</span>
          <span className={styles.cargo}>{pessoa.role}</span>
        </span>
        <span className={styles.marca} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </button>
    </li>
  );
}

export default function SeletorMembrosProvisorio({ membros, onChange, onFechar, ancora }) {
  const painel = useRef(null);
  const escolhidos = new Set(membros.map((m) => chaveMembro(m.nome)));

  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  // Foco no primeiro item ao abrir.
  useEffect(() => {
    painel.current?.querySelector('button')?.focus();
  }, []);

  // Esc ou clique fora fecham o seletor (sem fechar o modal).
  useEffect(() => {
    const onFechar = () => fechar.current();
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onFechar();
    };
    const onFora = (event) => {
      if (painel.current?.contains(event.target) || ancora.current?.contains(event.target)) return;
      onFechar();
    };
    const elemento = painel.current;
    elemento?.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onFora);
    return () => {
      elemento?.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onFora);
    };
  }, [ancora]);

  const alternar = (pessoa) => {
    const chave = chaveMembro(pessoa.name);
    onChange((atuais) => {
      const tem = atuais.some((m) => chaveMembro(m.nome) === chave);
      if (tem) return atuais.filter((m) => chaveMembro(m.nome) !== chave);
      const resultado = adicionarMembro(atuais, pessoa.name);
      return resultado.ok ? resultado.membros : atuais;
    });
  };

  return (
    <div ref={painel} className={styles.painel} role="dialog" aria-label="Escolher membros">
      <p className={styles.titulo}>Escolher membros</p>
      <ul className={styles.lista} data-modal-scroll>
        {PESSOAS.map((pessoa) => (
          <Pessoa
            key={pessoa.id}
            pessoa={pessoa}
            marcada={escolhidos.has(chaveMembro(pessoa.name))}
            onAlternar={() => alternar(pessoa)}
          />
        ))}
      </ul>
      <button type="button" className={styles.pronto} onClick={onFechar}>
        Pronto
      </button>
    </div>
  );
}
