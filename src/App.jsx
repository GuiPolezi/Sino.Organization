import Hero from './components/Hero/Hero.jsx';
import Systems from './components/Systems/Systems.jsx';
import { useLenis } from './hooks/useLenis.js';

export default function App() {
  useLenis();

  return (
    <main>
      <Hero>
        <Systems />
      </Hero>
    </main>
  );
}
