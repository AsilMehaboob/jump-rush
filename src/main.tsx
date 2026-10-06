import '@fontsource/lilita-one/400.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import { createRoot } from 'react-dom/client';
import { APP_CONFIG } from './config/appConfig';
import { THEMES } from './config/theme';
import { App } from './App';
import './styles.css';

const theme = THEMES[APP_CONFIG.theme];
const root = document.documentElement.style;
for (const [k, v] of Object.entries(theme.ui)) root.setProperty(`--c-${k}`, v);
root.setProperty('--c-sky-top', theme.world.skyTop);
root.setProperty('--c-sky-bottom', theme.world.skyBottom);

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
