import { Suspense, lazy } from 'react';
import Clients from './components/Clients/Clients.jsx';
import Hero from './components/Hero/Hero.jsx';
import Systems from './components/Systems/Systems.jsx';
import { useLenis } from './hooks/useLenis.js';

/*
 * Rotas além da home. Cada página é um chunk à parte (o three.js só baixa em
 * /suporte e /desenvolvimento). A navegação entre elas é por link comum, com recarga da página.
 */
const routes = {
  '/suporte': lazy(() => import('./pages/Suporte/index.jsx')),
  '/desenvolvimento': lazy(() => import('./pages/Desenvolvimento/index.jsx')),
  '/licencas': lazy(() => import('./pages/Licencas/index.jsx')),
};
const NotFound = lazy(() => import('./pages/NotFound/index.jsx'));

// Página da licença de cada cliente: /licencas/<slug>.
const CLIENTE_LICENCA = /^\/licencas\/([a-z0-9-]+)$/;
const ClienteLicenca = lazy(() => import('./pages/Licencas/Cliente.jsx'));

const HOME_PATHS = ['', '/index.html'];

// "/suporte/" e "/Suporte" valem como "/suporte"; "/" vira "".
const currentPath = () => window.location.pathname.replace(/\/+$/, '').toLowerCase();

function Home() {
  useLenis();

  return (
    <main>
      <Hero>
        <Systems />
      </Hero>
      <Clients />
    </main>
  );
}

export default function App() {
  const path = currentPath();
  if (HOME_PATHS.includes(path)) return <Home />;

  const cliente = path.match(CLIENTE_LICENCA);
  if (cliente) {
    return (
      <Suspense fallback={<p className="sr-only">Carregando…</p>}>
        <ClienteLicenca slug={cliente[1]} />
      </Suspense>
    );
  }

  // Object.hasOwn: "/constructor" e afins não podem cair numa chave herdada.
  const Page = Object.hasOwn(routes, path) ? routes[path] : NotFound;

  return (
    <Suspense fallback={<p className="sr-only">Carregando…</p>}>
      <Page />
    </Suspense>
  );
}
