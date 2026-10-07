import { Suspense, lazy } from 'react';
import Clients from './components/Clients/Clients.jsx';
import Hero from './components/Hero/Hero.jsx';
import Systems from './components/Systems/Systems.jsx';
import { useLenis } from './hooks/useLenis.js';

/*
 * Rotas além da home. Cada página é um chunk à parte (o three.js só baixa em
 * /suporte). A navegação entre elas é por link comum, com recarga da página.
 */
const routes = {
  '/suporte': lazy(() => import('./pages/Suporte/index.jsx')),
};

// "/suporte/" e "/Suporte" valem como "/suporte".
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
  const Page = routes[currentPath()];
  if (!Page) return <Home />;

  return (
    <Suspense fallback={<p className="sr-only">Carregando…</p>}>
      <Page />
    </Suspense>
  );
}
