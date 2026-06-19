import { createRoot } from 'react-dom/client';
import { setLanguageConfig } from '@shared/language-registry';
import { initVscodeServices } from './vscode/initServices';
import './styles/app.css';

setLanguageConfig(await window.api.config.language());
await initVscodeServices();
const { App } = await import('./App');

createRoot(document.getElementById('root')!).render(<App />);
