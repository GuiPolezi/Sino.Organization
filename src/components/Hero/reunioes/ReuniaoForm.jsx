import { useEffect, useId, useRef, useState } from 'react';
import { LIMITES, MODALIDADES, paraDataHoraLocal } from './reunioes.js';
import CalendarioMini from './CalendarioMini.jsx';
import HoraPilulas from './HoraPilulas.jsx';
import ResumoQuando from './ResumoQuando.jsx';
import MembrosEscolha from './MembrosEscolha.jsx';
import styles from './ReuniaoForm.module.css';

const OPCOES_MODALIDADE = [
  { valor: MODALIDADES.PRESENCIAL, rotulo: 'Presencial' },
  { valor: MODALIDADES.DIGITAL, rotulo: 'Digital' },
];

const doisDigitos = (n) => String(n).padStart(2, '0');

// Início padrão: hoje (Brasília), na próxima hora cheia, com 1 h de duração.
// Tarde demais para hoje: amanhã, 09:00–10:00.
function horarioPadrao(agora = new Date()) {
  const [hoje, hora] = paraDataHoraLocal(agora).split('T');
  const proxima = Number(hora.slice(0, 2)) + 1;
  if (proxima <= 22) {
    return { data: hoje, inicio: `${doisDigitos(proxima)}:00`, fim: `${doisDigitos(proxima + 1)}:00` };
  }
  const amanha = paraDataHoraLocal(new Date(agora.getTime() + 24 * 3600 * 1000)).slice(0, 10);
  return { data: amanha, inicio: '09:00', fim: '10:00' };
}

// Mensagem de erro ligada ao campo por aria-describedby.
function Erro({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className={styles.erro} role="alert">
      {children}
    </p>
  );
}

// Formulário "Criar Reunião". `onSalvar(dados)` devolve o resultado de criar().
export default function ReuniaoForm({ onSalvar }) {
  const [padrao] = useState(horarioPadrao);
  const [hoje] = useState(() => paraDataHoraLocal(new Date()).slice(0, 10));
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(padrao.data);
  const [inicio, setInicio] = useState(padrao.inicio);
  const [fim, setFim] = useState(padrao.fim);
  const [modalidade, setModalidade] = useState(MODALIDADES.PRESENCIAL);
  const [membros, setMembros] = useState([]);
  const [erros, setErros] = useState({});
  const tituloRef = useRef(null);
  const formRef = useRef(null);
  const ids = {
    titulo: useId(),
    data: useId(),
    hora: useId(),
    modalidade: useId(),
    erroTitulo: useId(),
    erroData: useId(),
    erroHora: useId(),
    erroModalidade: useId(),
    erroMembros: useId(),
  };

  // Foco no título ao abrir.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const limparErro = (...campos) => {
    if (!campos.some((campo) => erros[campo])) return;
    setErros((atuais) => {
      const resto = { ...atuais };
      campos.forEach((campo) => delete resto[campo]);
      return resto;
    });
  };

  // Mudar o início empurra o fim junto, mantendo a duração.
  const mudarInicio = (novo) => {
    const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
    const duracao = minutos(fim) - minutos(inicio);
    const novoFim = minutos(novo) + (duracao > 0 ? duracao : 60);
    if (novoFim < 24 * 60) {
      setFim(`${doisDigitos(Math.floor(novoFim / 60))}:${doisDigitos(novoFim % 60)}`);
    }
    setInicio(novo);
    limparErro('dataHora', 'horaFim');
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const resultado = onSalvar({
      titulo,
      dataHora: `${data}T${inicio}`,
      horaFim: fim,
      modalidade,
      membros,
    });
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
        <div className={`${styles.campo} ${styles.surge}`}>
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
            placeholder="Nova Reunião"
            aria-invalid={erros.titulo ? true : undefined}
            aria-describedby={erros.titulo ? ids.erroTitulo : undefined}
            onChange={(event) => {
              setTitulo(event.target.value);
              limparErro('titulo');
            }}
          />
          <Erro id={ids.erroTitulo}>{erros.titulo}</Erro>
        </div>

        <div className={styles.quando}>
          <div className={`${styles.campo} ${styles.surge}`}>
            <span id={ids.data} className={styles.rotulo}>
              Data
            </span>
            <CalendarioMini
              valor={data}
              min={hoje}
              rotuloId={ids.data}
              invalido={Boolean(erros.dataHora)}
              descricao={erros.dataHora ? ids.erroData : undefined}
              onChange={(iso) => {
                setData(iso);
                limparErro('dataHora');
              }}
            />
            <Erro id={ids.erroData}>{erros.dataHora}</Erro>
          </div>

          <div className={`${styles.campo} ${styles.surge}`}>
            <span id={ids.hora} className={styles.rotulo}>
              Hora
            </span>
            <div className={styles.horas} role="group" aria-labelledby={ids.hora}>
              <HoraPilulas
                rotulo="Início"
                valor={inicio}
                invalido={Boolean(erros.dataHora)}
                descricao={erros.dataHora ? ids.erroData : undefined}
                onChange={mudarInicio}
              />
              <HoraPilulas
                rotulo="Fim"
                valor={fim}
                invalido={Boolean(erros.horaFim)}
                descricao={erros.horaFim ? ids.erroHora : undefined}
                onChange={(novo) => {
                  setFim(novo);
                  limparErro('horaFim');
                }}
              />
            </div>
            <Erro id={ids.erroHora}>{erros.horaFim}</Erro>

            <fieldset
              className={styles.modalidade}
              aria-describedby={erros.modalidade ? ids.erroModalidade : undefined}
            >
              <legend className="sr-only">Modalidade</legend>
              <div className={styles.segmentado}>
                {OPCOES_MODALIDADE.map((opcao) => (
                  <label key={opcao.valor} className={styles.segmento}>
                    <input
                      type="radio"
                      name={ids.modalidade}
                      value={opcao.valor}
                      checked={modalidade === opcao.valor}
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

          <div className={styles.surge}>
            <ResumoQuando data={data} inicio={inicio} fim={fim} />
          </div>
        </div>

        <div className={styles.surge}>
          <MembrosEscolha
            membros={membros}
            erro={erros.membros}
            erroId={ids.erroMembros}
            onChange={(atualizar) => {
              setMembros(atualizar);
              limparErro('membros');
            }}
          />
        </div>
      </div>

      <div className={styles.botoes}>
        <button type="submit" className={styles.salvar}>
          Salvar
        </button>
      </div>
    </form>
  );
}
