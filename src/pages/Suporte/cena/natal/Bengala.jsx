/*
 * Bengala doce: haste e gancho (meio toro) numa geometria só, com listras em
 * espiral desenhadas em canvas. Pé em y = 0; o gancho abre para −x.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clay } from '../../boneco/geometrias.js';
import { corNatal } from '../../../../tema/natal/paleta.js';
import { novaTextura } from '../../quadro/texturas.js';

const RAIO = 0.012;
const HASTE = 0.205;
const GANCHO = 0.028;

// Criados na 1ª bengala e compartilhados (nunca descartados, como materialNatal).
let pecas = null;
function criar() {
  const listras = novaTextura(32, 128, (ctx, w, h) => {
    ctx.fillStyle = corNatal('creme');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = corNatal('vermelho');
    for (let y = -h; y < h * 2; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 24);
      ctx.lineTo(w, y + 36);
      ctx.lineTo(0, y + 12);
      ctx.fill();
    }
  });
  listras.wrapS = THREE.RepeatWrapping;
  listras.wrapT = THREE.RepeatWrapping;
  listras.repeat.set(1, 2);

  const haste = new THREE.CylinderGeometry(RAIO, RAIO, HASTE, 10).translate(0, HASTE / 2, 0);
  // Meio toro de 0 a π: começa no topo da haste e cai do outro lado.
  const gancho = new THREE.TorusGeometry(GANCHO, RAIO, 8, 14, Math.PI).translate(-GANCHO, HASTE, 0);
  const geometria = mergeGeometries([haste, gancho]);
  haste.dispose();
  gancho.dispose();
  return { geometria, material: Object.assign(clay('#FFFFFF'), { map: listras }) };
}

export default function Bengala(props) {
  pecas ??= criar();
  return <mesh geometry={pecas.geometria} material={pecas.material} {...props} />;
}
