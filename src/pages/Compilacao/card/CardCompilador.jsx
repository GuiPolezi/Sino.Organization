import { aparenciaDe } from '../../Suporte/boneco/aparencia.js';
import base from '../../Suporte/card/CardTecnico.module.css';
import useAtalhos from '../../Suporte/card/useAtalhos.js';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { producaoDe } from '../resumo.js';
import { useAtuacao } from '../useAtuacao.js';
import AtividadeRecente from './AtividadeRecente.jsx';
import styles from './CardCompilador.module.css';
import Cidades from './Cidades.jsx';
import Normas from './Normas.jsx';
import Responsabilidade from './Responsabilidade.jsx';

/*
 * Card de quem foi selecionado em /compilacao: a casca do card do técnico do
 * suporte com o que é da compilação (a responsabilidade, as cidades, as normas
 * por período e a última atividade). Os dados ainda são fictícios (atuacao.js e
 * dados.js).
 */
export default function CardCompilador() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  useAtalhos();

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const pessoa = tecnicos[indice];
  const { atuacao, escolher } = useAtuacao(pessoa?.id);
  if (!pessoa) return null;

  const hoje = hojeEmBrasilia();
  const { emFila } = producaoDe(pessoa.id, hoje);

  return (
    // A key refaz as animações de entrada ao trocar de pessoa.
    <aside key={pessoa.id} className={`${base.card} ${styles.card}`} aria-label={`Informações de ${pessoa.nome}`}>
      <header className={base.topo}>
        <div className={base.avatar} style={{ '--cor-avatar': aparenciaDe(pessoa.id).camisa }} aria-hidden="true">
          {pessoa.avatarIniciais}
        </div>
        <div className={base.titulo}>
          <h2>{pessoa.nome}</h2>
          {pessoa.funcao && <p>{pessoa.funcao}</p>}
        </div>
        <button type="button" className={base.fechar} aria-label="Fechar" onClick={() => selecionar(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {/* Quem não está em atuacao.js (alguém novo na equipe) fica só com as normas. */}
      {atuacao && <Responsabilidade atuacao={atuacao} escolher={escolher} />}
      {/* A key fecha o "Ver mais" e refaz a entrada quando as cidades mudam com a responsabilidade. */}
      {atuacao && <Cidades key={atuacao.responsabilidade} cidades={atuacao.cidades} />}
      <Normas id={pessoa.id} hoje={hoje} emFila={emFila} />
      {atuacao && <AtividadeRecente id={pessoa.id} cidades={atuacao.cidades} />}

      <nav className={`${base.nav} ${base.surge}`} style={{ '--ordem': 5 }} aria-label="Navegar pela equipe">
        <button type="button" aria-label="Anterior" onClick={() => navegar(-1)}>
          ←
        </button>
        <span>
          {indice + 1} de {tecnicos.length}
        </span>
        <button type="button" aria-label="Próximo" onClick={() => navegar(1)}>
          →
        </button>
      </nav>
    </aside>
  );
}
