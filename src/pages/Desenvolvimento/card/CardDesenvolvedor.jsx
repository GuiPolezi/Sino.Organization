import { useMemo, useState } from 'react';
import { aparenciaDe } from '../../Suporte/boneco/aparencia.js';
import card from '../../Suporte/card/CardTecnico.module.css';
import Contagem from '../../Suporte/card/Contagem.jsx';
import EstadoCarregamento from '../../Suporte/card/EstadoCarregamento.jsx';
import useAtalhos from '../../Suporte/card/useAtalhos.js';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { resumirChamados } from '../mappers/chamados.js';
import Estrela from './Estrela.jsx';
import GraficoTipos from './GraficoTipos.jsx';
import SeletorPeriodo from './SeletorPeriodo.jsx';
import styles from './CardDesenvolvedor.module.css';

// Números compridos encolhem para caber na linha (ver [data-digitos] no CSS).
const digitos = (valor) => Math.min(String(valor).length, 5);

function Status({ status, total }) {
  return (
    <div>
      <dt>
        <small aria-hidden="true">Status</small>
        {status}
      </dt>
      <dd data-digitos={digitos(total)}>
        <Contagem valor={total} />
      </dd>
    </div>
  );
}

function Chamados({ resumo, periodo, onPeriodo }) {
  const { destaque, status } = resumo;

  return (
    <section className={card.surge} style={{ '--ordem': 1 }}>
      <div className={styles.cabecalhoSecao}>
        <h3 className={card.secao}>Chamados</h3>
        <SeletorPeriodo periodo={periodo} onMudar={onPeriodo} />
      </div>

      <dl className={styles.destaque}>
        <div>
          <dt>
            <small aria-hidden="true">Status</small>
            {destaque.status}
          </dt>
          <dd data-digitos={digitos(destaque.total)}>
            {destaque.total > 0 && <span aria-hidden="true">+</span>}
            <Contagem valor={destaque.total} />
          </dd>
        </div>
      </dl>

      {/* As linhas da grade têm a mesma altura, então a estrela cai no cruzamento das duas primeiras. */}
      <div className={styles.grade} style={{ '--linhas': Math.ceil(status.length / 2) }}>
        <dl className={styles.status}>
          {status.map((item) => (
            <Status key={item.status} {...item} />
          ))}
        </dl>
        <Estrela />
      </div>
    </section>
  );
}

function Total({ total, percentualFeito }) {
  return (
    <section className={`${styles.total} ${card.surge}`} style={{ '--ordem': 2 }}>
      <h3>Total Tickets Atribuídos</h3>
      <svg className={styles.setas} viewBox="0 0 64 56" aria-hidden="true" focusable="false">
        <path d="M6 6l18 22L6 50M22 6l18 22-18 22M38 6l18 22-18 22" />
      </svg>
      <p className={styles.totalNumero} data-digitos={digitos(total)}>
        <Contagem valor={total} />
      </p>
      <p className={styles.feito}>
        {percentualFeito === null ? (
          'Nenhum ticket neste período'
        ) : (
          <>
            <strong>
              <Contagem valor={percentualFeito} />%
            </strong>{' '}
            dos tickets feitos
          </>
        )}
      </p>
    </section>
  );
}

// As categorias do período; a escolhida mostra o gráfico. Sem escolha, ou se ela
// some do período, vale a primeira (a de mais chamados).
function Categorias({ categorias }) {
  const [escolhida, setEscolhida] = useState(null);
  const ativa = categorias.find(({ nome }) => nome === escolhida) ?? categorias[0];

  return (
    <section className={card.surge} style={{ '--ordem': 3 }}>
      <h3 className={card.secao}>Categorias</h3>
      {ativa ? (
        <>
          <div className={styles.categorias} role="group" aria-label="Categoria do gráfico">
            {categorias.map(({ nome }) => (
              <button
                key={nome}
                type="button"
                aria-pressed={nome === ativa.nome}
                onClick={() => setEscolhida(nome)}
              >
                {nome}
              </button>
            ))}
          </div>
          <GraficoTipos categoria={ativa} />
        </>
      ) : (
        <p className={styles.vazio}>Nenhum chamado neste período.</p>
      )}
    </section>
  );
}

/*
 * Card do desenvolvedor selecionado em /desenvolvimento. Mesmo esqueleto do card
 * do técnico (CardTecnico.module.css), com os chamados no lugar dos atendimentos.
 * O período vale para todo o card e continua o mesmo ao navegar pela equipe;
 * a categoria escolhida é de cada pessoa.
 */
export default function CardDesenvolvedor() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionado = useEquipe((s) => s.selecionado);
  const chamados = useEquipe((s) => s.chamados[s.selecionado]);
  const selecionar = useEquipe((s) => s.selecionar);
  const navegar = useEquipe((s) => s.navegar);
  const [periodo, setPeriodo] = useState('tudo');
  useAtalhos();

  const hoje = hojeEmBrasilia();
  const resumo = useMemo(() => chamados && resumirChamados(chamados.lista, periodo, hoje), [chamados, periodo, hoje]);

  const indice = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
  const tecnico = tecnicos[indice];
  if (!tecnico) return null;

  return (
    // A key refaz as animações de entrada ao trocar de pessoa.
    <aside key={tecnico.id} className={`${card.card} ${styles.card}`} aria-label={`Informações de ${tecnico.nome}`}>
      <header className={card.topo}>
        <div className={styles.avatar} style={{ '--cor-avatar': aparenciaDe(tecnico.id).camisa }} aria-hidden="true">
          {tecnico.avatarIniciais}
        </div>
        <div className={styles.titulo}>
          <h2>{tecnico.nome}</h2>
          {tecnico.funcao && <p>{tecnico.funcao}</p>}
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={() => selecionar(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {tecnico.ausente && (
        <span className={`${card.pill} ${card.neutro} ${card.surge}`} style={{ '--ordem': 0 }}>
          <i />
          Ausente
        </span>
      )}

      {resumo ? (
        <>
          <Chamados resumo={resumo} periodo={periodo} onPeriodo={setPeriodo} />
          <Total total={resumo.total} percentualFeito={resumo.percentualFeito} />
          <Categorias categorias={resumo.categorias} />
        </>
      ) : (
        <EstadoCarregamento dados="chamados" />
      )}

      <nav className={`${card.nav} ${card.surge}`} style={{ '--ordem': 4 }} aria-label="Navegar pela equipe">
        <button type="button" aria-label="Anterior" onClick={() => navegar(-1)}>
          ←
        </button>
        <span>
          {indice + 1} de {tecnicos.length}
          {chamados?.ficticio && <small>Dados de demonstração</small>}
        </span>
        <button type="button" aria-label="Próximo" onClick={() => navegar(1)}>
          →
        </button>
      </nav>
    </aside>
  );
}
