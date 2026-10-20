import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { APARENCIAS_DEV } from '../../../../pages/Desenvolvimento/aparencias.js';
import { aparenciaDe, registrarAparencias } from '../../../../pages/Suporte/boneco/aparencia.js';
import { Figura, useMateriais } from '../../../../pages/Suporte/boneco/Boneco.jsx';
import { criarUniformes, holografar, materialProfundidade } from './holoMaterial.js';
import Projetor, { TOPO_DISCO } from './Projetor.jsx';

// Na home cabem as duas equipes: suporte (já registrada) e desenvolvimento.
registrarAparencias(APARENCIAS_DEV);

// Altura do boneco em pé (pés no 0, topo do cabelo), antes da escala da aparência.
const ALTURA_FIGURA = 2.08;
const GIRO = 0.38; // rad/s: uma volta a cada ~16 s
const TRES_QUARTOS = -0.5;
const DURACAO = { entrada: 0.95, saida: 0.5, entradaReduzida: 0.25, saidaReduzida: 0.18 };
// O novo começa a materializar enquanto o antigo ainda some.
const ATRASO_ENTRADA = 0.28;

const GL = {
  antialias: true,
  alpha: true,
  powerPreference: 'default',
  toneMapping: THREE.NeutralToneMapping,
};

const suave = (t) => t * t * (3 - 2 * t);

// Enquadra boneco e projetor em qualquer proporção do card.
function Enquadramento() {
  const camera = useThree((s) => s.camera);
  const aspecto = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useLayoutEffect(() => {
    const meia = THREE.MathUtils.degToRad(camera.fov / 2);
    const porAltura = 1.55 / Math.tan(meia);
    const porLargura = 1.2 / (Math.tan(meia) * aspecto);
    const distancia = Math.max(porAltura, porLargura);
    camera.position.set(0, 1.55, distancia);
    camera.lookAt(0, 1.08, 0);
    camera.updateProjectionMatrix();
  }, [camera, aspecto]);
  return null;
}

/*
 * Um boneco projetado. Os materiais dele viram cópias com o shader de
 * holograma (os originais são compartilhados com outras cenas e ficam intactos).
 * Entra materializando de baixo para cima; com `saindo`, desmaterializa de cima
 * para baixo e avisa `onSaiu`.
 */
