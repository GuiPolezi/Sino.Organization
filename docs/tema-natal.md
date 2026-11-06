# Tema de Natal: plano de direção de arte e implementação

> Status: **IMPLEMENTADO** (2026-11-06). Para desligar: `NATAL_ATIVO = false` em `src/tema/natal.js`.
> Para apagar o código: seção 3.6.
>
> O plano foi escrito a partir da leitura do código no commit `48fad3a`. Toda coordenada abaixo foi tirada dos arquivos citados e conferida com um script de
> projeção e de folgas, que repete `posicionarQuadro`, `pontoLocal` e `obstaculosDa`. Confira de novo se a
> planta mudar.

**Resumo em uma frase:** o escritório de massinha ganha um Natal brasileiro e aconchegante:
- uma árvore por sala, com luzinhas quentes;
- festões nos monitores e no quadro;
- neve de spray no vidro da sala de reunião;
- panetone no café e um gorro na Têmis;
- 8 estilos de gorro nos bonecos, sorteados de forma fixa por pessoa.

Tudo fica atrás de um único interruptor, `src/tema/natal.js`.

---

## 0. Decisões que valem para tudo

| Decisão | Por quê |
|---|---|
| **Natal brasileiro, de verão.** Lá fora a paisagem continua verde e com sol. A neve só aparece como enfeite: spray no vidro, "saia" de algodão na árvore. Nunca como clima. | A empresa é do Brasil e dezembro é verão. Neve de verdade caindo lá fora contradiria a paisagem viva de `Paisagem.jsx`. Algodão na árvore e spray de neve na vitrine são enfeites típicos do Natal brasileiro. |
| **Pouco e bem-feito.** Uma peça de destaque por sala (a árvore), duas ou três de apoio e detalhes pequenos. | Guias de decoração de escritório apontam o excesso como erro comum. O mesmo vale para a cena: o foco continua nos bonecos e no quadro. |
| **Mesmo material massinha** (`clay()` de `Suporte/boneco/geometrias.js`: `roughness 0.82`, `metalness 0`). Só as lâmpadas e a estrela brilham. | Coerência com o diorama. Brilho demais deixaria o Natal "colado por cima". |
| **Nada de Natal bloqueia caminho, câmera nem clique.** As peças ficam fora da área de caminhada ou entram como obstáculo, já testado. | As páginas têm testes de planta (`test:cenario`) que garantem que todo lugar é alcançável. |
| **Desligar é mudar uma linha; remover é apagar pastas e linhas marcadas.** | É o pedido do usuário. |
| **Datas sugeridas:** ligar em 01/12/2026 (terça) e desligar em 06/01/2027 (quarta, Dia de Reis, quando se desmonta a árvore). | Datas calculadas com `python datetime`. Fica a critério do time. |

---

## 1. Referências pesquisadas

A WebFetch está proibida neste ambiente, então as páginas **não foram abertas**. Os resumos vêm dos
trechos devolvidos pela busca. Três pontos vêm do meu conhecimento de cultura brasileira, não das fontes:
o algodão como neve na árvore, o spray de neve na vitrine e o panetone no café.

| # | Referência | O que faz ela funcionar | O que levamos |
|---|---|---|---|
| 1 | Behance: *3D Isometric Scene All Set for Christmas*: https://behance.com/gallery/164389391/3D-Isometric-Scene-All-Set-for-Christmas | Quarto isométrico de madeira em que velas e luzinhas são a fonte de luz "motivada" e a iluminação global dá o calor. | O calor vem das luzinhas e de **uma** luz pontual quente perto da árvore, não de deixar a cena toda laranja. |
| 2 | CGTrader: *Christmas cozy decor pack* / interior estilizado: https://www.cgtrader.com/3d-models/interior/other/christmas-cozy-decor-pack | Kit de vocabulário (árvore com bolas, meias, presentes, lareira) em paleta pastel suave. | O vocabulário (árvore, presentes, festão, guirlanda), com cores suaves que combinam com o creme do tapete. |
| 3 | Ryan King Art: *Cozy Christmas Critters (Low Poly)*: https://ryankingart.gumroad.com/l/xmas-critters | Pinheiros low-poly espalhados com contenção: silhueta simples, poucas cores. | A árvore como cones empilhados com borda ondulada: forma legível a 15 m da câmera. |
| 4 | Fab: pacote low-poly de Natal com 220 peças e **um atlas só**: https://www.fab.com/listings/15562a2c-9598-417d-9df6-f5c10a0534fa | Muitas peças e pouquíssimos materiais, pensado para jogo. | Orçamento: materiais compartilhados e lâmpadas instanciadas, poucos draw calls. |
| 5 | GetIllustrations: árvore e guirlanda "Clay 3D": https://getillustrations.com/single-illustration/Christmas-tree-holiday-decoration-festive-whimsical-playful e https://getillustrations.com/single-illustration/wreath-holiday-festive-celebration-seasonal-decoration-cheer | Aparência de "massinha": volumes gordinhos, cantos arredondados, cor saturada mas fosca. | É o estilo exato do site: bolas grossas, laços gordos, sem detalhe fino. |
| 6 | Nookipedia (Animal Crossing): *Festive wreath* e *Ornament wreath*: https://nookipedia.com/wiki/Item:Festive_wreath_(New_Horizons) e https://nookipedia.com/wiki/Item:Ornament_wreath_(New_Horizons) | Guirlandas e festões de bolas com silhueta grossa e cores chapadas, legíveis em tamanho pequeno. | A guirlanda do vidro da reunião e o festão do quadro: poucas bolas grandes valem mais que muitas pequenas. |
| 7 | Chaves na Mão: *Enfeites de Natal para escritório*: https://www.chavesnamao.com.br/blog/decoracao-e-estilo/enfeites-de-natal-para-escritorio/ | Pede sobriedade, consistência e respeito ao fluxo de trabalho. | Nada no caminho dos bonecos nem na frente do quadro. |
| 8 | GiftCampaign: dicas de decoração no trabalho: https://www.giftcampaign.pt/blog/?p=5380 | Árvore de tamanho moderado, nas cores do escritório. Evitar excesso. | A árvore usa o verde-oliva do site; há um gorro "da casa" em oliva e creme. |
| 9 | Natal brasileiro e tropical: Maceió, "Natal Tropical": https://diariodocomercio.com.br/mix/papai-noel-gigante-de-areia-e-instalado-ao-lado-de-monumento-historico-em-praia-brasileira/ · Maricá: https://www.brasildefato.com.br/2025/12/15/marica-celebra-natal-com-decoracao-e-atividades-inspiradas-nas-raizes-brasileiras/ · poinsétia em alta: https://terrabrasilnoticias.com/2025/12/a-flor-do-natal-que-deixou-de-ser-detalhe-e-virou-destaque-nas-decoracoes-de-2025/ · brasilidade tropical: https://www.correiobraziliense.com.br/revista-do-correio/2022/01/amp/4981211-a-brasilidade-tropical-na-decoracao-cores-e-natureza.html | Natal com identidade local. A poinsétia (bico-de-papagaio) está cada vez mais nas casas brasileiras. | Bico-de-papagaio nas mesas e paisagem verde de verão. Panetone, algodão e spray de neve como detalhes brasileiros. |
| 10 | Paletas de Natal com hex: https://thecolorsmeaning.com/christmas-color-palettes e https://www.color-meanings.com/christmas-color-palettes | Vermelho, verde e ouro "vintage" e terrosos (ex.: Hunter Green #355E3B, Antique Gold #B8860B, Falu Red #78281F, creme #FFFDD0) funcionam melhor que as cores puras. | Base da paleta da seção 2, puxada para o oliva e o creme dos tokens. |
| 11 | Origem do gorro: https://skjalden.com/origin-of-the-santa-hat/ e https://ponderworthy.com/the-christmas-santa-claus-hat-why-we-keep-wearing-this-weird-piece-of-history-12hp (fontes de qualidade baixa a média) | Gorro cônico mole (frígio) com pompom (a "top cap" escandinava) e variações: elfo listrado, veludo "premium", tricô. | A família de 8 gorros: o mesmo cone curvo com variações de cor, comprimento, aba e ponta. |
| 12 | three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html · forum `setColorAt`: https://discourse.threejs.org/t/replace-material-color-for-instancedmesh-instance-with-setcolorat/40285.md · issue #21786: https://github.com/mrdoob/three.js/issues/21786 | Instanciar reduz draw calls. O buffer de cor por instância só nasce no 1º `setColorAt` (chamar antes do 1º render) e precisa de `needsUpdate`. | Lâmpadas e bolas instanciadas, com a cor definida na criação. O pisca vem do shader, sem reenviar buffer a cada frame. |

---

## 2. Direção de arte

### 2.1 Paleta (`src/tema/natal/paleta.js`)

A paleta parte dos tokens (`src/styles/tokens.css`) e das cores que as cenas já usam:
- tokens: oliva `#606C38`, oliva escuro `#3B4726`, creme `#FEFAE0`, menta `#B0DAC9` e verde-água `#1A6E63`;
- cenas: o ouro `#F2B632` e o `#FFC23D` do quadro e da estátua, o vermelho `#E25656` e o amarelo `#F2B632` dos pufes, o verde-água `#2E9C93` da xícara e o uniforme `#4FA46B`.

A ideia é o vermelho um pouco mais fundo que o dos pufes, para os dois não brigarem, e o verde do pinheiro puxado para o oliva.

