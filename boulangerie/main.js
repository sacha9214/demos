/* Maison Fournier · demo site behaviour. No framework, no network calls. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Opening hours in minutes since midnight, indexed by Date#getDay() (0 = Sunday).
  const HOURS = [[390, 810], null, [390, 1170], [390, 1170], [390, 1170], [390, 1170], [390, 1170]];
  // Hot baguette batches, same indexing.
  const BAKES = [[420, 630], null, [420, 690, 1020], [420, 690, 1020], [420, 690, 1020], [420, 690, 1020], [420, 690, 1020]];
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const time = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  const euro = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  /* ---------- Header: shadow once scrolled ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('#menu-mobile');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Today's hours (hero) + table highlight ---------- */
  const now = new Date();
  const today = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const nextOpenDay = () => {
    for (let i = 1; i <= 7; i++) {
      const d = (today + i) % 7;
      if (HOURS[d]) return i === 1 ? 'demain' : DAYS[d];
    }
    return '';
  };

  const dayEl = $('[data-today-day]');
  const statusEl = $('[data-today-status]');
  const dotEl = $('[data-today-dot]');
  const bakeEl = $('[data-today-bake]');
  const h = HOURS[today];
  dayEl.textContent = `Aujourd’hui, ${DAYS[today]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  if (!h) {
    statusEl.textContent = `Fermé le lundi · réouverture ${nextOpenDay()} à 6h30`;
    dotEl.classList.add('is-closed');
    bakeEl.textContent = 'Commandez dès maintenant pour demain matin.';
  } else if (mins < h[0]) {
    statusEl.textContent = `Ouvre à ${time(h[0])}, jusqu’à ${time(h[1])}`;
    bakeEl.textContent = `Première fournée de tradition à ${time(BAKES[today][0])}`;
  } else if (mins < h[1]) {
    statusEl.textContent = `Ouvert jusqu’à ${time(h[1])}`;
    dotEl.classList.add('is-open');
    const next = BAKES[today].find((b) => b > mins);
    bakeEl.textContent = next ? `Prochaine fournée de tradition à ${time(next)}` : 'Dernières baguettes du jour au comptoir';
  } else {
    statusEl.textContent = `Fermé · réouverture ${nextOpenDay()} à 6h30`;
    dotEl.classList.add('is-closed');
    bakeEl.textContent = 'Commandez ce soir, retirez demain matin.';
  }

  const row = $(`.hours tr[data-day="${today}"]`);
  if (row) row.classList.add('is-today');

  /* ---------- Product tabs (WAI-ARIA tabs pattern) ---------- */
  const tabs = $$('[role="tab"]');
  const selectTab = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`).classList.toggle('is-active', on);
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      selectTab(tabs[(keys[e.key] + tabs.length) % tabs.length], true);
    });
  });

  /* ---------- Click & collect form ---------- */
  const form = $('#order-form');
  const items = $$('.order-item', form);
  const MAX = 30;
  const qtyOf = (input) => Math.min(MAX, Math.max(0, parseInt(input.value, 10) || 0));

  const daysWrap = $('#pickup-days');
  const slotsWrap = $('#pickup-slots');
  const SLOTS_WEEK = [[390, 540], [540, 720], [720, 960], [960, 1170]];
  const SLOTS_SUNDAY = [[390, 540], [540, 660], [660, 810]];
  const pickup = { day: null, slot: null };

  function readCart() {
    let total = 0;
    const lines = [];
    items.forEach((li) => {
      const input = $('input', li);
      const q = qtyOf(input);
      li.classList.toggle('is-picked', q > 0);
      $('[data-step="-1"]', li).classList.toggle('is-min', q === 0);
      if (q) {
        const sum = q * parseFloat(li.dataset.price);
        total += sum;
        lines.push({ q, name: li.dataset.name, sum });
      }
    });
    return { lines, total };
  }

  function renderLines(list, lines) {
    list.replaceChildren(...lines.map((l) => {
      const li = el('li');
      const label = el('span');
      label.append(el('span', 'qty', `${l.q} ×`), l.name);
      li.append(label, el('span', '', euro(l.sum)));
      return li;
    }));
  }

  const whenText = () => {
    if (!pickup.day) return null;
    const d = pickup.day;
    const date = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return pickup.slot ? `${date}, entre ${time(pickup.slot[0])} et ${time(pickup.slot[1])}` : date;
  };

  function update() {
    const cart = readCart();
    renderLines($('#ticket-lines'), cart.lines);
    $('#ticket-empty').hidden = cart.lines.length > 0;
    $('#ticket-total').textContent = euro(cart.total);
    const when = $('#ticket-when');
    const w = whenText();
    when.replaceChildren('Retrait : ');
    if (w) when.append(el('strong', '', w)); else when.append('jour et créneau à choisir');
    return cart;
  }

  // Pickup days: the next 6 opening days, starting tomorrow, never on Monday.
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const dayDates = [];
  for (let offset = 1; dayDates.length < 6; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    if (d.getDay() !== 1) dayDates.push(d);
  }
  dayDates.forEach((d, i) => {
    const label = el('label', 'chip day-chip');
    const input = el('input');
    input.type = 'radio';
    input.name = 'day';
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const face = el('span');
    const visual = [el('span', 'dow', i === 0 ? 'Demain' : DAYS[d.getDay()].slice(0, 3) + '.'), el('span', 'dnum', String(d.getDate())), el('span', 'mon', MONTHS_SHORT[d.getMonth()])];
    visual.forEach((v) => v.setAttribute('aria-hidden', 'true'));
    face.append(...visual, el('span', 'sr-only', `${i === 0 ? 'Demain, ' : ''}${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`));
    label.append(input, face);
    input.addEventListener('change', () => { pickup.day = d; renderSlots(); setError('day'); update(); });
    daysWrap.append(label);
  });

  function renderSlots() {
    const list = pickup.day.getDay() === 0 ? SLOTS_SUNDAY : SLOTS_WEEK;
    const keep = pickup.slot && list.some((s) => s[0] === pickup.slot[0] && s[1] === pickup.slot[1]);
    if (!keep) pickup.slot = null;
    slotsWrap.replaceChildren(...list.map((s) => {
      const label = el('label', 'chip slot-chip');
      const input = el('input');
      input.type = 'radio';
      input.name = 'slot';
      input.value = `${time(s[0])}-${time(s[1])}`;
      input.checked = !!keep && pickup.slot[0] === s[0];
      input.addEventListener('change', () => { pickup.slot = s; setError('slot'); update(); });
      label.append(input, el('span', '', `${time(s[0])} – ${time(s[1])}`));
      return label;
    }));
  }

  // Steppers (event delegation) and typed quantities
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const input = $('input', btn.closest('.order-item'));
    input.value = Math.min(MAX, Math.max(0, qtyOf(input) + Number(btn.dataset.step)));
    const cart = update();
    if (cart.lines.length) setError('products');
  });
  form.addEventListener('input', (e) => {
    if (e.target.matches('.stepper input')) { if (update().lines.length) setError('products'); }
    if (e.target.id === 'c-name') setError('name');
    if (e.target.id === 'c-phone') setError('phone');
  });
  form.addEventListener('change', (e) => {
    if (e.target.matches('.stepper input')) { e.target.value = qtyOf(e.target); update(); }
  });

  // Validation
  const fieldFor = { name: '#c-name', phone: '#c-phone' };
  function setError(key, msg) {
    const box = $(`#err-${key}`);
    box.textContent = msg || '';
    box.hidden = !msg;
    if (fieldFor[key]) {
      const f = $(fieldFor[key]);
      if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cart = update();
    const name = $('#c-name').value.trim();
    const phoneRaw = $('#c-phone').value.trim();
    const phone = phoneRaw.replace(/[\s.\-()]/g, '');
    const errors = [];

    const check = (key, msg, target) => { setError(key, msg); if (msg) errors.push(target); };
    check('products', cart.lines.length ? '' : 'Ajoutez au moins un produit à votre commande (bouton +).', $('.stepper input', form));
    check('day', pickup.day ? '' : 'Choisissez un jour de retrait.', $('input[name="day"]', form));
    check('slot', !pickup.day || pickup.slot ? '' : 'Choisissez un créneau horaire.', $('input[name="slot"]', form));
    if (!pickup.day) setError('slot');
    check('name', name.length >= 2 ? '' : 'Indiquez votre nom, pour que l’on retrouve votre commande.', $('#c-name'));
    check('phone', !phone ? 'Indiquez un numéro de téléphone.'
      : /^(?:0|\+33|0033)[1-9]\d{8}$/.test(phone) ? '' : 'Ce numéro ne semble pas valide : 10 chiffres, commençant par 0.', $('#c-phone'));

    const alert = $('#form-alert');
    if (errors.length) {
      alert.textContent = errors.length === 1
        ? 'Il manque une information : vérifiez le champ signalé.'
        : `Il manque ${errors.length} informations : vérifiez les champs signalés.`;
      alert.hidden = false;
      errors[0].focus({ preventScroll: true });
      errors[0].closest('fieldset, .field').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    alert.hidden = true;

    // Demo success: summarise, never send anything.
    const first = name.split(/\s+/)[0];
    $('#success-title').textContent = `Merci ${first}, c’est noté !`;
    const when = $('#success-when');
    when.replaceChildren('Votre commande vous attend ', el('strong', '', whenText()), ', au comptoir du 12 rue des Fileuses.');
    renderLines($('#success-lines'), cart.lines);
    $('#success-total').textContent = euro(cart.total);
    $('#success-contact').textContent = `En cas d’imprévu, nous vous appellerons au ${phoneRaw}.`;
    form.hidden = true;
    const success = $('#order-success');
    success.hidden = false;
    success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    $('#success-title').focus({ preventScroll: true });
  });

  $('#order-again').addEventListener('click', () => {
    form.reset();
    pickup.day = null;
    pickup.slot = null;
    slotsWrap.replaceChildren(el('p', 'chips-hint', 'Choisissez d’abord un jour.'));
    update();
    $('#order-success').hidden = true;
    form.hidden = false;
    $('.stepper input', form).focus();
  });

  update();

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add('is-in'));
  }

  // Images in hidden tabs never trigger lazy-loading: warm them up once the section is near.
  const warmTabs = () => $$('.tab-panel img').forEach((img) => { img.loading = 'eager'; });
  if ('IntersectionObserver' in window) {
    const warm = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { warmTabs(); warm.disconnect(); }
    }, { rootMargin: '600px 0px' });
    warm.observe($('#produits'));
  } else {
    warmTabs();
  }

  /* ---------- Footer year ---------- */
  $('#year').textContent = String(now.getFullYear());
})();
