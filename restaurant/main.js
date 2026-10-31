/* Le Comptoir des Halles — small, dependency-free interactions.
   Menu, header state, scroll reveal, opening status, booking form (demo), lightbox. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Mobile menu ---------- */
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Header shadow once scrolled ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  if ('IntersectionObserver' in window) {
    const links = new Map($$('.site-nav a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        // Sections without a nav link (hero, booking) clear the highlight.
        links.forEach((l) => l.removeAttribute('aria-current'));
        const link = links.get(en.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach((s) => spy.observe(s));
  }

  /* ---------- Scroll reveal ---------- */
  const reveals = $$('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
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

  /* ---------- Opening hours: today + live status ---------- */
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const minutes = now.getHours() * 60 + now.getMinutes();
  $$('[data-day]').forEach((row) => {
    if (Number(row.dataset.day) === day) {
      row.classList.add('is-today');
      row.setAttribute('aria-current', 'date');
    }
  });

  const status = $('[data-status]');
  if (status) {
    const lunchDay = day !== 1;               // Tue → Sun
    const dinnerDay = day >= 2 && day <= 6;   // Tue → Sat
    let text;
    let open = false;
    if (lunchDay && minutes < 14 * 60) {
      open = minutes >= 12 * 60;
      text = open ? 'Ouvert en ce moment · service jusqu’à 14h' : 'Ouvert aujourd’hui · service dès 12h';
    } else if (dinnerDay && minutes < 22 * 60 + 30) {
      open = minutes >= 19 * 60 + 30;
      text = open ? 'Ouvert en ce moment · service jusqu’à 22h30' : 'Ce soir, service à partir de 19h30';
    } else {
      // Next opening: Sunday evening and Monday → Tuesday lunch.
      text = (day === 0 || day === 1) ? 'Fermé · réouverture mardi à 12h' : 'Fermé · réouverture demain à 12h';
    }
    status.textContent = text;
    status.classList.toggle('is-open', open);
    status.hidden = false;
  }

  /* ---------- Booking form (demo only, nothing is sent) ---------- */
  const form = $('#booking-form');
  if (form) {
    const success = $('#booking-success');
    const summary = $('#success-summary');
    const formStatus = $('#form-status');
    const el = form.elements;
    const SLOTS = {
      dejeuner: ['12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30'],
      diner: ['19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30']
    };
    const SERVICE_LABEL = { dejeuner: 'Déjeuner', diner: 'Dîner' };
    const pad = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseDate = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
    const slotLabel = (s) => s.replace(':', 'h');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 90);
    el.date.min = toISO(today);
    el.date.max = toISO(maxDate);

    const fillSlots = () => {
      const service = el.service.value;
      const previous = el.creneau.value;
      el.creneau.textContent = '';
      if (!service) {
        el.creneau.add(new Option('Choisissez un service', ''));
        el.creneau.disabled = true;
        return;
      }
      el.creneau.disabled = false;
      el.creneau.add(new Option('Choisir une heure', ''));
      SLOTS[service].forEach((s) => el.creneau.add(new Option(slotLabel(s), s)));
      if (SLOTS[service].includes(previous)) el.creneau.value = previous;
    };
    fillSlots();
    $$('input[name="service"]', form).forEach((r) => r.addEventListener('change', fillSlots));

    const rules = {
      date() {
        const v = el.date.value;
        if (!v) return 'Indiquez la date souhaitée.';
        const d = parseDate(v);
        if (Number.isNaN(d.getTime())) return 'Cette date n’est pas valide.';
        if (d < today) return 'Cette date est déjà passée.';
        if (d > maxDate) return 'Les réservations sont ouvertes jusqu’à 90 jours à l’avance.';
        if (d.getDay() === 1) return 'Nous sommes fermés le lundi : choisissez un autre jour.';
        return '';
      },
      service() {
        const s = el.service.value;
        if (!s) return 'Choisissez le déjeuner ou le dîner.';
        if (s === 'diner' && el.date.value && parseDate(el.date.value).getDay() === 0) {
          return 'Le dimanche, nous servons uniquement le midi.';
        }
        return '';
      },
      creneau() {
        if (!el.service.value) return '';
        const s = el.creneau.value;
        if (!s) return 'Choisissez une heure d’arrivée.';
        if (el.date.value && parseDate(el.date.value).getTime() === today.getTime()) {
          const [h, m] = s.split(':').map(Number);
          const n = new Date();
          if (h * 60 + m < n.getHours() * 60 + n.getMinutes() + 30) {
            return 'Ce créneau est trop proche ou déjà passé : choisissez-en un autre ou appelez-nous.';
          }
        }
        return '';
      },
      couverts() {
        const n = Number(el.couverts.value);
        if (!n) return 'Indiquez le nombre de couverts.';
        if (n < 1 || n > 10) return 'De 1 à 10 couverts. Au-delà, appelez-nous.';
        return '';
      },
      nom() {
        return el.nom.value.trim().length < 2 ? 'Indiquez votre nom pour la réservation.' : '';
      },
      tel() {
        const v = el.tel.value.trim();
        if (!v) return 'Indiquez un numéro pour vous joindre en cas d’imprévu.';
        if (!/^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v)) {
          return 'Ce numéro ne semble pas valide (ex. 06 12 34 56 78).';
        }
        return '';
      },
      email() {
        const v = el.email.value.trim();
        return v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Cette adresse e-mail ne semble pas valide.' : '';
      },
      message() {
        return el.message.value.length > 500 ? '500 caractères maximum.' : '';
      }
    };

    const controlsFor = (name) => (name === 'service' ? $$('input[name="service"]', form) : [el[name]]);

    const check = (name) => {
      const msg = rules[name]();
      const field = $(`[data-field="${name}"]`, form);
      $(`#err-${name}`, form).textContent = msg;
      field.classList.toggle('has-error', Boolean(msg));
      controlsFor(name).forEach((c) => {
        if (msg) c.setAttribute('aria-invalid', 'true');
        else c.removeAttribute('aria-invalid');
      });
      return !msg;
    };

    // Re-validate live once the user has tried to submit.
    let attempted = false;
    form.addEventListener('input', (e) => { if (attempted && e.target.name in rules) check(e.target.name); });
    form.addEventListener('change', (e) => {
      if (!attempted) return;
      const n = e.target.name;
      if (n === 'date' || n === 'service') { check('date'); check('service'); check('creneau'); }
      else if (n in rules) check(n);
    });

    const fmtDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      attempted = true;
      const invalid = Object.keys(rules).filter((name) => !check(name));
      if (invalid.length) {
        formStatus.textContent = invalid.length === 1
          ? 'Un champ est à corriger.'
          : `${invalid.length} champs sont à corriger.`;
        const first = controlsFor(invalid[0])[0];
        first.focus();
        return;
      }

      // Build the summary with textContent only (user input is never parsed as HTML).
      const n = Number(el.couverts.value);
      const rows = [
        ['Date', fmtDate.format(parseDate(el.date.value))],
        ['Service', `${SERVICE_LABEL[el.service.value]} · ${slotLabel(el.creneau.value)}`],
        ['Couverts', `${n} ${n > 1 ? 'personnes' : 'personne'}`],
        ['Nom', el.nom.value.trim()],
        ['Téléphone', el.tel.value.trim()]
      ];
      if (el.email.value.trim()) rows.push(['E-mail', el.email.value.trim()]);
      if (el.message.value.trim()) rows.push(['Message', el.message.value.trim()]);

      summary.textContent = '';
      rows.forEach(([k, v]) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = k;
        dd.textContent = v;
        summary.append(dt, dd);
      });
      $('#success-name').textContent = el.nom.value.trim().split(/\s+/)[0];

      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.closest('.booking').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    $('#booking-reset').addEventListener('click', () => {
      form.reset();
      attempted = false;
      Object.keys(rules).forEach((name) => {
        $(`#err-${name}`, form).textContent = '';
        $(`[data-field="${name}"]`, form).classList.remove('has-error');
        controlsFor(name).forEach((c) => c.removeAttribute('aria-invalid'));
      });
      formStatus.textContent = '';
      fillSlots();
      success.hidden = true;
      form.hidden = false;
      el.date.focus();
    });
  }

  /* ---------- Gallery lightbox (<dialog>) ---------- */
  const dialog = $('#lightbox');
  const items = $$('.gallery a');
  if (dialog && typeof dialog.showModal === 'function' && items.length) {
    const figure = $('#lightbox-figure');
    const caption = $('#lightbox-caption');
    const count = $('#lightbox-count');
    const img = document.createElement('img');
    img.decoding = 'async';
    let index = 0;
    let opener = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const link = items[index];
      const thumb = $('img', link);
      img.src = link.href;
      img.alt = thumb.alt;
      caption.textContent = thumb.alt;
      count.textContent = `${index + 1} / ${items.length}`;
    };

    items.forEach((link, i) => link.addEventListener('click', (e) => {
      e.preventDefault();
      if (!img.isConnected) figure.prepend(img);
      opener = link;
      show(i);
      dialog.showModal();
    }));

    dialog.addEventListener('click', (e) => {
      const action = e.target.closest('[data-lb]')?.dataset.lb;
      if (action === 'close' || e.target === dialog) dialog.close();
      else if (action === 'prev') show(index - 1);
      else if (action === 'next') show(index + 1);
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    dialog.addEventListener('close', () => { if (opener) opener.focus(); });
  }
})();
