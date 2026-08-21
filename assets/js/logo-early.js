/* ASPI: start logo loading before Alpine/API rendering and recover stale logo URLs. */
(function () {
  'use strict';

  const LOGO_URL = 'logo.php';
  const PRELOAD_ID = 'aspi-logo-preload';
  const CACHE_KEY = 'aspi_logo_url';

  function ensurePreload() {
    if (document.getElementById(PRELOAD_ID)) return;
    const link = document.createElement('link');
    link.id = PRELOAD_ID;
    link.rel = 'preload';
    link.as = 'image';
    link.fetchPriority = 'high';
    link.href = LOGO_URL;
    document.head.appendChild(link);
  }

  function primeLogoImages(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('img[alt="ASPI Logo"]').forEach((img) => {
      const cached = (() => {
        try { return localStorage.getItem(CACHE_KEY) || ''; } catch (_) { return ''; }
      })();
      const immediate = cached || LOGO_URL;
      if (!img.getAttribute('src') || img.getAttribute('src') === 'undefined') {
        img.setAttribute('src', immediate + (immediate.includes('?') ? '&' : '?') + 'v=' + Date.now());
      }
      if (!img.dataset.aspiLogoFallbackBound) {
        img.dataset.aspiLogoFallbackBound = '1';
        img.addEventListener('error', () => {
          if (!img.src.includes(LOGO_URL)) {
            img.src = LOGO_URL + '?v=' + Date.now();
          }
        });
      }
    });
  }

  ensurePreload();
  primeLogoImages(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) primeLogoImages(node);
        });
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        primeLogoImages(mutation.target);
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }
})();
