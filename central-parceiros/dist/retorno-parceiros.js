'use strict';
// Apresentações dos empreendimentos servidas em parceirosvitacon.com.br/empreendimentos/ (vindas do portfólio do Luigi).
// O "Voltar" e a marca levam para a Vitrine; links internos de outros projetos continuam no mesmo domínio.
(() => {
  function ajustar() {
    document.querySelectorAll('a[href]').forEach(a => {
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === '/' || url.pathname === '/projetos/' || url.pathname === '/index.html') {
        a.href = '/vitrine/';
        if (a.classList.contains('brand')) a.textContent = 'VITACON · PARCEIROS';
        else if (/voltar/i.test(a.textContent)) a.textContent = '← Voltar à Vitrine';
      }
    });
  }
  ajustar();
  const list = document.getElementById('lista');
  if (list) new MutationObserver(ajustar).observe(list, {childList: true, subtree: true});
})();
