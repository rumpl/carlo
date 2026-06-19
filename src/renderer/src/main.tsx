import { createRoot } from 'react-dom/client';
import { initVscodeServices } from './vscode/initServices';
import './styles/app.css';

await initVscodeServices();
const { App } = await import('./App');

createRoot(document.getElementById('root')!).render(<App />);
