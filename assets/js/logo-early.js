/* ASPI: start logo loading before Alpine/API rendering and keep every ASPI logo stable. */
(function () {
  'use strict';

  const LOGO_URL = 'logo.php';
  const PRELOAD_ID = 'aspi-logo-preload';
  const CACHE_KEY = 'aspi_logo_url';

  function cacheUrl() {
    try { return localStorage.getItem(CACHE_KEY) || ''; } catch (_) { return ''; }
  }

  function immediateUrl() {
    return cacheUrl() || LOGO_URL;
  }

  function isLogoElement(img) {
    if (!(img instanceof HTMLImageElement)) return false;
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    const srcExpr = `${img.getAttribute(':src') || ''} ${img.getAttribute('x-bind:src') || ''}`.toLowerCase();
    const id = (img.id || '').toLowerCase();
    const cls = (img.className || '').toString().toLowerCase();
    return alt.includes('aspi logo') || alt === 'aspi' || srcExpr.includes('data.site.logo') || id.includes('logo') || cls.includes('logo');
  }

  function setLogoSource(img, force = false) {
    if (!isLogoElement(img)) return;
    const current = img.getAttribute('src') || '';
    const bad = !current || current === 'undefined' || current === 'null' || current === 'about:blank';
    if (force || bad) img.setAttribute('src', immediateUrl());

    if (!img.dataset.aspiLogoFallbackBound) {
      img.dataset.aspiLogoFallbackBound = '1';
      img.addEventListener('error', () => {
        const fallback = `${LOGO_URL}?v=${Date.now()}`;
        if (!img.src.includes(LOGO_URL)) img.setAttribute('src', fallback);
      });
    }
  }

  function ensurePreload() {
    let link = document.getElementById(PRELOAD_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = PRELOAD_ID;
      link.rel = 'preload';
      link.as = 'image';
      link.fetchPriority = 'high';
      document.head.appendChild(link);
    }
    link.href = LOGO_URL;
  }

  function primeLogoImages(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (scope instanceof HTMLImageElement) setLogoSource(scope);
    scope.querySelectorAll('img').forEach((img) => setLogoSource(img));
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
      if (mutation.type === 'attributes') setLogoSource(mutation.target, true);
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', ':src', 'x-bind:src']
    });
  }
})();