| Chave | Hex | Uso |
|---|---|---|
| `vermelho` | `#C8423B` | gorro clássico, laços, bolas, fita dos presentes |
| `vermelhoSombra` | `#9E2F2B` | dobras e o lado de dentro do gorro, listras |
| `vinho` | `#7A1F2B` | gorro "luxo" (veludo) |
| `pinheiro` | `#2F5D3A` | árvore (camadas pares), festão, guirlanda |
| `pinheiroClaro` | `#4E7F45` | árvore (camadas ímpares), folhas |
| `oliva` | `#606C38` (token) | gorro "da casa", um presente, raminhos |
| `elfo` | `#4FA46B` (uniforme) | gorro de elfo: o verde da camisa da empresa |
| `creme` | `#FEFAE0` (token) | pelúcia (aba e pompom), fita, cartão |
| `neve` | `#F7F9F6` | algodão, spray no vidro (branco quente, nunca `#FFFFFF` puro) |
| `ouro` | `#F2B632` | estrela, sinos, bolas, fitas (mesmo ouro do quadro e da estátua) |
| `ouroBrilho` | `#FFC23D` | emissivo da estrela (é o `OURO` de `Quadro.jsx`) |
| `ouroAntigo` | `#C9A04E` | aba e pompom do gorro "luxo" |
| `verdeAgua` | `#2E9C93` | bolas e um presente (dialoga com a xícara e o pincel do quadro) |
| `menta` | `#B0DAC9` (token) | listra do gorro de tricô, um presente |
| `madeira` | `#7A4E2D` | tronco da árvore |
| `luzQuente` | `#FFD27A` | ~70% das lâmpadas |
| `luzAmbar` | `#FF9F5A` | ~15% das lâmpadas |
| `luzCores` | `#FF6F61` `#7FD3A8` `#7FB8F0` | ~15%: lâmpadas coloridas, só como tempero |
| `panetone` | `#B5733A` (cúpula) · `#C98B4E` (papel) | panetone do café |

Regras:
1. Na mesma peça, no máximo 3 cores da paleta, mais o creme.
2. Lâmpadas e estrela usam `MeshBasicMaterial({ toneMapped: false })`, como as telas dos monitores em
   `EstacoesTrabalho.jsx`. Assim o `NeutralToneMapping` não as apaga.
3. Não usar o branco puro (`#FFFFFF`) em grandes áreas: num tapete creme, ele "estoura".

### 2.2 Material

- **Massinha:** `clay(cor)`, já existente. Pelúcia (aba e pompom): `roughness 1`. Veludo ("luxo"):
  `roughness 0.95`. Ouro: `roughness 0.45, metalness 0.15`, como a placa da Têmis.
- **Materiais compartilhados e preguiçosos:** `src/tema/natal/materiais.js` exporta
  `materialNatal(chave)`. Ele cria o material na 1ª chamada, guarda num `Map` e **nunca o descarta**,
  como `ESCURO` e `CORDAO` em `geometrias.js`. Nada é criado ao importar o módulo; com o Natal desligado,
  não há custo nenhum em tempo de execução.
- **Volume de massinha:** a aba de pelúcia é um `TorusGeometry` com deslocamento radial
  `1 + 0.07·sin(9θ)·sin(5φ)`, que a deixa "fofa". O pompom é um `IcosahedronGeometry(r, 2)` com ruído
  leve. Sem texturas de normal.
- **Texturas em canvas, quando servem:** listras do gorro de bengala, ponto de tricô com faixa de
  floco, neve de spray e o cartão "Boas Festas". Use a `novaTextura()` de `Suporte/quadro/texturas.js`
  ou a `textura()` de `Reuniao/cena/comum.js`. O cartão usa a fonte **Caveat**, já carregada, a mesma
  das anotações.
- **Hover do quadro e da estátua:** as peças de Natal montadas dentro do `grupo` deles crescem junto no
  hover (o grupo escala 3%). **Não** entram em `M.brilham`: não acendem em dourado. Ficam fixas, como
  enfeite.

### 2.3 Orçamento de polígonos e draw calls

| Item | Triângulos | Draw calls |
|---|---|---|
| Gorro (cada) | ≤ 1.500 (cone 20×12 seg ≈ 480, aba 10×32 ≈ 640, pompom ico-2 ≈ 320) | 3 a 5 |
| Árvore completa (camadas, bolas instanciadas, luzes instanciadas, halos, estrela, saia, tronco) | ≤ 8.000 | ≤ 10 |
| Festão (tubo mesclado + lâmpadas) | ≤ 2.500 por festão | 3 |
| Cena inteira, só o Natal (sem gorros) | ≤ 25.000 | ≤ 40 |
| Luzes reais (`pointLight`) | **no máximo 1 por cena**, e só a da árvore | – |

Regras de desempenho:
- Instancie tudo o que se repete: lâmpadas, bolas, flocos. Para cada conjunto, uma `InstancedMesh`
  com a cor definida **na criação**, por causa da issue #21786.
- O pisca é feito no shader (`onBeforeCompile` com `uTempo` e um atributo `aFase` por instância). Não
  use `setColorAt` a cada frame.
- Os halos ficam num único `THREE.Points` (textura radial, `AdditiveBlending`, `depthWrite: false`).
- Não monte nem desmonte luzes dinamicamente. Isso muda a contagem de luzes e recompila todos os
  shaders da cena. A luz da árvore fica sempre montada e só a `intensity` varia, como faz a `Luminaria`
  em `Mobilia.jsx`.
- Halos e lâmpadas ficam fora das sombras de contato. Use a camada 2 (`CAMADA_BRILHO`), habilitada na
  câmera pelo componente de Natal, com o mesmo padrão de `HabilitarCamada` em `Reuniao/cena/comum.js`.
  Na camada 0, o `ContactShadows` desenharia os halos como manchas no tapete.

### 2.4 Animação (sutil) e `prefers-reduced-motion`

| O quê | Como | Limites |
|---|---|---|
| Pisca das luzinhas | Brilho `0.75 + 0.25·sin(t·v + fase)`, com `v` entre 0,6 e 1,4 rad/s e fase por lâmpada | Senoide suave: nada de liga/desliga. Bem abaixo de 3 piscadas/s (WCAG 2.3.1). |
| Estrela da árvore | Gira em Y a 0,25 rad/s e "respira" no emissivo ±10% | – |
| Pompom ou sino do gorro | Pêndulo `sin(t·1.3 + fase)·0.08` rad, no pivô do pompom | A fase vem do hash do id, para os bonecos não balançarem juntos. |
| Ponta do gorro caído | O "rabo" pendurado balança `±0.06` rad | – |
| Flocos do holograma | Descem 0,15 m/s e giram devagar | – |
| Festões | **Parados** | Só as lâmpadas deles piscam. |

**Movimento reduzido.** O helper `src/tema/natal/movimento.js` exporta `movimentoReduzido()`, que
devolve `MOVIMENTO.reduzido` (do `store.js`, mantido pela `Cena`) **ou** o resultado de
`matchMedia(MEDIA.reducedMotion)`, guardado em cache com um listener preguiçoso. O helper é necessário
porque na home (holograma) a `Cena` não existe e `MOVIMENTO.reduzido` fica `false`.

Com movimento reduzido:
- tudo para na pose de descanso;
- as lâmpadas ficam **acesas, fixas** em 0,9;
- a estrela fica parada, de frente para a câmera.

Segue o padrão de `Quadro.jsx`: `const t = reduzido ? 0 : clock.elapsedTime`.

---

## 3. Arquitetura do interruptor

### 3.1 O interruptor

```js
// src/tema/natal.js
/**
 * Tema de Natal. Mudar para false desliga tudo (bonecos sem gorro, salas sem enfeite).
 * Remoção completa do código: ver "Remoção" em docs/tema-natal.md (seção 3.6).
 */
export const NATAL_ATIVO = true;
```

A ideia original era um modo automático por data. **Não** o use: ele impediria a eliminação de código
morto, e o pedido é um interruptor simples.

### 3.2 Onde vive o código

```
src/tema/natal.js                         ← o interruptor (só esta constante)
src/tema/natal/
  paleta.js            cores (seção 2.1)
  materiais.js         materialNatal(chave): materiais compartilhados e preguiçosos
  movimento.js         movimentoReduzido()
  camadas.js           CAMADA_BRILHO = 2 + <HabilitarBrilho/>
  obstaculos.js        useObstaculosNatal(lista): põe/tira círculos em OBSTACULOS (marca 'natal')
  paleta.test.mjs      testes da paleta e da mistura das lâmpadas (passo 0)
  obstaculos.test.mjs  testes de sincronizarObstaculos (passo 0)
  geometrias.js        geometrias preguiçosas: coneEmCamadas, estrela, laço, caixa, tubo de festão
  pecas/
    geometriaFestao.js curva, tubo mesclado e pontos ao longo do festão (JS puro, testável em Node)
    geometriaFestao.test.mjs
    Luzinhas.jsx       lâmpadas instanciadas + halos (Points) + pisca no shader
    Festao.jsx         tubo de pinheiro numa curva (CatmullRom) + Luzinhas ao longo dele
    Laco.jsx           laço gordo (dois toros achatados + nó)
    Presente.jsx       caixa com fita cruzada e laço
    ArvoreNatal.jsx    árvore completa (camadas, bolas, luzes, estrela, saia de algodão, luz quente)
    BicoDePapagaio.jsx poinsétia num vasinho
    Guirlanda.jsx      guirlanda com bolas e laço
  cenario.js           NATAL_CENA (onde fica a árvore no tapete) + configurarNatal()
  NatalCenario.jsx     a árvore e os presentes no tapete (/suporte, /desenvolvimento, /compilacao)
  gorros/
    catalogo.js        os 8 estilos (dados) + GORROS_POR_PESSOA + gorroDe(id)
    geometriasGorro.js coneCurvo() e companhia (JS puro, testável em Node)
    encaixe.js         ENCAIXE por estilo de cabelo + CABELO_SOB_GORRO
    Gorro.jsx          o gorro montado (com o balanço do pompom)
  natal.test.mjs       testes de posição, encaixe e sorteio
src/pages/Suporte/cena/natal/EnfeitesEstacao.jsx
src/pages/Suporte/quadro/natal/EnfeiteQuadro.jsx
src/pages/Desenvolvimento/cena/natal/configNatal.js
src/pages/Compilacao/cena/natal/{configNatal.js, NatalTemis.jsx, NatalCafe.jsx}
src/pages/Reuniao/cena/natal/{pontos.js, NatalReuniao.jsx, FestaoVidro.jsx, NeveNoVidro.jsx, LuzesNaPaisagem.jsx}
src/components/Hero/reunioes/holograma/natal/FlocosHolograficos.jsx
```

