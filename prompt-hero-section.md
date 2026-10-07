# PROJETO: Landing page sino.org — Sino Informática

## Seu papel
Você é um desenvolvedor front-end sênior, especialista em React, animações com GSAP e design minimalista. Seu trabalho é transformar com fidelidade de pixel um design que já está pronto em código limpo, performático e bem componentizado.

## Como vamos trabalhar (IMPORTANTE)
A landing page será desenvolvida SEÇÃO POR SEÇÃO, para garantir excelência em cada parte. Para cada seção, siga este fluxo:

1. **Ler**: analise com atenção a imagem de referência da seção que eu anexar com @. Observe hierarquia, espaçamentos, proporções, alinhamentos, pesos de fonte, cores e elementos decorativos.
2. **Planejar**: antes de escrever qualquer código, me apresente um plano curto com:
   - a estrutura de componentes (árvore de arquivos);
   - as medidas e o layout que você extraiu da imagem (grid, tamanhos de fonte em clamp(), espaçamentos);
   - as animações que vai criar e com qual técnica GSAP;
   - as dúvidas ou ambiguidades que encontrou no design.
3. **Desenvolver**: implemente só a seção atual.
4. **Revisar**: compare o resultado com a imagem de referência, corrija as diferenças e me entregue um resumo do que foi feito.
5. **Parar e aguardar**: não comece a próxima seção até eu enviar a próxima imagem.

Nesta etapa, desenvolva APENAS a **Hero Section**.

---

## Stack técnica
- **React + Vite** (o site não tem back-end, é 100% front-end).
- **GSAP 3** com os plugins **ScrollTrigger** e **@gsap/react** (use o hook `useGSAP()` para criar e limpar as animações corretamente no React).
- Todas as animações devem ser feitas com GSAP. Não use Framer Motion nem transições CSS para movimentos principais. CSS só para estados simples, se necessário.
- CSS Modules ou CSS puro organizado por componente, com variáveis CSS globais para os tokens de design.
- Estrutura sugerida:

```
src/
  assets/
    fonts/        (Inter Regular, Bold, Black)
    images/       (banners_site_fachada2 + imagens placeholder)
  components/
    Hero/
      Hero.jsx
      Hero.module.css
      CompanyCard.jsx
      YearsCounter.jsx
      SectorsList.jsx
      ImageReveal.jsx
  styles/
    tokens.css
    global.css
  utils/
    getYearsSince.js
  App.jsx
```

## Identidade do site
- Nome do site: **sino.org** (use no `<title>` e nas meta tags).
- Empresa: **Sino Informática**, fundada em **1989**.

## Tipografia
- Fonte única: **Inter**, nas variantes **Regular (400)**, **Bold (700)** e **Black (900)**.
- Carregue a fonte via `@font-face` com os arquivos locais em `src/assets/fonts/`. Se os arquivos não estiverem lá, use o Google Fonts como alternativa temporária e me avise.
- Use `font-display: swap`.

## Paleta de cores (tokens obrigatórios)

```css
:root {
  --color-white: #FFFFFF;
  --color-olive: #606C38;      /* fundo principal */
  --color-cream: #FEFAE0;      /* títulos, números, destaques */
  --color-olive-dark: #3B4726; /* elementos decorativos, linhas, sombras */
}
```

Não use cores fora dessa paleta. Para variações (textos secundários como "Desde 1989" e "Setores"), use as cores da paleta com opacidade.

---

## HERO SECTION: especificação

Referência visual: @imagem1.png
Imagem do card: @imagem2.png

Leia a imagem da hero com atenção antes de planejar. A descrição abaixo complementa a imagem, mas **a imagem é a fonte da verdade** para layout e proporções.

