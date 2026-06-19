import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initVscodeServices } from './vscode/initServices';
import './styles/app.css';

await initVscodeServices();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
