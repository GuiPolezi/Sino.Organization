import { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import { CENA } from '../store.js';
import { PALETA } from './paleta.js';

const GIRO_CHAO = -Math.PI / 2;

/*
 * Cenário provisório: um chão elíptico neutro com sombras de contato. O fundo
 * atrás dele é o da página (o canvas é transparente). Componente isolado para
 * ser trocado pelo cenário definitivo sem tocar na cena nem nos bonecos.
 */
export default function Cenario({ area }) {
  // O tapete creme passa da área de caminhada pela margem da página (store.js); a borda escura, 0,4 m além.
  const { margemTapete: margem } = CENA;
  // Referência estável: o ContactShadows recria seus render targets quando ela muda.
  const escalaSombra = useMemo(() => [(area.rx + margem) * 2 + 0.6, (area.rz + margem) * 2 + 0.6], [area, margem]);

  return (
    <group>
      <mesh rotation-x={GIRO_CHAO} position-y={-0.02} scale={[area.rx + margem + 0.4, area.rz + margem + 0.4, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial color={PALETA.olivaEscuro} roughness={1} />
      </mesh>
      <mesh rotation-x={GIRO_CHAO} position-y={-0.01} scale={[area.rx + margem, area.rz + margem, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial color={PALETA.creme} roughness={1} />
      </mesh>

      {/* Fica em y = 0: deslocado para cima, o desfoque do drei sai vazio e a sombra some. */}
      <ContactShadows
        scale={escalaSombra}
        resolution={512}
        blur={2.4}
        opacity={0.5}
        far={2.6}
        color={PALETA.olivaEscuro}
      />
    </group>
  );
}
