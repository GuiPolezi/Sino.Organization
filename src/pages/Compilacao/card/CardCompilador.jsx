import { aparenciaDe } from '../../Suporte/boneco/aparencia.js';
import base from '../../Suporte/card/CardTecnico.module.css';
import EstadoCarregamento from '../../Suporte/card/EstadoCarregamento.jsx';
import useAtalhos from '../../Suporte/card/useAtalhos.js';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { atuacaoDe, trabalhandoEm } from '../atuacao.js';
import { useCompilacao, usePessoaCompilacao } from '../store.js';
import AtividadeRecente from './AtividadeRecente.jsx';
import styles from './CardCompilador.module.css';
import Cidades from './Cidades.jsx';
import Normas from './Normas.jsx';
import Responsabilidade from './Responsabilidade.jsx';

const primeiroNome = (nome) => nome.split(' ')[0];

/*
 * Card de quem foi selecionado em /compilacao: a casca do card do técnico do
 * suporte com o que é da compilação (a responsabilidade, onde trabalha, as normas
 * por período e a última atividade), com os números do servidor (/api/compilacao).
 */
export default function CardCompilador() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  useAtalhos();

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const pessoa = tecnicos[indice];
  const numeros = usePessoaCompilacao(pessoa?.id);
  const carregado = useCompilacao((s) => s.dados !== null);
  const referencia = useCompilacao((s) => s.dados?.referencia);
  const geradoEm = useCompilacao((s) => s.geradoEm);
  if (!pessoa) return null;

  const hoje = hojeEmBrasilia();
  const atuacao = atuacaoDe(numeros);
  const nomeDe = (id) => primeiroNome(tecnicos.find((t) => t.id === id)?.nome ?? id);

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

      {pessoa.ausente && (
        <span className={`${base.pill} ${base.neutro} ${base.surge}`} style={{ '--ordem': 0 }}>
          <i />
          Ausente
        </span>
      )}

      {/* Até os números chegarem: "Carregando…", ou o erro com "Tentar de novo". */}
      {!carregado && <EstadoCarregamento dados="números da compilação" />}
      {carregado && !atuacao && (
        <p className={`${base.estado} ${base.surge}`} style={{ '--ordem': 1 }}>
          Sem números de {primeiroNome(pessoa.nome)} no servidor.
        </p>
      )}
      {atuacao && (
        <>
          <Responsabilidade atuacao={atuacao} />
          <Cidades {...trabalhandoEm(numeros)} />
          <Normas pessoa={numeros} referencia={referencia} hoje={hoje} geradoEm={geradoEm} nomeDe={nomeDe} />
          <AtividadeRecente pessoa={numeros} />
        </>
      )}

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
