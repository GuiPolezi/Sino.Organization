import { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { aparenciaDe } from './aparencia.js';
import { Figura, useMateriais } from './Boneco.jsx';

// Lado do retrato em px: nítido até num avatar de 96 px em tela de dpr 2,5.
const TAMANHO = 256;

/*
 * Retratos já tirados (id → URL da imagem, ou null se a foto falhou) e a fila de quem espera o seu. Vivem até
 * a página recarregar: a aparência de cada pessoa não muda.
 */
export const useRetratos = create((set) => ({
  urls: {},
  fila: [],
  // Devolve o mesmo estado quando não muda nada: assim o zustand não notifica ninguém.
  pedir: (id) => set((s) => (id in s.urls || s.fila.includes(id) ? s : { fila: [...s.fila, id] })),
  entregar: (id, url) =>
    set(({ urls, fila }) => {
      const semId = fila.filter((outro) => outro !== id);
      // Dois fotógrafos (home e Suporte) podem tirar a mesma foto: fica a primeira.
      if (urls[id]) {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        return { fila: semId };
      }
      return { urls: { ...urls, [id]: url }, fila: semId };
    }),
}));

// Falhas por pessoa: tenta de novo algumas vezes antes de desistir (fica com as iniciais).
const TENTATIVAS = 3;
const falhas = new Map();
function falhou(id) {
  const vezes = (falhas.get(id) ?? 0) + 1;
  falhas.set(id, vezes);
  if (vezes >= TENTATIVAS) {
    useRetratos.getState().entregar(id, null);
    return;
  }
  // Sai da fila (a Pose desmonta) e volta um pouco depois, com uma Pose nova.
  useRetratos.setState(({ fila }) => ({ fila: fila.filter((outro) => outro !== id) }));
  setTimeout(() => useRetratos.getState().pedir(id), 500 * vezes);
}

/**
 * O retrato da pessoa: o rosto do boneco dela, acenando, em fundo transparente.
 * Pede o retrato na primeira vez; até ele ficar pronto (um quadro da cena por
 * pessoa), devolve null. Sem a cena (sem WebGL), fica null.
 * @param {string} id
 */
export function useRetrato(id) {
  const url = useRetratos((s) => s.urls[id] ?? null);
  useEffect(() => {
    if (id) useRetratos.getState().pedir(id);
  }, [id]);
  return url;
}

// Os pixels do alvo, de baixo para cima e com a cor multiplicada pela opacidade,
// viram uma imagem PNG. O toBlob codifica fora da thread principal (o toDataURL travava).
function paraImagem(pixels) {
  const tela = document.createElement('canvas');
  tela.width = TAMANHO;
  tela.height = TAMANHO;
  const contexto = tela.getContext('2d');
  const imagem = contexto.createImageData(TAMANHO, TAMANHO);
  const linha = TAMANHO * 4;
  for (let y = 0; y < TAMANHO; y++) {
    const origem = (TAMANHO - 1 - y) * linha;
    for (let x = 0; x < linha; x += 4) {
      const a = pixels[origem + x + 3];
      // Nas bordas suavizadas a cor vem multiplicada pela opacidade: desfaz, para não escurecer o contorno.
      const ganho = a > 0 && a < 255 ? 255 / a : 1;
      for (let c = 0; c < 3; c++) imagem.data[y * linha + x + c] = Math.min(255, pixels[origem + x + c] * ganho);
      imagem.data[y * linha + x + 3] = a;
    }
  }
  contexto.putImageData(imagem, 0, 0);
  return new Promise((resolver) => {
    tela.toBlob((blob) => resolver(blob ? URL.createObjectURL(blob) : tela.toDataURL('image/png')), 'image/png');
  });
}

// Lê os pixels sem travar a GPU (leitura assíncrona); sem suporte, cai na síncrona.
async function lerPixels(gl, alvo) {
  const pixels = new Uint8Array(TAMANHO * TAMANHO * 4);
  if (gl.readRenderTargetPixelsAsync) {
    try {
      await gl.readRenderTargetPixelsAsync(alvo, 0, 0, TAMANHO, TAMANHO, pixels);
      return pixels;
    } catch {
      // segue para a leitura síncrona
    }
  }
  gl.readRenderTargetPixels(alvo, 0, 0, TAMANHO, TAMANHO, pixels);
  return pixels;
}

/*
 * Uma pessoa posando: o boneco dela num cenário só dele, fora da cena, com luz
 * de estúdio. No segundo quadro (o primeiro monta e compila os materiais), a
 * foto é tirada num alvo de renderização e entregue.
 */
function Pose({ id, cena, camera, alvo }) {
  const aparencia = useMemo(() => aparenciaDe(id), [id]);
  const materiais = useMateriais(aparencia);
  const quadros = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  // Em frameloop sob demanda, pede os dois quadros de que a foto precisa.
  useEffect(() => invalidate(), [invalidate]);

  useFrame(({ gl }) => {
    quadros.current += 1;
    if (quadros.current < 2) {
      invalidate();
      return;
    }
    if (quadros.current !== 2) return;
    const anterior = gl.getRenderTarget();
    gl.setRenderTarget(alvo);
    gl.render(cena, camera);
    gl.setRenderTarget(anterior);
    lerPixels(gl, alvo)
      .then(paraImagem)
      .then((url) => useRetratos.getState().entregar(id, url))
      .catch(() => falhou(id));
  });

  return createPortal(
    <>
      <hemisphereLight args={['#FFF7F0', '#B9B2C9', 1.1]} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.25} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#C9D6FF" />
      <Figura aparencia={aparencia} materiais={materiais} aceno />
    </>,
    cena,
  );
}

/**
 * Fotógrafo da equipe, dentro do Canvas da cena: tira os retratos pedidos por
 * useRetrato, um por vez, com o mesmo renderizador (sem abrir outro contexto
 * WebGL). O enquadramento pega cabeça, ombros e a mão erguida.
 */
export default function Retratista() {
  const id = useRetratos((s) => s.fila[0]);
  const cena = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => {
    const lente = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
    lente.position.set(0, 1.55, 3.3);
    lente.lookAt(0, 1.42, 0);
    return lente;
  }, []);
  const alvo = useMemo(() => {
    const novo = new THREE.WebGLRenderTarget(TAMANHO, TAMANHO, { samples: 4 });
    // Grava em sRGB, como a tela; sem isso o retrato sai escuro.
    novo.texture.colorSpace = THREE.SRGBColorSpace;
    return novo;
  }, []);
  useEffect(() => () => alvo.dispose(), [alvo]);

  // A key troca o boneco inteiro a cada pessoa.
  return id ? <Pose key={id} id={id} cena={cena} camera={camera} alvo={alvo} /> : null;
}
