import { useEffect, useRef, useState } from 'react';
import styles from './HoraPilulas.module.css';

const doisDigitos = (n) => String(n).padStart(2, '0');
const PASSO_MINUTO = 5;

// Uma pílula de dois dígitos (hora ou minuto).
function Pilula({ valor, maximo, passo, rotulo, invalido, descricao, entradaRef, onConfirmar, onCheio }) {
  const [rascunho, setRascunhoEstado] = useState(doisDigitos(valor));
  const [pulso, setPulso] = useState(0);
  // O blur pode vir no meio da digitação (foco pulando para o minuto):
  // ler o rascunho e o valor daqui evita confirmar um texto velho.
  const atual = useRef({ rascunho, valor });
  atual.current.valor = valor;

  const setRascunho = (texto) => {
    atual.current.rascunho = texto;
    setRascunhoEstado(texto);
  };

  // Valor mudou por fora (setas, outro campo): o rascunho acompanha.
  useEffect(() => setRascunho(doisDigitos(valor)), [valor]);

  const confirmar = (texto) => {
    const { valor: anterior } = atual.current;
    const numero = Number.parseInt(texto, 10);
    const novo = Number.isNaN(numero) ? anterior : Math.min(maximo, Math.max(0, numero));
    setRascunho(doisDigitos(novo));
    if (novo !== anterior) {
      atual.current.valor = novo;
      onConfirmar(novo);
    }
  };

  const girar = (direcao) => {
    const total = maximo + 1;
    // Minutos "soltos" (ex.: 07) encaixam no passo antes de andar.
    const base = direcao > 0 ? Math.floor(valor / passo) * passo : Math.ceil(valor / passo) * passo;
    onConfirmar((((base + direcao * passo) % total) + total) % total);
    setPulso((p) => p + 1);
  };

  return (
    <input
      ref={entradaRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      className={styles.pilula}
      value={rascunho}
      aria-label={rotulo}
      aria-invalid={invalido || undefined}
      aria-describedby={descricao}
      data-pulso={pulso ? pulso % 2 : undefined}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const digitos = event.target.value.replace(/\D/g, '').slice(0, 2);
        setRascunho(digitos);
        if (digitos.length === 2) {
          confirmar(digitos);
          // Pula para o minuto depois que o valor novo entrar.
          if (onCheio) requestAnimationFrame(onCheio);
        }
      }}
      onBlur={() => confirmar(atual.current.rascunho)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          girar(event.key === 'ArrowUp' ? 1 : -1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          confirmar(atual.current.rascunho);
        }
      }}
    />
  );
}

/**
 * Hora em duas pílulas (HH e mm). ↑/↓ andam 1 h ou 5 min; dois dígitos
 * digitados na hora pulam para o minuto.
 *
 * @param {object} props
 * @param {string} props.rotulo "Início" / "Fim"
 * @param {string} props.valor 'HH:mm'
 * @param {(hora: string) => void} props.onChange
 */
export default function HoraPilulas({ rotulo, valor, onChange, invalido, descricao }) {
  const [h, m] = valor.split(':').map(Number);
  const minutoRef = useRef(null);

  return (
    <div className={styles.linha} role="group" aria-label={`${rotulo}: ${valor}`}>
      <span className={styles.rotulo} aria-hidden="true">
        {rotulo}
      </span>
      <Pilula
        valor={h}
        maximo={23}
        passo={1}
        rotulo={`${rotulo}, horas`}
        invalido={invalido}
        descricao={descricao}
        onConfirmar={(novo) => onChange(`${doisDigitos(novo)}:${doisDigitos(m)}`)}
        onCheio={() => minutoRef.current?.focus()}
      />
      <span className={styles.separador} aria-hidden="true">
        :
      </span>
      <Pilula
        entradaRef={minutoRef}
        valor={m}
        maximo={59}
        passo={PASSO_MINUTO}
        rotulo={`${rotulo}, minutos`}
        invalido={invalido}
        descricao={descricao}
        onConfirmar={(novo) => onChange(`${doisDigitos(h)}:${doisDigitos(novo)}`)}
      />
    </div>
  );
}
