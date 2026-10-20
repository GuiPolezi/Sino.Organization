import { useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './CalendarioMini.module.css';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const SEMANA_EXTENSO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const doisDigitos = (n) => String(n).padStart(2, '0');
const paraIso = (ano, mes, dia) => `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(dia)}`;

// 'YYYY-MM-DD' → { ano, mes (0-11), dia }. Datas puras: nada de fuso aqui.
function partes(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes: mes - 1, dia };
}

// Dias da semana e do mês por UTC: a grade não depende do fuso da máquina.
const diaDaSemana = (ano, mes, dia) => new Date(Date.UTC(ano, mes, dia)).getUTCDay();
const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

function somarDias(iso, n) {
  const { ano, mes, dia } = partes(iso);
  const data = new Date(Date.UTC(ano, mes, dia + n));
  return paraIso(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

/**
 * Calendário compacto de um mês. Dias antes de `min` ficam desabilitados.
 * Teclado: setas andam pelos dias (trocando de mês se preciso), Enter/Espaço
 * escolhe; Page Up/Down trocam de mês.
 *
 * @param {object} props
 * @param {string} props.valor 'YYYY-MM-DD' ou ''
 * @param {string} props.min 'YYYY-MM-DD' (primeiro dia escolhível)
 * @param {string} [props.hoje] 'YYYY-MM-DD' marcado com o anel (padrão: min)
 * @param {(iso: string) => void} props.onChange
 * @param {boolean} [props.invalido]
 * @param {string} [props.descricao] id da mensagem de erro
 */
export default function CalendarioMini({ valor, min, hoje = min, onChange, invalido, descricao, rotuloId }) {
  const inicial = partes(valor || min);
  const [visto, setVisto] = useState({ ano: inicial.ano, mes: inicial.mes });
  const [focado, setFocado] = useState(valor || min);
  // Direção da última troca de mês (anima a grade entrando por esse lado).
  const [direcao, setDirecao] = useState(0);
  const grade = useRef(null);
  const moverFoco = useRef(false);
  const tituloId = useId();

  // Valor mudou por fora (ex.: data padrão): mostra o mês dele.
  useEffect(() => {
    if (!valor) return;
    const { ano, mes } = partes(valor);
    setVisto((atual) => (atual.ano === ano && atual.mes === mes ? atual : { ano, mes }));
    setFocado(valor);
  }, [valor]);

  // Depois de navegar pelo teclado, o foco segue o dia.
  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    grade.current?.querySelector(`[data-dia="${focado}"]`)?.focus();
  }, [focado, visto]);

  const minimo = partes(min);
  const podeVoltar = visto.ano > minimo.ano || (visto.ano === minimo.ano && visto.mes > minimo.mes);

  const trocarMes = (delta) => {
    if (delta < 0 && !podeVoltar) return;
    setDirecao(delta);
    setVisto(({ ano, mes }) => {
      const data = new Date(Date.UTC(ano, mes + delta, 1));
      return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() };
    });
  };

  const dias = useMemo(() => {
    const vazios = diaDaSemana(visto.ano, visto.mes, 1);
    const total = diasNoMes(visto.ano, visto.mes);
    return [
      ...Array.from({ length: vazios }, () => null),
      ...Array.from({ length: total }, (_, i) => paraIso(visto.ano, visto.mes, i + 1)),
    ];
  }, [visto]);

  // O dia que recebe Tab: o focado se estiver neste mês, senão o primeiro válido.
  const doMes = dias.filter(Boolean);
  const tabulavel = doMes.includes(focado) && focado >= min ? focado : doMes.find((iso) => iso >= min);

  const irPara = (iso) => {
    if (iso < min) return;
    const { ano, mes } = partes(iso);
    if (ano !== visto.ano || mes !== visto.mes) {
      setDirecao(ano * 12 + mes > visto.ano * 12 + visto.mes ? 1 : -1);
      setVisto({ ano, mes });
    }
    moverFoco.current = true;
    setFocado(iso);
  };

  const onKeyDown = (event, iso) => {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in passos) {
      event.preventDefault();
      irPara(somarDias(iso, passos[event.key]));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      irPara(somarDias(iso, event.key === 'PageUp' ? -30 : 30));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const semana = diaDaSemana(...Object.values(partes(iso)));
      irPara(somarDias(iso, event.key === 'Home' ? -semana : 6 - semana));
    }
  };

  return (
    <div
      className={styles.calendario}
      data-invalido={invalido || undefined}
      role="group"
      aria-labelledby={rotuloId ? `${rotuloId} ${tituloId}` : tituloId}
      aria-describedby={descricao}
    >
      <div className={styles.topo}>
        <button
          type="button"
          className={styles.navegar}
          onClick={() => trocarMes(-1)}
          disabled={!podeVoltar}
          aria-label="Mês anterior"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p id={tituloId} className={styles.mes} aria-live="polite">
          <span key={`${visto.ano}-${visto.mes}`} className={styles.mesTexto}>
            <span aria-hidden="true">{MESES[visto.mes]}</span>
            <span className="sr-only">
              {MESES_EXTENSO[visto.mes]} de {visto.ano}
            </span>
          </span>
          <span className={styles.ano} aria-hidden="true">
            {visto.ano}
          </span>
        </p>
        <button
          type="button"
          className={styles.navegar}
          onClick={() => trocarMes(1)}
          aria-label="Próximo mês"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className={styles.semana} aria-hidden="true">
        {SEMANA.map((letra, i) => (
          <span key={i}>{letra}</span>
        ))}
      </div>

      <div
        ref={grade}
        key={`${visto.ano}-${visto.mes}`}
        className={styles.dias}
        data-direcao={direcao > 0 ? 'seguinte' : direcao < 0 ? 'anterior' : undefined}
      >
        {dias.map((iso, i) => {
          if (!iso) return <span key={`v${i}`} aria-hidden="true" />;
          const { ano, mes, dia } = partes(iso);
          const passado = iso < min;
          const escolhido = iso === valor;
          return (
            <button
              key={iso}
              type="button"
              className={styles.dia}
              data-dia={iso}
              data-hoje={iso === hoje || undefined}
              aria-pressed={escolhido}
              aria-label={`${SEMANA_EXTENSO[diaDaSemana(ano, mes, dia)]}, ${dia} de ${MESES_EXTENSO[mes]} de ${ano}${iso === hoje ? ' (hoje)' : ''}`}
              disabled={passado}
              tabIndex={iso === tabulavel ? 0 : -1}
              onClick={() => {
                setFocado(iso);
                onChange(iso);
              }}
              onKeyDown={(event) => onKeyDown(event, iso)}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
