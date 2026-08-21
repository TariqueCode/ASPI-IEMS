(function(){
  'use strict';

  var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 80); };

  function optimizeImages(){
    var images = document.images;
    for (var i=0;i<images.length;i++){
      var img = images[i];
      if (!img.hasAttribute('loading')) img.setAttribute('loading','lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
      if (i < 3) {
        img.setAttribute('loading','eager');
        if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority','high');
      }
    }
  }

  function markLazySections(){
    var sections = document.querySelectorAll('section');
    for (var i=2;i<sections.length;i++) sections[i].classList.add('aspi-lazy-section');
  }

  function removeIntroCost(){
    // Do not remove the splash immediately; simply avoid leaving it alive
    // after it has been closed, which can keep a large blurred layer in the DOM.
    var splash = document.querySelector('[x-show="showIntro"]');
    if (!splash || splash.dataset.aspiOptimized) return;
    splash.dataset.aspiOptimized = '1';
    var canvas = splash.querySelector('#introSplashCanvas');
    if (canvas) canvas.style.display = 'none';
  }

  function warmImportantLinks(){
    var links = document.querySelectorAll('a[href]');
    var count = 0;
    for (var i=0;i<links.length && count<6;i++){
      var href = links[i].href;
      if (!href || href.indexOf(location.origin)!==0) continue;
      if (href.indexOf('#')!==-1 || href.indexOf('javascript:')===0) continue;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
      count++;
    }
  }

  function bindFastClickFeedback(){
    document.addEventListener('click', function(e){
      var el = e.target.closest && e.target.closest('button,[role="button"]');
      if (!el || el.disabled) return;
      el.classList.add('aspi-clicked');
      setTimeout(function(){ el.classList.remove('aspi-clicked'); }, 120);
    }, {passive:true});
  }

  function boot(){
    optimizeImages();
    markLazySections();
    bindFastClickFeedback();
    idle(function(){
      removeIntroCost();
      warmImportantLinks();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
