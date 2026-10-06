import { spawn } from 'node:child_process';
const run = (cmd, env = {}) => spawn(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
await new Promise((r) => run('node scripts/build-electron.mjs').on('exit', r));
const vite = run('npx vite --port 5173 --strictPort');
const electron = run('npx wait-on tcp:5173 && npx electron .', { VITE_DEV_SERVER_URL: 'http://localhost:5173' });
electron.on('exit', () => { vite.kill(); process.exit(0); });
