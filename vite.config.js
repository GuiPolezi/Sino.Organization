import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Em `npm run dev` e `npm run preview`, atende /api/* com as mesmas rotas das
// funções da Vercel (server/api.mjs). O código roda só no Node, nunca no navegador.
function apiLocal() {
  const middleware = async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    try {
      const { tratarApi } = await import('./server/api.mjs');
      const resposta = await tratarApi(new Request(new URL(req.url, 'http://localhost'), { method: req.method }));
      res.statusCode = resposta.status;
      resposta.headers.forEach((valor, nome) => res.setHeader(nome, valor));
      res.end(Buffer.from(await resposta.arrayBuffer()));
    } catch (erro) {
      next(erro);
    }
  };
  return {
    name: 'api-local',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig(({ mode }) => {
  // Leva o .env para o process.env do servidor (chaves do Milldesk, Sino.Licença e
  // Supabase). Só variáveis VITE_* chegariam ao navegador, e não usamos nenhuma.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), apiLocal()] };
});
