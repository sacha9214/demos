/* Clara Vidal Photographie — demo interactions. No framework, no build step. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Hero fills exactly one screen under the demo banner ---------- */
  const banner = $('.demo-banner');
  const setBanner = () => doc.style.setProperty('--banner-h', `${banner ? banner.offsetHeight : 0}px`);
  setBanner();
  addEventListener('resize', setBanner, { passive: true });

  /* ---------- Header hairline once the page scrolls ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    // The overlay starts under the header, wherever the header currently sits.
    if (open) doc.style.setProperty('--menu-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    toggle.setAttribute('aria-expanded', String(open));
    $('.menu-label', toggle).textContent = open ? 'Fermer' : 'Menu';
    doc.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Current section in the nav ---------- */
  const navLinks = $$('#site-nav ul a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => {
          if (a.hash === `#${en.target.id}`) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach((a) => { const s = $(a.hash); if (s) spy.observe(s); });
  }

  /* ---------- Reveals: text rises, photos "develop" once loaded ---------- */
  const reveal = (el) => {
    const img = el.classList.contains('develop') ? $('img', el) : null;
    if (!img || img.complete) { el.classList.add('is-in'); return; }
    const done = () => el.classList.add('is-in');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  };
  const revealEls = $$('.reveal, .develop');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        reveal(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Portfolio filter ---------- */
  const gallery = $('.gallery');
  const tiles = $$('.tile', gallery);
  const filters = $$('.filter');
  const filterStatus = $('#filter-status');
  // Masonry on a 4 px row grid: tiles are dealt to columns in turn and span
  // their own height, so numbers read left to right (CSS columns read top to bottom).
  const ROW = 4;
  const layout = () => {
    const n = getComputedStyle(gallery).gridTemplateColumns.split(' ').length;
    let i = 0;
    tiles.forEach((t) => {
      if (t.hidden) return;
      t.style.gridColumn = String((i % n) + 1);
      i += 1;
      const h = t.getBoundingClientRect().height + parseFloat(getComputedStyle(t).marginBottom);
      t.style.gridRowEnd = `span ${Math.ceil(h / ROW)}`;
    });
  };
  gallery.classList.add('is-masonry');
  layout();
  if ('ResizeObserver' in window) {
    let lastW = gallery.clientWidth;
    new ResizeObserver(() => {
      if (gallery.clientWidth === lastW) return;
      lastW = gallery.clientWidth;
      layout();
    }).observe(gallery);
  }
  if (document.fonts) document.fonts.ready.then(layout);

  const statusText = {
    all: (n) => `${n} photos affichées`,
    mariage: (n) => `${n} photos de mariage affichées`,
    portrait: (n) => `${n} portraits affichés`,
  };
  filters.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-pressed') === 'true') return;
    const f = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const apply = () => {
      let n = 0;
      tiles.forEach((t) => {
        const show = f === 'all' || t.dataset.cat === f;
        t.hidden = !show;
        if (show) { n += 1; reveal(t); }
      });
      layout();
      filterStatus.textContent = statusText[f](n);
      gallery.classList.remove('is-fading');
    };
    if (reduceMotion.matches) apply();
    else { gallery.classList.add('is-fading'); setTimeout(apply, 450); }
  }));

  /* ---------- Lightbox (native <dialog>: focus trap + Esc for free) ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  let list = [];
  let current = 0;
  let trigger = null;

  const show = (i) => {
    current = (i + list.length) % list.length;
    const tile = list[current];
    const src = $('img', tile);
    lbImg.classList.add('is-loading');
    const done = () => lbImg.classList.remove('is-loading');
    lbImg.onload = done;
    lbImg.onerror = done;
    lbImg.alt = src.alt;
    lbImg.srcset = src.srcset;
    lbImg.src = src.src;
    if (lbImg.complete && lbImg.naturalWidth) requestAnimationFrame(done);
    $('#lb-title').textContent = tile.dataset.title;
    $('#lb-meta').textContent = tile.dataset.meta;
    $('#lb-index').textContent = pad(current + 1);
    $('#lb-total').textContent = pad(list.length);
  };

  tiles.forEach((tile) => $('.tile-btn', tile).addEventListener('click', (e) => {
    list = tiles.filter((t) => !t.hidden);
    trigger = e.currentTarget;
    show(list.indexOf(tile));
    lb.showModal();
    $('.lb-close', lb).focus();
  }));

  $('.lb-close', lb).addEventListener('click', () => lb.close());
  $('.lb-prev', lb).addEventListener('click', () => show(current - 1));
  $('.lb-next', lb).addEventListener('click', () => show(current + 1));
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
  });
  lb.addEventListener('close', () => { if (trigger) trigger.focus(); trigger = null; });

  // Swipe on touch screens; a tap on the empty stage closes.
  let x0 = null;
  let swiped = false;
  lb.addEventListener('pointerdown', (e) => { x0 = e.clientX; swiped = false; });
  lb.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) { swiped = true; show(current + (dx < 0 ? 1 : -1)); }
  });
  $('.lb-stage', lb).addEventListener('click', (e) => {
    if (!swiped && e.target === e.currentTarget) lb.close();
  });

  /* ---------- Contact form (demo only: validates, never sends) ---------- */
  const form = $('#contact-form');
  const success = $('#form-success');
  const formStatus = $('#form-status');
  const dateInput = $('#f-date');
  const dateOpt = $('#date-opt');
  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  dateInput.min = todayISO;

  const el = (name) => form.elements[name];
  const val = (name) => (el(name).value || '').trim();
  const type = () => el('type').value;

  const checks = {
    type: () => (type() ? '' : 'Choisissez le type de projet.'),
    date: () => {
      const v = val('date');
      if (!v) return type() === 'Mariage' ? 'Indiquez la date du mariage, même approximative.' : '';
      return v < todayISO ? 'Cette date est déjà passée.' : '';
    },
    lieu: () => (val('lieu').length >= 2 ? '' : 'Indiquez le lieu ou la ville.'),
    budget: () => (val('budget') ? '' : 'Choisissez une fourchette de budget.'),
    message: () => (val('message').length >= 20 ? '' : 'Écrivez-moi quelques mots (20 caractères minimum).'),
    nom: () => (val('nom').length >= 2 ? '' : 'Indiquez votre prénom et votre nom.'),
    email: () => {
      const v = val('email');
      if (!v) return 'Indiquez votre adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Cette adresse e-mail ne semble pas valide (ex. : prenom@domaine.fr).';
    },
    tel: () => {
      const v = val('tel');
      return !v || /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v) ? '' : 'Ce numéro ne semble pas valide (ex. : 06 12 34 56 78).';
    },
    rgpd: () => (el('rgpd').checked ? '' : 'Merci de cocher cette case pour que je puisse vous répondre.'),
  };

  const setError = (name, msg) => {
    const field = $(`[data-field="${name}"]`, form);
    const controls = name === 'type' ? $$('input[name="type"]', form) : [el(name)];
    $(`#err-${name}`).textContent = msg;
    field.classList.toggle('is-invalid', !!msg);
    controls.forEach((c) => (msg ? c.setAttribute('aria-invalid', 'true') : c.removeAttribute('aria-invalid')));
    return !!msg;
  };

  const syncDateHint = () => {
    const t = type();
    dateOpt.textContent = t === 'Mariage' ? '*' : t ? '(facultatif)' : '(facultatif pour un portrait)';
    dateOpt.className = t === 'Mariage' ? 'req' : 'opt';
  };

  let submitted = false;
  const revalidate = (e) => {
    const name = e.target.name;
    if (name === 'type') syncDateHint();
    if (!submitted) return;
    if (checks[name]) setError(name, checks[name]());
    if (name === 'type') setError('date', checks.date());
    const left = Object.keys(checks).filter((k) => checks[k]()).length;
    formStatus.textContent = !left ? '' : left === 1
      ? 'Un champ est à compléter ou à corriger.'
      : `${left} champs sont à compléter ou à corriger.`;
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  // Offer links pre-select the project type.
  $$('a[data-type]').forEach((a) => a.addEventListener('click', () => {
    const radio = $(`input[name="type"][value="${a.dataset.type}"]`, form);
    if (radio) { radio.checked = true; syncDateHint(); }
  }));

  const frenchDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitted = true;
    const invalid = Object.keys(checks).filter((k) => setError(k, checks[k]()));
    if (invalid.length) {
      formStatus.textContent = invalid.length === 1
        ? 'Un champ est à compléter ou à corriger.'
        : `${invalid.length} champs sont à compléter ou à corriger.`;
      const first = invalid[0] === 'type' ? $('input[name="type"]', form) : el(invalid[0]);
      first.focus();
      return;
    }

    const optText = (name) => { const s = el(name); return s.value ? s.options[s.selectedIndex].text : ''; };
    const msg = val('message');
    const rows = [
      ['Projet', type()],
      ['Date', val('date') ? frenchDate(val('date')) : 'À définir'],
      ['Lieu', val('lieu')],
      ['Budget', optText('budget')],
      ['Nom', val('nom')],
      ['E-mail', val('email')],
      ['Téléphone', val('tel') || 'Non renseigné'],
      ['M’a connue via', optText('source') || 'Non précisé'],
      ['Message', msg.length > 240 ? `${msg.slice(0, 240)}…` : msg],
    ];
    const summary = $('#form-summary');
    summary.replaceChildren(...rows.map(([k, v]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      row.append(dt, dd);
      return row;
    }));
    $('#success-title').textContent = `Merci, ${val('nom').split(/\s+/)[0]}.`;
    formStatus.textContent = '';
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  $('#form-reset').addEventListener('click', () => {
    form.reset();
    submitted = false;
    Object.keys(checks).forEach((k) => setError(k, ''));
    syncDateHint();
    success.hidden = true;
    form.hidden = false;
    $('input[name="type"]', form).focus();
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
})();
