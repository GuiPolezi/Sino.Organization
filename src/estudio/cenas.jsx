/*
 * As seis composições dos cards da home, feitas com os bonecos e os objetos das
 * próprias cenas. Cada uma fica em torno da origem, no chão (y = 0), de frente
 * para +z; o estúdio enquadra e a câmera é a mesma para todas.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import EstatuaTemis from '../pages/Compilacao/cena/EstatuaTemis.jsx';
import Mobilia from '../pages/Reuniao/cena/Mobilia.jsx';
import CentroDeMesa from '../pages/Reuniao/cena/natal/CentroDeMesa.jsx';
import { CENTRO_MESA } from '../pages/Reuniao/cena/natal/pontos.js';
import { LUGARES_MESA, LUMINARIA, MESA } from '../pages/Reuniao/cena/planta.js';
import { pontoLocal } from '../pages/Suporte/boneco/estacoes.js';
import EstacoesTrabalho from '../pages/Suporte/cena/EstacoesTrabalho.jsx';
import Quadro from '../pages/Suporte/quadro/Quadro.jsx';
import { posicionarQuadro } from '../pages/Suporte/quadro/posicao.js';
import { AREA } from '../pages/Suporte/store.js';
import { NATAL_ATIVO } from '../tema/natal.js';
import Pessoa, { Silhueta } from './Pessoa.jsx';

/*
 * O quadro (e a estátua) se colocam sozinhos na borda do tapete (posicao.js). Aqui
 * o grupo desfaz essa posição, para eles ficarem na origem, e esconde o losango
 * dourado de "dá para clicar", que não faz sentido numa ilustração.
 */
function Parado({ Componente, props, ...transformacao }) {
  const lugar = useMemo(() => posicionarQuadro(AREA, false), []);
  const grupo = useRef(null);
  useLayoutEffect(() => {
    grupo.current.traverse((objeto) => {
      if (objeto.isMesh && objeto.geometry?.type === 'OctahedronGeometry') objeto.visible = false;
    });
  });
  return (
    <group {...transformacao}>
      <group rotation-y={-lugar.rot}>
        <group ref={grupo} position={[-lugar.x, 0, -lugar.z]}>
          <Componente area={AREA} {...props} />
        </group>
      </group>
    </group>
  );
}

// O que vai escrito nos quadros: só ilustração (no card fica pequeno demais para ler).
const DIAS = [5, 7, 6, 9, 8, 11, 10].map((valor, i) => ({ rotulo: 'STQQSSD'[i], valor, hoje: i === 6 }));
const ANOTACOES_SUPORTE = {
  assinatura: 'equipe técnica',
  grafico: { titulo: 'Atendimentos', subtitulo: 'últimos 7 dias', dias: DIAS },
  lista: {
    titulo: 'Metas da semana',
    linhas: [{ texto: '✓ chamados em dia' }, { texto: '✓ clientes atendidos' }, { texto: '✓ nota alta' }],
  },
  postit: { numero: '★', linhas: ['bom', 'trabalho!'] },
};
const ANOTACOES_DEV = {
  assinatura: 'desenvolvimento',
  grafico: {
    titulo: 'Entregas',
    subtitulo: 'no mês',
    barras: [
      { rotulo: 'sistemas', valor: 9, cor: '#2E8C93', percentual: '' },
      { rotulo: 'sites', valor: 6, cor: '#E58F8F', percentual: '' },
      { rotulo: 'apps', valor: 4, cor: '#3B4C8C', percentual: '' },
    ],
  },
  lista: { titulo: 'Sprint', linhas: [{ texto: '✓ planejar' }, { texto: '✓ codar' }, { texto: '• revisar' }] },
  postit: { numero: '★', linhas: ['bora', 'codar!'] },
};

const DEVS = ['adriano', 'antonio', 'arnaldo', 'caique', 'donizeti', 'eduardo', 'guilherme-a', 'gustavo', 'ketlyn', 'rafael'];

/*
 * Um grupo de pessoas: a primeira na frente, maior (o "líder"), e as outras em
 * fileiras desencontradas atrás. `lugares`: [x, z, giro, extra] por pessoa.
 */
function Grupo({ ids, lugares }) {
  return ids.map((id, i) => {
    const [x, z, giro = 0, extra = {}] = lugares[i];
    return <Pessoa key={id} id={id} posicao={[x, 0, z]} giro={giro} {...extra} />;
  });
}

function CenaDev() {
  const lugares = [
    [-0.15, 1.55, 0.2, { escala: 1.15, acenoEsquerdo: true }],
    [0.8, 0.9, -0.05],
    [1.7, 0.75, -0.2],
    [-0.6, 0.15, 0.15],
    [0.3, 0.05, 0],
    [1.2, 0.0, -0.15],
    [2.25, -0.05, -0.3, { aceno: true }],
    [-0.15, -0.7, 0.05],
    [0.75, -0.8, -0.05],
    [1.65, -0.85, -0.2],
  ];
  return (
    <>
      <Parado Componente={Quadro} props={{ anotacoes: ANOTACOES_DEV }} position={[-2.3, 0, -1.0]} rotation-y={0.32} />
      <Grupo ids={DEVS} lugares={lugares} />
    </>
  );
}

