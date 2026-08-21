/* ASPI UI enhancements: adaptive department cards + one formal theme control */
(function () {
  'use strict';

  const THEME_STYLE = 'aspi-site-theme-formal-style';

  function injectStyles() {
    if (document.getElementById(THEME_STYLE)) return;
    const style = document.createElement('style');
    style.id = THEME_STYLE;
    style.textContent = `
      .aspi-site-theme-formal{
        width:38px!important;height:38px!important;padding:0!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;
        border-radius:11px!important;border:1px solid rgba(148,163,184,.28)!important;
        background:rgba(255,255,255,.9)!important;color:#475569!important;
        box-shadow:0 4px 14px rgba(15,23,42,.08)!important;
        transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease!important;
      }
      .aspi-site-theme-formal:hover{transform:translateY(-1px)!important;box-shadow:0 7px 18px rgba(15,23,42,.12)!important}
      .dark .aspi-site-theme-formal{background:rgba(15,23,42,.94)!important;color:#facc15!important;border-color:rgba(148,163,184,.22)!important;box-shadow:0 5px 18px rgba(0,0,0,.25)!important}
      .aspi-site-theme-formal .aspi-theme-old-glyphs{display:none!important}
      .aspi-site-theme-formal .aspi-theme-knob{position:static!important;transform:none!important;width:26px!important;height:26px!important;border-radius:8px!important;box-shadow:none!important;}
      #departments .aspi-department-grid{display:grid!important;gap:20px!important;align-items:stretch!important;}
      #departments .aspi-department-grid > *{width:100%!important;max-width:none!important;min-width:0!important;}
      @media(min-width:768px){
        #departments .aspi-department-grid.aspi-dept-1{grid-template-columns:repeat(1,minmax(0,1fr))!important}
        #departments .aspi-department-grid.aspi-dept-2{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #departments .aspi-department-grid.aspi-dept-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        #departments .aspi-department-grid.aspi-dept-4{grid-template-columns:repeat(4,minmax(0,1fr))!important}
        #departments .aspi-department-grid.aspi-dept-many{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      }
      @media(max-width:767px){#departments .aspi-department-grid{grid-template-columns:1fr!important;gap:14px!important}}
    `;
    document.head.appendChild(style);
  }

  function updateThemeButton() {
    const buttons = Array.from(document.querySelectorAll('button')).filter((button) => {
      const click = (button.getAttribute('@click') || button.getAttribute('x-on:click') || '').replace(/\s/g, '');
      return click === 'toggleTheme()';
    });
    if (!buttons.length) return;

    const primary = buttons.find((b) => b.closest('nav') || (b.className || '').includes('hidden xl:flex')) || buttons[0];
    buttons.forEach((button) => {
      if (button === primary) return;
      const row = button.closest('.flex.items-center.justify-between');
      if (row && row.querySelectorAll('button').length === 1 && row.textContent.trim().match(/মোড|থিম/)) row.remove();
      else button.remove();
    });

    primary.classList.add('aspi-site-theme-formal');
    primary.setAttribute('title', 'লাইট / ডার্ক মোড পরিবর্তন');
    primary.setAttribute('aria-label', 'লাইট / ডার্ক মোড পরিবর্তন');
    primary.style.display = 'inline-flex';

    const glyphs = primary.children[0];
    const knob = primary.children[1];
    if (glyphs) glyphs.classList.add('aspi-theme-old-glyphs');
    if (knob) {
      knob.classList.add('aspi-theme-knob');
      knob.classList.remove('translate-x-6','translate-x-7');
    }
  }

  function findDepartmentGrid() {
    const section = document.getElementById('departments');
    if (!section) return null;
    let grid = section.querySelector('.grid');
    if (!grid) {
      const candidates = Array.from(section.querySelectorAll('div')).filter((el) => {
        const children = Array.from(el.children).filter((child) => child.nodeType === 1);
        return children.length >= 1 && /grid/.test(el.className || '');
      });
      grid = candidates[0] || null;
    }
    return grid;
  }

  function updateDepartmentGrid() {
    const grid = findDepartmentGrid();
    if (!grid) return;
    const children = Array.from(grid.children).filter((child) => child.nodeType === 1 && child.offsetParent !== null);
    if (!children.length) return;

    const count = children.length;
    grid.classList.add('aspi-department-grid');
    grid.classList.remove('aspi-dept-1','aspi-dept-2','aspi-dept-3','aspi-dept-4','aspi-dept-many');
    grid.classList.add(count === 1 ? 'aspi-dept-1' : count === 2 ? 'aspi-dept-2' : count === 3 ? 'aspi-dept-3' : count === 4 ? 'aspi-dept-4' : 'aspi-dept-many');
  }

  function boot() {
    injectStyles();
    updateThemeButton();
    updateDepartmentGrid();
  }

  document.addEventListener('DOMContentLoaded', boot);
  [250,700,1400,2500].forEach((delay) => setTimeout(boot, delay));

  const observer = new MutationObserver(() => {
    updateDepartmentGrid();
    updateThemeButton();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
