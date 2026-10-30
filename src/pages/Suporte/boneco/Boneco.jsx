import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { MathUtils, Vector3 } from 'three';
import { PALETA } from '../cena/paleta.js';
import { useEquipe } from '../store.js';
import { aparenciaDe, temBochechas } from './aparencia.js';
import { BOCHECHA, BRANCO, CORDAO, ESCURO, G, INVISIVEL, LOGO, clay } from './geometrias.js';
import { EXTRA, useComportamento } from './useComportamento.js';
import styles from './Boneco.module.css';

const LADOS = [-1, 1];
const OPACIDADE_BARBA_RALA = 0.55;
const GRAUS = Math.PI / 180;
// Giro do braço erguido no aceno do retrato: quase para cima, um pouco aberto.
const ACENO = 2.55;

// Folga mínima, em px, entre a etiqueta do nome e a borda da tela.
const FOLGA_ETIQUETA = 8;
// Abaixo desta largura o card é um bottom sheet (CardTecnico.module.css).
const LARGURA_ESTREITA = 760;
const pontoEtiqueta = new Vector3();

/*
 * Posição da etiqueta na tela, a mesma que o Html calcula (o ponto projetado),
 * mas presa dentro da tela: um boneco na borda, ou fora dela com a câmera perto
 * de outro (hover pelo elenco), continua com o nome inteiro à vista. No desktop,
 * com um card aberto (o <aside> da página, à direita), a etiqueta para antes
 * dele em vez de ficar escondida por baixo. Só muda o translate do Html, nada de
 * layout por frame.
 */
const posicaoDentroDaTela = (etiqueta) => (objeto, camera, size) => {
  pontoEtiqueta.setFromMatrixPosition(objeto.matrixWorld).project(camera);
  const x = ((pontoEtiqueta.x + 1) * size.width) / 2;
  const y = ((1 - pontoEtiqueta.y) * size.height) / 2;
  // Medida uma vez por etiqueta montada (o Html só remonta a cada hover).
  const el = etiqueta.current;
  if (el && etiqueta.medida?.el !== el && el.offsetWidth) {
    etiqueta.medida = { el, largura: el.offsetWidth, altura: el.offsetHeight };
  }
  const medida = etiqueta.medida;
  if (!el || medida?.el !== el) return [x, y];

  const card = size.width > LARGURA_ESTREITA ? el.closest('main')?.querySelector(':scope > aside') : null;
  const direita = card ? Math.min(size.width, card.getBoundingClientRect().left) : size.width;
  const meiaLargura = Math.min(medida.largura / 2 + FOLGA_ETIQUETA, direita / 2);
  const meiaAltura = Math.min(medida.altura / 2 + FOLGA_ETIQUETA, size.height / 2);
  return [
    MathUtils.clamp(x, meiaLargura, direita - meiaLargura),
    MathUtils.clamp(y, meiaAltura, size.height - meiaAltura),
  ];
};

// Cachos espalhados pela cabeça em anéis, sem cobrir o rosto. Cada anel:
// [ângulo a partir do topo, primeiro e último giro a partir da frente, quantidade].
const espalharCachos = (aneis, raioEsfera) =>
  aneis.flatMap(([polar, inicio, fim, quantidade]) =>
    Array.from({ length: quantidade }, (_, i) => {
      const giro = (inicio + ((fim - inicio) * i) / Math.max(1, quantidade - 1)) * GRAUS;
      const raio = raioEsfera * Math.sin(polar * GRAUS);
      return [raio * Math.sin(giro), raioEsfera * Math.cos(polar * GRAUS), raio * Math.cos(giro)];
    }),
  );
// Cacheado: cachos grandes do topo até a nuca.
const CACHOS = espalharCachos([
  [0, 0, 0, 1],
  [35, 0, 300, 6],
  [62, 70, 290, 8],
  [90, 95, 265, 7],
  [115, 120, 240, 6],
  [138, 150, 210, 4],
], 0.33);
// Cachinhos: cabelo curto, cachos pequenos e juntos só no alto da cabeça.
const CACHINHOS = espalharCachos([
  [0, 0, 0, 1],
  [25, 0, 315, 8],
  [50, 0, 330, 12],
  [72, 60, 300, 11],
], 0.335);
// Duas a cada cinco mechas recebem a cor das luzes, sem formar fileiras.
const temLuzes = (indice) => indice % 5 === 1 || indice % 5 === 3;