**Regra de ouro para os módulos de Natal:** **nenhum efeito colateral ao importar.** Nada de
`new THREE.*`, `OBSTACULOS.push` ou `TextureLoader` no topo do módulo. Tudo nasce no primeiro uso, ou
em `useMemo`/`useLayoutEffect`. Com isso, desligado, o Natal custa zero em tempo de execução, mesmo
que o bundler não elimine o código.

### 3.3 As linhas que entram nos arquivos existentes (lista completa)

`git grep -n NATAL_ATIVO` deve listar **exatamente** estas linhas:

| Arquivo | Linha nova | Dono |
|---|---|---|
| `src/pages/Suporte/cena/Cenario.jsx` | `{NATAL_ATIVO && <NatalCenario area={area} />}` dentro do `<group>` | C |
| `src/pages/Suporte/cena/EstacoesTrabalho.jsx` | `{NATAL_ATIVO && <EnfeitesEstacao indice={indice} />}` dentro do grupo da `Estacao` | B |
| `src/pages/Suporte/quadro/Quadro.jsx` | `{NATAL_ATIVO && <EnfeiteQuadro />}` dentro do `<group ref={grupo}>` | B |
| `src/pages/Reuniao/cena/CenarioReuniao.jsx` | `{NATAL_ATIVO && <NatalReuniao tema={tema} />}` | B |
| `src/pages/Desenvolvimento/index.jsx` | `if (NATAL_ATIVO) configurarNatal(NATAL_DEV);` junto dos outros `configurar*` | B |
| `src/pages/Compilacao/index.jsx` | `if (NATAL_ATIVO) configurarNatal(NATAL_COMPILACAO);` | C |
| `src/pages/Compilacao/cena/EstatuaTemis.jsx` | `{NATAL_ATIVO && <NatalTemis />}` dentro do `<group ref={grupo}>` | C |
| `src/pages/Compilacao/cena/CantoDoCafe.jsx` | `{NATAL_ATIVO && <NatalCafe altura={altura} />}` dentro do grupo da mesa | C |
| `src/pages/Suporte/boneco/Boneco.jsx` | na `Figura`: `{NATAL_ATIVO && <Gorro id={id} aparencia={aparencia} />}` + o ajuste do cabelo (3.4) | A |
| `src/components/Hero/reunioes/holograma/CenaHolograma.jsx` | `{NATAL_ATIVO && <FlocosHolograficos tempo={tempo} energia={energia} />}` no `Palco` | A |

Também entram mudanças que **não** dependem do interruptor e são inofensivas com ele desligado:
- a `Figura` passa a receber `id`, e os três lugares que a chamam o repassam (`Boneco.jsx`, `Retratos.jsx`
  no `Pose`, `CenaHolograma.jsx` no `BonecoHolografico`, que também põe `id` nas deps do `useMemo`);
- em `Boneco.jsx`, o `Cabelo` ganha a prop `ajuste` (com as medidas de hoje extraídas para constantes,
  como `TOPETE`, `COQUE` e `MOICANO`, e o helper `peca()`), e o `AcessorioCabeca` ganha `semArco`.

Sem o Natal, `ajuste` e `semArco` chegam indefinidos e o desenho é idêntico ao de hoje.

### 3.4 O único ajuste que não cabe numa linha: o cabelo sob o gorro

Alguns cabelos atravessariam o gorro: a crista do moicano, os coques, o topete e os cachos do topo. A
`Figura` calcula, uma vez por aparência,
`const sobGorro = NATAL_ATIVO ? cabeloSobGorro(id, aparencia) : undefined` e passa
`<Cabelo … ajuste={sobGorro} />`. Dentro de `Cabelo`, as peças em conflito leem
`ajuste?.topete ?? {posição/escala de hoje}` e assim por diante. **Com `ajuste` indefinido, o desenho é
idêntico ao de hoje.** A tabela fica em `src/tema/natal/gorros/encaixe.js` (seção 5.4).

O mesmo vale para o boné: `<AcessorioCabeca tipo={sobGorro?.semBone ? 'nenhum' : aparencia.acessorio} …/>`.
Com o gorro, o boné sai.

### 3.5 Eliminação de código morto: verificar, não supor

O projeto usa Vite 8 (Rolldown). Não está confirmado que o bundler propague a constante importada
`NATAL_ATIVO = false` entre módulos e elimine os imports. Por isso a garantia vem em camadas:
1. **não monta:** `{false && …}` não renderiza nada;
2. **não executa:** os módulos não têm efeito colateral ao importar (3.2);
3. **verificação no build:** com `false`, rodar `npm run build` e
   `grep -rl "natal:arvore" dist/assets`.
   Cada `ArvoreNatal` recebe `name="natal:arvore"`, que serve de marcador.
   Se o marcador sumir, o código foi eliminado. Se ficar, é só código morto: anote no PR o tamanho a mais
   do chunk.

**Resultado medido (2026-11-06):**
- Com `false`, o Rolldown tira o JSX, mas mantém os módulos importados: `natal:arvore`, `gorro` e
  `panetone` continuam em `Boneco-*.js` e `PaginaEquipe-*.js`.
- São cerca de 60 KB a mais no `dist`, e inertes: nada roda nem monta.
- Logo, o marcador continuar no `dist` **é o esperado** e não indica falha. Para tirar esses 60 KB, use a
  remoção da seção 3.6.

### 3.6 Remoção (quando o Natal acabar de vez)

Desligar basta para o site voltar ao normal. Apagar o código é opcional:

1. Liste tudo o que aponta para o Natal fora das pastas dele:
   `git grep -in "natal" -- src package.json ':!src/tema/natal' ':!**/natal/**'`
   (não use só `NATAL_ATIVO`: as linhas de `import` não têm essa palavra).
2. Nesses arquivos, apague os `import` de módulos de Natal e as linhas `NATAL_ATIVO`. Os arquivos são:
   `Cenario.jsx`, `EstacoesTrabalho.jsx`, `Quadro.jsx`, `Boneco.jsx`, `CenarioReuniao.jsx`,
   `Desenvolvimento/index.jsx`, `Compilacao/index.jsx`, `EstatuaTemis.jsx`, `CantoDoCafe.jsx` e
   `CenaHolograma.jsx`.
3. Apague o script `test:natal` do `package.json`.
4. Apague as pastas: `src/tema/` inteira, mais as pastas `natal/` em `Suporte/cena`, `Suporte/quadro`,
   `Desenvolvimento/cena`, `Reuniao/cena`, `Compilacao/cena` e `components/Hero/reunioes/holograma`.
5. Sobras opcionais, que não atrapalham se ficarem: a prop `id` da `Figura`, `ajuste` no `Cabelo` e
   `semArco` no `AcessorioCabeca`.
6. Rode `npm run build` e `npm run test:cenario`.

Outro caminho é reverter o(s) commit(s) do tema de Natal com `git revert`.

---

## 4. Cena por cena

Eixos de todas as cenas: `+x` direita · `+z` frente (câmera) · `y` altura · 1 unidade = 1 m. As posições
de tela usam a vista geral em 1536×864.

### 4.1 Peças compartilhadas (C)

**`ArvoreNatal`** (props: `escala = 1`, `luzAcesa = 1`, `semLuz = false`). É uma árvore de 2,05 m na
escala 1, mais alta que os bonecos (~2,0 m com o cabelo), sem passar do quadro.

