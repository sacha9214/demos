/* Garage Lefèvre — demo site interactions. No framework, no network calls. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  const toggleLabel = $('.visually-hidden', toggle);

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 1001px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Header shadow once the page scrolls ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Opening hours, computed in Paris time ---------- */
  // Minutes from midnight; index 0 = Sunday.
  const WEEK = [[480, 720], [810, 1110]];
  const HOURS = [[], WEEK, WEEK, WEEK, WEEK, WEEK, [[480, 720]]];
  const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const parisNow = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', weekday: 'short', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
      minutes: Number(get('hour')) * 60 + Number(get('minute')),
      iso: `${get('year')}-${get('month')}-${get('day')}`,
    };
  };

  const fmtTime = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;

  const openStatus = () => {
    const { day, minutes } = parisNow();
    for (const [start, end] of HOURS[day]) {
      if (minutes >= start && minutes < end) return { open: true, text: `Ouvert · jusqu’à ${fmtTime(end)}` };
    }
    for (const [start] of HOURS[day]) {
      if (minutes < start) return { open: false, text: `Fermé · ouvre à ${fmtTime(start)}` };
    }
    for (let i = 1; i <= 7; i += 1) {
      const d = (day + i) % 7;
      if (HOURS[d].length) {
        const when = i === 1 ? 'demain' : DAY_NAMES[d];
        return { open: false, text: `Fermé · ouvre ${when} à ${fmtTime(HOURS[d][0][0])}` };
      }
    }
    return { open: false, text: 'Fermé' };
  };

  const renderStatus = () => {
    const s = openStatus();
    $$('[data-status]').forEach((el) => {
      el.textContent = s.text;
      el.dataset.state = s.open ? 'open' : 'closed';
    });
  };
  renderStatus();
  setInterval(renderStatus, 60000);

  const todayRow = $(`.hours [data-day="${parisNow().day}"]`);
  if (todayRow) {
    todayRow.classList.add('is-today');
    const tag = document.createElement('span');
    tag.className = 'today-tag';
    tag.textContent = 'Aujourd’hui';
    todayRow.querySelector('th').append(tag);
  }

  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window && !reducedMotion) {
    document.documentElement.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
      io.observe(el);
    });
  }

  /* ---------- Booking form ---------- */
  const form = $('#rdv-form');
  if (!form) return;

  const success = $('#rdv-success');
  const alertBox = $('#form-alert');
  const plate = $('#plaque');
  const plateBox = $('#plate-box');
  const noPlate = $('#sans-plaque');
  const km = $('#km');
  const date = $('#date');

  // Pre-select a service when a "Réserver" link is used.
  $$('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const box = $$('input[name="prestation"]', form).find((c) => c.value === link.dataset.service);
      if (box) box.checked = true;
    });
  });

  // Number plate: uppercase, strip junk, insert dashes as you type (AA-123-AA).
  // The caret is kept after the same number of characters, so editing mid-plate works.
  plate.addEventListener('input', () => {
    const caret = plate.selectionStart ?? plate.value.length;
    const before = plate.value.slice(0, caret).replace(/[^A-Za-z0-9]/g, '').length;
    const raw = plate.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    let out = raw.slice(0, 2);
    if (raw.length > 2) out += `-${raw.slice(2, 5)}`;
    if (raw.length > 5) out += `-${raw.slice(5, 7)}`;
    plate.value = out;
    let pos = 0;
    for (let n = 0; pos < out.length && n < before; pos += 1) if (out[pos] !== '-') n += 1;
    if (out[pos] === '-' && before > 0) pos += 1;
    plate.setSelectionRange(pos, pos);
  });

  noPlate.addEventListener('change', () => {
    plate.disabled = noPlate.checked;
    plateBox.classList.toggle('is-disabled', noPlate.checked);
    if (noPlate.checked) plate.value = '';
    if (form.dataset.submitted) validateField('plaque');
  });

  // Mileage: digits only, French thousands separator.
  km.addEventListener('input', () => {
    const digits = km.value.replace(/\D/g, '').slice(0, 7);
    km.value = digits ? Number(digits).toLocaleString('fr-FR') : '';
  });

  date.min = parisNow().iso;

  // French SIV format: no I, O or U; the number block cannot be 000.
  const PLATE_RE = /^[A-HJ-NP-TV-Z]{2}-(?!000)\d{3}-[A-HJ-NP-TV-Z]{2}$/;
  const PHONE_RE = /^(?:\+33|0033|0)[1-9]\d{8}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MAX_DAYS_AHEAD = 90;

  const checked = (name) => $$(`input[name="${name}"]:checked`, form);
  const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);

  const rules = {
    plaque() {
      if (noPlate.checked) return '';
      if (!plate.value) return 'Indiquez l’immatriculation, ou cochez « Pas encore immatriculé ».';
      return PLATE_RE.test(plate.value) ? '' : 'Format attendu : AA-123-AA (sans les lettres I, O et U).';
    },
    marque: () => ($('#marque').value.trim().length >= 2 ? '' : 'Indiquez la marque du véhicule.'),
    modele: () => ($('#modele').value.trim() ? '' : 'Indiquez le modèle (ex. 308, Clio, Golf).'),
    km() {
      const v = km.value.replace(/\D/g, '');
      if (!v) return 'Indiquez le kilométrage, même approximatif.';
      return Number(v) > 999999 ? 'Ce kilométrage semble trop élevé.' : '';
    },
    prestation: () => (checked('prestation').length ? '' : 'Choisissez au moins une prestation.'),
    date() {
      const v = date.value;
      if (!v) return 'Choisissez une date.';
      const today = parisNow().iso;
      if (v < today) return 'Cette date est déjà passée.';
      const wd = new Date(`${v}T12:00:00Z`).getUTCDay();
      if (wd === 0 || wd === 6) return 'Les rendez-vous se prennent du lundi au vendredi. Le samedi matin, appelez-nous.';
      if (dayDiff(v, today) > MAX_DAYS_AHEAD) return 'Choisissez une date dans les 3 prochains mois.';
      return '';
    },
    creneau() {
      const slot = checked('creneau')[0];
      if (!slot) return 'Choisissez le matin ou l’après-midi.';
      const now = parisNow();
      if (date.value === now.iso) {
        const end = slot.value === 'matin' ? 720 : 1110;
        if (now.minutes >= end - 30) return 'Ce créneau est passé pour aujourd’hui : choisissez-en un autre.';
      }
      return '';
    },
    nom: () => ($('#nom').value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    tel: () => (PHONE_RE.test($('#tel').value.replace(/[\s.\-()]/g, '')) ? '' : 'Numéro invalide : 10 chiffres, par exemple 06 12 34 56 78.'),
    email: () => (EMAIL_RE.test($('#email').value.trim()) ? '' : 'Adresse e-mail invalide, par exemple prenom.nom@mail.fr.'),
  };

  // Where each rule shows its state and which element gets focus.
  const targets = {
    prestation: { focus: () => $('input[name="prestation"]', form), group: $('#prestation-group') },
    creneau: { focus: () => $('input[name="creneau"]', form), group: $('#creneau-group') },
    plaque: { focus: () => (noPlate.checked ? noPlate : plate), group: plateBox },
  };

  function validateField(name) {
    const msg = rules[name]();
    $(`#${name}-error`).textContent = msg;
    const t = targets[name];
    if (t) {
      t.group.classList.toggle('is-invalid', Boolean(msg));
      $$('input', name === 'plaque' ? plateBox : t.group).forEach((i) => i.setAttribute('aria-invalid', String(Boolean(msg))));
    } else {
      $(`#${name}`).setAttribute('aria-invalid', String(Boolean(msg)));
    }
    return msg;
  }

  // Live re-validation once the user has tried to submit.
  form.addEventListener('input', (e) => revalidate(e.target));
  form.addEventListener('change', (e) => revalidate(e.target));
  function revalidate(el) {
    if (!form.dataset.submitted) return;
    const name = el.name === 'sans-plaque' ? 'plaque' : el.name;
    if (rules[name]) validateField(name);
    if (name === 'date') validateField('creneau');
    if (!Object.keys(rules).some((n) => $(`#${n}-error`).textContent)) alertBox.hidden = true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.dataset.submitted = 'true';
    const failed = Object.keys(rules).filter((n) => validateField(n));

    if (failed.length) {
      alertBox.textContent = failed.length === 1
        ? 'Un champ est à corriger avant d’envoyer la demande.'
        : `${failed.length} champs sont à corriger avant d’envoyer la demande.`;
      alertBox.hidden = false;
      const first = failed[0];
      const el = targets[first] ? targets[first].focus() : $(`#${first}`);
      el.focus({ preventScroll: true });
      el.closest('.field, fieldset').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    alertBox.hidden = true;
    showSuccess();
  });

  const SLOT_LABELS = { matin: 'matin (8h – 12h)', 'apres-midi': 'après-midi (13h30 – 18h30)' };

  function showSuccess() {
    const name = $('#nom').value.trim();
    const firstName = name.split(/\s+/)[0];
    const d = new Date(`${date.value}T12:00:00Z`);
    const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const ref = `GL-${date.value.slice(8, 10)}${date.value.slice(5, 7)}-${String(Math.floor(Math.random() * 900) + 100)}`;

    $('#success-ref').textContent = `Demande n° ${ref}`;
    $('#success-title').textContent = `Merci ${firstName}, c’est noté.`;
    $('#success-text').textContent = `Nous vous rappelons sous 2 h ouvrées au ${$('#tel').value.trim()} pour confirmer l’heure de dépôt et vous donner un premier prix.`;

    const rows = [
      ['Véhicule', () => {
        const frag = document.createDocumentFragment();
        if (noPlate.checked) {
          frag.append('Pas encore immatriculé · ');
        } else {
          const p = document.createElement('span');
          p.className = 'mini-plate';
          p.textContent = plate.value;
          frag.append(p, ' ');
        }
        frag.append(`${$('#marque').value.trim()} ${$('#modele').value.trim()} · ${km.value}\u00a0km`);
        return frag;
      }],
      ['Intervention', checked('prestation').map((c) => c.value).join(', ')],
      ['Créneau', `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}, ${SLOT_LABELS[checked('creneau')[0].value]}`],
      ['Véhicule de prêt', $('#pret').checked ? 'Oui, à réserver' : 'Non'],
      ['Contact', `${name} · ${$('#tel').value.trim()} · ${$('#email').value.trim()}`],
    ];
    const comment = $('#commentaire').value.trim();
    if (comment) rows.push(['Précisions', comment]);

    const dl = $('#success-summary');
    dl.replaceChildren();
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      if (typeof value === 'function') dd.append(value());
      else dd.textContent = value;
      row.append(dt, dd);
      dl.append(row);
    });

    form.hidden = true;
    success.hidden = false;
    const title = $('#success-title');
    title.focus({ preventScroll: true });
    success.closest('.form-panel').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  $('#rdv-reset').addEventListener('click', () => {
    form.reset();
    delete form.dataset.submitted;
    plate.disabled = false;
    plateBox.classList.remove('is-disabled', 'is-invalid');
    $$('.error', form).forEach((el) => { el.textContent = ''; });
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    $$('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
    alertBox.hidden = true;
    success.hidden = true;
    form.hidden = false;
    plate.focus();
  });
})();
