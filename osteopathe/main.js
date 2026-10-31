/* Cabinet d'ostéopathie Camille Aubert — demo interactions (no framework, no build). */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Header state on scroll ---------- */
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('#mobile-menu');
  const toggleLabel = $('.menu-toggle-label', toggle);
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Fermer' : 'Menu';
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 981px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    reveals.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Footer year & today's opening hours ---------- */
  $('#year').textContent = String(new Date().getFullYear());
  const today = String(new Date().getDay());
  $$('.hours-table tr').forEach((tr) => {
    if (!tr.dataset.days.split(',').includes(today)) return;
    tr.classList.add('is-today');
    const tag = document.createElement('span');
    tag.className = 'today-tag';
    tag.textContent = 'Aujourd’hui';
    $('th', tr).append(tag);
  });

  /* ======================================================================
     Booking demo: next 5 opening days, fake availability, validation
     ====================================================================== */
  const WEEKDAY_SLOTS = ['08:30', '09:15', '10:00', '10:45', '11:30', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45', '18:30'];
  const SATURDAY_SLOTS = ['08:30', '09:15', '10:00', '10:45', '11:30'];
  const TYPES = {
    adulte: { label: 'Consultation adulte', price: '60 €', duration: '45 min environ' },
    sportif: { label: 'Consultation sportif', price: '60 €', duration: '45 min environ' },
    enceinte: { label: 'Femme enceinte', price: '60 €', duration: '45 min environ' },
    nourrisson: { label: 'Nourrisson', price: '55 €', duration: '30 à 45 min' },
  };

  const fmtWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = (t) => t.replace(/^0/, '').replace(':', 'h');
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Small deterministic hash so the same day always shows the same "taken" slots.
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  // Build the next 5 opening days (Monday to Saturday), starting tomorrow.
  const days = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (days.length < 5) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday === 0) continue;
    const key = isoDate(cursor);
    const slots = (weekday === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS)
      .map((t) => ({ t, taken: hash(`${key}T${t}`) % 100 < 46 }));
    if (slots.filter((s) => !s.taken).length < 3) { slots[1].taken = false; slots[slots.length - 2].taken = false; slots[slots.length - 1].taken = false; }
    days.push({ date: new Date(cursor), key, slots });
  }

  const form = $('#booking-form');
  const tabsEl = $('#day-tabs');
  const panel = $('#slot-panel');
  const slotInput = $('#slot-input');
  const slotError = $('#slot-error');
  const success = $('#booking-success');
  const state = { day: 0, picked: null }; // picked = { day, t }

  const freeCount = (d) => d.slots.filter((s) => !s.taken).length;

  function renderTabs() {
    tabsEl.innerHTML = days.map((d, i) => {
      const selected = i === state.day;
      const n = freeCount(d);
      const longLabel = `${fmtLong.format(d.date)}, ${n} créneau${n > 1 ? 'x' : ''} libre${n > 1 ? 's' : ''}`;
      return `<button type="button" role="tab" class="day-tab" id="day-tab-${i}" aria-controls="slot-panel" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" aria-label="${longLabel}">
        <span class="d-name">${fmtWeekday.format(d.date)}</span>
        <span class="d-num">${d.date.getDate()}</span>
        <span class="d-month">${fmtMonth.format(d.date)}</span>
        <span class="d-count">${n} libre${n > 1 ? 's' : ''}</span>
      </button>`;
    }).join('');
  }

  function renderSlots() {
    const d = days[state.day];
    panel.setAttribute('aria-labelledby', `day-tab-${state.day}`);
    const button = (s) => {
      if (s.taken) return `<button type="button" class="slot" disabled aria-label="${fmtTime(s.t)}, déjà réservé">${fmtTime(s.t)}</button>`;
      const pressed = !!state.picked && state.picked.day === state.day && state.picked.t === s.t;
      return `<button type="button" class="slot" data-time="${s.t}" aria-pressed="${pressed}">${fmtTime(s.t)}</button>`;
    };
    const group = (label, list) => (list.length
      ? `<div class="slot-group"><p class="slot-group-label">${label}</p><div class="slot-grid">${list.map(button).join('')}</div></div>`
      : '');
    panel.innerHTML = group('Matin', d.slots.filter((s) => s.t < '12:00'))
      + group('Après-midi', d.slots.filter((s) => s.t >= '12:00'));
  }

  function selectDay(i, focus) {
    state.day = i;
    renderTabs();
    renderSlots();
    if (focus) $(`#day-tab-${i}`).focus();
  }

  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) selectDay(Number(tab.id.split('-').pop()), true);
  });
  tabsEl.addEventListener('keydown', (e) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(e.key in moves)) return;
    e.preventDefault();
    let next = state.day + moves[e.key];
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = days.length - 1;
    selectDay((next + days.length) % days.length, true);
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.slot[data-time]');
    if (!btn) return;
    pickSlot(state.day, btn.dataset.time);
  });

  function pickSlot(dayIndex, t) {
    state.picked = { day: dayIndex, t };
    slotInput.value = `${days[dayIndex].key} ${t}`;
    slotError.textContent = '';
    if (state.day !== dayIndex) selectDay(dayIndex, false);
    else $$('.slot[data-time]', panel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === t)));
    updateSummary();
  }

  /* Live summary */
  const sum = {
    date: $('#sum-date'), time: $('#sum-time'), type: $('#sum-type'),
    duration: $('#sum-duration'), price: $('#sum-price'),
  };
  const setSum = (el, value, fallback) => {
    el.textContent = value || fallback;
    el.classList.toggle('is-empty', !value);
  };
  const pickedType = () => {
    const input = $('input[name="type"]:checked', form);
    return input ? input.value : null;
  };

  function updateSummary() {
    const p = state.picked;
    setSum(sum.date, p ? cap(fmtLong.format(days[p.day].date)) : '', 'À choisir');
    setSum(sum.time, p ? fmtTime(p.t) : '', 'À choisir');
    const type = TYPES[pickedType()];
    setSum(sum.type, type ? type.label : '', 'À préciser');
    sum.duration.textContent = type ? type.duration : '45 min environ';
    sum.price.textContent = type ? type.price : '60 €';
  }

  /* Patient type */
  const typeField = $('#type-field');
  const typeError = $('#type-error');
  const babyHint = $('#baby-hint');
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'type') return;
    typeError.textContent = '';
    typeField.removeAttribute('aria-invalid');
    babyHint.hidden = e.target.value !== 'nourrisson';
    updateSummary();
  });

  /* Hero "next free slot" shortcut */
  const nextSlotLink = $('#next-slot');
  const firstFree = (() => {
    for (let i = 0; i < days.length; i++) {
      const s = days[i].slots.find((x) => !x.taken);
      if (s) return { day: i, t: s.t };
    }
    return null;
  })();
  if (firstFree) {
    $('#next-slot-value').textContent = `${cap(fmtLong.format(days[firstFree.day].date))} à ${fmtTime(firstFree.t)}`;
    nextSlotLink.addEventListener('click', () => pickSlot(firstFree.day, firstFree.t));
  }

  /* Validation */
  const fields = {
    name: $('#f-name'), phone: $('#f-phone'), email: $('#f-email'), motif: $('#f-motif'), first: $('#f-first'),
  };
  const errorFor = (input) => $(`#${input.getAttribute('aria-describedby')}`);
  const setError = (input, message) => {
    errorFor(input).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };
  const validators = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom et votre prénom.'),
    phone: (v) => {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return 'Indiquez votre numéro de téléphone.';
      return /^(?:\+33|0033|0)[1-9]\d{8}$/.test(digits) ? '' : 'Ce numéro semble incomplet. Exemple : 06 12 34 56 78.';
    },
    email: (v) => {
      if (!v.trim()) return 'Indiquez votre adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Cette adresse e-mail semble incomplète. Exemple : vous@exemple.fr.';
    },
  };
  ['name', 'phone', 'email'].forEach((key) => {
    const input = fields[key];
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) setError(input, validators[key](input.value)); });
    input.addEventListener('blur', () => { if (input.value) setError(input, validators[key](input.value)); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const invalid = [];

    if (!state.picked) {
      slotError.textContent = 'Choisissez un horaire disponible.';
      invalid.push($('.slot[data-time]', panel) || panel);
    }
    if (!pickedType()) {
      typeError.textContent = 'Indiquez qui consulte.';
      typeField.setAttribute('aria-invalid', 'true');
      invalid.push($('input[name="type"]', form));
    }
    ['name', 'phone', 'email'].forEach((key) => {
      const msg = validators[key](fields[key].value);
      setError(fields[key], msg);
      if (msg) invalid.push(fields[key]);
    });

    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    showSuccess();
  });

  function showSuccess() {
    const p = state.picked;
    const type = TYPES[pickedType()];
    const rows = [
      ['Rendez-vous', `${cap(fmtLong.format(days[p.day].date))} à ${fmtTime(p.t)}`],
      ['Consultation', `${type.label} · ${type.price}`],
      ['Durée', type.duration],
      ['Nom', fields.name.value.trim()],
      ['Téléphone', fields.phone.value.trim()],
      ['E-mail', fields.email.value.trim()],
      ['Première consultation', fields.first.checked ? 'Oui' : 'Non'],
    ];
    if (fields.motif.value.trim()) rows.push(['Motif', fields.motif.value.trim()]);

    const list = $('#success-list');
    list.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      row.append(dt, dd);
      return row;
    }));
    const firstName = fields.name.value.trim().split(/\s+/)[0];
    $('#success-lead').textContent = `Merci ${firstName}. Voici le récapitulatif de votre rendez-vous au cabinet, 12 rue du Verger-Saint-Clair.`;

    // The slot is now booked in this demo session.
    days[p.day].slots.find((s) => s.t === p.t).taken = true;

    form.hidden = true;
    success.hidden = false;
    $('.booking-card').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    $('#success-title').focus({ preventScroll: true });
  }

  $('#booking-reset').addEventListener('click', () => {
    form.reset();
    state.picked = null;
    slotInput.value = '';
    babyHint.hidden = true;
    typeField.removeAttribute('aria-invalid');
    success.hidden = true;
    form.hidden = false;
    renderTabs();
    renderSlots();
    updateSummary();
    $(`#day-tab-${state.day}`).focus();
  });

  renderTabs();
  renderSlots();
  updateSummary();
})();