function Cabelo({ estilo, material, materialMechas, materialDegrade }) {
  if (estilo === 'curto') return <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.35} />;
  // Degradê: cheio em cima, sumindo nas laterais e na nuca (geometrias.js).
  if (estilo === 'degrade') {
    return <mesh geometry={G.degrade} material={materialDegrade} rotation-x={-0.35} />;
  }
  if (estilo === 'raspado') return <mesh geometry={G.cabeloRaspado} material={material} rotation-x={-0.3} />;
  if (estilo === 'coque') {
    return (
      <>
        <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.3} />
        <mesh geometry={G.coque} material={material} position={[0, 0.34, -0.14]} />
      </>
    );
  }
  // Samurai: cabelo grande puxado para trás, sem franja, cobrindo até a nuca, e
  // preso num coque alto no topo de trás da cabeça.
  if (estilo === 'samurai') {
    return (
      <>
        <mesh geometry={G.cabeloPuxado} material={material} rotation-x={-0.62} />
        <mesh geometry={G.peDoCoque} material={material} position={[0, 0.335, -0.13]} rotation-x={-0.5} />
        <mesh geometry={G.coque} material={material} position={[0, 0.42, -0.17]} scale={[1.05, 0.95, 1.05]} />
      </>
    );
  }
  if (estilo === 'longo') {
    return (
      <>
        <mesh geometry={G.cabeloLongo} material={material} rotation-x={-0.4} />
        <mesh geometry={G.rabo} material={material} position={[0, -0.14, -0.2]} scale={[1.15, 1, 0.55]} />
      </>
    );
  }
  // Comprido: o topo do longo, um pouco maior e inclinado para trás para a franja
  // ficar curta, com o cabelo descendo pelas costas até perto da cintura e uma
  // mecha de cada lado do rosto caindo no ombro.
  if (estilo === 'comprido') {
    return (
      <>
        <mesh geometry={G.cabeloLongo} material={material} rotation-x={-0.55} scale={1.03} />
        <mesh geometry={G.rabo} material={material} position={[0, -0.32, -0.3]} scale={[1.25, 1.5, 0.5]} />
        {LADOS.map((lado) => (
          <mesh key={lado} geometry={G.mechaLateral} material={material} position={[0.3 * lado, -0.16, -0.02]} />
        ))}
      </>
    );
  }
  // Até o ombro: cabelo longo de homem, liso e solto. A base tem a franja alta
  // (acima dos óculos) e desce até a nuca; atrás, o cabelo cobre o pescoço.
  if (estilo === 'ombro') {
    return (
      <>
        <mesh geometry={G.cabeloLongo} material={material} rotation-x={-0.7} scale={1.03} />
        <mesh geometry={G.rabo} material={material} position={[0, -0.124, -0.24]} scale={[1.2, 0.65, 0.5]} />
      </>
    );
  }
  if (estilo === 'volumoso') {
    return (
      <>
        <mesh geometry={G.cabeloVolumoso} material={material} rotation-x={-0.35} />
        <mesh geometry={G.topete} material={material} position={[0, 0.32, 0.19]} scale={[1.05, 0.6, 0.85]} />
      </>
    );
  }
  if (estilo === 'topete') {
    return (
      <>
        <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.35} />
        <mesh geometry={G.topete} material={material} position={[0, 0.3, 0.2]} scale={[1.2, 0.9, 1.1]} />
      </>
    );
  }
  if (estilo === 'cacheado') {
    return CACHOS.map((posicao, indice) => (
      <mesh
        key={indice}
        geometry={G.cacho}
        material={temLuzes(indice) ? materialMechas : material}
        position={posicao}
      />
    ));
  }
  // Sobre a base do curto, para não aparecer couro entre os cachinhos.
  if (estilo === 'cachinhos') {
    return (
      <>
        <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.35} />
        {CACHINHOS.map((posicao, indice) => (
          <mesh key={indice} geometry={G.cachinho} material={material} position={posicao} />
        ))}
      </>
    );
  }
  if (estilo === 'moicano') {
    return (
      <mesh
        geometry={G.moicano}
        material={material}
        position={[0, 0.3, -0.04]}
        rotation-x={Math.PI / 2 - 0.25}
        scale={[1, 1, 1.6]}
      />
    );
  }
  return null;
}