### 1. Fundo
- Cor de fundo: `--color-olive` (#606C38).
- No canto inferior direito há um elemento decorativo grande, com cantos arredondados (formato de seta ou chevron), na cor `--color-olive-dark` (#3B4726), cortado pelas bordas da tela. Recrie esse elemento como **SVG** para manter a nitidez em qualquer resolução.

### 2. Card "Sino Informática" (canto superior esquerdo)
- Card com bordas bem arredondadas (cerca de 24px) e sombra suave.
- Imagem de fundo: `banners_site_fachada2`, com `object-fit: cover`.
- Sobreposição escura/oliva sobre a imagem para garantir o contraste do texto (gradiente sutil usando `--color-olive-dark` com opacidade).
- Conteúdo (em `--color-white`):
  - Título **"Sino Informática"** em Inter Black, bem grande, com entrelinha apertada (cerca de 0.85) e letter-spacing levemente negativo. O título ocupa quase toda a largura do card.
  - "Endereço: R. Cezira Giovanoni Moretti, 905 - Santa Rosa" em Inter Regular.
  - "Segunda a Sexta" e "8h às 18h" em duas linhas, Inter Regular.
  - Link **"Clique aqui para acessar site oficial"**: este link mantém o sublinhado, como no design. Deixe o `href` como placeholder (`#`) e abra em nova aba (`target="_blank" rel="noopener noreferrer"`).

### 3. Contador "Anos de História" (canto superior direito)
- Número grande em Inter Black, cor `--color-cream`.
- Ao lado do número: "Anos de" / "História" em duas linhas, Inter Regular, cor `--color-cream`.
- Abaixo: "Desde 1989" em tamanho pequeno, cor creme com opacidade reduzida.
- **O cálculo DEVE ser automático e dinâmico**:

```js
// utils/getYearsSince.js
export const FOUNDING_YEAR = 1989;
export const getYearsSince = (year = FOUNDING_YEAR) =>
  new Date().getFullYear() - year;
```

- Nada de número fixo no código: o valor tem que mudar sozinho a cada virada de ano.
- Animação: ao carregar a página, o número conta de 0 até o valor final com GSAP (tween de um objeto `{ value: 0 }` com `snap: { value: 1 }` e `ease: "power3.out"`, cerca de 2s), atualizando o texto no `onUpdate`.

### 4. Setores (metade inferior esquerda)
- Rótulo **"Setores"** em Inter Bold, tamanho pequeno, cor creme com opacidade reduzida.
- Três itens: **DESENVOLVIMENTO**, **SUPORTE** e **LICENÇAS**.
  - Inter Black, caixa alta, cor `--color-cream`, tamanho grande e responsivo (use `clamp()`).
  - À esquerda de cada item há uma linha horizontal fina (1px) na cor `--color-olive-dark`, alinhada ao meio vertical do texto, como na imagem.
- **São links clicáveis para outras páginas** (`/desenvolvimento`, `/suporte`, `/licencas`). Use `<a>` (ou o `<Link>` do React Router, se você configurar rotas) com placeholders por enquanto.
- **Remova completamente o estilo padrão de link**: sem sublinhado, sem cor azul ou roxa de visitado, `text-decoration: none`, `color: inherit` em todos os estados (`:link`, `:visited`, `:hover`, `:active`). Mantenha um `:focus-visible` discreto e elegante para acessibilidade (outline creme fino com offset).
- Microinteração sugerida no hover (sutil e elegante): a linha à esquerda cresce em largura (scaleX com GSAP) e o texto se desloca alguns pixels para a direita.

### 5. Efeito de imagem no hover dos setores (Image Reveal Hover, Efeito 2)
Referência: https://tympanus.net/Development/ImageRevealHover/ (efeito nº 2). O código original está em anexo @[ImageRevealHover-master.zip]. Abaixo está a lógica exata do efeito 2, que deve ser **portada para React + GSAP 3** (o original usa TweenMax/TimelineMax, uma versão antiga).

**Estrutura do elemento revelado:**

```html
<div class="hover-reveal">          <!-- position: fixed; pointer-events: none; opacity: 0; ~200x150px (ajuste a proporção ao design) -->
  <div class="hover-reveal__inner"> <!-- overflow: hidden; width/height: 100% -->
    <div class="hover-reveal__img"/> <!-- background-size: cover; background-position: center -->
  </div>
</div>
```

**Comportamento:**
- **mouseenter**: posiciona o reveal no cursor (`x + 20px`, `y + 20px`) e executa o showImage.
- **mousemove**: atualiza a posição seguindo o mouse. Use `gsap.quickTo()` para o movimento ficar fluido e levemente "atrasado" (duração de cerca de 0.4s, `ease: "power3"`).
- **mouseleave**: executa o hideImage.

**showImage** (duração de 0.4s, `ease: "power4.out"`, que equivale ao Quint.easeOut original; antes, mate os tweens em andamento com `gsap.killTweensOf`):
- `.hover-reveal` com `opacity: 1`.
- `.hover-reveal__inner`: de `xPercent: -100, yPercent: -100` para `xPercent: 0, yPercent: 0`.
- `.hover-reveal__img`: de `xPercent: 100, yPercent: 100` para `xPercent: 0, yPercent: 0`.
- As duas animações começam ao mesmo tempo. Esse movimento em direções opostas cria o efeito de "máscara diagonal" característico do efeito 2.

**hideImage** (duração de 0.3s, `ease: "power4.out"`):
- `.hover-reveal__inner` para `xPercent: 100, yPercent: 100`.
- `.hover-reveal__img` para `xPercent: -100, yPercent: -100`.
- No `onComplete`: `opacity: 0` no reveal.

**Imagens:** por enquanto, use imagens fictícias de placeholder (por exemplo `https://picsum.photos/seed/desenvolvimento/400/300`, `.../suporte/...` e `.../licencas/...`). Centralize-as em um único array de configuração, para eu trocar facilmente depois:

```js
const sectors = [
  { label: "DESENVOLVIMENTO", href: "/desenvolvimento", image: "..." },
  { label: "SUPORTE",         href: "/suporte",         image: "..." },
  { label: "LICENÇAS",        href: "/licencas",        image: "..." },
];
```

⚠️ **Ponto técnico crítico:** como a hero vai se mover horizontalmente (com `transform`), um elemento `position: fixed` dentro dela deixa de se posicionar em relação à viewport. **Renderize o `.hover-reveal` via `createPortal` no `document.body`**, para ele sempre seguir o cursor corretamente.

- Desative o efeito em dispositivos touch (`(hover: none)`), onde o hover não existe.

### 6. Scroll horizontal da Hero
- Ao rolar a página, a hero **não deve rolar verticalmente como um scroll normal**: ela deve se **mover horizontalmente**.
- Implemente com **ScrollTrigger**: a seção é fixada (`pin: true`) e um "track" interno é animado no eixo X conforme o scroll (`scrub: 1` para ficar suave e amortecido).
- Calcule a distância horizontal dinamicamente (`track.scrollWidth - window.innerWidth`) usando valores funcionais e `invalidateOnRefresh: true`, para funcionar em qualquer resolução e ao redimensionar a janela.
- Elementos internos podem ter leve parallax durante o movimento horizontal (por exemplo, o shape decorativo e o número de anos se movendo em velocidades diferentes, usando `containerAnimation` do ScrollTrigger). Seja sutil.
- Deixe a estrutura preparada para que a **próxima seção** possa continuar no mesmo track horizontal ou retomar o scroll vertical. Me pergunte qual prefiro quando chegarmos lá.
- Opcional, mas recomendado: scroll suave com **Lenis** integrado ao ticker do GSAP (`gsap.ticker`), para uma sensação premium.

### 7. Animação de entrada (ao carregar a página)
Crie uma timeline GSAP de entrada elegante e orquestrada:
1. O card surge com reveal de máscara (`clip-path` de inset total para zero) e a imagem interna faz um leve zoom-out (scale 1.2 → 1).
2. O título "Sino Informática" entra palavra por palavra ou linha por linha, de baixo para cima, com overflow hidden (`yPercent: 100 → 0`, stagger, `ease: "expo.out"`).
3. As informações do card aparecem com fade e um leve deslocamento.
4. O contador de anos começa a contar.
5. "Setores" e os três links entram em stagger. As linhas à esquerda crescem com `scaleX: 0 → 1` (transform-origin à esquerda).
6. O shape decorativo entra suavemente pelo canto.

Durações entre 0.8s e 1.4s, eases `expo.out` e `power3.out`. Nada brusco. Tudo deve parecer fluido, refinado e minimalista.

---

## Requisitos de qualidade
- **Fidelidade visual**: o resultado deve ficar praticamente idêntico à imagem de referência em desktop (1440px).
- **Responsividade**: adapte para tablet e mobile. No mobile, avalie desativar o scroll horizontal (use `gsap.matchMedia()`) e empilhar os elementos verticalmente, mantendo a elegância.
- **Acessibilidade**: HTML semântico (`<section>`, `<h1>`, `<nav aria-label="Setores">`), `alt` nas imagens, foco visível e contraste adequado.
- **prefers-reduced-motion**: respeite essa preferência com `gsap.matchMedia()`, reduzindo ou removendo animações para quem a ativar.
- **Performance**: anime somente `transform` e `opacity` (e `clip-path` na entrada), use `will-change` com moderação, faça o cleanup de todos os ScrollTriggers e listeners (o `useGSAP` cuida disso) e otimize a imagem do card (WebP, `loading` adequado).
- **Código limpo**: componentes pequenos e reutilizáveis, sem números mágicos espalhados e comentários só onde agregam.

## Critérios de aceite da Hero
- [ ] Layout fiel à imagem de referência.
- [ ] Fonte Inter (400/700/900) aplicada corretamente.
- [ ] Apenas as 4 cores da paleta utilizadas.
- [ ] Anos de história calculados dinamicamente a partir de 1989.
- [ ] Links de setores sem nenhum estilo padrão de link.
- [ ] Image reveal (efeito 2) funcionando e seguindo o mouse com suavidade.
- [ ] Scroll horizontal com pin e scrub suave.
- [ ] Animação de entrada orquestrada.
- [ ] Responsivo, acessível e com suporte a reduced motion.

Comece lendo a imagem da Hero Section e me apresente o **plano** antes de desenvolver.
