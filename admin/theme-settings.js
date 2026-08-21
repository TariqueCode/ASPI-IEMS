/* ASPI Admin Theme Controller - compact formal theme control */
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
        width:32px!important;height:32px!important;padding:0!important;
        border-radius:9px!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;
        border:1px solid rgba(148,163,184,.24)!important;
        background:#1e293b!important;color:#cbd5e1!important;
        box-shadow:0 2px 8px rgba(15,23,42,.12)!important;
        cursor:pointer!important;
        transition:background .16s ease,border-color .16s ease,color .16s ease,transform .16s ease,box-shadow .16s ease!important;
      }
      #${BUTTON_ID}:hover{
        transform:translateY(-1px)!important;
        background:#334155!important;
        border-color:rgba(250,204,21,.42)!important;
        color:#facc15!important;
        box-shadow:0 5px 14px rgba(15,23,42,.18)!important;
      }
      #${BUTTON_ID}:active{transform:scale(.96)!important}
      #${BUTTON_ID}:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(250,204,21,.20),0 4px 12px rgba(15,23,42,.12)!important}
      #${BUTTON_ID} .aspi-theme-old-glyphs{display:none!important}
      #${BUTTON_ID} .aspi-theme-knob{
        position:static!important;transform:none!important;
        width:24px!important;height:24px!important;
        border-radius:7px!important;
        background:transparent!important;
        color:inherit!important;
        box-shadow:none!important;
        padding:0!important;
      }
      #${BUTTON_ID} .aspi-theme-knob.translate-x-6,
      #${BUTTON_ID} .aspi-theme-knob.translate-x-7{transform:none!important}
      #${BUTTON_ID} .aspi-theme-knob i{font-size:12px!important;line-height:1!important}
      @media(max-width:640px){
        #${BUTTON_ID}{width:30px!important;height:30px!important;border-radius:8px!important}
        #${BUTTON_ID} .aspi-theme-knob{width:22px!important;height:22px!important}
      }
    `;
    document.head.appendChild(style);
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

  function findPrimaryButton() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(isThemeButton);
    return buttons.find((b) => (b.className || '').includes('hidden sm:inline-flex'))
      || buttons.find((b) => b.closest('header'))
      || buttons[0]
      || null;
  }

  function stylePrimaryButton(button) {
    if (!button) return;
    button.id = BUTTON_ID;
    button.classList.remove('hidden', 'sm:inline-flex');
    button.style.display = 'inline-flex';
    button.setAttribute('title', 'থিম পরিবর্তন');
    button.setAttribute('aria-label', 'থিম পরিবর্তন');
    button.setAttribute('data-theme-control', 'true');

    const glyphs = button.children[0];
    const knob = button.children[1];
    if (glyphs) glyphs.classList.add('aspi-theme-old-glyphs');
    if (knob) {
      knob.classList.add('aspi-theme-knob');
      knob.classList.remove('translate-x-6', 'translate-x-7');
    }
  }

  function boot() {
    injectStyles();
    removeLegacySettingsCard();
    const primary = document.getElementById(BUTTON_ID) || findPrimaryButton();
    if (!primary) return false;
    removeDuplicateThemeButtons(primary);
    stylePrimaryButton(primary);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (boot() || attempts > 80) clearInterval(timer);
  }, 150);
})();
