/* ASPI Admin Theme Controller - compact theme control + upload naming + logo recovery */
(function () {
  'use strict';

  const STYLE_ID = 'aspi-admin-theme-fixed-style';
  const BUTTON_ID = 'aspi-admin-global-theme';
  const SLOT_ID = 'aspi-admin-theme-slot';
  const UPLOAD_CONTEXT_KEY = '__aspiUploadContext';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SLOT_ID}{flex:0 0 auto!important;width:34px!important;height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important}
      #${BUTTON_ID}{position:static!important;flex:0 0 34px!important;width:34px!important;height:34px!important;min-width:34px!important;max-width:34px!important;min-height:34px!important;max-height:34px!important;padding:0!important;margin:0!important;border-radius:10px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid rgba(148,163,184,.24)!important;background:#172033!important;color:#cbd5e1!important;box-shadow:0 2px 8px rgba(15,23,42,.12)!important;cursor:pointer!important;transform:none!important;transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease!important}
      #${BUTTON_ID}:hover{background:#222e45!important;border-color:rgba(250,204,21,.38)!important;color:#facc15!important;box-shadow:0 4px 12px rgba(15,23,42,.16)!important}
      #${BUTTON_ID}:active{transform:scale(.96)!important}
      #${BUTTON_ID}:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(250,204,21,.18)!important}
      #${BUTTON_ID} .aspi-theme-old-glyphs{display:none!important}
      #${BUTTON_ID} .aspi-theme-knob{position:static!important;transform:none!important;width:26px!important;height:26px!important;min-width:26px!important;max-width:26px!important;min-height:26px!important;max-height:26px!important;border-radius:8px!important;background:transparent!important;color:inherit!important;box-shadow:none!important;padding:0!important;margin:0!important}
      #${BUTTON_ID} .aspi-theme-knob.translate-x-6,#${BUTTON_ID} .aspi-theme-knob.translate-x-7{transform:none!important}
      #${BUTTON_ID} .aspi-theme-knob i{font-size:12px!important;line-height:1!important}
      @media(max-width:640px){#${SLOT_ID}{width:32px!important;height:32px!important}#${BUTTON_ID}{flex-basis:32px!important;width:32px!important;height:32px!important;min-width:32px!important;max-width:32px!important;min-height:32px!important;max-height:32px!important;border-radius:9px!important}#${BUTTON_ID} .aspi-theme-knob{width:24px!important;height:24px!important}}
      html[data-aspi-alpine-error="true"] [x-cloak]{display:block!important;visibility:visible!important}
      html[data-aspi-alpine-error="true"] body::before{content:'এডমিন প্যানেলের JavaScript লোড হচ্ছে না। পেজটি একবার Reload করুন।';display:block;position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:10px 14px;border-radius:10px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;font:700 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 30px rgba(15,23,42,.15)}
    `;
    document.head.appendChild(style);
  }

  function isThemeButton(button) {
    const click = (button.getAttribute('@click') || button.getAttribute('x-on:click') || '').replace(/\s/g, '');
    return click === 'toggleTheme()';
  }

  function findHeader() { return document.querySelector('header'); }

  function findSaveButton(header) {
    if (!header) return null;
    const buttons = Array.from(header.querySelectorAll('button'));
    return buttons.find((button) => /পরিবর্তন/.test(button.textContent || '') && /saveData/.test(button.getAttribute('@click') || button.getAttribute('x-on:click') || '')) ||
           buttons.find((button) => /পরিবর্তন/.test(button.textContent || '')) || null;
  }

  function ensureSlot(header) {
    let slot = document.getElementById(SLOT_ID);
    if (slot) return slot;
    slot = document.createElement('div');
    slot.id = SLOT_ID;
    slot.setAttribute('aria-label', 'Theme control');
    const saveButton = findSaveButton(header);
    if (saveButton && saveButton.parentElement) saveButton.parentElement.insertBefore(slot, saveButton);
    else {
      const controls = header.querySelector('.flex.items-center.space-x-2, .flex.items-center.space-x-2\\.5, .flex.items-center');
      if (controls) controls.appendChild(slot); else header.appendChild(slot);
    }
    return slot;
  }

  function removeLegacySettingsCard() {
    const card = document.getElementById('aspi-admin-theme-settings-card');
    if (card) card.remove();
  }

  function removeDefaultLoginInfo() {
    const marker = 'ডিফল্ট এডমিন লগইন তথ্য';
    const password = '#Tarique-1998';
    Array.from(document.querySelectorAll('div')).filter((el) => {
      const text = el.textContent || '';
      return text.includes(marker) && text.includes(password);
    }).forEach((block) => (block.closest('.mt-6.pt-4') || block.parentElement || block).remove());
  }

  function findPrimaryButton() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(isThemeButton);
    return buttons.find((b) => b.closest('header')) || buttons[0] || null;
  }

  function moveToFixedSlot(button, slot) {
    if (button && slot && button.parentElement !== slot) slot.appendChild(button);
  }

  function removeDuplicateThemeButtons(primary) {
    document.querySelectorAll('button').forEach((button) => {
      if (!isThemeButton(button) || button === primary) return;
      const row = button.closest('.flex.items-center.justify-between.p-2');
      if (row && row.querySelectorAll('button').length === 1) row.remove(); else button.remove();
    });
  }

  function stylePrimaryButton(button) {
    if (!button) return;
    button.id = BUTTON_ID;
    button.classList.remove('hidden', 'sm:inline-flex');
    button.style.display = 'inline-flex';
    button.setAttribute('title', 'থিম পরিবর্তন');
    button.setAttribute('aria-label', 'লাইট / ডার্ক মোড পরিবর্তন');
    const glyphs = button.children[0];
    const knob = button.children[1];
    if (glyphs) glyphs.classList.add('aspi-theme-old-glyphs');
    if (knob) { knob.classList.add('aspi-theme-knob'); knob.classList.remove('translate-x-6', 'translate-x-7'); }
  }

  function loadScript(url, done) {
    const existing = document.querySelector(`script[data-aspi-alpine-src="${url}"]`);
    if (existing) return;
    const script = document.createElement('script');
    script.src = url;
    script.defer = true;
    script.setAttribute('data-aspi-alpine-src', url);
    script.onload = () => done(true);
    script.onerror = () => done(false);
    document.head.appendChild(script);
  }

  function recoverAlpine() {
    if (window.Alpine) return;
    const sources = [
      'https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.15.0/cdn.min.js',
      'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
      'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js'
    ];
    const tryNext = (index) => {
      if (window.Alpine) return;
      if (index >= sources.length) {
        document.documentElement.setAttribute('data-aspi-alpine-error', 'true');
        return;
      }
      loadScript(sources[index], (ok) => {
        if (ok) {
          setTimeout(() => {
            if (window.Alpine) {
              document.documentElement.removeAttribute('data-aspi-alpine-error');
              return;
            }
            tryNext(index + 1);
          }, 250);
        } else tryNext(index + 1);
      });
    };
    tryNext(0);
  }

  function safeBase(value, fallback = 'ASPI-File') {
    const cleaned = String(value || '')
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');
    return cleaned || fallback;
  }

  function collectUploadContext(input) {
    const file = input?.files?.[0];
    if (!file) return null;

    let text = '';
    const values = [];
    let node = input;
    for (let i = 0; i < 8 && node; i += 1, node = node.parentElement) {
      text += ' ' + (node.textContent || '');
      node.querySelectorAll?.('input:not([type="file"]), textarea, select').forEach((field) => {
        const value = String(field.value || '').trim();
        if (value) values.push(value);
      });
    }
    const haystack = `${text} ${values.join(' ')}`;
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    let base = '';

    if (/ইনস্টিটিউট লোগো/i.test(haystack)) base = 'ASPI-Logo';
    else if (/প্রতিষ্ঠাতার প্রতিকৃতি|প্রতিষ্ঠাতার ছবি/i.test(haystack) || values.some(v => /সিরাজুল ইসলাম/i.test(v))) base = 'Sirajul Islam - Founder';
    else if (/কাস্টম বাংলা ফন্ট/i.test(haystack)) base = 'ASPI-Custom-Font';
    else if (values.some(v => /আফনান ইসলাম|Afnan Islam/i.test(v))) base = 'Afnan Islam - Chairman';
    else if (values.some(v => /নুরুল ইসলাম|Nurul Islam/i.test(v))) base = 'Nurul Islam - President';
    else {
      const meaningful = values.filter(v => v.length > 2 && !/^ডিপ্লোমা$|^NSDA$|^all$/i.test(v));
      if (meaningful.length) {
        // Prefer the first name-like value and append the next designation/title when present.
        base = meaningful[0];
        if (meaningful[1] && meaningful[1] !== base && meaningful[1].length < 80) base += ' - ' + meaningful[1];
      }
    }

    return `${safeBase(base, 'ASPI-File')}.${ext}`;
  }

  function installUploadBridge() {
    if (window.__aspiUploadBridgeInstalled) return;
    window.__aspiUploadBridgeInstalled = true;

    document.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
      const filename = collectUploadContext(input);
      if (filename) window[UPLOAD_CONTEXT_KEY] = { filename, at: Date.now() };
    }, true);

    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (resource, options = {}) {
      let url = typeof resource === 'string' ? resource : (resource?.url || '');
      const body = options?.body;
      const ctx = window[UPLOAD_CONTEXT_KEY];

      if (body instanceof FormData && ctx && Date.now() - ctx.at < 30000) {
        if (!body.has('desired_filename')) body.append('desired_filename', ctx.filename);

        // Always use the canonical named upload endpoint. This keeps old
        // admin code that calls api.php?action=upload working too.
        if (/api\.php\?action=upload(?:&|$)/.test(url) || /\/api\/upload(?:\?|$)/.test(url)) {
          url = url.startsWith('http') ? new URL('/upload.php', url).toString() : '../upload.php';
          options = { ...options, body };
        }
      }

      return nativeFetch(url || resource, options);
    };
  }

  function ensureAdminLogoFallback() {
    const cacheBust = Date.now();
    document.querySelectorAll('img[alt="ASPI Logo"]').forEach((img) => {
      const fallback = '../logo.php?v=' + cacheBust;
      if (!img.getAttribute('src') || img.getAttribute('src') === 'undefined') {
        img.setAttribute('src', fallback);
      }
      if (!img.dataset.aspiLogoFallbackBound) {
        img.dataset.aspiLogoFallbackBound = '1';
        img.addEventListener('error', () => {
          if (img.src.includes('logo.php')) return;
          img.src = fallback;
        }, { once: true });
      }
    });
  }

  function boot() {
    try {
      injectStyles();
      installUploadBridge();
      ensureAdminLogoFallback();
      removeLegacySettingsCard();
      removeDefaultLoginInfo();
      const header = findHeader();
      if (!header) return false;
      const slot = ensureSlot(header);
      const primary = document.getElementById(BUTTON_ID) || findPrimaryButton();
      if (!primary) return false;
      moveToFixedSlot(primary, slot);
      removeDuplicateThemeButtons(primary);
      stylePrimaryButton(primary);
      return true;
    } catch (e) {
      console.warn('ASPI theme controller recovery:', e);
      return false;
    }
  }

  setTimeout(recoverAlpine, 1800);
  setTimeout(() => {
    if (!window.Alpine) recoverAlpine();
    boot();
  }, 2500);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (boot() || attempts > 100) clearInterval(timer);
  }, 150);
})();
