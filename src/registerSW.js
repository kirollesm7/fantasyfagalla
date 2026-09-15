// Explicit SW registration — no plugin magic, so it's easy to verify this is
// actually happening (check the browser console for these log lines, or
// DevTools → Application → Service Workers).
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] service workers not supported in this browser');
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] registered, scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] registration failed:', err);
      });
  });
}