// Bigode em duas metades caídas; o cavanhaque soma a ele o tufo do queixo. A
// barba fechada soma ao bigode as costeletas, o maxilar e o volume do queixo; a
// curta tem o mesmo contorno, rente ao rosto e sem o volume. A grande é a fechada
// mais cheia, com a ponta descendo do queixo até o peito.
function Barba({ estilo, material }) {
  if (!['bigode', 'cavanhaque', 'fechada', 'curta', 'grande'].includes(estilo)) return null;

  return (
    <>
      {LADOS.map((lado) => (
        <mesh
          key={lado}
          geometry={G.bigode}
          material={material}
          position={[0.05 * lado, -0.085, 0.328]}
          rotation-z={(Math.PI / 2 - 0.3) * lado}
        />
      ))}
      {estilo === 'curta' && <mesh geometry={G.barbaCurta} material={material} />}
      {estilo === 'fechada' && (
        <>
          <mesh geometry={G.barbaFechada} material={material} />
          <mesh geometry={G.queixo} material={material} position={[0, -0.21, 0.24]} scale={[1.45, 0.9, 0.7]} />
        </>
      )}
      {estilo === 'grande' && (
        <>
          <mesh geometry={G.barbaGrande} material={material} />
          <mesh geometry={G.queixo} material={material} position={[0, -0.25, 0.25]} scale={[1.8, 1.3, 0.95]} />
          <mesh geometry={G.queixo} material={material} position={[0, -0.33, 0.255]} scale={[1.45, 1.25, 0.88]} />
        </>
      )}
      {estilo === 'cavanhaque' && (
        <mesh geometry={G.cavanhaque} material={material} position={[0, -0.215, 0.245]} scale={[1, 0.8, 0.6]} />
      )}
    </>
  );
}

// Moletom com capuz: o capuz caído nas costas, a gola e os dois cordões na frente.
function Moletom({ material }) {
  return (
    <>
      <mesh geometry={G.capuz} material={material} position={[0, 1.14, -0.27]} scale={[1.25, 0.8, 0.6]} />
      <mesh geometry={G.gola} material={material} position-y={1.3} rotation-x={Math.PI / 2} />
      {LADOS.map((lado) => (
        <mesh key={lado} geometry={G.ponte} material={CORDAO} position={[0.07 * lado, 1.13, 0.31]} rotation-x={-0.25} scale={[1, 2, 1]} />
      ))}
    </>
  );
}

// Acessórios presos à cabeça; maleta e gravata ficam no corpo.
function AcessorioCabeca({ tipo, materialBone }) {
  if (tipo === 'oculos') {
    return (
      <>
        <mesh geometry={G.lente} material={ESCURO} position={[-0.12, 0.04, 0.33]} />
        <mesh geometry={G.lente} material={ESCURO} position={[0.12, 0.04, 0.33]} />
        <mesh geometry={G.ponte} material={ESCURO} position={[0, 0.05, 0.34]} rotation-z={Math.PI / 2} />
      </>
    );
  }
  if (tipo === 'headset') {
    return (
      <>
        <mesh geometry={G.arco} material={ESCURO} />
        <mesh geometry={G.concha} material={ESCURO} position={[-0.36, 0, 0]} rotation-z={Math.PI / 2} />
        <mesh geometry={G.concha} material={ESCURO} position={[0.36, 0, 0]} rotation-z={Math.PI / 2} />
        <mesh
          geometry={G.ponte}
          material={ESCURO}
          position={[0.3, -0.14, 0.2]}
          rotation={[1.2, 0, 0.6]}
          scale={[1.2, 3.2, 1.2]}
        />
      </>
    );
  }
  if (tipo === 'bone') {
    return (
      <>
        <mesh geometry={G.cabeloCurto} material={materialBone} position-y={0.02} rotation-x={-0.15} />
        <mesh geometry={G.aba} material={materialBone} position={[0, 0.17, 0.27]} rotation-x={0.18} scale={[0.9, 1, 1]} />
      </>
    );
  }
  return null;
}

