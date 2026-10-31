/* Encre Noire: demo interactions. Vanilla JS, no dependencies, no network calls. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Mobile menu ---------- */
  const header = $('.site-header');
  const toggle = $('.menu-toggle');
  const nav = $('#menu');
  const toggleLabel = $('.menu-toggle__label');

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Fermer' : 'Menu';
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Portfolio filters ---------- */
  const works = $('.works');
  const items = $$('.work', works);
  const filterBtns = $$('[data-filter-btn]');
  const status = $('#filter-status');
  const names = { all: 'tous styles', fineline: 'fine line', blackwork: 'blackwork', realisme: 'réalisme' };

  const applyFilter = (key) => {
    let shown = 0;
    filterBtns.forEach((b) => {
      const on = b.dataset.filter === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    items.forEach((it) => {
      const show = key === 'all' || it.dataset.style === key;
      it.hidden = !show;
      if (show) shown += 1;
    });
    works.dataset.view = key === 'all' ? 'all' : 'filtered';
    status.textContent = `${shown} pièce${shown > 1 ? 's' : ''} affichée${shown > 1 ? 's' : ''} : ${names[key]}`;
  };
  filterBtns.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  // "Voir son travail" links and cover lines pre-select a style before jumping to #portfolio
  $$('a[data-filter]').forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filter)));

  /* ---------- Lightbox (native <dialog>) ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbTitle = $('#lb-title');
  const lbMeta = $('#lb-meta');
  const lbCount = $('#lb-count');
  let visible = [];
  let current = 0;
  let trigger = null;

  const unsplash = (base, w) => `${base}?auto=format&fit=max&w=${w}&q=75`;
  const show = (i) => {
    current = (i + visible.length) % visible.length;
    const btn = visible[current];
    const thumb = $('img', btn);
    const base = btn.dataset.full;
    lbImg.src = unsplash(base, 1200);
    lbImg.srcset = [800, 1200, 1600].map((w) => `${unsplash(base, w)} ${w}w`).join(', ');
    lbImg.sizes = '(min-width: 760px) 70vw, 100vw';
    lbImg.alt = thumb.alt;
    lbImg.width = thumb.width;
    lbImg.height = thumb.height;
    lbTitle.textContent = btn.dataset.title;
    lbMeta.textContent = btn.dataset.meta;
    lbCount.textContent = `${pad(current + 1)} / ${pad(visible.length)}`;
  };

  works.addEventListener('click', (e) => {
    const btn = e.target.closest('.work__btn');
    if (!btn || typeof lb.showModal !== 'function') return;
    visible = items.filter((it) => !it.hidden).map((it) => $('.work__btn', it));
    trigger = btn;
    show(visible.indexOf(btn));
    lb.showModal();
    document.body.classList.add('no-scroll');
  });
  $('[data-lb-prev]', lb).addEventListener('click', () => show(current - 1));
  $('[data-lb-next]', lb).addEventListener('click', () => show(current + 1));
  $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });
  // Click on the dark area around the picture closes the viewer
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.classList.contains('lightbox__fig') || e.target.classList.contains('lightbox__inner')) lb.close();
  });
  lb.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
    if (trigger) trigger.focus();
  });

  /* ---------- Project request form (demo only: nothing is sent) ---------- */
  const form = $('#form-projet');
  const success = $('#form-success');
  const summary = $('#form-summary');
  const desc = $('#f-description');
  const descCount = $('#desc-count');
  const daysBox = $('.days');
  let submitted = false;

  const val = (name) => (form.elements[name].value || '').trim();
  const days = () => $$('input[name="dispo"]:checked', form).map((c) => c.value);

  const rules = {
    style: (v) => (v ? '' : 'Choisissez un style, ou « Je ne sais pas encore ».'),
    zone: (v) => (v ? '' : 'Indiquez la zone du corps à tatouer.'),
    taille: (v) => {
      if (!v) return 'Indiquez une taille approximative, en centimètres.';
      const n = Number(v.replace(',', '.'));
      return n >= 1 && n <= 100 ? '' : 'La taille doit être comprise entre 1 et 100 cm.';
    },
    budget: (v) => (v ? '' : 'Choisissez une fourchette de budget.'),
    description: (v) => (v.length >= 30 ? '' : `Décrivez votre projet en 30 caractères minimum (encore ${30 - v.length}).`),
    reference: (v) => (!v || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v) ? '' : 'Ce lien ne semble pas valide : il doit commencer par https://'),
    prenom: (v) => (v.length >= 2 ? '' : 'Indiquez votre prénom.'),
    email: (v) => {
      if (!v) return 'Indiquez votre adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Cette adresse e-mail n’est pas valide (ex. prenom@domaine.fr).';
    },
    tel: (v) => {
      if (!v) return 'Indiquez un numéro de téléphone.';
      return /^(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v) ? '' : 'Ce numéro ne semble pas valide (ex. 06 12 34 56 78).';
    },
  };

  const setError = (key, msg, control) => {
    const err = $(`#err-${key}`);
    err.textContent = msg;
    control.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const ids = (control.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== err.id);
    if (msg) ids.push(err.id);
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
    return !msg;
  };

  const checkField = (key) => setError(key, rules[key](val(key)), form.elements[key]);
  const checkDays = () => {
    const msg = days().length ? '' : 'Cochez au moins un jour où vous êtes disponible.';
    $('#err-dispo').textContent = msg;
    daysBox.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const checkAdult = () => {
    const box = form.elements.majeur;
    return setError('majeur', box.checked ? '' : 'Cette case est obligatoire : nous ne tatouons que les personnes majeures.', box);
  };

  const updateCount = () => { descCount.textContent = desc.value.trim().length; };
  desc.addEventListener('input', updateCount);

  // After a first submit attempt, errors update live as the visitor fixes them
  Object.keys(rules).forEach((key) => {
    const el = form.elements[key];
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => { if (submitted) checkField(key); });
    el.addEventListener('blur', () => { if (submitted || (el.value && key !== 'description')) checkField(key); });
  });
  $$('input[name="dispo"]', form).forEach((c) => c.addEventListener('change', () => { if (submitted) checkDays(); }));
  form.elements.majeur.addEventListener('change', () => { if (submitted) checkAdult(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitted = true;
    const results = Object.keys(rules).map((key) => [key, checkField(key)]);
    const daysOk = checkDays();
    const adultOk = checkAdult();
    const bad = results.filter(([, ok]) => !ok).map(([key]) => form.elements[key]);
    if (!daysOk) bad.push($('input[name="dispo"]', form));
    if (!adultOk) bad.push(form.elements.majeur);

    if (bad.length) {
      summary.hidden = false;
      summary.textContent = bad.length === 1
        ? 'Un champ est à compléter ou à corriger avant l’envoi.'
        : `${bad.length} champs sont à compléter ou à corriger avant l’envoi.`;
      // Order of `bad` follows the form, so the first one is the topmost invalid field
      const first = [...form.elements].find((el) => bad.includes(el));
      (first || bad[0]).focus();
      return;
    }

    summary.hidden = true;
    const rows = [
      ['Style', val('style')],
      ['Zone', val('zone')],
      ['Taille', `${val('taille').replace('.', ',')} cm environ`],
      ['Budget', val('budget')],
      ['Disponibilités', days().join(', ')],
      ['Projet', val('description')],
      ['Référence', val('reference') || 'Aucune'],
      ['Contact', `${val('prenom')} · ${val('email')} · ${val('tel')}`],
      ['Âge', '18 ans ou plus (confirmé)'],
    ];
    const list = $('#success-list');
    list.textContent = '';
    rows.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      list.append(dt, dd);
    });
    $('#success-title').textContent = `Merci, ${val('prenom')}.`;
    form.hidden = true;
    success.hidden = false;
    $('#success-title').focus();
  });

  $('#success-reset').addEventListener('click', () => {
    form.reset();
    submitted = false;
    $$('[aria-invalid]', form).forEach((el) => el.setAttribute('aria-invalid', 'false'));
    $$('.field__error', form).forEach((el) => { el.textContent = ''; });
    updateCount();
    success.hidden = true;
    form.hidden = false;
    form.elements.style.focus();
  });

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('.reveal');
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
})();
