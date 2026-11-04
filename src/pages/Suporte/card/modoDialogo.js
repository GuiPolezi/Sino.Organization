/*
 * Quando o card (e o painel do quadro) é um diálogo no centro da tela, e não fica
 * à direita: em telas estreitas ou baixas. Os números são os das media queries de
 * card/CardTecnico.module.css e Suporte.module.css; mudou aqui, mude lá também.
 */
export const LARGURA_ESTREITA = 760;
export const ALTURA_BAIXA = 480;

/** @param {{ width: number, height: number }} size tamanho da tela (o do <Canvas>) */
export const cardEmDialogo = ({ width, height }) => width <= LARGURA_ESTREITA || height <= ALTURA_BAIXA;
