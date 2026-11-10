import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/noto-sans-tamil';
import '@fontsource-variable/fraunces';
import '@fontsource/noto-serif-tamil/tamil-400.css';
import '@fontsource/noto-serif-tamil/tamil-600.css';
import './design/tokens.css';
import './design/base.css';
import './design/glass.css';
import './app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