function CenaSuporte() {
  const lugares = [
    [-0.25, 1.2, 0.2, { escala: 1.15, acenoEsquerdo: true }],
    [0.7, 0.6, -0.1],
    [1.6, 0.2, -0.2],
    [2.35, -0.6, -0.3, { aceno: true }],
  ];
  return (
    <>
      <Parado Componente={Quadro} props={{ anotacoes: ANOTACOES_SUPORTE }} position={[-2.15, 0, -1.0]} rotation-y={0.32} />
      <Grupo ids={['roberto', 'fabio', 'guilherme-p', 'luiz']} lugares={lugares} />
    </>
  );
}

function CenaCompilacao() {
  const lugares = [
    [-0.15, 1.9, 0, { escala: 1.12, aceno: true }],
    [-1.3, 1.45, 0.2],
    [1.15, 1.45, -0.2],
    [-2.0, 0.6, 0.3],
    [1.95, 0.6, -0.3],
    [-2.65, -0.65, 0.4],
    [2.65, -0.65, -0.4, { aceno: true }],
  ];
  return (
    <>
      <Parado Componente={EstatuaTemis} position={[0, 0, -0.8]} />
      <Grupo ids={['nathalia', 'leonardo', 'laura', 'ramon', 'damaris', 'gdressano', 'glopes']} lugares={lugares} />
    </>
  );
}

// Setor ainda sem equipe: bonecos genéricos (aparência gerada pelo id), em silhueta.
function CenaDigitalizacao() {
  const lugares = [
    [0, 1.0, 0, { escala: 1.1 }],
    [-0.95, 0.35, 0.15],
    [0.95, 0.35, -0.15],
    [-0.45, -0.4, 0.05],
    [0.5, -0.45, -0.05],
  ];
  return (
    <Silhueta>
      <Grupo ids={['digitalizacao-1', 'digitalizacao-2', 'digitalizacao-3', 'digitalizacao-4', 'digitalizacao-5']} lugares={lugares} />
    </Silhueta>
  );
}

// Uma estação de trabalho; a de índice 3 tem a mini árvore no canto da mesa (natal/EnfeitesEstacao.jsx).
const ESTACAO_LICENCAS = [{ id: 'licencas', x: 0, z: 0, rot: 0.75 }];
const INDICE_COM_ARVORE = 3;

function CenaLicencas() {
  const estacoes = useMemo(
    () => Array.from({ length: INDICE_COM_ARVORE + 1 }, (_, i) => ({ ...ESTACAO_LICENCAS[0], id: `e${i}` })),
    [],
  );
  // Só a última aparece: as anteriores existem para ela ganhar o índice da mini árvore.
  const grupo = useRef(null);
  useLayoutEffect(() => {
    grupo.current.getObjectByName('estacoes-de-trabalho').children.forEach((estacao, i) => {
      estacao.visible = i === INDICE_COM_ARVORE;
    });
  });
  return (
    <group ref={grupo}>
      <EstacoesTrabalho estacoes={estacoes} />
    </group>
  );
}

// Na mesa: os dois lugares do fundo e a cabeceira esquerda ocupados; um em pé na frente, à direita, acenando.
const PLANO_REUNIAO = { cadeiras: ['r1', 'r2', 'r3'], poltronas: [] };
const SENTADOS = [
  ['nathalia', 'r1'],
  ['roberto', 'r2'],
  ['rafael', 'r3'],
];

// A sala em três-quartos: assim quem senta na cabeceira esquerda fica meio de frente.
const GIRO_REUNIAO = -0.45;

function CenaReunioes() {
  const grupo = useRef(null);
  // A luminária de pé fica longe da mesa, no fundo da sala: fora da ilustração.
  useLayoutEffect(() => {
    grupo.current.traverse((objeto) => {
      if (objeto.position.x === LUMINARIA.x && objeto.position.z === LUMINARIA.z) objeto.visible = false;
    });
  });
  return (
    <group ref={grupo} rotation-y={GIRO_REUNIAO}>
      <Mobilia plano={PLANO_REUNIAO} luminariaAcesa={false} />
      {NATAL_ATIVO && (
        <group position={[MESA.x, 0, MESA.z]}>
          <CentroDeMesa position={[CENTRO_MESA.x, CENTRO_MESA.altura, CENTRO_MESA.z]} rotation-y={0.4} />
        </group>
      )}
      {SENTADOS.map(([id, lugar]) => {
        const base = LUGARES_MESA[lugar];
        const { x, z } = pontoLocal(base, 0, 0.64);
        return <Pessoa key={id} id={id} posicao={[x, 0, z]} giro={base.rot + Math.PI} sentado />;
      })}
      <Pessoa id="damaris" posicao={[1.25, 0, 1.3]} giro={0.1} aceno />
    </group>
  );
}

export const CENAS = {
  dev: CenaDev,
  suporte: CenaSuporte,
  compilacao: CenaCompilacao,
  digitalizacao: CenaDigitalizacao,
  licencas: CenaLicencas,
  reunioes: CenaReunioes,
};
