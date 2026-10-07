import Hero from './components/Hero/Hero.jsx';
import PlaceholderPanel from './components/PlaceholderPanel/PlaceholderPanel.jsx';
import { useLenis } from './hooks/useLenis.js';

export default function App() {
  useLenis();

  return (
    <main>
      <Hero>
        <PlaceholderPanel />
      </Hero>
    </main>
  );
}