/** Materiais de uma aparência, descartados quando ela muda ou quando quem a usa sai de cena. */
export function useMateriais(aparencia) {
  const materiais = useMemo(
    () => ({
      pele: clay(aparencia.pele),
      camisa: clay(aparencia.camisa),
      calca: clay(aparencia.calca),
      cabelo: clay(aparencia.cabelo.cor),
      // Só existem para quem tem luzes no cabelo, olhos claros ou boné de outra cor.
      mechas: aparencia.cabelo.mechas ? clay(aparencia.cabelo.mechas) : null,
      olhos: aparencia.olhos ? clay(aparencia.olhos) : null,
      bone: aparencia.bone ? clay(aparencia.bone) : null,
      // A barba curta é rala: da cor do cabelo, mas deixa a pele aparecer.
      barbaRala:
        aparencia.barba === 'curta'
          ? Object.assign(clay(aparencia.cabelo.cor), { transparent: true, opacity: OPACIDADE_BARBA_RALA })
          : null,
      // O degradê tira a transparência de cada ponto da cor dos vértices.
      degrade:
        aparencia.cabelo.estilo === 'degrade'
          ? Object.assign(clay(aparencia.cabelo.cor), { transparent: true, vertexColors: true })
          : null,
    }),
    [aparencia],
  );
  useEffect(
    () => () => Object.values(materiais).forEach((material) => material?.dispose()),
    [materiais],
  );
  return materiais;
}

/**
 * O corpo do boneco, das pernas à cabeça, de pé e de frente para +z. `partes`
 * traz as refs que o comportamento anima; sem elas, a pose fica parada. Com
 * `aceno`, o braço direito sobe e a cabeça inclina um pouco: é a pose do
 * retrato (Retratos.jsx).
 *
 * @param {object} props
 * @param {ReturnType<typeof aparenciaDe>} props.aparencia
 * @param {ReturnType<typeof useMateriais>} props.materiais
 * @param {object} [props.partes]
 * @param {boolean} [props.aceno]
 * @param {import('react').ReactNode} [props.naMao] o que vai na mão direita (a xícara de /compilacao)
 */
export function Figura({ aparencia, materiais, partes = {}, aceno = false, naMao = null }) {
  return (
    <group ref={partes.corpo}>
      {/* Pernas (pivô no quadril) */}
      <group ref={partes.pernaE} position={[-0.15, 0.42, 0]}>
        <mesh geometry={G.perna} material={materiais.calca} position-y={-0.2} />
      </group>
      <group ref={partes.pernaD} position={[0.15, 0.42, 0]}>
        <mesh geometry={G.perna} material={materiais.calca} position-y={-0.2} />
      </group>

      {/* Tronco */}
      <mesh geometry={G.corpo} material={materiais.camisa} position-y={0.86} />
      {/* No peito esquerdo de quem veste: o boneco olha para +z. */}
      {aparencia.logo && <mesh geometry={G.logo} material={LOGO} position-y={0.99} rotation-y={0.47} />}
      {aparencia.moletom && <Moletom material={materiais.camisa} />}
      {aparencia.acessorio === 'gravata' && (
        <mesh geometry={G.gravata} material={ESCURO} position={[0, 0.93, 0.33]} rotation-x={-0.12} />
      )}

      {/* Braços (pivô no ombro) */}
      <group ref={partes.bracoE} position={[-0.39, 1.13, 0]}>
        <mesh geometry={G.braco} material={materiais.camisa} position-y={-0.2} />
        <mesh geometry={G.mao} material={materiais.pele} position-y={-0.42} />
      </group>
      <group ref={partes.bracoD} position={[0.39, 1.13, 0]} {...(aceno && { 'rotation-z': ACENO })}>
        <mesh geometry={G.braco} material={materiais.camisa} position-y={-0.2} />
        <mesh geometry={G.mao} material={materiais.pele} position-y={-0.42} />
        {aparencia.acessorio === 'maleta' && (
          <mesh geometry={G.maleta} material={ESCURO} position={[0, -0.6, 0]} />
        )}
        {naMao && <group position-y={-0.42}>{naMao}</group>}
      </group>

      <group ref={partes.cabeca} position-y={1.56} {...(aceno && { 'rotation-z': -0.08 })}>
        <mesh geometry={G.cabeca} material={materiais.pele} />
        {LADOS.map((lado) => (
          <group key={lado}>
            <mesh geometry={G.olho} material={materiais.olhos ?? ESCURO} position={[0.12 * lado, 0.04, 0.31]} />
            {materiais.olhos && (
              <mesh geometry={G.pupila} material={ESCURO} position={[0.12 * lado, 0.04, 0.343]} />
            )}
            <mesh geometry={G.brilho} material={BRANCO} position={[0.12 * lado + 0.015, 0.06, 0.35]} />
            {temBochechas(aparencia) && (
              <mesh geometry={G.bochecha} material={BOCHECHA} position={[0.2 * lado, -0.07, 0.27]} scale={[1, 0.6, 0.4]} />
            )}
          </group>
        ))}
        <Cabelo
          estilo={aparencia.cabelo.estilo}
          material={materiais.cabelo}
          materialMechas={materiais.mechas ?? materiais.cabelo}
          materialDegrade={materiais.degrade}
        />
        <Barba estilo={aparencia.barba} material={materiais.barbaRala ?? materiais.cabelo} />
        <AcessorioCabeca tipo={aparencia.acessorio} materialBone={materiais.bone ?? materiais.camisa} />
      </group>
    </group>
  );
}

