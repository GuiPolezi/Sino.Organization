import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/inter/latin-900-italic.css';
// Título e cards da home (a arte do Figma usa Libertinus Sans).
import '@fontsource/libertinus-sans/latin-400.css';
import '@fontsource/libertinus-sans/latin-700.css';
import 'lenis/dist/lenis.css';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.jsx';
import Cursor from './components/Cursor/Cursor.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Cursor />
  </StrictMode>,
);