| Parte | Geometria | Medidas (local, pé em y=0) | Cor |
|---|---|---|---|
| Saia de algodão | 7 esferas achatadas sobrepostas | raio total 0,62, altura 0,06 | `neve`/`creme` alternados |
| Tronco | cilindro | r 0,08, h 0,28 | `madeira` |
| Camadas (4) | `ConeGeometry(r, h, 12, 1)` com o anel de baixo em zigue-zague (vértices alternados ±0,03 em y) | (0,62; 0,62; y 0,55) · (0,50; 0,55; 0,95) · (0,38; 0,48; 1,30) · (0,25; 0,40; 1,62), com y no centro de cada cone | `pinheiro` e `pinheiroClaro` alternados |
| Bolas (16) | `InstancedMesh` de esfera r 0,055 | espiral de ângulo áureo sobre as camadas, a 92% do raio de cada uma | `vermelho`, `ouro`, `creme`, `verdeAgua` em rodízio |
| Luzinhas (34) | `Luzinhas` em espiral (3 voltas, da base ao topo) | r 0,022, a 98% do raio | 70/15/15 (2.1) |
| Estrela | `ExtrudeGeometry` de 5 pontas (r 0,13, profundidade 0,04, bisel 0,015) | y 1,93 | `ouro`, emissivo `ouroBrilho` 0,6 |
| Luz | `pointLight` quente `#FFC98A` | (0; 1,0; 0,6), `distance` 3,2, `intensity` 0,9·`luzAcesa` | – |

A luz pontual é opcional por cena (`semLuz`). Ela fica sempre montada (2.3).

**Como ficou (agente C).** `src/tema/natal/pecas/ArvoreNatal.jsx`, `export default`:
- **Props:** `escala = 1` (1 = 2,05 m), `luzAcesa = 1` (multiplica a intensidade da luz; 0 apaga),
  `semLuz = false` (sem a `pointLight`; fixo por cena, não alternar depois de montar). O resto
  (`position`, `rotation`…) vai para o `<group name="natal:arvore">` de fora (o marcador de 3.5).
- **Pé em y = 0**, de frente para +z. As medidas ficam em `pecas/medidas.js` (`ARVORE`) e a conta em
  `pecas/geometriaArvore.js` (JS puro).
- **Diferenças da tabela:** as camadas são um torno gordinho (perfil levemente convexo, borda de baixo
  arredondada) com a borda ondulada em 9, 8, 7 e 6 dentes, no lugar do cone de 12 segmentos; as bolas
  pendem das pontas dos dentes; as luzinhas seguem a espiral só na parte visível de cada camada; a saia
  tem 7 bolotas e 12 tufos (neve, com um terço creme); a luz quente fica em (0; 1,1; 0,95), não em
  (0; 1,0; 0,6), porque perto demais fazia uma mancha clara nas camadas.
- **Animação:** a estrela gira a 0,25 rad/s e o emissivo respira ±10%; com `movimentoReduzido()`, para
  de frente. O pisca é o das `Luzinhas`.

**`Presente`** (`modelo = 'A'`, e `largura, altura, profundidade, cor, fita` para trocar o que vier do
modelo; o resto vai para o `<group>`): base em y = 0, laço de frente para +z. Ex.: `<Presente modelo="D"
position={…} rotation-y={0.3} />`. Uma caixa arredondada, duas faixas finas de
fita cruzadas e um `Laco` em cima. São quatro modelos fixos (`PRESENTES` em `pecas/medidas.js`):

| # | Caixa | Fita |
|---|---|---|
| A | 0,34³, `vermelho` | `creme` |
| B | 0,26 × 0,22 × 0,26, `oliva` | `ouro` |
| C | 0,40 × 0,18 × 0,30, `creme` | `vermelho` |
| D | 0,22 × 0,32 × 0,22, `verdeAgua` | `creme` |

**`Luzinhas`** (`pontos`, `cores`, `raio`, `prepararMaterial?`): é uma `InstancedMesh` de esfera com 8×6
segmentos, mais um `Points` para os halos (tamanho ≈ 6× o raio). `prepararMaterial` permite aplicar
`natural()` (o stencil da paisagem da Reunião) sem importar a Reunião no módulo compartilhado.

**`Festao`** (`pontos`, `raio = 0.035`, `luzes = n`): uma `TubeGeometry` (8 segmentos radiais) numa
`CatmullRomCurve3`, em `pinheiro`, com "agulhas" sugeridas por uma textura de listras diagonais escuras.
Em cima, de 4 a 7 bolinhas por metro e `n` lâmpadas distribuídas por `curva.getPointAt(u)`. Vários
festões da mesma cena viram uma geometria só (`mergeGeometries` de
`three/examples/jsm/utils/BufferGeometryUtils.js`).

**`useObstaculosNatal(lista)`**: no `useLayoutEffect`, põe em `OBSTACULOS` (de
`Suporte/boneco/estacoes.js`) os círculos `{ x, z, r, estacao: 'natal' }`. Na limpeza, os tira.
- **Atualização:** quando a forma do tapete muda, atualiza os mesmos objetos (como `posicao.js` faz com o
  quadro).
- **Convivência com o resto:** `definirEstacoes` e `aplicarPlanta` preservam obstáculos de outras marcas,
  então os de Natal ficam.
- **Boneco nascido em cima:** se um boneco nascer em cima antes do efeito, `aplicarLimites` o expulsa no
  1º frame. É o mesmo comportamento do pé do quadro.
- **Teste da Reunião:** o teste de rota da Reunião filtra `estacao === 'cenario-reuniao'`, então a marca
  `'natal'` não interfere nele.

#### Contratos do passo 0 (implementados; não mudar sem avisar os outros agentes)

Todos os componentes são `export default` e repassam o resto das props (`position`, `rotation`,
`scale`, `name`…) para um `<group>` de fora. Cores aceitam **chave de `PALETA_NATAL` ou hex**.

| Arquivo | API |
|---|---|
| `src/tema/natal.js` | `NATAL_ATIVO: boolean` |
| `paleta.js` | `PALETA_NATAL` (congelada: as chaves de 2.1, mais `prata` `#DCE8EC`, `luzArvore` `#FFC98A` e `panetonePapel` `#C98B4E`; `panetone` é a cúpula) · `LUZ_CORES` (os 3 hex de `luzCores`) · `corNatal(chave) → hex` · `coresLuzinhas(n) → hex[]` (70/15/15, determinístico) |
| `materiais.js` | `materialNatal(chave, acabamento = 'massinha')`, com `acabamento` ∈ `'massinha' \| 'pelucia' \| 'veludo' \| 'ouro' \| 'brilho'` (`brilho` = `MeshBasicMaterial`, `toneMapped: false`). Compartilhado: nunca descartar nem alterar |
| `movimento.js` | `movimentoReduzido() → boolean` (barato, pode ir no `useFrame`) |
| `camadas.js` | `CAMADA_BRILHO = 2` · `useHabilitarBrilho(ativo = true)` · `<HabilitarBrilho />` · `naCamadaBrilho(objeto) → objeto`. A câmera conta os pedidos: vários enfeites podem habilitar e só o último a sair desliga |
| `obstaculos.js` | `MARCA_NATAL = 'natal'` · `useObstaculosNatal(lista: {x, z, r}[])` · `sincronizarObstaculos(atuais, lista) → círculos` · `tirarObstaculos(círculos)` |
| `pecas/geometriaFestao.js` | `curvaDe(pontos, fechada?)` (CatmullRom `centripetal`) · `tuboDoFestao(curvas, raio, fechada?)` · `pontosAoLongo(curvas, quantos(m) → n, dy, desvio = 0.5)` |

**`<Luzinhas>`**: `pontos` (`[x, y, z]` ou `{x, y, z}`, no espaço local), `cores?` (uma por lâmpada,
repete se faltar; padrão `coresLuzinhas`), `raio = 0.022`, `halo = true`, `camada = CAMADA_BRILHO`,
`prepararMaterial?` (recebe e devolve cada material, lâmpada e halo; passe uma função **estável**, como
`natural`).
- Na `CAMADA_BRILHO`, ela mesma habilita a camada na câmera: ninguém precisa montar `HabilitarBrilho`
  por causa dela.
- Para a paisagem da Reunião: `camada={CAMADA_NATUREZA}` e `prepararMaterial={natural}`.
- Recria a malha só quando os números mudam (pode receber uma lista nova a cada render).
- O halo é um `Points` com tamanho em metros: **não** acompanha a escala dos grupos pais (na estátua,
  escala 1,3, o halo fica 30% menor em proporção).

**`<Festao>`**: `pontos` (uma curva) **ou** `curvas` (lista de curvas, mescladas numa geometria só),
`fechado = false`, `raio = 0.035`, `cor = 'pinheiro'` (o ouropel do monitor passa `vermelho`, `ouro`,
`pinheiroClaro` ou `prata`), `luzes?`, `raioLuz = 0.7·raio`, `coresLuzes?`, `bolinhas?` e
`coresBolinhas = ['vermelho', 'ouro']`.
- `luzes` e `bolinhas` são contagens **por curva**. Sem elas, o padrão é 6 lâmpadas e 5 bolinhas por
  metro. Com `0`, não há nenhuma.
- As lâmpadas ficam 0,75·raio acima do fio. As bolinhas (raio 1,15·raio) ficam 1,4·raio abaixo, e as
  duas se alternam ao longo do comprimento.
- Exemplos: o monitor (4.3) é `raio={0.018} luzes={7} raioLuz={0.013} bolinhas={0}`. O quadro (4.4) é
  `luzes={9} bolinhas={6}`. A Reunião (4.6) é `curvas={10 trechos} luzes={5}`.

**`<Laco>`**: `cor = 'vermelho'`, `escala = 1` (**largura do laço em metros**: na escala 1 ele tem
1 m), `pontas = 0` (quanto as pontas da fita caem abaixo do nó, em metros já na escala final). Olha
para +z. Exemplo: no quadro, `<Laco escala={0.22} pontas={0.18} />`.

### 4.2 Tapete de /suporte, /desenvolvimento e /compilacao: `NatalCenario` (C)

