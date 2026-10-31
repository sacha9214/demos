/* Pétale & Tige: small progressive enhancements, no framework, no build. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const euro = (n) => `${n} €`;
  const hm = (m) => `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`;

  document.documentElement.classList.add('js');

  /* ---------- Header: hairline once the page scrolls ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('#menu');
  const toggleLabel = $('.menu-toggle__label');
  const setMenu = (open) => {
    if (open) header.style.setProperty('--menu-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Fermer' : 'Menu';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Current season ---------- */
  const month = new Date().getMonth();
  const season = month >= 2 && month <= 4 ? 'printemps' : month <= 7 && month >= 5 ? 'ete' : month >= 8 && month <= 10 ? 'automne' : 'hiver';
  const seasonRow = $(`[data-season="${season}"]`);
  if (seasonRow) {
    seasonRow.classList.add('is-current');
    const tag = document.createElement('span');
    tag.className = 'season-tag';
    tag.textContent = 'En ce moment';
    const name = $('.season-list__name', seasonRow);
    name.append(tag);
  }

  /* ---------- Opening hours: today + open status ---------- */
  const HOURS = { 0: [570, 780], 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [570, 1140] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const now = new Date();
  const today = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const todayRow = $(`.hours tr[data-day="${today}"]`);
  if (todayRow) {
    todayRow.classList.add('is-today');
    const t = document.createElement('span');
    t.className = 'today-tag';
    t.textContent = "aujourd'hui";
    $('th', todayRow).append(t);
  }
  const status = $('#open-status');
  if (status) {
    const h = HOURS[today];
    const open = h && mins >= h[0] && mins < h[1];
    let text = '';
    if (open) {
      text = `Ouvert en ce moment, jusqu'à ${hm(h[1])}`;
    } else {
      for (let d = 0; d < 8; d++) {
        const dd = (today + d) % 7;
        const hh = HOURS[dd];
        if (!hh || (d === 0 && mins >= hh[0])) continue;
        text = `Fermé · ouverture ${d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : DAYS[dd]} à ${hm(hh[0])}`;
        break;
      }
    }
    status.textContent = text;
    status.classList.toggle('is-closed', !open);
    status.hidden = false;
  }

  const year = $('#year');
  if (year) year.textContent = now.getFullYear();

  /* ---------- Order form ---------- */
  const form = $('#order-form');
  if (!form) return;

  const grid = $('.order__grid');
  const success = $('#order-success');
  const summary = $('.summary');
  const alertBox = $('#form-alert');
  const bouquet = $('#f-bouquet');
  const date = $('#f-date');
  const slot = $('#f-slot');
  const msg = $('#f-message');
  const counter = $('#message-count');
  const PRICES = { S: 35, M: 50, L: 70 };
  const FEES = { lille: 9, alentours: 14 };
  const SLOTS = ['9h30 – 12h', '12h – 14h', '14h – 17h', '17h – 19h'];
  const SUNDAY_SLOTS = ['9h30 – 11h', '11h – 13h'];
  let tried = false;
  let slotKey = '';

  const val = (name) => (form.elements[name].value || '').trim();
  const isDelivery = () => val('mode') === 'livraison';
  const current = () => bouquet.selectedOptions[0];
  const isQuote = () => current().hasAttribute('data-quote');

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  date.min = iso(new Date());
  date.max = iso(maxDate);

  // Sunday has shorter hours, so it gets its own time slots
  function fillSlots() {
    const d = date.value ? new Date(`${date.value}T12:00`) : null;
    const list = d && d.getDay() === 0 ? SUNDAY_SLOTS : SLOTS;
    if (list.join() === slotKey) return;
    slotKey = list.join();
    const prev = slot.value;
    slot.replaceChildren(new Option('Choisir un créneau', ''), ...list.map((s) => new Option(s, s)));
    slot.value = list.includes(prev) ? prev : '';
  }

  function update() {
    const opt = current();
    const quote = isQuote();
    const delivery = isDelivery();
    const size = val('size') || 'M';
    const zone = val('zone') || 'lille';
    const name = opt.dataset.name || opt.textContent.trim();

    $('#size-field').hidden = quote;
    $('#zone-field').hidden = !delivery;
    $('#address-block').hidden = !delivery;
    $$('[data-delivery-only]').forEach((el) => { el.hidden = !delivery; });
    $('#when-legend').textContent = delivery ? 'Date et créneau de livraison' : 'Date et créneau de retrait';
    $('#message-label').firstChild.textContent = quote ? 'Votre projet en quelques mots ' : 'Message pour la carte ';
    $('#submit-btn').textContent = quote ? 'Envoyer ma demande de devis' : 'Valider la commande';

    const img = $('#sum-img');
    const src = `${opt.dataset.img}?auto=format&fit=crop&w=480&q=70`;
    if (img.getAttribute('src') !== src) img.src = src;
    $('#sum-name').textContent = name;
    $('#sum-sub').textContent = quote ? 'Demande de devis' : `Taille ${size} · ${delivery ? 'livraison' : "retrait à l'atelier"}`;
    $('#sum-bouquet').textContent = quote ? 'Sur devis' : euro(PRICES[size]);
    $('#sum-delivery-label').textContent = delivery ? (zone === 'lille' ? 'Livraison Lille' : 'Livraison alentours') : "Retrait à l'atelier";
    $('#sum-delivery').textContent = !delivery ? 'Offert' : quote ? 'Selon le lieu' : euro(FEES[zone]);
    const total = quote ? 'Sur devis' : euro(PRICES[size] + (delivery ? FEES[zone] : 0));
    $('#sum-total').textContent = total;
    $('[data-total]').textContent = total;
  }

  /* Validation rules: [field id, check] -> French message or '' */
  const RULES = [
    ['f-bouquet', () => (bouquet.value ? '' : 'Choisissez un bouquet.')],
    ['f-date', () => {
      if (!date.value) return isDelivery() ? 'Choisissez une date de livraison.' : 'Choisissez une date de retrait.';
      const d = new Date(`${date.value}T12:00`);
      if (Number.isNaN(d.getTime())) return 'Date invalide.';
      const t = new Date();
      if (date.value < iso(t)) return 'Cette date est déjà passée.';
      if (d.getDay() === 1) return "L'atelier est fermé le lundi\u00a0: choisissez un autre jour.";
      if (date.value > date.max) return 'Nous prenons les commandes jusqu’à six mois à l’avance.';
      if (date.value === iso(t)) {
        const m = t.getHours() * 60 + t.getMinutes();
        const cutoff = d.getDay() === 0 ? 660 : 840;
        if (isDelivery() && m >= cutoff) return `Livraison le jour même\u00a0: commandez avant ${hm(cutoff)}. Choisissez une autre date.`;
        if (m >= (d.getDay() === 0 ? 750 : 1110)) return "L'atelier ferme bientôt : choisissez une autre date.";
      }
      return '';
    }],
    ['f-slot', () => (slot.value ? '' : 'Choisissez un créneau.')],
    ['f-rname', () => (!isDelivery() || val('recipient') ? '' : 'Indiquez le nom du destinataire.')],
    ['f-address', () => (!isDelivery() || val('address').length >= 5 ? '' : "Indiquez l'adresse de livraison (numéro et rue).")],
    ['f-cp', () => {
      if (!isDelivery()) return '';
      const cp = val('cp');
      if (/^59\d{3}$/.test(cp)) return '';
      return /^\d{5}$/.test(cp) ? 'Nous livrons uniquement dans le Nord (59).' : 'Code postal à 5 chiffres, par exemple 59800.';
    }],
    ['f-city', () => (!isDelivery() || val('city') ? '' : 'Indiquez la ville.')],
    ['f-name', () => (val('name').length >= 2 ? '' : 'Indiquez votre nom.')],
    ['f-phone', () => {
      const v = val('phone');
      if (!v) return 'Indiquez votre numéro de téléphone.';
      return /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v) ? '' : 'Numéro invalide\u00a0: 10 chiffres, par exemple 06 12 34 56 78.';
    }],
    ['f-email', () => {
      const v = val('email');
      if (!v) return 'Indiquez votre adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Adresse e-mail invalide, par exemple prenom@exemple.fr.';
    }],
  ];

  function setError(el, message) {
    const err = $(`#err-${el.id.slice(2)}`);
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    if (err) err.textContent = message;
  }

  function validate() {
    const bad = [];
    RULES.forEach(([id, check]) => {
      const el = $(`#${id}`);
      const message = check();
      setError(el, message);
      if (message) bad.push(el);
    });
    return bad;
  }

  function flashSummary() {
    if (reduced) return;
    summary.classList.remove('is-flash');
    void summary.offsetWidth; // restart the animation
    summary.classList.add('is-flash');
  }

  function showForm() {
    success.hidden = true;
    grid.hidden = false;
  }

  // Pre-select from "Commander" (bouquet + chosen size) and "Demander un devis" links
  function preselect(value, size) {
    showForm();
    bouquet.value = value;
    if (size) {
      const r = $(`input[name="size"][value="${size}"]`, form);
      if (r) r.checked = true;
    }
    setError(bouquet, '');
    update();
    flashSummary();
  }
  $$('[data-bouquet]').forEach((a) => a.addEventListener('click', () => {
    const picked = $('.sizes input:checked', a.closest('.product'));
    preselect(a.dataset.bouquet, picked ? picked.value : null);
  }));
  $$('[data-devis]').forEach((a) => a.addEventListener('click', () => preselect(a.dataset.devis)));

  form.addEventListener('change', (e) => {
    if (e.target === date) fillSlots();
    update();
    if (tried) validate();
  });
  form.addEventListener('input', (e) => {
    if (e.target === msg) {
      const n = msg.value.length;
      counter.firstElementChild.textContent = n;
      counter.classList.toggle('is-near', n >= 180);
    }
    if (tried && e.target.id) {
      const rule = RULES.find(([id]) => id === e.target.id);
      if (rule) setError(e.target, rule[1]());
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    tried = true;
    const bad = validate();
    if (bad.length) {
      alertBox.textContent = bad.length === 1
        ? 'Un champ est à compléter ou à corriger.'
        : `${bad.length} champs sont à compléter ou à corriger.`;
      alertBox.hidden = false;
      bad[0].focus();
      return;
    }
    alertBox.hidden = true;
    showSuccess();
  });

  function showSuccess() {
    const opt = current();
    const quote = isQuote();
    const delivery = isDelivery();
    const size = val('size');
    const zone = val('zone');
    const name = opt.dataset.name || opt.textContent.trim();
    const when = new Date(`${date.value}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const first = val('name').split(/\s+/)[0];
    const total = PRICES[size] + (delivery ? FEES[zone] : 0);

    const rows = [
      quote ? ['Demande', `Devis\u00a0: ${name.toLowerCase()}`] : ['Bouquet', `${name}, taille ${size} (${euro(PRICES[size])})`],
      [delivery ? 'Livraison' : "Retrait à l'atelier", `${when}, ${slot.value}`],
      delivery && ['Adresse', `${val('recipient')}, ${val('address')}, ${val('cp')} ${val('city')}`],
      !delivery && val('recipient') && ['Pour', val('recipient')],
      val('message') && [quote ? 'Votre projet' : 'Message de la carte', `«\u00a0${val('message')}\u00a0»`],
      ['Vos coordonnées', `${val('name')} · ${val('phone')} · ${val('email')}`],
      ['Total', quote ? 'Sur devis' : euro(total), quote ? 'réponse sous 48\u00a0h' : delivery ? `dont ${euro(FEES[zone])} de livraison` : 'retrait offert'],
    ].filter(Boolean);

    const list = $('#success-list');
    list.replaceChildren(...rows.map(([dt, dd, note]) => {
      const div = document.createElement('div');
      const t = document.createElement('dt');
      const d = document.createElement('dd');
      t.textContent = dt;
      d.textContent = dd;
      if (note) { // total row: big figure + small detail
        div.className = 'is-total';
        const small = document.createElement('small');
        small.textContent = note;
        d.append(' ', small);
      }
      div.append(t, d);
      return div;
    }));
    $('#success-title').textContent = quote ? `Merci ${first}, votre demande est notée.` : `Merci ${first}, votre commande est notée.`;
    $('#success-lead').textContent = quote
      ? 'Camille vous rappelle sous 48 h pour parler de votre projet, puis vous envoie un devis détaillé.'
      : 'Nous vous envoyons la confirmation et le lien de paiement par SMS. Voici le récapitulatif :';

    grid.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  $('#new-order').addEventListener('click', () => {
    form.reset();
    tried = false;
    $$('[aria-invalid]', form).forEach((el) => setError(el, ''));
    alertBox.hidden = true;
    counter.firstElementChild.textContent = '0';
    counter.classList.remove('is-near');
    fillSlots();
    update();
    showForm();
    bouquet.focus();
  });

  fillSlots();
  update();
})();