function BonecoHolografico({ chave, id, saindo, atraso, onSaiu, onVisivel, tempo, energia, reduzido }) {
  const aparencia = useMemo(() => aparenciaDe(id), [id]);
  const materiais = useMateriais(aparencia);
  const uniformes = useMemo(criarUniformes, []);
  const grupo = useRef(null);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const cena = useThree((s) => s.scene);
  const estado = useRef({
    progresso: 0,
    espera: atraso,
    avisou: false,
    glitchAte: 0,
    proximoGlitch: 4 + Math.random() * 6,
    compilado: false,
  });
  const escala = aparencia.altura ?? 1;

  useLayoutEffect(() => {
    const copias = new Map();
    const malhas = [];
    // Passe só de profundidade (opaco, antes dos transparentes): o holograma
    // fica translúcido para o fundo sem mostrar a nuca através do rosto.
    const profundidade = materialProfundidade(uniformes);
    const sombras = [];
    grupo.current.traverse((objeto) => {
      if (!objeto.isMesh || objeto.userData.holoSombra) return;
      const original = objeto.userData.holoOriginal ?? objeto.material;
      if (!copias.has(original)) copias.set(original, holografar(original, uniformes));
      objeto.userData.holoOriginal = original;
      objeto.material = copias.get(original);
      malhas.push(objeto);
      // Peças já transparentes (logo, bochecha, barba rala) não tampam nada.
      if (original.transparent) return;
      const sombra = new THREE.Mesh(objeto.geometry, profundidade);
      sombra.userData.holoSombra = true;
      sombras.push([objeto, sombra]);
    });
    sombras.forEach(([objeto, sombra]) => objeto.add(sombra));

    // Compila os shaders em paralelo (sem travar a página no clique) e só mostra
    // o boneco quando estiverem prontos. O compile() precisa do grupo visível;
    // depois ele fica escondido até a promessa resolver.
    let cancelado = false;
    const mostrar = () => {
      if (cancelado) return;
      estado.current.compilado = true;
      if (grupo.current) grupo.current.visible = true;
      onVisivel?.();
      invalidate();
    };
    if (gl.compileAsync) {
      gl.compileAsync(grupo.current, camera, cena).then(mostrar, mostrar);
      grupo.current.visible = false;
    } else {
      mostrar();
    }

    return () => {
      cancelado = true;
      malhas.forEach((malha) => {
        malha.material = malha.userData.holoOriginal;
        delete malha.userData.holoOriginal;
      });
      sombras.forEach(([objeto, sombra]) => objeto.remove(sombra));
      copias.forEach((copia) => copia.dispose());
      profundidade.dispose();
    };
  }, [materiais, uniformes, gl, camera, cena, invalidate, onVisivel]);

  // Em frameloop sob demanda (movimento reduzido), a troca precisa pedir quadro.
  useEffect(() => invalidate(), [saindo, invalidate]);

  useFrame((state, delta) => {
    const e = estado.current;
    const passo = Math.min(delta, 1 / 20);
    let animando = false;

    if (saindo) {
      const duracao = reduzido ? DURACAO.saidaReduzida : DURACAO.saida;
      e.progresso = Math.max(0, e.progresso - passo / duracao);
      animando = true;
      if (e.progresso === 0 && !e.avisou) {
        e.avisou = true;
        onSaiu(chave);
      }
    } else if (!e.compilado) {
      // Shaders ainda compilando: espera sem gastar o atraso nem a entrada.
      return;
    } else if (e.espera > 0) {
      e.espera -= passo;
      animando = true;
    } else if (e.progresso < 1) {
      if (e.progresso === 0) energia.pulso = 1;
      const duracao = reduzido ? DURACAO.entradaReduzida : DURACAO.entrada;
      e.progresso = Math.min(1, e.progresso + passo / duracao);
      animando = true;
    }

    const p = suave(e.progresso);
    const t = tempo.current;
    let glitch = 0;
    let brilho = 1;
    if (!reduzido) {
      // Glitch forte nas transições, sumindo quando o boneco termina de entrar.
      glitch = saindo ? 0.35 + 0.65 * (1 - p) : e.progresso < 1 ? 0.9 * (1 - p) : 0;
      // De vez em quando, um soluço curto do sinal.
      if (!saindo && e.progresso === 1) {
        if (t > e.proximoGlitch) {
          e.glitchAte = t + 0.12 + Math.random() * 0.1;
          e.proximoGlitch = t + 6 + Math.random() * 8;
        }
        if (t < e.glitchAte) glitch = 0.35;
      }
      // Flicker leve: ondulação lenta + quedas raras.
      brilho = 0.97 + 0.03 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
      if (Math.random() < 0.012) brilho *= 0.8;
      if (glitch > 0.3 && Math.random() < 0.25) brilho *= 0.85;
    }

    const u = uniformes;
    u.uTempo.value = t;
    u.uProgresso.value = p;
    u.uGlitch.value = glitch;
    u.uBrilho.value = brilho;
    const g = grupo.current;
    // Ao sair, o boneco se recolhe para o feixe: afina e estica um pouco.
    const recolher = saindo ? 1 - p : 0;
    g.scale.set(escala * (1 - 0.3 * recolher), escala * (1 + 0.08 * recolher), escala * (1 - 0.3 * recolher));
    g.updateWorldMatrix(true, false);
    u.uBase.value = g.matrixWorld.elements[13];
    u.uAltura.value = ALTURA_FIGURA * g.scale.y;

    if (animando && reduzido) invalidate();
  });

  // A Figura não muda depois de montada: as cópias de material aplicadas ficam.
  const figura = useMemo(() => <Figura aparencia={aparencia} materiais={materiais} />, [aparencia, materiais]);
  return <group ref={grupo}>{figura}</group>;
}

// Memo: trocar de pessoa re-renderiza o Palco, mas não os bonecos que já estão em cena.
const BonecoMemo = memo(BonecoHolografico);

