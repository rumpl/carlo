import { createRoot } from 'react-dom/client';
import { setLanguageConfig } from '@shared/language-registry';
import { App } from './App';
import { ensureVscodeServices } from './vscode/servicesReady';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(<App />);

void window.api.config.language().then(setLanguageConfig).catch(console.error);
window.setTimeout(() => {
  void ensureVscodeServices()
    .then(() => import('./vscode/peekWidgetFixes'))
    .then(({ installPeekWidgetFixes }) => installPeekWidgetFixes())
    .catch(console.error);
}, 0);
