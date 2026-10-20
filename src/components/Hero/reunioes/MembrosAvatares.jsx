import { useState } from 'react';
import devTeam from '../../../data/dev-team.json';
import team from '../../../data/team.json';
import { useRetratoReuniao } from './RetratosReunioes.jsx';
import { chaveMembro } from './reunioes.js';
import styles from './MembrosAvatares.module.css';

// Lado do avatar em px (o CSS usa --avatar-tamanho; ≤ 480 px, --avatar-tamanho-compacto).
export const tamanhos = Object.freeze({ padrao: 50, compacto: 36 });

const COLUNAS = 3;

// Quem é da equipe (suporte ou desenvolvimento), pela chave do nome.
const EQUIPE = new Map(
  [...team.team, ...devTeam.team].map((pessoa) => [chaveMembro(pessoa.name), pessoa]),
);

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Membro da reunião → id do boneco (o da equipe, se o nome bater) e cargo.
function identificar(membro) {
  const pessoa = EQUIPE.get(chaveMembro(membro.nome));
  return pessoa ? { id: pessoa.id, cargo: pessoa.role } : { id: membro.id, cargo: null };
}

// "Ana Maria Souza" → "AS"; "Bia" → "B".
function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

// Tom discreto de fundo, sempre o mesmo para cada id.
const matiz = (id) => hash(String(id)) % 360;

// Esc esconde o tooltip até o ponteiro ou o foco saírem (WCAG 1.4.13).
function useDispensavel() {
  const [oculto, setOculto] = useState(false);
  return {
    'data-oculto': oculto || undefined,
    onKeyDown: (evento) => evento.key === 'Escape' && setOculto(true),
    onBlur: () => setOculto(false),
    onMouseLeave: () => setOculto(false),
  };
}

function Avatar({ membro, estilo }) {
  const { id, cargo } = identificar(membro);
  const url = useRetratoReuniao(id);
  const [carregado, setCarregado] = useState(false);
  const dispensavel = useDispensavel();
  const rotulo = cargo ? `${membro.nome}, ${cargo}` : membro.nome;

  return (
    <li className={styles.item} style={estilo}>
      <span
        className={styles.alvo}
        role="img"
        aria-label={rotulo}
        tabIndex={0}
        {...dispensavel}
      >
        <span className={styles.avatar} style={{ '--matiz': matiz(id) }} data-pronto={carregado || undefined}>
          <span className={styles.iniciais} aria-hidden="true">
            {iniciais(membro.nome)}
          </span>
          {url && (
            <img
              className={styles.retrato}
              src={url}
              alt=""
              draggable="false"
              decoding="async"
              onLoad={() => setCarregado(true)}
            />
          )}
        </span>
        <span className={styles.dica} aria-hidden="true">
          <span className={styles.dicaNome}>{membro.nome}</span>
          {cargo && <span className={styles.dicaCargo}>{cargo}</span>}
        </span>
      </span>
    </li>
  );
}

function Mais({ restantes, estilo }) {
  const dispensavel = useDispensavel();
  const nomes = restantes.map((m) => m.nome);

  return (
    <li className={styles.item} style={estilo}>
      <span
        className={styles.alvo}
        role="img"
        aria-label={`Mais ${nomes.length}: ${nomes.join(', ')}`}
        tabIndex={0}
        {...dispensavel}
      >
        <span className={`${styles.avatar} ${styles.mais}`} aria-hidden="true">
          +{nomes.length}
        </span>
        <span className={styles.dica} aria-hidden="true">
          {nomes.map((nome, i) => (
            <span key={restantes[i].id ?? i} className={styles.dicaLinha}>
              {nome}
            </span>
          ))}
        </span>
      </span>
    </li>
  );
}

/**
 * Grade de avatares dos membros de uma reunião: o rosto do boneco de cada um
 * (iniciais até o retrato ficar pronto, ou sem WebGL), 3 por linha, a última
 * linha incompleta alinhada à direita. Acima de `max`, o último lugar vira "+N".
 *
 * @param {object} props
 * @param {{ id: string, nome: string }[]} props.membros
 * @param {number} [props.max=6]
 * @param {string} [props.className]
 */
export default function MembrosAvatares({ membros, max = 6, className }) {
  const lista = Array.isArray(membros) ? membros : [];
  if (!lista.length) return null;

  const limite = Math.max(1, max);
  const excede = lista.length > limite;
  const visiveis = excede ? lista.slice(0, limite - 1) : lista;
  const restantes = excede ? lista.slice(limite - 1) : [];
  const total = visiveis.length + (excede ? 1 : 0);

  const colunas = Math.min(total, COLUNAS);
  // Primeira casa da última linha incompleta: empurrada para a direita.
  const sobra = total % COLUNAS;
  const inicioUltima = total > COLUNAS && sobra ? total - sobra : -1;
  const estiloDe = (indice) =>
    indice === inicioUltima ? { gridColumnStart: COLUNAS - sobra + 1 } : undefined;

  return (
    <ul
      className={className ? `${styles.grade} ${className}` : styles.grade}
      style={{ '--colunas': colunas }}
      aria-label={`Membros (${lista.length})`}
    >
      {visiveis.map((membro, i) => (
        <Avatar key={membro.id ?? i} membro={membro} estilo={estiloDe(i)} />
      ))}
      {excede && <Mais restantes={restantes} estilo={estiloDe(visiveis.length)} />}
    </ul>
  );
}