// Fila de bonecos em cena: o atual e os que ainda estão desmaterializando.
function useElenco(pessoaId) {
  const contador = useRef(0);
  const [elenco, setElenco] = useState(() => (pessoaId ? [{ chave: 0, id: pessoaId, saindo: false, atraso: 0 }] : []));
  const anterior = useRef(pessoaId);

  useEffect(() => {
    if (anterior.current === pessoaId) return;
    anterior.current = pessoaId;
    setElenco((atual) => {
      // No máximo dois saindo ao mesmo tempo (trocas rápidas).
      const saindo = atual.map((item) => (item.saindo ? item : { ...item, saindo: true })).slice(-2);
      const atraso = saindo.length ? ATRASO_ENTRADA : 0;
      return pessoaId ? [...saindo, { chave: ++contador.current, id: pessoaId, saindo: false, atraso }] : saindo;
    });
  }, [pessoaId]);

  // Estável: os bonecos não re-renderizam quando o elenco muda.
  const remover = useCallback((chave) => setElenco((atual) => atual.filter((item) => item.chave !== chave)), []);
  return [elenco, remover];
}

function Palco({ pessoaId, reduzido, onPronto }) {
  const [elenco, remover] = useElenco(pessoaId);
  const tempo = useRef(0);
  // Energia do projetor: menor sem ninguém, pico ao materializar.
  const energia = useRef(1);
  const pulso = useRef({ pulso: 0 }).current;
  const giratorio = useRef(null);
  const flutuante = useRef(null);
  const pronto = useRef(false);
  const vazio = !elenco.some((item) => !item.saindo);
  const avisoPronto = useRef(onPronto);
  avisoPronto.current = onPronto;
  // Pronto = algo para ver: o primeiro boneco já compilado e visível (ou o
  // projetor vazio). Antes disso a reserva continua por cima.
  const avisar = useCallback(() => {
    if (pronto.current) return;
    pronto.current = true;
    requestAnimationFrame(() => avisoPronto.current?.());
  }, []);

  useFrame((_, delta) => {
    const passo = Math.min(delta, 1 / 20);
    if (!reduzido) tempo.current += passo;
    const t = tempo.current;

    if (reduzido) {
      giratorio.current.rotation.y = TRES_QUARTOS;
      flutuante.current.position.y = TOPO_DISCO + 0.1;
    } else {
      giratorio.current.rotation.y += passo * GIRO;
      flutuante.current.position.y = TOPO_DISCO + 0.1 + Math.sin(t * 1.25) * 0.045;
    }

    pulso.pulso = Math.max(0, pulso.pulso - passo * 1.6);
    const alvo = (vazio ? 0.55 : 1) + pulso.pulso * 0.6;
    energia.current += (alvo - energia.current) * Math.min(1, passo * 4);
    if (reduzido) energia.current = vazio ? 0.55 : 1;

    if (vazio) avisar();
  });

  return (
    <>
      <Enquadramento />
      <hemisphereLight args={['#FFF7F0', '#9FB6BD', 1.15]} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.2} />
      <directionalLight position={[-3, 2, -3]} intensity={0.9} color="#9FF5EA" />
      <Projetor tempo={tempo} energia={energia} />
      <group ref={flutuante}>
        <group ref={giratorio} rotation-y={TRES_QUARTOS}>
          {elenco.map((item) => (
            <BonecoMemo
              key={item.chave}
              chave={item.chave}
              id={item.id}
              saindo={item.saindo}
              atraso={item.atraso}
              onSaiu={remover}
              onVisivel={avisar}
              tempo={tempo}
              energia={pulso}
              reduzido={reduzido}
            />
          ))}
        </group>
      </group>
    </>
  );
}

/**
 * O Canvas do holograma (chunk à parte, com o three). Vive enquanto montado;
 * trocar `pessoaId` só troca o boneco lá dentro.
 */
function CenaHolograma({ pessoaId, ativo, reduzido, onPronto, className }) {
  const frameloop = !ativo ? 'never' : reduzido ? 'demand' : 'always';
  // Sem tabIndex nem aria-hidden: o wrapper do Canvas ficava focável e escondido
  // ao mesmo tempo (aviso "Blocked aria-hidden"). O pai já é role="img" com rótulo.
  return (
    <Canvas
      className={className}
      dpr={[1, 1.5]}
      gl={GL}
      frameloop={frameloop}
      camera={{ fov: 28, near: 0.1, far: 40, position: [0, 1.55, 7] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Palco pessoaId={pessoaId} reduzido={reduzido} onPronto={onPronto} />
    </Canvas>
  );
}

export default memo(CenaHolograma);
