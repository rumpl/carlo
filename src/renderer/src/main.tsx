import { createRoot } from 'react-dom/client';
import { setLanguageConfig } from '@shared/language-registry';
import { initVscodeServices } from './vscode/initServices';
import { installPeekWidgetFixes } from './vscode/peekWidgetFixes';
import './styles/app.css';

setLanguageConfig(await window.api.config.language());
await initVscodeServices();
installPeekWidgetFixes();
const { App } = await import('./App');

createRoot(document.getElementById('root')!).render(<App />);
