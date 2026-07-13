import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/app.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}

// Surface any uncaught async/global error on screen too — WKWebView has no console we can open, so a
// pre-mount throw (module load, firebase init) would otherwise just show a black screen.
const showGlobalError = (msg: string) => {
  const el = document.createElement('pre');
  el.textContent = `Uncaught: ${msg}`;
  el.style.cssText =
    'position:fixed;inset:0;z-index:9999;margin:0;padding:16px;overflow:auto;background:#0a0a0b;color:#fca5a5;font:12px/1.4 monospace;white-space:pre-wrap;word-break:break-word';
  document.body.appendChild(el);
};
window.addEventListener('error', e => showGlobalError(e.message + (e.error?.stack ? `\n${e.error.stack}` : '')));
window.addEventListener('unhandledrejection', e => showGlobalError(String(e.reason?.stack ?? e.reason)));

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
