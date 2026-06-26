/* ============================================================
   LORD — UI interactions & scroll storytelling (GSAP)
   ============================================================ */
(function () {
  'use strict';

  // Storytelling page: always begin the narrative from the top on reload
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  // ---------- Loader ----------
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('done'), 700);
  });
  // Safety: never trap the user behind the loader
  setTimeout(() => loader.classList.add('done'), 4000);

  // ---------- Nav ----------
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  const progress = document.getElementById('scrollProgress');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }, { passive: true });

  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.classList.remove('open');
    })
  );

  // ---------- GSAP scroll storytelling ----------
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.add('gsap-off');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.documentElement.classList.add('gsap-off');
    return;
  }

  // Generic reveals
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 46 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 86%' }
      }
    );
  });

  // Hero entrance (homepage only)
  if (document.querySelector('.hero')) {
    gsap.timeline({ delay: 0.9 })
      .from('.hero-kicker', { opacity: 0, x: -40, duration: 1, ease: 'power3.out' })
      .from('.hero-title', { opacity: 0, y: 60, duration: 1.2, ease: 'power3.out' }, '-=0.6')
      .from('.hero-sub', { opacity: 0, y: 30, duration: 1, ease: 'power3.out' }, '-=0.7')
      .from('.hero-actions .btn', { opacity: 0, y: 24, stagger: 0.12, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-stat', { opacity: 0, y: 20, stagger: 0.1, duration: 0.7 }, '-=0.5')
      .from('.scroll-hint', { opacity: 0, duration: 0.8 }, '-=0.4');

    // Gentle glow breathing on the hero logo
    gsap.to('.hero-logo', {
      filter: 'drop-shadow(0 10px 60px rgba(201,160,80,0.5))',
      duration: 2.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  // Chapter media parallax
  document.querySelectorAll('.chapter-media img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: {
        trigger: img.closest('.chapter-media'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });

  // Chapter numbers drift
  document.querySelectorAll('.chapter-num').forEach((num) => {
    gsap.fromTo(num, { y: 60 }, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: num.closest('.chapter'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });

  // Quote band: letter-spacing breathe
  if (document.querySelector('.quote-band')) {
    gsap.from('.quote-band blockquote', {
      opacity: 0,
      scale: 0.96,
      duration: 1.4,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.quote-band', start: 'top 75%' }
    });
  }

  // Stats counters
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate() { el.textContent = Math.round(obj.v) + suffix; }
    });
  });

  // Hero canvas slight zoom-out as you scroll into the story
  // (base opacity is lower on mobile so the headline stays readable)
  if (document.getElementById('hero-canvas')) {
    const heroCanvasBase = window.innerWidth < 860 ? 0.6 : 1;
    gsap.fromTo('#hero-canvas', { opacity: heroCanvasBase }, {
      opacity: 0.2,
      scale: 1.06,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });
  }
})();
