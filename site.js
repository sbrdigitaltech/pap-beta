(function () {
  'use strict';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu: icon swaps to X while open; Escape or any link closes it.
  var toggle = document.querySelector('[data-mobile-toggle]');
  var menu = document.getElementById('mobile-menu');
  var ICON_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  if (toggle && menu) {
    var closeMenu = function () {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = ICON_MENU;
    };
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? ICON_CLOSE : ICON_MENU;
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); }
    });
  }

  // Reveal on scroll: only blocks below the fold animate in. Cards that enter
  // the viewport in the same observer batch stagger (70ms apart, capped) so
  // grids cascade instead of popping at once.
  var els = document.querySelectorAll('[data-reveal]');
  if (!REDUCE && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
          if (i > 0) e.target.style.transitionDelay = Math.min(i * 70, 210) + 'ms';
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
          // Once the reveal has played, drop the inline styles so class-based
          // hover transforms (card lift) are free to take over.
          var el = e.target;
          setTimeout(function () {
            el.style.opacity = '';
            el.style.transform = '';
            el.style.transitionDelay = '';
          }, 1400);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.height || r.top < window.innerHeight * 0.92) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      io.observe(el);
    });
  }

  // Hero parallax: the photo block drifts against the scroll direction while
  // the hero is on screen. Purely decorative, so reduced-motion skips it.
  var heroBlock = document.querySelector('.hero-media');
  if (heroBlock && !REDUCE) {
    var parTick = false;
    var drift = function () {
      parTick = false;
      var y = window.scrollY;
      heroBlock.style.transform = (y > 0 && y < window.innerHeight * 1.3)
        ? 'translateY(' + Math.min(y * 0.08, 36) + 'px)'
        : '';
    };
    window.addEventListener('scroll', function () {
      if (!parTick) { parTick = true; requestAnimationFrame(drift); }
    }, { passive: true });
  }

  // Stats count-up (home). The final values are already in the HTML, so the
  // animation is purely cosmetic and reduced-motion users simply see them.
  var statNums = document.querySelectorAll('[data-count]');
  if (statNums.length && !REDUCE && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        sio.unobserve(e.target);
        var el = e.target;
        var end = parseFloat(el.getAttribute('data-count'));
        var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var t0 = null;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / 1100, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (end * eased).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    statNums.forEach(function (el) { sio.observe(el); });
  }

  // Card spotlight: a quiet accent wash follows the pointer across cards
  // marked .spot (--mx/--my feed a CSS radial gradient). rAF-throttled and
  // skipped for touch devices and reduced-motion users; purely decorative.
  var spots = document.querySelectorAll('.spot');
  if (spots.length && !REDUCE && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var spotTick = false;
    spots.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        if (spotTick) return;
        spotTick = true;
        requestAnimationFrame(function () {
          spotTick = false;
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    });
  }

  // FAQ accordion. Answers expand and collapse through their measured height
  // (about 200ms, ease-out); reduced-motion users get the instant toggle.
  var faqAnswer = function (item) { return item.querySelector('.faq-a'); };
  var faqSet = function (item, open) {
    var answer = faqAnswer(item);
    var btn = item.querySelector('[data-faq]');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (answer.getAnimations) answer.getAnimations().forEach(function (a) { a.cancel(); });
    if (open) {
      answer.hidden = false;
      item.classList.add('faq-open');
      if (!REDUCE && answer.animate) {
        answer.style.overflow = 'hidden';
        var h = answer.scrollHeight;
        var anim = answer.animate(
          [{ height: '0px', opacity: '0' }, { height: h + 'px', opacity: '1' }],
          { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' }
        );
        anim.onfinish = function () { anim.cancel(); answer.style.height = ''; answer.style.overflow = ''; };
      }
    } else if (!answer.hidden) {
      if (!REDUCE && answer.animate) {
        answer.style.overflow = 'hidden';
        var h2 = answer.scrollHeight;
        var anim2 = answer.animate(
          [{ height: h2 + 'px', opacity: '1' }, { height: '0px', opacity: '0' }],
          { duration: 180, easing: 'cubic-bezier(.23,1,.32,1)' }
        );
        anim2.onfinish = function () {
          anim2.cancel();
          answer.hidden = true;
          item.classList.remove('faq-open');
          answer.style.height = '';
          answer.style.overflow = '';
        };
      } else {
        answer.hidden = true;
        item.classList.remove('faq-open');
      }
    } else {
      item.classList.remove('faq-open');
    }
  };
  document.querySelectorAll('[data-faq]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('[data-faq-item]');
      var opening = faqAnswer(item).hidden;
      document.querySelectorAll('[data-faq-item]').forEach(function (other) {
        if (other !== item) faqSet(other, false);
      });
      faqSet(item, opening);
    });
  });

  // Media lightbox (about page)
  var lightbox = document.getElementById('pap-lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    function openMedia(card) {
      var img = card.querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeMedia() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      // The CSS exit fade needs the image on screen for its full 200ms; drop it
      // afterwards, unless the lightbox was reopened in the meantime.
      setTimeout(function () {
        if (!lightbox.classList.contains('open')) lbImg.src = '';
      }, 240);
    }
    document.querySelectorAll('[data-media]').forEach(function (card) {
      card.addEventListener('click', function () { openMedia(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMedia(card); }
      });
    });
    lightbox.addEventListener('click', function (e) { if (e.target !== lbImg) closeMedia(); });
    document.getElementById('pap-lightbox-close').addEventListener('click', closeMedia);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMedia(); });
  }

  // Contact form -> validated mailto
  var form = document.getElementById('pap-form');
  if (form) {
    var sent = document.getElementById('pap-sent');
    function setErr(name, msg) {
      var el = form.querySelector('[data-err="' + name + '"]');
      var input = form.querySelector('[name="' + name + '"]');
      if (msg) { el.textContent = msg; el.hidden = false; input.classList.add('bad'); }
      else { el.hidden = true; input.classList.remove('bad'); }
    }
    ['name', 'email', 'org', 'message'].forEach(function (n) {
      form.querySelector('[name="' + n + '"]').addEventListener('input', function () { setErr(n, ''); });
    });
    var formError = document.getElementById('pap-form-error');
    var submitBtn = form.querySelector('button[type="submit"]');
    // Captured once: re-reading it mid-flight would pick up "Sending…".
    var submitLabel = submitBtn.textContent;
    var restoreButton = function () {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return form.querySelector('[name="' + n + '"]').value.trim(); };
      var ok = true;
      if (!v('name')) { setErr('name', 'Please tell us your name'); ok = false; }
      if (!v('email')) { setErr('email', 'We need an email to reply'); ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) { setErr('email', "That email doesn't look right"); ok = false; }
      if (!v('org')) { setErr('org', 'Which company are you with?'); ok = false; }
      if (v('message').length < 12) { setErr('message', 'A line or two about the site helps'); ok = false; }
      if (!ok) return;

      var cfg = window.PAP_CONFIG || {};
      formError.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var succeed = function () {
        restoreButton(); // so "Send another" gets a usable form back
        form.hidden = true;
        sent.hidden = false;
        sent.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
      };
      var failed = function () {
        formError.hidden = false;
        restoreButton();
      };

      // Honeypot: bots that fill the hidden "website" field get the success
      // screen without anything being sent.
      if (v('website')) { succeed(); return; }

      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) { failed(); return; }

      // New sb_publishable_ keys use the apikey header only; legacy JWT (eyJ…)
      // keys also need Authorization: Bearer.
      var headers = {
        'Content-Type': 'application/json',
        apikey: cfg.SUPABASE_KEY,
        Prefer: 'return=minimal'
      };
      if (cfg.SUPABASE_KEY.indexOf('eyJ') === 0) {
        headers.Authorization = 'Bearer ' + cfg.SUPABASE_KEY;
      }

      fetch(cfg.SUPABASE_URL + '/rest/v1/' + (cfg.TABLE || 'pap_contact_submissions'), {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          name: v('name'),
          email: v('email'),
          company: v('org'),
          stage: v('stage'),
          message: v('message')
        })
      }).then(function (res) {
        if (res.ok) succeed(); else failed();
      }).catch(failed);
    });

    document.getElementById('pap-reset').addEventListener('click', function () {
      form.reset();
      form.hidden = false;
      sent.hidden = true;
      formError.hidden = true;
      restoreButton();
      ['name', 'email', 'org', 'message'].forEach(function (n) { setErr(n, ''); });
    });
  }
})();