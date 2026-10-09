import * as THREE from 'three';
import logoUrl from '../../../assets/images/logo-sino.png';

// Tronco: é sobre ele que o logo da camisa se curva.
const RAIO_CORPO = 0.34;
const LADO_LOGO = 0.14;

// Geometrias e materiais base: criados uma vez e compartilhados por todos os bonecos.
export const G = {
  corpo: new THREE.CapsuleGeometry(RAIO_CORPO, 0.36, 10, 24),
  cabeca: new THREE.SphereGeometry(0.34, 36, 28),
  perna: new THREE.CapsuleGeometry(0.115, 0.2, 8, 14),
  braco: new THREE.CapsuleGeometry(0.085, 0.28, 8, 14),
  mao: new THREE.SphereGeometry(0.095, 16, 12),
  olho: new THREE.SphereGeometry(0.045, 14, 10),
  brilho: new THREE.SphereGeometry(0.014, 8, 6),
  bochecha: new THREE.SphereGeometry(0.06, 14, 10),
  cabeloCurto: new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
  cabeloLongo: new THREE.SphereGeometry(0.365, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
  coque: new THREE.SphereGeometry(0.15, 18, 14),
  rabo: new THREE.CapsuleGeometry(0.22, 0.32, 8, 16),
  moicano: new THREE.CapsuleGeometry(0.07, 0.42, 6, 12),
  topete: new THREE.SphereGeometry(0.16, 20, 16),
  cacho: new THREE.SphereGeometry(0.11, 16, 12),
  bigode: new THREE.CapsuleGeometry(0.026, 0.07, 6, 10),
  cavanhaque: new THREE.SphereGeometry(0.075, 14, 10),
  pupila: new THREE.SphereGeometry(0.022, 10, 8),
  lente: new THREE.TorusGeometry(0.085, 0.018, 8, 22),
  ponte: new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6),
  arco: new THREE.TorusGeometry(0.385, 0.028, 8, 28, Math.PI),
  concha: new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18),
  aba: new THREE.CylinderGeometry(0.26, 0.26, 0.035, 24),
  maleta: new THREE.BoxGeometry(0.34, 0.24, 0.09),
  gravata: new THREE.CapsuleGeometry(0.05, 0.2, 4, 8),
  // Retalho quadrado da lateral de um cilindro, rente ao tronco e centrado na frente.
  logo: new THREE.CylinderGeometry(
    RAIO_CORPO + 0.004,
    RAIO_CORPO + 0.004,
    LADO_LOGO,
    8,
    1,
    true,
    -LADO_LOGO / RAIO_CORPO / 2,
    LADO_LOGO / RAIO_CORPO,
  ),
  anel: new THREE.TorusGeometry(0.55, 0.035, 10, 48),
  hit: new THREE.CylinderGeometry(0.5, 0.5, 2.1, 10),
};

// Material "massinha": fosco e sem brilho metálico.
export const clay = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });

export const ESCURO = clay('#1F1A24');
// Logo estampado na camisa: a imagem tem fundo transparente.
const texturaLogo = new THREE.TextureLoader().load(logoUrl);
texturaLogo.colorSpace = THREE.SRGBColorSpace;
export const LOGO = new THREE.MeshStandardMaterial({
  map: texturaLogo,
  roughness: 0.82,
  metalness: 0,
  transparent: true,
  depthWrite: false,
});
export const BRANCO = new THREE.MeshBasicMaterial({ color: '#ffffff' });
export const BOCHECHA = new THREE.MeshStandardMaterial({
  color: '#F08A8A',
  roughness: 1,
  transparent: true,
  opacity: 0.55,
});
export const INVISIVEL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
// A área de clique não entra no passe de sombras de contato.
INVISIVEL.allowOverride = false;
