import { useId, useRef, useState } from 'react';
import { LIMITES, adicionarMembro, chaveMembro, removerMembro } from './reunioes.js';
import styles from './ReuniaoForm.module.css';

/*
 * Campo de membros: digita o nome e adiciona (botão ou Enter, sem enviar o
 * formulário). Cada membro vira um chip com "×" para remover.
 * `erro` vem da validação do formulário; o erro local, de adicionarMembro.
 */
export default function MembrosInput({ id, membros, onChange, erro, sugestoes = [] }) {
  const [nome, setNome] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const entrada = useRef(null);
  const listaId = useId();
  const erroId = useId();
  const ajudaId = useId();

  const mensagem = erroLocal || erro;
  const jaAdicionados = new Set(membros.map((membro) => chaveMembro(membro.nome)));
  const opcoes = sugestoes.filter((s) => !jaAdicionados.has(chaveMembro(s)));

  const adicionar = () => {
    const resultado = adicionarMembro(membros, nome);
    if (!resultado.ok) {
      setErroLocal(resultado.erro);
      return;
    }
    setErroLocal('');
    setNome('');
    onChange(resultado.membros);
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    adicionar();
  };

  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.rotulo}>
        Membros
      </label>

      <div className={styles.membrosLinha}>
        <input
          ref={entrada}
          id={id}
          type="text"
          className={styles.entrada}
          value={nome}
          list={listaId}
          maxLength={LIMITES.nomeMembroMax}
          autoComplete="off"
          placeholder="Nome do membro"
          aria-invalid={mensagem ? true : undefined}
          aria-describedby={`${ajudaId}${mensagem ? ` ${erroId}` : ''}`}
          onChange={(event) => {
            setNome(event.target.value);
            if (erroLocal) setErroLocal('');
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={styles.adicionar} onClick={adicionar}>
          Adicionar
        </button>
      </div>

      <datalist id={listaId}>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao} />
        ))}
      </datalist>

      <p id={ajudaId} className={styles.ajuda}>
        {membros.length} de {LIMITES.membrosMax} · Enter também adiciona
      </p>

      {mensagem && (
        <p id={erroId} className={styles.erro} role="alert">
          {mensagem}
        </p>
      )}

      {membros.length > 0 && (
        <ul className={styles.chips} aria-label="Membros adicionados">
          {membros.map((membro) => (
            <li key={membro.id} className={styles.chip}>
              {membro.nome}
              <button
                type="button"
                className={styles.chipRemover}
                aria-label={`Remover ${membro.nome}`}
                onClick={() => {
                  setErroLocal('');
                  onChange(removerMembro(membros, membro.id));
                  entrada.current?.focus();
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
