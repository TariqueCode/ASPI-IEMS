/* ASPI Admin Theme Controller - single global control */
(function () {
  'use strict';

  const STYLE_ID = 'aspi-admin-theme-single-style';
  const BUTTON_ID = 'aspi-admin-global-theme';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{
        width:38px;height:38px;padding:0;border-radius:11px;
        display:inline-flex;align-items:center;justify-content:center;
        border:1px solid rgba(148,163,184,.28);
        background:rgba(255,255,255,.92);color:#475569;
        box-shadow:0 4px 14px rgba(15,23,42,.08);
        cursor:pointer;transition:transform .16s ease,background .16s ease,border-color .16s ease,box-shadow .16s ease;
      }
      #${BUTTON_ID}:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(15,23,42,.12)}
      #${BUTTON_ID}:active{transform:translateY(0)}
      #${BUTTON_ID} i{font-size:14px;line-height:1}
      .dark #${BUTTON_ID}{background:#0f172a;color:#facc15;border-color:rgba(148,163,184,.22);box-shadow:0 5px 18px rgba(0,0,0,.24)}
      @media(max-width:640px){#${BUTTON_ID}{width:36px;height:36px;border-radius:10px}}
    `;
    document.head.appendChild(style);
  }

  function getApp() {
    try {
      const root = document.querySelector('[x-data="adminApp"]');
      return window.Alpine && root ? window.Alpine.$data(root) : null;
    } catch (_) { return null; }
  }

  function isThemeButton(button) {
    const click = (button.getAttribute('@click') || button.getAttribute('x-on:click') || '').replace(/\s/g, '');
    return click === 'toggleTheme()';
  }

  function removeLegacySettingsCard() {
    const card = document.getElementById('aspi-admin-theme-settings-card');
    if (card) card.remove();
  }

  function removeDuplicateThemeButtons(primary) {
    document.querySelectorAll('button').forEach((button) => {
      if (!isThemeButton(button) || button === primary) return;
      const row = button.closest('.flex.items-center.justify-between.p-2');
      if (row && row.querySelectorAll('button').length === 1) row.remove();
      else button.remove();
    });
  }

  function findHeaderThemeButton() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(isThemeButton);
    return buttons.find((b) => (b.className || '').includes('hidden sm:inline-flex')) || buttons[0] || null;
  }

  function stylePrimaryButton(button) {
    if (!button) return;
    button.classList.remove('hidden', 'sm:inline-flex');
    button.id = BUTTON_ID;
    button.style.display = 'inline-flex';
    button.setAttribute('title', 'লাইট / ডার্ক মোড পরিবর্তন');
    button.setAttribute('aria-label', 'লাইট / ডার্ক মোড পরিবর্তন');

    // Keep Alpine's existing reactive icon/state, but flatten the old track into a formal icon button.
    const children = button.children;
    if (children.length >= 2) {
      const glyphs = children[0];
      const knob = children[1];
      glyphs.style.display = 'none';
      knob.style.width = '26px';
      knob.style.height = '26px';
      knob.style.transform = 'translateX(0) !important';
      knob.classList.remove('translate-x-6', 'translate-x-7');
      knob.classList.add('rounded-lg');
      knob.style.boxShadow = 'none';
    }
  }

  function createFallbackButton() {
    let holder = document.querySelector('header') || document.querySelector('main') || document.body;
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = '<i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>';
    button.title = 'লাইট / ডার্ক মোড পরিবর্তন';
    button.setAttribute('aria-label', 'লাইট / ডার্ক মোড পরিবর্তন');
    button.addEventListener('click', () => {
      const app = getApp();
      if (app && typeof app.toggleTheme === 'function') app.toggleTheme();
    });
    Object.assign(button.style, { position:'fixed', top:'14px', right:'150px', zIndex:'80' });
    holder.appendChild(button);
    return button;
  }

  function boot() {
    injectStyles();
    removeLegacySettingsCard();

    let primary = document.getElementById(BUTTON_ID);
    if (!primary) primary = findHeaderThemeButton();
    if (primary) {
      removeDuplicateThemeButtons(primary);
      stylePrimaryButton(primary);
      return true;
    }

    createFallbackButton();
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (boot() || attempts > 100) clearInterval(timer);
  }, 150);
})();
