# Cálculo do Tempo Médio Diário de Atendimento — Suporte Técnico

Guia de referência para implementar no sistema interno o cálculo do **tempo médio por atendimento no dia**, atualizado em tempo real conforme o técnico registra atendimentos.

---

## 1. Escopo: somente a média diária

> **Requisito principal:** o sistema deve calcular e exibir **apenas a média diária** de cada técnico.
>
> O protótipo feito no Claude (artefato "Contador de Atendimentos") também mostra médias de **semana** e **mês**. Elas serviram só para demonstração e **não devem ser implementadas**.

Contagens de semana e mês podem continuar existindo como totais simples de atendimentos, se forem úteis. Mas **não é necessário calcular tempo médio para esses períodos**.

---

## 2. O que o cálculo mede

O resultado é o **tempo disponível por atendimento**: quanto tempo de expediente o técnico teve, em média, para cada atendimento feito no dia.

Ele **não** mede a duração real de cada atendimento, porque não há registro de início e fim. O valor inclui intervalos entre chamados, pausas curtas e outras tarefas. Por isso, deve ser lido como um **indicador de ritmo**, não como cronômetro.

---

## 3. Fórmula

```
Tempo médio do dia (min) = Minutos trabalhados até agora ÷ Atendimentos registrados hoje
```

- **Minutos trabalhados até agora:** tempo entre o início do expediente e o horário atual, descontando o almoço e limitado ao fim do expediente.
- **Atendimentos registrados hoje:** quantidade de cliques em "+1" do técnico na data de hoje, no horário de Brasília.

O valor é recalculado:
- a cada novo atendimento registrado (+1 ou desfazer);
- periodicamente com o passar do tempo. No protótipo, isso acontece a cada 15 segundos.

---

## 4. Horário de referência: Brasília

Todo cálculo usa o fuso **America/Sao_Paulo** (UTC−03:00), não o relógio do computador do usuário nem o UTC do servidor.

- **Registro:** grave o momento do atendimento em UTC (timestamp) e também a **data local de Brasília** (`AAAA-MM-DD`). A data local é o que define a que dia o atendimento pertence.
- **Cálculo:** converta o horário atual para Brasília antes de calcular os minutos trabalhados.
- **Virada do dia:** à meia-noite de Brasília, a contagem do dia volta a zero automaticamente, porque o filtro passa a ser a nova data.

---

## 5. Cadastro de expediente por técnico

Cada técnico tem o próprio expediente. Campos necessários:

| Campo | Exemplo (você) | Exemplo (colega) | Descrição |
|---|---|---|---|
| `inicio` | 08:00 | 09:00 | Início do expediente |
| `fim` | 17:00 | 18:00 | Fim do expediente |
| `almoco_inicio` | 12:00 | 12:00 | Horário em que o almoço começa (ajustar ao real) |
| `almoco_min` | 60 | 60 | Duração do almoço em minutos |

Jornada de 9 horas no total, sendo **8 horas de trabalho efetivo** e 1 hora de almoço.

> O horário de almoço dos dois foi colocado às 12:00 como suposição. Confirme o horário real de cada técnico antes de implementar, porque ele afeta a média durante o dia.

---

## 6. Como as horas de expediente são analisadas

Todos os horários são convertidos para **minutos desde a meia-noite** (ex.: 08:00 → 480, 12:00 → 720, 17:00 → 1020).

**Passo a passo para obter os minutos trabalhados até agora:**

1. **Limitar o horário atual ao expediente**
   `fim_considerado = mínimo(agora, fim)`, e nunca menor que `inicio`.
   - Antes do início: resultado 0.
   - Depois do fim: o tempo para de crescer no fim do expediente.

2. **Calcular quanto do almoço já passou**
   `almoco_fim = almoco_inicio + almoco_min`
   `almoco_decorrido = máximo(0, mínimo(fim_considerado, almoco_fim) − máximo(inicio, almoco_inicio))`
   - Antes do almoço: 0.
   - Durante o almoço: desconta só a parte que já passou, então a média fica "congelada".
   - Depois do almoço: desconta o almoço inteiro.

