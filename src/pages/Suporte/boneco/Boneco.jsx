import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { PALETA } from '../cena/paleta.js';
import { useEquipe } from '../store.js';
import { aparenciaDe } from './aparencia.js';
import { BOCHECHA, BRANCO, ESCURO, G, INVISIVEL, clay } from './geometrias.js';
import { useComportamento } from './useComportamento.js';
import styles from './Boneco.module.css';

const LADOS = [-1, 1];

function Cabelo({ estilo, material }) {
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
    }),
    [aparencia],
  );
  useEffect(
    () => () => Object.values(materiais).forEach((material) => material.dispose()),
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
              <mesh geometry={G.olho} material={ESCURO} position={[0.12 * lado, 0.04, 0.31]} />
              <mesh geometry={G.brilho} material={BRANCO} position={[0.12 * lado + 0.015, 0.06, 0.35]} />
              <mesh geometry={G.bochecha} material={BOCHECHA} position={[0.2 * lado, -0.07, 0.27]} scale={[1, 0.6, 0.4]} />
            </group>
          ))}
          <Cabelo estilo={aparencia.cabelo.estilo} material={materiais.cabelo} />
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
