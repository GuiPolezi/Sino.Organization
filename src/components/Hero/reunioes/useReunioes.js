import { useCallback, useEffect, useMemo, useState } from 'react';
import { criarReuniao, editarReuniao, ordenarReunioes, removerReuniao } from './reunioes.js';
import {
  apagarReuniaoNoServidor,
  enviarEdicaoReuniao,
  enviarNovaReuniao,
  listarReunioes,
  migrarReunioesLocais,
} from './reunioesRepo.js';

/*
 * Estado das reuniões, vindas do servidor. Criar, editar e remover mudam a
 * tela na hora (com as mesmas regras de reunioes.js) e gravam em segundo
 * plano; se o servidor recusar, a lista volta ao que está gravado lá e `erro`
 * explica o que aconteceu. Para novas ações, siga o padrão: regra pura em
 * reunioes.js, mudança local e envio ao servidor (com como desfazer).
 */
export function useReunioes() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // `manterAviso`: depois de uma gravação que falhou, o aviso dela continua na tela.
  const recarregar = useCallback(async ({ manterAviso = false } = {}) => {
    try {
      setLista(await listarReunioes());
      return true;
    } catch (e) {
      if (!manterAviso) setErro(`Não foi possível carregar as reuniões. ${e.message}`);
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    migrarReunioesLocais()
      .catch(() => {})
      .then(() => ativo && recarregar());
    return () => {
      ativo = false;
    };
  }, [recarregar]);

  // Grava em segundo plano. Se falhar: avisa e relê a lista do servidor; se nem
  // isso der (sem conexão), `desfazer` volta a tela ao que era antes da mudança.
  const enviar = useCallback(
    (promessa, falhou, desfazer) => {
      promessa.catch(async (e) => {
        setErro(`${falhou} ${e.message}`);
        if (!(await recarregar({ manterAviso: true }))) setLista(desfazer);
      });
    },
    [recarregar],
  );

  const criar = useCallback(
    (dados) => {
      const resultado = criarReuniao(dados);
      if (resultado.ok) {
        const { reuniao } = resultado;
        setErro(null);
        setLista((atual) => [...atual, reuniao]);
        enviar(enviarNovaReuniao(reuniao), 'A reunião não foi salva.', (atual) =>
          removerReuniao(atual, reuniao.id),
        );
      }
      return resultado;
    },
    [enviar],
  );

  // Valida contra a lista atual; se ok, troca a reunião e envia.
  const editar = useCallback(
    (id, dados) => {
      const resultado = editarReuniao(lista, id, dados);
      if (resultado.ok) {
        const original = lista.find((r) => r.id === id);
        const trocarPor = (reuniao) => (atual) => atual.map((r) => (r.id === id ? reuniao : r));
        setErro(null);
        setLista(trocarPor(resultado.reuniao));
        enviar(enviarEdicaoReuniao(resultado.reuniao), 'A alteração não foi salva.', trocarPor(original));
      }
      return resultado;
    },
    [lista, enviar],
  );

  const remover = useCallback(
    (id) => {
      const removida = lista.find((r) => r.id === id);
      setErro(null);
      setLista((atual) => removerReuniao(atual, id));
      enviar(apagarReuniaoNoServidor(id), 'A reunião não foi removida.', (atual) =>
        removida && !atual.some((r) => r.id === id) ? [...atual, removida] : atual,
      );
    },
    [lista, enviar],
  );

  const reunioes = useMemo(() => ordenarReunioes(lista), [lista]);
  const limparErro = useCallback(() => setErro(null), []);

  return { reunioes, criar, editar, remover, carregando, erro, limparErro };
}