3. **Minutos trabalhados**
   `trabalhados = fim_considerado − inicio − almoco_decorrido`

### Pseudocódigo

```text
função minutosTrabalhados(tecnico, agoraMin):
    ini   = paraMinutos(tecnico.inicio)
    fim   = paraMinutos(tecnico.fim)
    aIni  = paraMinutos(tecnico.almoco_inicio)
    aFim  = aIni + tecnico.almoco_min

    fimConsiderado = máximo(ini, mínimo(agoraMin, fim))
    almoco = máximo(0, mínimo(fimConsiderado, aFim) − máximo(ini, aIni))
    retorna máximo(0, fimConsiderado − ini − almoco)

função tempoMedioDiario(tecnico):
    agora       = horaAtualEmBrasilia()            // em minutos desde 00:00
    hoje        = dataAtualEmBrasilia()            // 'AAAA-MM-DD'
    atendimentos = contar(registros onde tecnico = tecnico.id e data = hoje)
    minutos     = minutosTrabalhados(tecnico, agora)

    se atendimentos == 0: retorna "—"
    retorna minutos / atendimentos
```

---

## 7. Exemplos de validação

Use estes casos como testes da implementação.

**Técnico 1:** expediente 08:00–17:00, almoço 12:00 (60 min)

| Horário atual | Atendimentos hoje | Minutos trabalhados | Tempo médio |
|---|---|---|---|
| 07:30 | 0 | 0 | — (expediente não iniciado) |
| 10:12 | 4 | 132 | **33 min** |
| 12:30 | 10 | 240 (só 30 min de almoço descontados) | **24 min** |
| 15:00 | 12 | 360 | **30 min** |
| 18:00 | 16 | 480 (limitado ao fim) | **30 min** |

**Técnico 2:** expediente 09:00–18:00, almoço 12:00 (60 min)

| Horário atual | Atendimentos hoje | Minutos trabalhados | Tempo médio |
|---|---|---|---|
| 08:45 | 0 | 0 | — (expediente não iniciado) |
| 10:12 | 3 | 72 | **24 min** |
| 14:00 | 8 | 240 | **30 min** |

---

## 8. Regras de exibição

- **Nenhum atendimento no dia:** mostrar "—", nunca dividir por zero.
- **Formato:** abaixo de 60 min, mostrar em minutos (`33 min`). A partir de 60 min, mostrar em horas e minutos (`1h 05 min`).
- **Status do técnico**, opcional mas útil: "Antes do expediente", "Em expediente", "Em almoço", "Expediente encerrado".
- **Desfazer:** remover o último atendimento do técnico **no dia de hoje**, para corrigir cliques a mais.

---

## 9. Modelo de dados sugerido

**Tabela `tecnicos`**

| Coluna | Tipo | Exemplo |
|---|---|---|
| id | texto/inteiro | `eu` |
| nome | texto | `Eu` |
| inicio | hora | `08:00` |
| fim | hora | `17:00` |
| almoco_inicio | hora | `12:00` |
| almoco_min | inteiro | `60` |

**Tabela `atendimentos`** (um registro por clique em "+1")

| Coluna | Tipo | Exemplo |
|---|---|---|
| id | identificador | — |
| tecnico_id | referência | `eu` |
| registrado_em | data/hora UTC | `2026-10-08T13:12:00Z` |
| data_brasilia | data | `2026-10-08` |

A consulta do dia fica simples: `contar atendimentos onde tecnico_id = X e data_brasilia = hoje`.

---

## 10. Limitações conhecidas

- **Expediente que atravessa a meia-noite** não é tratado. A regra assume início e fim no mesmo dia.
- **Mudança de expediente no meio do dia** passa a valer para o dia inteiro, porque o cálculo usa o cadastro atual.
- **Saídas fora do almoço** (reuniões, treinamentos, consultas médicas) entram como tempo trabalhado e aumentam a média. Se isso for frequente, considere um campo de "pausas extras" a descontar.
- **Feriados e folgas** não afetam a média diária: sem atendimentos no dia, o resultado é "—".