Montado em `Cenario.jsx`, que as três páginas usam. Ele lê `NATAL_CENA`, que cada página pode trocar com
`configurarNatal`:

```js
// src/tema/natal/cenario.js: padrão (/suporte)
export const NATAL_CENA = {
  arvore: {
    // Ângulo na elipse (graus, como CONFIG_QUADRO: 0 = direita, −90 = fundo, 180 = esquerda).
    angulo: -145, anguloRetrato: 180,
    // Quanto a elipse da árvore passa da área de caminhada (m). Positivo = no anel do tapete, fora da área.
    alemDaArea: 1.0,
    escala: 1.05,
    obstaculo: null,   // { r } quando a árvore entra na área de caminhada
    presentes: 'frente', // 'frente' (para a câmera) ou 'fora' (para a borda do tapete)
  },
};
```

O componente recebe `area` (a de `AREA`, que vira retrato e paisagem) e lê `CENA.margemTapete`. Ele
calcula o centro em `((area.rx + alemDaArea)·cos a, (area.rz + alemDaArea)·sin a)` e vira a árvore para a
câmera (`atan2(0 − x, 14 − z)`, como o quadro).

| Página | Orientação | Centro da árvore | Por quê / folga |
|---|---|---|---|
| /suporte | paisagem | ângulo −145°, além 1,0 → **(−5,90; −2,52)** | Fica no anel creme, fora da área de caminhada: na fórmula da elipse dá 1,46 na área e 0,80 no tapete. Não precisa de obstáculo. Fundo-esquerdo, espelhando o quadro (fundo-direito, em (4,53; −2,90), `posicao.js`). Na tela vai de (322, 376) a (303, 221), **abaixo** do título (até y ≈ 180) e longe do card, que abre à direita. |
| /suporte | retrato | 180°, além 1,0 → **(−4,30; 0)** | No retrato o fundo esquerdo fica sob o título. A lateral esquerda está livre (o bloco 2×2 vai até x ±1,6). |
| /desenvolvimento | paisagem | −150° na elipse (rx + margem − 0,6; rz + margem − 0,6) = **(−7,53; −2,65)**, obstáculo r 1,15 | A margem é de só 0,55 m, então a árvore entra na borda da área e vira obstáculo. A menor folga até as mesas (`dev-fundo`) é 1,10 m com r 0,85, ou ~0,8 m com r 1,15: passável. Quadro a 11 m. Tela: (267, 379) a (248, 244). |
| /desenvolvimento | retrato | 180° → **(−5,00; 0)**, r 1,15 | Folga de 1,84 m até o bloco central, de 2,14 m com r 0,85. |
| /compilacao | paisagem | −160° → **(−8,18; −1,81)**, r 1,15, presentes `'fora'` | **Ao lado do café** (mesa em (−6,1; −1,7), `planta.js`): "canto do café natalino". O obstáculo encosta no da mesa do café, um canto fechado onde ninguém passa. Fica a 1,8 m e 1,5 m das chegadas `cafe-xicaras` e `cafe-cafeteira` e a ~1,1 m do pufe vermelho. Tela: (205, 400) a (182, 261). |
| /compilacao | retrato | **(−4,60; −0,40)**, r 1,15 | Atrás da mesa do café, que no retrato está de lado em (−3,4; 1,2). Folga de 1,45 m até `c-fundo`. |

Os valores de /desenvolvimento e /compilacao vão em `src/pages/Desenvolvimento/cena/natal/configNatal.js`
(`NATAL_DEV`) e `src/pages/Compilacao/cena/natal/configNatal.js` (`NATAL_COMPILACAO`). São só dados,
lidos pelo teste.

**Presentes:** 3 caixas (A, B e C de 4.1) na saia da árvore, a 0,45–0,7 m do centro.
- **Onde:** viradas para o centro do tapete (`'frente'`). Nas páginas com obstáculo, para o lado da borda
  (`'fora'`), para o obstáculo de r 1,15 cobri-las.
- **Giros:** ±0,3 rad, nada alinhado.
- **Por quê:** é uma cena de "pé da árvore" que se lê de longe.

**Como ficou (agente C): o formato de `NATAL_CENA`.** `src/tema/natal/cenario.js` (só dados e contas,
sem three nem React):

```js
// Config de uma página: { arvore: Partial<ConfigArvore> }, aplicada sobre o padrão.
{
  arvore: {
    angulo, anguloRetrato,   // graus na elipse (0 = direita, −90 = fundo, 180 = esquerda)
    alemDaArea,              // m além da área de caminhada (negativo = dentro dela)
    centro?, centroRetrato?, // { x, z } fixo, no lugar de angulo/alemDaArea (ex.: /compilacao em retrato)
    escala,                  // 1 = 2,05 m (padrão 1,05)
    obstaculo,               // null ou { r } (r já soma o corpo, como OBSTACULOS)
    presentes,               // 'frente' (entre a árvore e a câmera) ou 'fora' (do lado da borda)
  },
}
```

- **API:** `NATAL_CENA` (padrão, congelado) · `configurarNatal(config)` (sempre sobre o padrão, então
  repetir não acumula) · `cenaNatal()` (a config em uso) · `centroDaArvore(arvore, area, retrato)` ·
  `arvoreNoTapete(arvore, area, retrato) → { x, z, rot, escala, raioSaia, obstaculo, presentes }`.
- **Mudanças no padrão:** `alemDaArea` é **1,05** (não 1,0). Com 1,0, a saia (0,65 m) ficava 3 cm ao
  alcance do corpo de quem anda na borda (o teste mede a distância real até a elipse). O centro em /suporte
  vai a (−5,94; −2,55) em paisagem e a (−4,35; 0) em retrato.
- **Presentes:** `'frente'` fica a 0,48–0,52 m do centro, não mais, para nenhum ficar ao alcance de quem
  passa: os presentes ficam "debaixo dos galhos". `'fora'` abre para os lados (±1,3 rad), a 0,3–0,5 m,
  para continuar no creme quando o tapete acaba perto.
- **Retrato:** `NatalCenario` decide pela tela (`size.width / size.height < 1`), como a estátua e o
  `CenarioCompilacao`.

### 4.3 Mesas de trabalho (as 3 páginas): `EnfeitesEstacao` (B)

Montado dentro do grupo de cada `Estacao` de `EstacoesTrabalho.jsx`, no espaço local da mesa (monitor em
(0; 1,13; −0,16), escala (0,7; 0,43; 0,05), topo em y 1,345).

| Peça | Onde (local) | Detalhe |
|---|---|---|
| **Festão no monitor** (todas) | Curva pelo topo do monitor, de (−0,36; 1,35; −0,13) a (0,36; 1,35; −0,13), com uma pontinha caindo 0,08 na lateral direita | Ouropel fino r 0,018 com 7 lâmpadas de r 0,013. A cor varia pelo `indice`: vermelho, ouro, verde, prata `#DCE8EC`. Não cobre a tela (que vai até y 1,32). |
| `indice % 4 === 0` (tem caneca) | Bengala doce dentro da caneca (−0,6; 0,83; 0,12) | Cilindro r 0,012 + meio toro, listras por textura. Altura 0,16 acima da caneca. |
| `indice % 4 === 1` (sem caneca) | **Bico-de-papagaio** em (−0,58; 0,77; 0,08) | Vasinho `creme` r 0,06 h 0,08 e 6 brácteas `vermelho` (esferas achatadas) em roseta, com miolo `ouro`. Diâmetro 0,2. |
| `indice % 4 === 2` (tem caneca) | – | Só o festão: respiro visual. |
| `indice % 4 === 3` (sem caneca) | **Mini árvore** em (−0,58; 0,77; 0,06) | 3 cones `pinheiro` (h total 0,24) + estrela de r 0,03 + 3 bolinhas. Sem `pointLight`. |

**Por quê:** é o "Natal de mesa" de escritório brasileiro. Lê-se de perto quando a câmera se aproxima de
um boneco sentado (`CameraRig` em `pos + (1,35; 2,7; 7,2)`) e não pesa na vista geral.

### 4.4 Quadro da equipe (/suporte e /desenvolvimento): `EnfeiteQuadro` (B)

Montado **dentro** do `grupo` de `Quadro.jsx`: cresce no hover e clicar nele abre o painel. Medidas de
`Quadro.jsx`: W 2,4 · H 1,55 · C 1,9 · TOPO 2,675 · Z_NOTA 0,04.

| Peça | Onde | Detalhe |
|---|---|---|
| **Festão no topo da moldura** | 3 pontos de apoio: (−1,18; TOPO + 0,03; 0,07), (0; TOPO + 0,03; 0,07), (1,18; TOPO + 0,03; 0,07), com 2 barrigas de 0,07 | Desce até y ≈ 2,60, acima da nota mais alta (papel rasgado, topo em 2,537). 9 lâmpadas e 6 bolinhas vermelhas e douradas. O losango dourado (em TOPO + 0,45) fica livre. |
| **Laço vermelho** | Cantoneira superior esquerda (−1,18; 2,66; 0,09) | `Laco` com escala 0,22 e as pontas da fita caindo 0,18. |
| **Cartão "Boas Festas"** | Canto inferior direito, livre: (0,82; C − 0,42; Z_NOTA + 0,012), 0,46 × 0,30, giro 0,06 | Canvas `creme` com "Boas Festas!" em Caveat 700, raminho de azevinho e uma fita adesiva, a `Fita` existente na cor `FITA.papel`. Não encobre a folha pautada (x de −0,51 a 0,43) nem o post-it (y ≥ C − 0,02). |

