'use strict';
// Registra o app (service worker) e liga os botões "Instalar o app" das páginas.
(() => {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let prompt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; document.dispatchEvent(new Event('vp:installable')); });
  window.VPApp = {
    standalone,
    canPrompt: () => !!prompt,
    async install() { if (!prompt) return false; prompt.prompt(); const r = await prompt.userChoice; prompt = null; return r.outcome === 'accepted'; }
  };
  // Esconde os atalhos "Instalar o app" quando o site já está aberto como app.
  if (standalone) document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-install-link]').forEach(a => { a.hidden = true; }));
})();
