/* ASPI Admin Theme Settings - runtime UI */
(function () {
  'use strict';

  const STYLE_ID = 'aspi-admin-theme-runtime-style';
  const CARD_ID = 'aspi-admin-theme-settings-card';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .aspi-admin-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .aspi-admin-theme-choice{min-height:132px;text-align:left;border:1px solid rgb(226 232 240);background:rgba(248,250,252,.78);border-radius:16px;padding:16px;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background .12s ease;cursor:pointer}
      .dark .aspi-admin-theme-choice{border-color:rgb(51 65 85);background:rgba(15,23,42,.5);color:#e2e8f0}
      .aspi-admin-theme-choice:hover{transform:translateY(-1px);border-color:rgb(129 140 248);box-shadow:0 8px 20px rgba(15,23,42,.08)}
      .aspi-admin-theme-choice.is-active{border-color:rgb(99 102 241);background:rgba(238,242,255,.92);box-shadow:0 8px 24px rgba(79,70,229,.1)}
      .dark .aspi-admin-theme-choice.is-active{background:rgba(30,41,59,.82);border-color:rgb(129 140 248)}
      .aspi-admin-theme-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;border:1px solid rgb(226 232 240);background:#fff}
      .dark .aspi-admin-theme-icon{background:#1e293b;border-color:#334155}
      .aspi-admin-theme-choice .aspi-theme-check{opacity:0;transition:opacity .12s ease}
      .aspi-admin-theme-choice.is-active .aspi-theme-check{opacity:1}
      @media(max-width:900px){.aspi-admin-theme-grid{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){.aspi-admin-theme-choice{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function getApp() {
    try {
      const root = document.querySelector('[x-data="adminApp"]');
      return window.Alpine && root ? window.Alpine.$data(root) : null;
    } catch (_) {
      return null;
    }
  }

  function removeLegacyToggles() {
    document.querySelectorAll('button').forEach((button) => {
      const click = button.getAttribute('@click') || button.getAttribute('x-on:click') || '';
      if (click.replace(/\s/g, '') !== 'toggleTheme()') return;
      const row = button.closest('.flex.items-center.justify-between.p-2');
      if (row && row.parentElement && row.querySelector('button') === button) {
        row.remove();
      } else {
        button.remove();
      }
    });
  }

  function getSettingsPanel() {
    return document.querySelector('[x-show="activeTab === \'settings\'"]');
  }

  function setTheme(mode) {
    const app = getApp();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const next = ['light', 'dark', 'auto'].includes(mode) ? mode : 'auto';

    localStorage.setItem('aspi_admin_theme', next);

    if (app) {
      app.themeMode = next;
      app.darkMode = next === 'dark' ? true : next === 'light' ? false : media.matches;
      if (typeof app.applyThemeClass === 'function') app.applyThemeClass();
      else document.documentElement.classList.toggle('dark', app.darkMode);
    } else {
      document.documentElement.classList.toggle('dark', next === 'dark' || (next === 'auto' && media.matches));
    }

    updateActiveChoice();
  }

  function updateActiveChoice() {
    const mode = localStorage.getItem('aspi_admin_theme') || 'auto';
    document.querySelectorAll('#' + CARD_ID + ' .aspi-admin-theme-choice').forEach((button) => {
      const active = button.dataset.theme === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const status = document.querySelector('#' + CARD_ID + ' [data-theme-status]');
    const isDark = document.documentElement.classList.contains('dark');
    if (status) {
      status.textContent = mode === 'auto'
        ? 'সিস্টেমের থিম অনুসরণ হচ্ছে'
        : mode === 'dark'
          ? 'ডার্ক মোড সক্রিয়'
          : 'লাইট মোড সক্রিয়';
    }
    const badge = document.querySelector('#' + CARD_ID + ' [data-theme-badge]');
    if (badge) badge.textContent = isDark ? 'Dark' : 'Light';
  }

  function createCard() {
    const panel = getSettingsPanel();
    if (!panel || document.getElementById(CARD_ID)) return false;

    const card = document.createElement('div');
    card.id = CARD_ID;
    card.className = 'mb-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden';
    card.innerHTML = `
      <div class="px-5 sm:px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center">
            <span class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-3"><i class="fa-solid fa-palette"></i></span>
            ইন্টারফেস ও থিম
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 ml-[52px]">এডমিন ড্যাশবোর্ডের থিম এখান থেকে নিয়ন্ত্রণ করুন।</p>
        </div>
        <span class="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"><i class="fa-solid fa-sliders mr-1.5"></i> Interface</span>
      </div>
      <div class="p-5 sm:p-6">
        <div class="aspi-admin-theme-grid">
          <button type="button" class="aspi-admin-theme-choice" data-theme="light">
            <div class="flex items-center justify-between mb-3"><span class="aspi-admin-theme-icon text-amber-500"><i class="fa-solid fa-sun"></i></span><i class="aspi-theme-check fa-solid fa-circle-check text-indigo-600 dark:text-brand-gold"></i></div>
            <div class="font-black text-sm text-slate-900 dark:text-white">লাইট মোড</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">উজ্জ্বল ও পরিষ্কার interface</div>
          </button>
          <button type="button" class="aspi-admin-theme-choice" data-theme="dark">
            <div class="flex items-center justify-between mb-3"><span class="aspi-admin-theme-icon bg-slate-900! text-yellow-300"><i class="fa-solid fa-moon"></i></span><i class="aspi-theme-check fa-solid fa-circle-check text-indigo-600 dark:text-brand-gold"></i></div>
            <div class="font-black text-sm text-slate-900 dark:text-white">ডার্ক মোড</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">চোখের জন্য আরামদায়ক dark interface</div>
          </button>
          <button type="button" class="aspi-admin-theme-choice" data-theme="auto">
            <div class="flex items-center justify-between mb-3"><span class="aspi-admin-theme-icon text-indigo-500"><i class="fa-solid fa-circle-half-stroke"></i></span><i class="aspi-theme-check fa-solid fa-circle-check text-indigo-600 dark:text-brand-gold"></i></div>
            <div class="font-black text-sm text-slate-900 dark:text-white">সিস্টেম অনুযায়ী</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">কম্পিউটারের theme অনুসরণ করবে</div>
          </button>
        </div>
        <div class="mt-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><div class="text-xs font-black text-slate-800 dark:text-slate-200">বর্তমান থিম</div><div data-theme-status class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5"></div></div>
          <div data-theme-badge class="inline-flex items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200"></div>
        </div>
      </div>
    `;

    panel.insertBefore(card, panel.firstElementChild && panel.firstElementChild.nextElementSibling ? panel.firstElementChild.nextElementSibling : panel.firstChild);

    card.querySelectorAll('.aspi-admin-theme-choice').forEach((button) => {
      button.addEventListener('click', () => setTheme(button.dataset.theme));
    });

    updateActiveChoice();
    return true;
  }

  function boot() {
    injectStyles();
    removeLegacyToggles();
    if (!createCard()) return false;
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (boot() || attempts > 80) clearInterval(timer);
  }, 150);

  window.addEventListener('storage', (event) => {
    if (event.key === 'aspi_admin_theme') updateActiveChoice();
  });
})();