### 4.5 /compilacao: Têmis e café (C)

**`NatalTemis`**, dentro do `grupo` de `EstatuaTemis.jsx`, no espaço da estátua antes da escala de 1,3.
A cabeça fica em y 2,33 (r 0,19); a calota do cabelo em (0; 2,37; −0,03); o coque em (0; 2,38; −0,2),
r 0,095; a venda em y 2,34.

| Peça | Onde | Detalhe |
|---|---|---|
| **Gorro de Papai Noel** | Aba (toro R 0,205, tubo 0,045) em (0; 2,47; 0), com `rotation-x` −0,12 para trás | O cone curvo (r 0,19, h 0,34, curvatura 1,6) cai para a **esquerda** (−x). À direita sobem o braço erguido e a folha (`PEGA` (0,8; 2,5; 0,16)). Pompom r 0,055. Vermelho e creme, contrastando com o mármore, como uma estátua "vestida" para o Natal. O topo fica em ≈ 2,80 local (3,64 no mundo), abaixo do losango (TOPO·1,3 + 0,3 = 3,84). |
| **Festão no pedestal** | Em volta do tampo, rente: retângulo arredondado 1,28 × 1,12 em y 0,36 | Pinheiro r 0,035 com bolinhas vermelhas, **sem** barriga na frente: a placa "COMPILAÇÃO" (y 0,21, topo 0,29) continua legível. 12 lâmpadas. |
| A folha | Não mexer | É o quadro de dados. Fica legível e sem enfeite por cima. |

**Como ficou (agente C).** O festão do pedestal são dois `Festao`: a volta pelos lados e pelo fundo (14
bolinhas vermelhas, 9 lâmpadas) e o trecho reto da frente, sem bolinhas (3 lâmpadas), para nada pender
sobre a borda da placa. O cone curvo do gorro está em `Compilacao/cena/natal/gorroTemis.js` (o
`coneCurvo` de 5.2, local para não depender dos gorros de A).

**`NatalCafe`**, dentro do grupo da mesa do café de `CantoDoCafe.jsx` (tampo em y = `altura` 0,78;
cafeteira em (0,38; −0,12); xícaras em (−0,2; 0,12), (−0,42; 0,2), (−0,08; −0,12), (0,05; 0,22);
vaso em (−0,56; −0,18)).

| Peça | Onde (local da mesa) | Detalhe |
|---|---|---|
| **Panetone** | (−0,30; altura; −0,22) | Forma de papel (cilindro r 0,09 h 0,09, borda ondulada) `#C98B4E` + cúpula (meia esfera r 0,095 achatada em 0,7) `#B5733A` + 5 pontinhos de fruta cristalizada. A folga até o vaso e as xícaras é ≥ 0,24. |
| **Raminho na cafeteira** | Laço pequeno (escala 0,1) na alça da jarra, em (0,52; 0,18; −0,08) no mundo da mesa | Detalhe de perto, quando a câmera segue alguém no café. |

### 4.6 /reunioes/<id>: `NatalReuniao` (B)

Medidas de `Reuniao/cena/planta.js`:
- tapete de 7 × 5 m;
- vidro em arco (`ESCALA_ARCO` 0,97, de 164° a 16°, 10 trechos, altura 2,9, moldura 0,09);
- mesa em (0; −0,1), 2,4 × 1,2, altura 0,76;
- quadro em (2,5; −3,55);
- luminária em (−2,6; −3,75);
- pufes p1 (−4,4; −1,5), p6 (−5,25; −0,55) etc.

| Peça | Onde | Por quê / detalhe |
|---|---|---|
| **Árvore** (escala 0,92, h ≈ 1,9) | **(−4,05; −2,85)**, virada para a câmera. Obstáculo r 0,85. | É o canto esquerdo do fundo, entre a luminária e o vidro, que à noite a ilumina com a luz quente dela. A ~1,05 m do vidro (que a ~126° está em (−3,99; −3,92)). Fecha o canto atrás do p1, mas a rota até as cadeiras do fundo passa pela frente do p1 (ver teste 6.2). Tela: (428, 360) a (413, 203), abaixo do título compacto. Presentes A e D encaixados entre a árvore e o vidro. |
| **Festão no vidro** | Em cada trecho de `PAINEIS`, uma barriga do canto superior esquerdo ao direito, no local de cada trecho: `y(u) = 2,78 − 0,18·(1 − (2u − 1)²)`, `z` +0,09 (lado da sala) | 10 barrigas mescladas numa geometria, com 5 lâmpadas por trecho (50 no total). No trecho 8, o do logo (`LOGO` y 1,7, tamanho 1,15), a barriga é menor (0,1) para não encostar no logo. |
| **Guirlanda** | No montante entre os trechos 4 e 5 (x ≈ 0, z ≈ −4,85 + 0,1), centro y 1,85, pendurada por uma fita vermelha até o trilho de cima | Diâmetro 0,55 (toro + 18 "folhas" + 6 bolas + laço embaixo). Fica no eixo da sala, emoldurada pela luminária e pelo quadro, atrás da mesa (tela ≈ (768, 173)). |
| **Neve de spray no vidro** | Nos cantos de baixo dos trechos 0, 2, 7 e 9 (laterais, longe do logo e do centro): plano 0,9 × 0,6 em x local ±(W/2 − 0,45), y 0,42, z +0,015 | Uma textura em canvas só, espelhada com `scale.x = −1`: arco de neve no canto e 4 flocos "estêncil". `MeshBasicMaterial` `neve`, `transparent`, `opacity` 0,85, `depthWrite: false`. Fica no vidro: **não** usa `natural()` nem a camada 1. É a neve decorativa, o enfeite clássico de vitrine. |
| **Luzinhas na paisagem** | Nas árvores 2, 6 e 10 de `ARVORES` (`Paisagem.jsx`), 10 lâmpadas em espiral na copa (r ≈ 0,8·`alt`) | Só com `tema.periodo` em `entardecer` ou `noite`. Lâmpadas com `natural()` (via `prepararMaterial`) e camada `CAMADA_NATUREZA`, aparecendo só dentro do vidro. Dão o clima de "cidade iluminada" sem neve na grama. |
| **Centro de mesa** | No local da mesa: (−0,40; altura; −0,28) | Raminho de pinheiro (3 cápsulas `pinheiro`), 3 bolas (`vermelho`, `ouro`, `creme`) e uma vela `creme` com chama `MeshBasic` `luzQuente`, que tremula ±5% (parada com movimento reduzido). Raio 0,15. Folgas: xícara (−0,85; −0,25) a 0,45, jarra a 0,49. |
| **Quadro da reunião** | Laço vermelho no canto superior esquerdo da moldura: (−W/2 + 0,05; C + H/2 + 0,02; 0,06), com W 2,1, H 1,32 e C 1,78 de `QuadroReuniao.jsx` | Só o laço: a lousa é o título da reunião. |

**Iluminação:** a luz da árvore liga na intensidade de `tema.luminaria ? 1 : 0.5` (mais forte no
entardecer e à noite), sempre montada.

### 4.7 Holograma da home: gorro e flocos (A)

- **Gorro:** aparece sozinho, porque o `Gorro` está dentro da `Figura`. O `BonecoHolografico` percorre
  as malhas no `useLayoutEffect` e troca cada material por uma cópia holográfica (`holografar`). Os
  materiais compartilhados do gorro ficam intactos e as cópias são descartadas na limpeza.
- **Altura:** `ALTURA_FIGURA` (2,08) **não precisa mudar**. Pela regra do envelope (5.3), o gorro fica em
  ≤ 2,09 no mundo, e o corte holográfico chega a 1,12 × 2,08 = 2,33. Conferir na tela o topo do gorro
  durante a materialização.
- **`FlocosHolograficos`:** 8 planos com uma textura de floco de 6 pontas, na cor `COR_HOLO` `#5fe8d6`,
  com as mesmas regras de `aditivo` de `Projetor.jsx`.
  - **Onde:** dentro do cone (raio < 0,8, `RAIO_DISCO` 0,74 × 1,1).
  - **Movimento:** descem de y 2,4 a 0,2 e giram devagar, usando o mesmo ref `tempo` do `Palco`, que já
    para com movimento reduzido.
  - **Tamanho e brilho:** 0,07 a 0,12; opacidade 0,5 × energia.
  - **Por quê:** é o Natal no "idioma" do holograma, sem objetos sólidos.

---

## 5. Gorros dos bonecos (A)

### 5.1 Onde o gorro encaixa

- **A cabeça:** é o grupo `partes.cabeca` da `Figura`, em `position-y` 1,56, com a esfera da cabeça de
  r 0,34 (`G.cabeca`). **É a mesma em todos os bonecos.** A diferença de tamanho vem de `aparencia.altura`
  (0,93 a 1,08), aplicada na raiz por `useComportamento` (`raiz.scale.setScalar(s.escala * altura)`) e
  no `BonecoHolografico` (`escala`). O gorro, dentro do grupo da cabeça, escala junto.
- **Movimento:** o gorro acompanha automaticamente o giro e o balanço da cabeça e a pose de aceno do
  retrato (`rotation-z` −0,08).
- **O que varia:** o **volume do cabelo**. As cascas têm raio de 0,345 a 0,375; o que sobe acima delas
  é o topete (até y 0,44), os cachos (0,44), o coque (0,49) e o coque samurai (0,57).

