/*
 * Os tipos de norma de /compilacao, na ordem dos cards, do Quadro e da folha.
 * As chaves são os baldes que o servidor devolve em `porTipo`
 * (scripts/lib/compilacao/tipos.mjs, BALDES): os 6 tipos e "outros" (atos da
 * mesa e da presidência, Lei Orgânica, Lei do Legislativo etc.), para a soma
 * dos tipos dar o total.
 */
export const TIPOS_DE_NORMA = [
  { chave: 'leis', rotulo: 'Leis Ordinárias', cor: '#4FA46B' },
  { chave: 'decretos', rotulo: 'Decretos', cor: '#7FA7D9' },
  { chave: 'resolucoes', rotulo: 'Resoluções', cor: '#F2B632' },
  { chave: 'portarias', rotulo: 'Portarias', cor: '#E58F8F' },
  { chave: 'complementares', rotulo: 'Leis Complementares', cor: '#B79CE0' },
  { chave: 'emendas', rotulo: 'Emendas à Lei Orgânica', curto: 'Emendas', cor: '#6FC3C8' },
  { chave: 'outros', rotulo: 'Outros', cor: null },
];
