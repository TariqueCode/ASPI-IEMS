/* ASPI: start logo loading before Alpine/API rendering. */
(function () {
  'use strict';

  const LOGO_URL = 'logo.php';
  const PRELOAD_ID = 'aspi-logo-preload';

  function ensurePreload() {
    if (document.getElementById(PRELOAD_ID)) return;
    const link = document.createElement('link');
    link.id = PRELOAD_ID;
    link.rel = 'preload';
    link.as = 'image';
    link.href = LOGO_URL;
    document.head.appendChild(link);
  }

  function primeLogoImages(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('img[alt="ASPI Logo"]').forEach((img) => {
      // Alpine uses :src, which browsers do not treat as an image URL. Give
      // the element a real src immediately; Alpine can replace it afterward.
      if (!img.getAttribute('src')) {
        img.setAttribute('src', LOGO_URL);
      }
    });
  }

  ensurePreload();
  primeLogoImages(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) primeLogoImages(node);
      });
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
