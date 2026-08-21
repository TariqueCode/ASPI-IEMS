/* ASPI Admin Theme Controller - fixed header placement */
(function () {
  'use strict';

  const STYLE_ID = 'aspi-admin-theme-fixed-style';
  const BUTTON_ID = 'aspi-admin-global-theme';
  const SLOT_ID = 'aspi-admin-theme-slot';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SLOT_ID}{
        flex:0 0 auto!important;
        width:34px!important;
        height:34px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        margin:0!important;
        padding:0!important;
      }
      #${BUTTON_ID}{
        position:static!important;
        flex:0 0 34px!important;
        width:34px!important;
        height:34px!important;
        min-width:34px!important;
        max-width:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        padding:0!important;
        margin:0!important;
        border-radius:10px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        border:1px solid rgba(148,163,184,.24)!important;
        background:#172033!important;
        color:#cbd5e1!important;
        box-shadow:0 2px 8px rgba(15,23,42,.12)!important;
        cursor:pointer!important;
        transform:none!important;
        transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease!important;
      }
      #${BUTTON_ID}:hover{
        background:#222e45!important;
        border-color:rgba(250,204,21,.38)!important;
        color:#facc15!important;
        box-shadow:0 4px 12px rgba(15,23,42,.16)!important;
      }
      #${BUTTON_ID}:active{transform:scale(.96)!important}
      #${BUTTON_ID}:focus-visible{outline:none!important;box-shadow:0 0 0 2px rgba(250,204,21,.18)!important}
      #${BUTTON_ID} .aspi-theme-old-glyphs{display:none!important}
      #${BUTTON_ID} .aspi-theme-knob{
        position:static!important;
        transform:none!important;
        width:26px!important;
        height:26px!important;
        min-width:26px!important;
        max-width:26px!important;
        min-height:26px!important;
        max-height:26px!important;
        border-radius:8px!important;
        background:transparent!important;
        color:inherit!important;
        box-shadow:none!important;
        padding:0!important;
        margin:0!important;
      }
      #${BUTTON_ID} .aspi-theme-knob.translate-x-6,
      #${BUTTON_ID} .aspi-theme-knob.translate-x-7{transform:none!important}
      #${BUTTON_ID} .aspi-theme-knob i{font-size:12px!important;line-height:1!important}
      @media(max-width:640px){
        #${SLOT_ID}{width:32px!important;height:32px!important}
        #${BUTTON_ID}{flex-basis:32px!important;width:32px!important;height:32px!important;min-width:32px!important;max-width:32px!important;min-height:32px!important;max-height:32px!important;border-radius:9px!important}
        #${BUTTON_ID} .aspi-theme-knob{width:24px!important;height:24px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function isThemeButton(button) {
    const click = (button.getAttribute('@click') || button.getAttribute('x-on:click') || '').replace(/\s/g, '');
    return click === 'toggleTheme()';
  }

  function findHeader() {
    return document.querySelector('header');
  }

  function findSaveButton(header) {
    if (!header) return null;
    return header.querySelector('button[\@click="saveData()"]') ||
           Array.from(header.querySelectorAll('button')).find((button) => /পরিবর্তন/.test(button.textContent || '')) ||
           null;
  }

  function ensureSlot(header) {
    let slot = document.getElementById(SLOT_ID);
    if (slot) return slot;

    slot = document.createElement('div');
    slot.id = SLOT_ID;
    slot.setAttribute('aria-label', 'Theme control');

    const saveButton = findSaveButton(header);
    if (saveButton && saveButton.parentElement) {
      saveButton.parentElement.insertBefore(slot, saveButton);
    } else {
      const controls = header ? header.querySelector('.flex.items-center.space-x-2, .flex.items-center.space-x-2\\.5, .flex.items-center') : null;
      if (controls) controls.appendChild(slot);
      else if (header) header.appendChild(slot);
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
    const blocks = Array.from(document.querySelectorAll('div')).filter((el) => {
      const text = el.textContent || '';
      return text.includes(marker) && text.includes(password);
    });
    blocks.forEach((block) => {
      const wrapper = block.closest('.mt-6.pt-4') || block.parentElement;
      if (wrapper) wrapper.remove();
      else block.remove();
    });
  }

  function findPrimaryButton() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(isThemeButton);
    return buttons.find((b) => b.closest('header')) || buttons[0] || null;
  }

  function moveToFixedSlot(button, slot) {
    if (!button || !slot) return;
    if (button.parentElement !== slot) slot.appendChild(button);
  }

  function removeDuplicateThemeButtons(primary) {
    document.querySelectorAll('button').forEach((button) => {
      if (!isThemeButton(button) || button === primary) return;
      const row = button.closest('.flex.items-center.justify-between.p-2');
      if (row && row.querySelectorAll('button').length === 1) row.remove();
      else button.remove();
    });
  }

  function stylePrimaryButton(button) {
    if (!button) return;
    button.id = BUTTON_ID;
    button.classList.remove('hidden', 'sm:inline-flex');
    button.style.display = 'inline-flex';
    button.setAttribute('title', 'থিম পরিবর্তন');
    button.setAttribute('aria-label', 'লাইট / ডার্ক মোড পরিবর্তন');
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
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (boot() || attempts > 100) clearInterval(timer);
  }, 150);
})();
