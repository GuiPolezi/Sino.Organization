import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { PALETA } from '../cena/paleta.js';
import { useEquipe } from '../store.js';
import { aparenciaDe } from './aparencia.js';
import { BOCHECHA, BRANCO, ESCURO, G, INVISIVEL, LOGO, clay } from './geometrias.js';
import { useComportamento } from './useComportamento.js';
import styles from './Boneco.module.css';

const LADOS = [-1, 1];
const GRAUS = Math.PI / 180;

// Cachos espalhados pela cabeça, sem cobrir o rosto: anéis do topo até a nuca.
// Cada anel: [ângulo a partir do topo, primeiro e último giro a partir da frente, quantidade].
const ANEIS_CACHOS = [
  [0, 0, 0, 1],
  [35, 0, 300, 6],
  [62, 70, 290, 8],
  [90, 95, 265, 7],
  [115, 120, 240, 6],
  [138, 150, 210, 4],
];
const RAIO_CACHOS = 0.33;
const CACHOS = ANEIS_CACHOS.flatMap(([polar, inicio, fim, quantidade]) =>
  Array.from({ length: quantidade }, (_, i) => {
    const giro = (inicio + ((fim - inicio) * i) / Math.max(1, quantidade - 1)) * GRAUS;
    const raio = RAIO_CACHOS * Math.sin(polar * GRAUS);
    return [raio * Math.sin(giro), RAIO_CACHOS * Math.cos(polar * GRAUS), raio * Math.cos(giro)];
  }),
);
// Duas a cada cinco mechas recebem a cor das luzes, sem formar fileiras.
const temLuzes = (indice) => indice % 5 === 1 || indice % 5 === 3;

function Cabelo({ estilo, material, materialMechas }) {
  if (estilo === 'curto') return <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.35} />;
  if (estilo === 'coque') {
    return (
      <>
        <mesh geometry={G.cabeloCurto} material={material} rotation-x={-0.3} />
        <mesh geometry={G.coque} material={material} position={[0, 0.34, -0.14]} />
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

// Bigode em duas metades caídas; o cavanhaque soma a ele o tufo do queixo.
function Barba({ estilo, material }) {
  if (estilo !== 'bigode' && estilo !== 'cavanhaque') return null;

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
      {estilo === 'cavanhaque' && (
        <mesh geometry={G.cavanhaque} material={material} position={[0, -0.215, 0.245]} scale={[1, 0.8, 0.6]} />
      )}
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

/*
 * Visual do boneco em primitivas. Todo técnico é uma configuração deste mesmo
 * componente (aparencia.js); o movimento vem de useComportamento.
 */
export default function Boneco({ tecnico }) {
  const { id } = tecnico;
  const aparencia = useMemo(() => aparenciaDe(id), [id]);
  const materiais = useMemo(
    () => ({
      pele: clay(aparencia.pele),
      camisa: clay(aparencia.camisa),
      calca: clay(aparencia.calca),
      cabelo: clay(aparencia.cabelo.cor),
      // Só existem para quem tem luzes no cabelo ou olhos claros.
      mechas: aparencia.cabelo.mechas ? clay(aparencia.cabelo.mechas) : null,
      olhos: aparencia.olhos ? clay(aparencia.olhos) : null,
    }),
    [aparencia],
  );
  useEffect(
    () => () => Object.values(materiais).forEach((material) => material?.dispose()),
    [materiais],
  );

  const selecionado = useEquipe((s) => s.selecionado === id);
  const emHover = useEquipe((s) => s.hover === id);
  const selecionar = useEquipe((s) => s.selecionar);
  const setHover = useEquipe((s) => s.setHover);

  const partes = useComportamento({ id, altura: aparencia.altura });

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
        {aparencia.acessorio === 'gravata' && (
          <mesh geometry={G.gravata} material={ESCURO} position={[0, 0.93, 0.33]} rotation-x={-0.12} />
        )}

        {/* Braços (pivô no ombro) */}
        <group ref={partes.bracoE} position={[-0.39, 1.13, 0]}>
          <mesh geometry={G.braco} material={materiais.camisa} position-y={-0.2} />
          <mesh geometry={G.mao} material={materiais.pele} position-y={-0.42} />
        </group>
        <group ref={partes.bracoD} position={[0.39, 1.13, 0]}>
          <mesh geometry={G.braco} material={materiais.camisa} position-y={-0.2} />
          <mesh geometry={G.mao} material={materiais.pele} position-y={-0.42} />
          {aparencia.acessorio === 'maleta' && (
            <mesh geometry={G.maleta} material={ESCURO} position={[0, -0.6, 0]} />
          )}
        </group>

        <group ref={partes.cabeca} position-y={1.56}>
          <mesh geometry={G.cabeca} material={materiais.pele} />
          {LADOS.map((lado) => (
            <group key={lado}>
              <mesh geometry={G.olho} material={materiais.olhos ?? ESCURO} position={[0.12 * lado, 0.04, 0.31]} />
              {materiais.olhos && (
                <mesh geometry={G.pupila} material={ESCURO} position={[0.12 * lado, 0.04, 0.343]} />
              )}
              <mesh geometry={G.brilho} material={BRANCO} position={[0.12 * lado + 0.015, 0.06, 0.35]} />
              <mesh geometry={G.bochecha} material={BOCHECHA} position={[0.2 * lado, -0.07, 0.27]} scale={[1, 0.6, 0.4]} />
            </group>
          ))}
          <Cabelo
            estilo={aparencia.cabelo.estilo}
            material={materiais.cabelo}
            materialMechas={materiais.mechas ?? materiais.cabelo}
          />
          <Barba estilo={aparencia.barba} material={materiais.cabelo} />
          <AcessorioCabeca tipo={aparencia.acessorio} materialBone={materiais.camisa} />
        </group>
      </group>

      {/* Selecionado, o nome já está no card. */}
      {emHover && !selecionado && (
        <Html position={[0, 2.35, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={styles.etiqueta}>{tecnico.nome}</div>
        </Html>
      )}
    </group>
  );
}
