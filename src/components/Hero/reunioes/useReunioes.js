import { useCallback, useMemo, useState } from 'react';
import { criarReuniao, ordenarReunioes, removerReuniao } from './reunioes.js';
import { carregarReunioes, salvarReunioes } from './reunioesRepo.js';

// Estado das reuniões + persistência. Para novas ações (editar, cancelar...),
// adicione aqui seguindo o padrão: regra pura em reunioes.js, depois persistir.
export function useReunioes() {
  const [lista, setLista] = useState(() => carregarReunioes());

  // Atualiza estado e grava (gravar duas vezes no StrictMode é inofensivo).
  const aplicar = useCallback((transformar) => {
    setLista((atual) => {
      const nova = transformar(atual);
      salvarReunioes(nova);
      return nova;
    });
  }, []);

  const criar = useCallback(
    (dados) => {
      const resultado = criarReuniao(dados);
      if (resultado.ok) aplicar((atual) => [...atual, resultado.reuniao]);
      return resultado;
    },
    [aplicar],
  );

  const remover = useCallback(
    (id) => aplicar((atual) => removerReuniao(atual, id)),
    [aplicar],
  );

  const reunioes = useMemo(() => ordenarReunioes(lista), [lista]);

  return { reunioes, criar, remover };
}
