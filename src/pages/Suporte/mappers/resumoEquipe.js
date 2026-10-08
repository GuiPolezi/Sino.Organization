/** @import { Tecnico } from '../tipos.js' */

/**
 * Dados da equipe que não saem da lista de técnicos (api/resumoEquipe.js).
 * Tudo é opcional: o quadro e o painel mostram cada parte só quando o dado existe.
 *
 * @typedef {object} ExtrasQuadro
 * @property {boolean} [ficticio]                  dados de demonstração, ainda sem backend
 * @property {number} [atendimentosHoje]
 * @property {number[]} [atendimentosUltimosDias]  do mais antigo até hoje
 * @property {number} [tempoMedioPrimeiraResposta] minutos
 * @property {number} [resolvidosPrimeiroContato]  %
 * @property {number} [satisfacaoClientes]         %
 * @property {string} [atualizadoEm]               data ISO
 * @property {{ abertos: number, emAndamento: number, concluidasMes: number, atrasadas: number }} [chamados]
 *   usados enquanto os técnicos não trazem `tarefas`
 * @property {number} [slaMedio]                   idem, para `slaCumprido`
 * @property {number} [avaliacaoMedia]             idem, para `avaliacaoMedia`
 * @property {{ id: string, concluidasMes: number }[]} [destaques] idem, para o ranking do mês
 */

const FUSO = 'America/Sao_Paulo';
const UM_DIA_MS = 864e5;
const TOTAL_DESTAQUES = 3;
const formatoDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: FUSO });

const soma = (lista, valorDe) => lista.reduce((total, item) => total + valorDe(item), 0);
const media = (lista, valorDe) => soma(lista, valorDe) / lista.length;
// Data ISO que não dá para ler vira null: o painel só mostra a hora quando ela é válida.
const dataValida = (iso) => (typeof iso === 'string' && !Number.isNaN(Date.parse(iso)) ? iso : null);
const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function contarStatus(tecnicos) {
  const status = { disponivel: 0, em_atendimento: 0, ausente: 0 };
  for (const tecnico of tecnicos) {
    if (tecnico.ausente) status.ausente += 1;
    else if (tecnico.status === 'em_atendimento') status.em_atendimento += 1;
    else status.disponivel += 1;
  }
  return status;
}

// Rótulos dos últimos dias: o último valor é o de hoje.
function ultimosDias(valores, agora) {
  return valores.map((valor, i) => {
    const hoje = i === valores.length - 1;
    const data = new Date(agora - (valores.length - 1 - i) * UM_DIA_MS);
    const rotulo = hoje ? 'Hoje' : maiuscula(formatoDiaSemana.format(data).replace('.', ''));
    return { rotulo, valor, hoje };
  });
}

function somarChamados(comTarefas) {
  return {
    abertos: soma(comTarefas, (t) => t.tarefas.abertas),
    emAndamento: soma(comTarefas, (t) => t.tarefas.emAndamento),
    concluidasMes: soma(comTarefas, (t) => t.tarefas.concluidasMes),
    atrasadas: soma(comTarefas, (t) => t.tarefas.atrasadas),
  };
}

// Os técnicos com mais chamados concluídos no mês, só entre os que existem na equipe.
function destaquesDoMes(tecnicos, comTarefas, extras) {
  const candidatos = comTarefas.length
    ? comTarefas.map((t) => ({ id: t.id, nome: t.nome, concluidasMes: t.tarefas.concluidasMes }))
    : (extras.destaques ?? []).flatMap(({ id, concluidasMes }) => {
        const tecnico = tecnicos.find((t) => t.id === id);
        return tecnico ? [{ id, nome: tecnico.nome, concluidasMes }] : [];
      });
  return candidatos.toSorted((a, b) => b.concluidasMes - a.concluidasMes).slice(0, TOTAL_DESTAQUES);
}

/**
 * Visão geral da equipe para o quadro e o painel. O que os técnicos já trazem
 * (chamados, SLA, avaliação) é somado aqui; o que falta vem de `extras`. Campo
 * sem dado sai como null (ou lista vazia) e a parte dele não é desenhada.
 *
 * @param {Tecnico[]} tecnicos
 * @param {ExtrasQuadro | null} [extras]
 */
export function resumoEquipe(tecnicos, extras, agora = Date.now()) {
  const dados = extras ?? {};
  const comTarefas = tecnicos.filter((t) => t.tarefas);
  const comSla = tecnicos.filter((t) => t.slaCumprido !== undefined);
  const comAvaliacao = tecnicos.filter((t) => t.avaliacaoMedia !== undefined);

  return {
    totalTecnicos: tecnicos.length,
    status: contarStatus(tecnicos),
    // Só há "em atendimento" quando os técnicos trazem o status ao vivo.
    temStatusAoVivo: tecnicos.some((t) => t.status !== undefined),
    chamados: comTarefas.length ? somarChamados(comTarefas) : (dados.chamados ?? null),
    slaMedio: comSla.length ? Math.round(media(comSla, (t) => t.slaCumprido)) : (dados.slaMedio ?? null),
    avaliacaoMedia: comAvaliacao.length
      ? media(comAvaliacao, (t) => t.avaliacaoMedia)
      : (dados.avaliacaoMedia ?? null),
    destaques: destaquesDoMes(tecnicos, comTarefas, dados),
    atendimentosHoje: dados.atendimentosHoje ?? null,
    dias: ultimosDias(dados.atendimentosUltimosDias ?? [], agora),
    tempoMedioPrimeiraResposta: dados.tempoMedioPrimeiraResposta ?? null,
    resolvidosPrimeiroContato: dados.resolvidosPrimeiroContato ?? null,
    satisfacaoClientes: dados.satisfacaoClientes ?? null,
    atualizadoEm: dataValida(dados.atualizadoEm),
    ficticio: dados.ficticio === true,
  };
}
