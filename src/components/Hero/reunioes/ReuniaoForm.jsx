import { useEffect, useId, useRef, useState } from 'react';
import suporte from '../../../data/team.json';
import desenvolvimento from '../../../data/dev-team.json';
import { LIMITES, MODALIDADES, minDataHoraLocal } from './reunioes.js';
import MembrosInput from './MembrosInput.jsx';
import styles from './ReuniaoForm.module.css';

// Nomes das duas equipes, sem repetir, para sugerir no campo de membros.
const SUGESTOES = [
  ...new Set([...suporte.team, ...desenvolvimento.team].map((pessoa) => pessoa.name)),
].sort((a, b) => a.localeCompare(b, 'pt-BR'));

const OPCOES_MODALIDADE = [
  { valor: MODALIDADES.PRESENCIAL, rotulo: 'Presencial' },
  { valor: MODALIDADES.DIGITAL, rotulo: 'Digital' },
];

// Mensagem de erro ligada ao campo por aria-describedby.
function Erro({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className={styles.erro}>
      {children}
    </p>
  );
}

// Formulário de nova reunião. `onSalvar(dados)` devolve o resultado de criar().
export default function ReuniaoForm({ onSalvar, onCancelar }) {
  const [titulo, setTitulo] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [modalidade, setModalidade] = useState(MODALIDADES.PRESENCIAL);
  const [membros, setMembros] = useState([]);
  const [erros, setErros] = useState({});
  const tituloRef = useRef(null);
  const formRef = useRef(null);
  const ids = {
    titulo: useId(),
    dataHora: useId(),
    horaFim: useId(),
    membros: useId(),
    erroTitulo: useId(),
    erroDataHora: useId(),
    erroHoraFim: useId(),
    erroModalidade: useId(),
    modalidade: useId(),
  };

  // Foco no primeiro campo ao abrir.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const limparErro = (campo) => {
    if (!erros[campo]) return;
    setErros((atuais) => {
      const resto = { ...atuais };
      delete resto[campo];
      return resto;
    });
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const resultado = onSalvar({ titulo, dataHora, horaFim, modalidade, membros });
    if (resultado.ok) return;

    setErros(resultado.erros);
    // Leva o foco ao primeiro campo com erro.
    requestAnimationFrame(() => {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    });
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.corpo} data-modal-scroll>
        <h4 className={styles.subtitulo}>Nova reunião</h4>

        <div className={styles.campo}>
          <label htmlFor={ids.titulo} className={styles.rotulo}>
            Título
          </label>
          <input
            ref={tituloRef}
            id={ids.titulo}
            type="text"
            className={styles.entrada}
            value={titulo}
            maxLength={LIMITES.tituloMax}
            autoComplete="off"
            placeholder="Ex.: Alinhamento semanal"
            aria-invalid={erros.titulo ? true : undefined}
            aria-describedby={erros.titulo ? ids.erroTitulo : undefined}
            onChange={(event) => {
              setTitulo(event.target.value);
              limparErro('titulo');
            }}
          />
          <Erro id={ids.erroTitulo}>{erros.titulo}</Erro>
        </div>

        <div className={styles.linha}>
          <div className={styles.quando}>
            <div className={styles.campo}>
              <label htmlFor={ids.dataHora} className={styles.rotulo}>
                Data e hora
              </label>
              <input
                id={ids.dataHora}
                type="datetime-local"
                className={styles.entrada}
                value={dataHora}
                min={minDataHoraLocal()}
                aria-invalid={erros.dataHora ? true : undefined}
                aria-describedby={erros.dataHora ? ids.erroDataHora : undefined}
                onChange={(event) => {
                  setDataHora(event.target.value);
                  limparErro('dataHora');
                }}
              />
              <Erro id={ids.erroDataHora}>{erros.dataHora}</Erro>
            </div>

            <div className={styles.campo}>
              <label htmlFor={ids.horaFim} className={styles.rotulo}>
                Término
              </label>
              <input
                id={ids.horaFim}
                type="time"
                className={styles.entrada}
                value={horaFim}
                aria-invalid={erros.horaFim ? true : undefined}
                aria-describedby={erros.horaFim ? ids.erroHoraFim : undefined}
                onChange={(event) => {
                  setHoraFim(event.target.value.slice(0, 5));
                  limparErro('horaFim');
                }}
              />
              <Erro id={ids.erroHoraFim}>{erros.horaFim}</Erro>
            </div>
          </div>

          <fieldset
            className={styles.campo}
            aria-describedby={erros.modalidade ? ids.erroModalidade : undefined}
          >
            <legend className={styles.rotulo}>Modalidade</legend>
            <div className={styles.segmentado}>
              {OPCOES_MODALIDADE.map((opcao) => (
                <label key={opcao.valor} className={styles.segmento}>
                  <input
                    type="radio"
                    name={ids.modalidade}
                    value={opcao.valor}
                    checked={modalidade === opcao.valor}
                    aria-invalid={erros.modalidade ? true : undefined}
                    onChange={() => {
                      setModalidade(opcao.valor);
                      limparErro('modalidade');
                    }}
                  />
                  <span>{opcao.rotulo}</span>
                </label>
              ))}
            </div>
            <Erro id={ids.erroModalidade}>{erros.modalidade}</Erro>
          </fieldset>
        </div>

        <MembrosInput
          id={ids.membros}
          membros={membros}
          sugestoes={SUGESTOES}
          erro={erros.membros}
          onChange={(novos) => {
            setMembros(novos);
            limparErro('membros');
          }}
        />
      </div>

      <div className={styles.botoes}>
        <button type="button" className={styles.cancelar} onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className={styles.salvar}>
          Salvar
        </button>
      </div>
    </form>
  );
}