### 5.2 O primitivo base: `coneCurvo()` (`geometriasGorro.js`, JS puro)

1. Parte de um `ConeGeometry(raioBase, altura, 20, 12, true)` com a base em y = 0.
2. Para cada vértice, com `t = y / altura`, aplica uma **dobra** em torno de um eixo horizontal (direção
   `dir`, ex.: `+x` ou `−z`), com raio de curvatura `R = altura / curva`.
   No plano (u = componente na direção `dir`, y):
   ```
   θ = curva · t
   u' = R − (R − u)·cos θ
   y' = (R − u)·sin θ
   ```
3. Opcionalmente, uma **queda** (`queda`): depois de `t > 0.7`, puxa `y'` para baixo
   `queda·(t − 0.7)²`, como um pano mole.
4. Calcula `computeVertexNormals()` e devolve **também a posição e a tangente da ponta**, para prender o
   pompom ou o sino.

Peças de apoio:

| Peça | Geometria |
|---|---|
| Aba | `TorusGeometry(R, tubo, 10, 32)` com o deslocamento "fofo" de 2.2, deitada (`rotation-x` π/2) |
| Pompom | `IcosahedronGeometry(r, 2)` com ruído |
| Sino | `LatheGeometry` com o perfil de sino (8 pontos) + bolinha badalo |
| Rabo pendurado (gorro caído) | `CapsuleGeometry` afinando + pompom |
| Listras e tricô | Texturas em canvas (UV do cone: `u` ao redor, `v` ao longo) |

As geometrias nascem **uma vez por estilo**, no 1º uso, num cache de módulo, e são compartilhadas por
todos os bonecos.

### 5.3 Regra do envelope (não cortar o retrato)

A lente do rosto em `Retratos.jsx` está em (0; 1,55; 3,3), olha para (0; 1,42; 0), com fov 24. A borda de
cima enxerga até y ≈ 2,116 no plano da cabeça, ou seja, **0,556 acima do centro da cabeça**. Daí:

> **Nenhum ponto do gorro passa de y = 0,53 no espaço da cabeça** (≈ 2,09 no mundo).

Isso vale para o pompom inteiro. Daí os gorros **caídos e dobrados**: a ponta tomba para o lado ou para
trás em vez de subir. O teste (6.1) mede a `boundingBox` de cada estilo. O retrato de corpo inteiro (topo
≈ 2,16) e o holograma (corte até 2,33) cabem com folga.

### 5.4 Encaixe por cabelo (`encaixe.js`)

**Base**, em todos os estilos, no espaço da cabeça:
- aba centrada em y 0,19;
- `rotation-x` −0,22 (inclinada para trás: na testa fica mais alta, na nuca mais baixa);
- aba R 0,33, tubo 0,065;
- cone com raio de base 0,31, começando em y 0,2.

| Estilo de cabelo (`Boneco.jsx`) | `ENCAIXE` (aba) | `CABELO_SOB_GORRO` (o que muda no cabelo) |
|---|---|---|
| `careca`, `raspado`, `degrade`, `degradeLateral` | R × 0,97, y − 0,02 | – |
| `curto`, `longo`, `comprido`, `compridoSemFranja`, `ombro` | R × 1,03 | – (as mechas e o rabo caem por baixo da aba) |
| `degradeMedio` | R × 1,0 | volume de cima (`topete` em (0; 0,25; 0,03)) **escondido** |
| `topete`, `volumoso` | R × 1,06, y + 0,02 | O topete vira franja: `position` (0; 0,17; 0,27), `scale` (1,25; 0,45; 0,75). Aparece por baixo da aba. |
| `coque` | R × 1,03 | Coque baixo: `position` (0; 0,03; −0,33), `scale` 0,85 |
| `samurai` | R × 1,04 (gorros cheios) | Coque baixo (0; 0,1; −0,36) e `peDoCoque` escondido. **Com o `mini`**, nada muda: o coque fica à mostra. |
| `cacheado`, `cacheadoLongo` | R × 1,15, y + 0,04 | Esconde os cachos com ângulo polar ≤ 35° (o do topo e o anel de 35°: 7 cachos). Os outros escapam por baixo da aba, o que fica ótimo. |
| `cachinhos` | R × 1,06 | Esconde os anéis de 0° e 25° (9 cachinhos) |
| `moicano` | R × 1,0 | Crista **escondida** |
| acessório `bone` | – | `semBone: true`: o boné sai, o gorro fica |
| acessório `headset` | R × 1,06 | – (o arco passa por baixo da aba, como na vida real) |
| `oculos` (y 0,04) e barbas | – | – (ficam bem abaixo da aba) |

### 5.5 Os 8 estilos (`catalogo.js`)

As medidas estão no espaço da cabeça. "Curva" é o `curva` de 5.2, e "dir" é para onde a ponta tomba
(o boneco olha para +z).

| Chave | Nome | Construção | Cores |
|---|---|---|---|
| `classico` | Papai Noel clássico | cone r 0,31, h 0,38, curva 1,6, dir +x (cai para a direita); aba fofa; pompom r 0,075 | `vermelho` / aba e pompom `creme` |
| `caido` | Gorro longo caído | cone h 0,50, curva 2,4, dir (−z +x) normalizado, + **rabo pendurado** (cápsula r 0,05→0,03, 0,3 de comprimento) até a altura da orelha, atrás, + pompom r 0,07 que balança | `vermelho`, listra `vermelhoSombra` / `creme` |
| `elfo` | Elfo | cone fino r 0,29, h 0,44, curva 2,2, dir −z (enrola para trás); aba **recortada**: 9 "pétalas" (esferas achatadas) alternando `vermelho` e `creme` no lugar do toro; **sino** dourado r 0,045 na ponta | `elfo` (verde do uniforme) / `ouro` |
| `bengala` | Bengala doce | cone r 0,30, h 0,40, curva 1,3, dir −x; **listras em espiral** (textura canvas 64 × 256, 6 listras diagonais) | `creme` + `vermelho` / pompom `creme` |
| `trico` | Gorro de tricô | **sem cone**: cúpula (meia esfera r 0,36 achatada em 0,78) com textura de ponto em V e **faixa de flocos**; barra dobrada (cilindro r 0,345, h 0,08); pompom grande r 0,1 no topo (centro em y 0,42, topo 0,52) | `pinheiro`, faixa `menta` com flocos `creme` / pompom `creme` |
| `luxo` | Noel veludo e ouro | o `classico` com cone r 0,32, h 0,36, curva 1,7, dir +x; aba um pouco mais grossa (tubo 0,075); pompom `ouroAntigo`, `roughness` 0,6 | `vinho` / aba `ouroAntigo` |
| `mini` | Mini gorro inclinado | `classico` em escala 0,55, com a base fora do centro: (−0,13; 0,32; 0,05), `rotation-z` 0,45, `rotation-x` −0,1 (no alto esquerdo da cabeça); sem esconder cabelo nenhum (exceto o moicano) | `vermelho` / `creme` |
| `casa` | Gorro da casa | o `classico` com curva 1,9 e dir −x; um disquinho com a marca (o `LOGO` de `geometrias.js`, 0,06) na frente da aba | `oliva` (token) / aba `creme` (token) |

### 5.6 Quem usa qual: sorteio fixo e variado (`gorroDe(id)`)