/*
 * Visual do boneco em primitivas. Todo técnico é uma configuração deste mesmo
 * componente (aparencia.js); o movimento vem de useComportamento.
 */
export default function Boneco({ tecnico }) {
  const { id } = tecnico;
  const aparencia = useMemo(() => aparenciaDe(id), [id]);
  const materiais = useMateriais(aparencia);

  const selecionado = useEquipe((s) => s.selecionado === id);
  const emHover = useEquipe((s) => s.hover === id);
  const selecionar = useEquipe((s) => s.selecionar);
  const setHover = useEquipe((s) => s.setHover);

  const partes = useComportamento({ id, altura: aparencia.altura });
  const etiqueta = useRef(null);
  const posicaoEtiqueta = useMemo(() => posicaoDentroDaTela(etiqueta), []);

  const sairDoHover = () => {
    if (useEquipe.getState().hover !== id) return;
    setHover(null);
    document.body.style.cursor = '';
  };
  // Se o boneco sair de cena sob o mouse, o hover e o cursor não ficam presos.
  useEffect(() => sairDoHover, [id]);

  const onPointerOver = (event) => {
    event.stopPropagation();
    setHover(id);
    document.body.style.cursor = 'pointer';
  };
  const onClick = (event) => {
    event.stopPropagation();
    selecionar(id);
  };

  return (
    <group ref={partes.raiz}>
      <mesh ref={partes.anel} geometry={G.anel} rotation-x={-Math.PI / 2} position-y={0.02} scale={0.001}>
        <meshBasicMaterial color={selecionado ? PALETA.olivaEscuro : PALETA.oliva} transparent opacity={0.85} />
      </mesh>

      {/* Área de clique generosa */}
      <mesh
        geometry={G.hit}
        material={INVISIVEL}
        position-y={1.05}
        onPointerOver={onPointerOver}
        onPointerOut={sairDoHover}
        onClick={onClick}
      />

      <Figura
        aparencia={aparencia}
        materiais={materiais}
        partes={partes}
        naMao={EXTRA.NaMao && <EXTRA.NaMao ia={partes.ia} bracoD={partes.bracoD} />}
      />

      {/* Selecionado, o nome já está no card. Sem distanceFactor: com a câmera perto de
          um boneco, a etiqueta dos vizinhos crescia até passar de 400 px e sair da tela.
          Acima do título e do elenco (z-index 10), abaixo do card (20). */}
      {emHover && !selecionado && (
        <Html
          position={[0, 2.35, 0]}
          center
          calculatePosition={posicaoEtiqueta}
          zIndexRange={[15, 11]}
          style={{ pointerEvents: 'none' }}
        >
          <div ref={etiqueta} className={styles.etiqueta}>
            {tecnico.nome}
          </div>
        </Html>
      )}
    </group>
  );
}
