import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// index.css first: design tokens and base styles must precede component CSS
// so same-specificity overrides in component files win the cascade.
import './index.css';
// Shared page chrome + dialog styles, still before route code so page-level
// CSS can override them when needed.
import './pages/pages.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