```js
export function gorroDe(id) {
  if (Object.hasOwn(GORROS_POR_PESSOA, id)) return GORROS_POR_PESSOA[id];
  // Pessoa nova (aparência gerada): FNV-1a do id com sal, sempre o mesmo estilo.
  return ESTILOS[hash(`${id}#natal`) % ESTILOS.length];
}
```

- **Por quê:** um hash puro com 21 pessoas e 8 estilos repete o mesmo gorro dentro de uma equipe com
  frequência. Uma tabela curada garante variedade por equipe e casa o gorro com o cabelo.
- **Pessoas novas:** quem não está na tabela cai no hash. É estável: a mesma pessoa tem o mesmo gorro na
  cena, no retrato, no holograma e na reunião.
- **Hash:** é o FNV-1a de `aparencia.js`, que não é exportado. Copie a função para `catalogo.js` (6
  linhas) em vez de exportá-la, para não mexer no módulo base.

| Equipe | id → gorro |
|---|---|
| Suporte | `roberto` classico · `fabio` luxo · `guilherme-p` trico (cacheado com mechas: os cachos escapam por baixo) · `luiz` elfo (careca) |
| Desenvolvimento | `adriano` caido · `antonio` mini (deixa o headset à mostra) · `arnaldo` bengala · `caique` classico · `donizeti` trico (volumoso) · `eduardo` elfo · `guilherme-a` casa (cachinhos) · `gustavo` luxo · `ketlyn` mini (comprido) · `rafael` caido (até o ombro) |
| Compilação | `leonardo` classico · `ramon` elfo · `gdressano` bengala · `glopes` mini (coque samurai à mostra) · `nathalia` luxo · `laura` caido · `damaris` trico (comprido liso) |

- **Suporte e Compilação:** nenhum estilo se repete.
- **Desenvolvimento:** 10 pessoas e 8 estilos; repetem só `classico`, `caido` e `mini`, sempre em pessoas
  com cabelos bem diferentes.
- **Fase do balanço:** `hash(id) % 628 / 100` (radianos).

### 5.7 O componente `Gorro`

- **Uso:** `<Gorro id aparencia />`, dentro do grupo da cabeça, logo depois de `<AcessorioCabeca>`.
- **Montagem:** um `group` com o encaixe (5.4), que contém a aba, o cone ou a cúpula, o pompom (num
  subgrupo com pivô na ponta, que balança) e os extras (sino, rabo, disquinho).
- **Animação:** um `useFrame` por gorro, que só gira o pivô do pompom. Barato: ~25 gorros numa página.
  Com `movimentoReduzido()`, fica em 0.
- **Materiais:** compartilhados (`materialNatal`), nunca descartados por pessoa. Isso combina com
  `useMateriais`, que só descarta os da aparência.
- **Retratos:** `Retratos.jsx` desenha a mesma `Figura`, então o gorro sai no avatar, no retrato de corpo
  inteiro e nos retratos da home (`RetratistaReunioes` usa o mesmo `Retratista`).
- **Cache:** os retratos ficam em cache só até a página recarregar (`useRetratos`, sem localStorage),
  então desligar o Natal não deixa gorro preso em retrato antigo.

---

## 6. Testes, desempenho e acessibilidade

### 6.1 Testes automáticos

Novo arquivo `src/tema/natal/natal.test.mjs`, só com módulos de dados e `three` (que roda em Node),
acrescentado ao script `test:cenario` em `package.json`:

1. **Gorros:**
   - `gorroDe` é determinístico (2 chamadas dão o mesmo resultado);
   - os 21 ids conhecidos estão na tabela;
   - cada equipe tem ≥ min(n, 7) estilos distintos;
   - um id desconhecido cai sempre num estilo válido.
2. **Envelope:** para cada estilo e cada `ENCAIXE`, a `boundingBox` do gorro montado (aplicando posição,
   rotação e escala) tem `max.y ≤ 0,53`.
3. **Árvore no tapete** (`NATAL_CENA` padrão, `NATAL_DEV`, `NATAL_COMPILACAO`, nas duas orientações):
   - sem obstáculo: o centro fica fora da área de caminhada e dentro do tapete;
   - com obstáculo: o círculo fica a ≥ 0,3 m de toda chegada (`aprox`) e de todo assento, de
     `definirEstacoes`/`aplicarPlanta`, e não encosta nas pegadas das mesas;
   - o corredor do quadro aberto (`corredorAberto()`) não cai sobre a árvore.
4. **Reunião:** com o obstáculo da árvore somado, `rotaLivre` (copiada de `cena.test.mjs`) chega a todo
   lugar ativo vindo da frente da sala, com 2, 4, 6 e 12 membros.
5. **Interruptor:** o teste importa `src/tema/natal.js`, mas **não** fixa o valor. O CI passa com `true`
   e com `false`.

Comandos:

```bash
npm run test:cenario      # testes existentes + natal.test.mjs
npm run test:reunioes     # holograma/reuniões (não deve mudar)
npm run build             # tem de passar com NATAL_ATIVO = true e = false
```

**Antes de implementar, confirme a linha de base.** Este plano não rodou nenhum desses comandos (a tarefa
foi só planejar). Rode `npm run test:cenario` e `npm run build` na `main` e guarde o resultado para
comparar.

### 6.2 Verificação visual (uma página por vez: a máquina tem pouca memória)

Prefira `npm run build && npm run preview` a deixar o `dev` aberto com várias abas.

| Onde | O que conferir |
|---|---|
| /suporte (1536×864 e 390×844 retrato) | árvore no fundo esquerdo, abaixo do título; festões nos monitores; quadro com festão, laço e cartão, e o clique e o hover continuam funcionando; ninguém atravessa nada |
| /desenvolvimento | os bonecos contornam a árvore; quem vai para `dev-fundo` senta normalmente; o corredor do quadro abre sem empurrar ninguém para a árvore |
| /compilacao | árvore ao lado do café; o gorro da Têmis não encosta no braço nem na folha; a placa continua legível; o panetone não atravessa xícara nenhuma; o retrato de corpo inteiro (destaque do quadro) com o gorro inteiro |
| /reunioes/<id> | uma reunião de **dia** e uma de **noite** (o horário está em `temaHorario.js`): spray de neve, festão, guirlanda, árvore acesa pela luminária à noite, luzinhas na paisagem só no entardecer e à noite; o teste de rota com 12 membros |
| Home → Reuniões (holograma) | gorro materializando de baixo para cima sem corte no topo; flocos em ciano; o glitch continua normal |
| Cards e avatares | o gorro inteiro dentro do círculo do avatar (sem corte em cima) para os 8 estilos |
| `prefers-reduced-motion: reduce` (DevTools → Rendering) | nada balança, pisca ou gira; as lâmpadas ficam acesas e fixas |
| Desempenho | Chrome Performance Monitor: FPS da vista geral de /desenvolvimento (a página com mais bonecos) no máximo ~5% abaixo do de hoje; `renderer.info.render.calls` e `.triangles` no console, contra o orçamento de 2.3 |
| Natal desligado | `NATAL_ATIVO = false` → as cenas ficam idênticas às de hoje (compare capturas); `git grep -n NATAL_ATIVO` lista só as linhas de 3.3; marcador `natal:arvore` no `dist` (3.5) |

### 6.3 Acessibilidade

- **Movimento reduzido:** respeitado em tudo (2.4).
- **Pisca:** sem flash, abaixo de 3 Hz e em senoide suave.
- **Leitores de tela:** os enfeites são só visuais e não entram no elenco nem nos rótulos. A única
  mudança em texto alternativo é opcional: o `aria-label` do holograma ("Boneco de …") pode continuar
  igual.
- **Contraste:** o cartão "Boas Festas" é decorativo. A informação dos quadros continua sem nada por cima.

### 6.4 Revisão (regra de revisão adversarial)

Cada pacote (A, B, C) é uma mudança de comportamento e passa por **1 revisor independente** (não o
autor) antes de ser dado como pronto.

---

## 7. Divisão do trabalho (3 agentes, arquivos disjuntos)

### Passo 0: base compartilhada (agente C, **antes** de A e B começarem)

Em ~1 bloco curto, nesta ordem:
1. `src/tema/natal.js` (o interruptor);
2. `src/tema/natal/paleta.js`, `materiais.js`, `movimento.js`, `camadas.js` e `obstaculos.js`;
3. `src/tema/natal/pecas/Luzinhas.jsx`, `Festao.jsx` e `Laco.jsx`: as três peças que A, B e C usam.

Os **contratos** (props e exports da seção 4.1) não podem mudar depois do passo 0 sem avisar os outros.

### Depois, em paralelo

| Agente | Arquivos que **só ele** cria ou edita | Entrega |
|---|---|---|
| **A: gorros e holograma** | `src/tema/natal/gorros/**`, `src/pages/Suporte/boneco/Boneco.jsx`, `src/pages/Suporte/boneco/Retratos.jsx` (só o `id` no `Pose`), `src/components/Hero/reunioes/holograma/CenaHolograma.jsx`, `src/components/Hero/reunioes/holograma/natal/**` | Seção 5 e 4.7; testes 1 e 2 de 6.1, num arquivo próprio: `src/tema/natal/gorros/gorros.test.mjs` |
| **B: Suporte, Desenvolvimento e Reunião** | `src/pages/Suporte/cena/EstacoesTrabalho.jsx`, `src/pages/Suporte/cena/natal/**`, `src/pages/Suporte/quadro/Quadro.jsx`, `src/pages/Suporte/quadro/natal/**`, `src/pages/Desenvolvimento/index.jsx`, `src/pages/Desenvolvimento/cena/natal/**`, `src/pages/Reuniao/cena/CenarioReuniao.jsx`, `src/pages/Reuniao/cena/natal/**`, `src/tema/natal/pecas/BicoDePapagaio.jsx`, `src/tema/natal/pecas/Guirlanda.jsx` | Seções 4.3, 4.4 e 4.6; teste 4 de 6.1 em `src/pages/Reuniao/cena/natal/natal.test.mjs`. A árvore da Reunião usa `ArvoreNatal` de C: monte-a por último. |
| **C: Compilação e peças compartilhadas** | Passo 0, `src/tema/natal/pecas/ArvoreNatal.jsx`, `Presente.jsx`, `src/tema/natal/cenario.js`, `NatalCenario.jsx`, `src/pages/Suporte/cena/Cenario.jsx`, `src/pages/Compilacao/index.jsx`, `src/pages/Compilacao/cena/EstatuaTemis.jsx`, `src/pages/Compilacao/cena/CantoDoCafe.jsx`, `src/pages/Compilacao/cena/natal/**`, `src/tema/natal/natal.test.mjs` (testes 3 e 5), `package.json` (scripts de teste, **só ele**) | Seções 4.1, 4.2 e 4.5 |

**Conflitos evitados:**
- `Cenario.jsx` é só de C e `EstacoesTrabalho.jsx` só de B, embora as duas peças apareçam nas 3 páginas.
- A config da árvore de /desenvolvimento (`Desenvolvimento/cena/natal/configNatal.js`) é de B, mas segue
  o formato `NATAL_CENA` de C (contrato do passo 0).
- `package.json` é só de C. A e B pedem a C para incluir os arquivos de teste deles no `test:cenario`.

**Ordem de integração:** passo 0 → A, B e C em paralelo → C junta os scripts de teste → build e visual
(6.2) → revisores independentes (6.4) → um commit por agente. As mensagens em português seguem o padrão
do repositório: `feat: tema de Natal — …`.
