/* ===========================================================
   OpsMind public site — interactions
   =========================================================== */
(function () {
  'use strict';

  /* ---------- nav shadow on scroll ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- scroll reveal ---------- */
  // Enable the hidden state only now that JS is running — guarantees content
  // is visible even if scripts fail to load.
  document.body.classList.add('reveal-ready');
  const revs = document.querySelectorAll('.reveal');
  const reveal = (el) => el.classList.add('in');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  revs.forEach((r) => io.observe(r));
  // Reveal anything already within the initial viewport on load (covers
  // environments where IntersectionObserver doesn't fire for offscreen iframes).
  const revealInView = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    revs.forEach((r) => {
      const rect = r.getBoundingClientRect();
      if (rect.top < vh * 0.94 && rect.bottom > 0) reveal(r);
    });
  };
  window.addEventListener('load', revealInView);
  setTimeout(revealInView, 400);
  // Final safety net: never leave content hidden.
  setTimeout(() => revs.forEach(reveal), 2200);

  /* ---------- animated counters ---------- */
  const fmt = (n, opts) => {
    const { prefix = '', suffix = '', decimals = 0 } = opts || {};
    const v = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return prefix + v + suffix;
  };
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur = 1500; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, { prefix, suffix, decimals });
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(target, { prefix, suffix, decimals });
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((c) => cio.observe(c));

  /* ---------- invoice extraction stagger ---------- */
  const exRows = document.querySelectorAll('.ex-row');
  if (exRows.length) {
    const eio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        exRows.forEach((row, i) => setTimeout(() => row.classList.add('in'), 220 * i + 200));
        eio.disconnect();
      });
    }, { threshold: 0.3 });
    eio.observe(exRows[0]);
  }

  /* ===========================================================
     Scenario simulator — multi-line 24-month cash projection
     (mirrors the product's Scenario Simulator screen)
     =========================================================== */
  const sim = document.getElementById('sim');
  if (sim) {
    const W = 920, H = 320, padL = 44, padR = 12, padT = 16, padB = 34, N = 24, start = 127.4;
    const labelIdx = [0, 3, 6, 9, 12, 15, 18, 21, 23];
    const monthLabels = ['Jun 26','Sept 26','Dec 26','Mar 27','Jun 27','Sept 27','Dec 27','Mar 28','May 28'];

    // Each scenario: end balance + early peak shape, plus the figures shown in
    // the banner / stat row / comparison table.
    const SC = {
      base:  { name: 'Baseline · without any changes', color: '#9A9AA0', peak: 138, end: -34.6,
               proj: '−$34.6K', payroll: '$170.5K', lease: '$16.6K', rev: '$25.0K', net: '−$162.1K' },
      hire:  { name: 'Hiring Project Manager', color: '#15A06A', peak: 150, end: 193.2,
               proj: '+$193.2K', payroll: '$185.6K', lease: '$16.6K', rev: '$268.0K', net: '+$65.8K' },
      lease: { name: 'Office Rental', color: '#DC2626', peak: 132, end: -106.6,
               proj: '−$106.6K', payroll: '$170.5K', lease: '$88.6K', rev: '$25.0K', net: '−$234.1K' },
    };

    const build = (end, peak) => {
      const a = [];
      for (let i = 0; i < N; i++) {
        let v;
        if (i <= 2) v = start + (peak - start) * (i / 2);
        else v = peak + (end - peak) * ((i - 2) / (N - 3));
        a.push(v);
      }
      return a;
    };
    const curves = {
      base:  build(SC.base.end,  SC.base.peak),
      hire:  build(SC.hire.end,  SC.hire.peak),
      lease: build(SC.lease.end, SC.lease.peak),
    };

    const allV = [].concat(curves.base, curves.hire, curves.lease, [0]);
    let min = Math.min(...allV), max = Math.max(...allV);
    const rg = max - min; min -= rg * 0.08; max += rg * 0.1;

    const x = (i) => padL + (i / (N - 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const pathFor = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');

    const lineEls = {
      base:  sim.querySelector('#line-base'),
      hire:  sim.querySelector('#line-hire'),
      lease: sim.querySelector('#line-lease'),
    };
    lineEls.base.setAttribute('d', pathFor(curves.base));
    lineEls.hire.setAttribute('d', pathFor(curves.hire));
    lineEls.lease.setAttribute('d', pathFor(curves.lease));

    // zero line + gridlines + y labels
    const zeroY = y(0);
    sim.querySelector('#sim-zero').setAttribute('y1', zeroY.toFixed(1));
    sim.querySelector('#sim-zero').setAttribute('y2', zeroY.toFixed(1));
    sim.querySelector('#sim-gridlines').innerHTML =
      [100, -100].map((val) => `<line x1="${padL}" x2="${W - padR}" y1="${y(val).toFixed(1)}" y2="${y(val).toFixed(1)}" stroke="#EDEDEB" stroke-width="1" stroke-dasharray="3 5"/>`).join('') +
      [100, 0, -100].map((val) => {
        const lbl = val < 0 ? '-$' + Math.abs(val) + 'K' : (val === 0 ? '$0' : '$' + val + 'K');
        return `<text x="${padL - 8}" y="${(y(val) + 3.5).toFixed(1)}" text-anchor="end" font-size="10.5" fill="#9A9AA0" font-family="Geist Mono, monospace">${lbl}</text>`;
      }).join('');
    sim.querySelector('#sim-xlabels').innerHTML = labelIdx.map((idx, k) =>
      `<text x="${x(idx).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="#9A9AA0" font-family="Geist Mono, monospace">${monthLabels[k]}</text>`).join('');

    const endDots = (active) => ['base', 'hire', 'lease'].map((key) => {
      const arr = curves[key]; const cx = x(N - 1), cy = y(arr[N - 1]);
      const on = active === key;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${on ? 5 : 3.5}" fill="${SC[key].color}" opacity="${on ? 1 : 0.45}"/>`;
    }).join('');

    const endG = sim.querySelector('#sim-endlabels');
    const chips = sim.querySelectorAll('.scenario-chip');
    const rows = sim.querySelectorAll('.sim-compare tr[data-row]');
    const projEl = sim.querySelector('#sim-proj');
    const projLabel = sim.querySelector('#sim-proj-label');
    const evt = sim.querySelector('#sim-evt');

    const evtConfig = {
      base:  null,
      hire:  { txt: '● New hire · Project Manager · wins projects · +$243K revenue over 24m', bg: '#E7F6EE', bd: '#C7E9D6', fg: '#15A06A' },
      lease: { txt: '● Lease change · Jun 26 → May 28 · +$3.0K/mo with no new revenue', bg: '#FDECEC', bd: '#F6CFCF', fg: '#DC2626' },
    };

    function select(key) {
      chips.forEach((c) => c.classList.toggle('active', c.dataset.scn === key));
      rows.forEach((r) => r.classList.toggle('active', r.dataset.row === key));
      Object.keys(lineEls).forEach((k) => lineEls[k].classList.toggle('dim', k !== key));
      projEl.textContent = SC[key].proj;
      projEl.classList.toggle('pos', SC[key].end >= 0);
      projLabel.textContent = SC[key].name;
      sim.querySelector('#sim-payroll').textContent = SC[key].payroll;
      sim.querySelector('#sim-lease').textContent = SC[key].lease;
      sim.querySelector('#sim-rev').textContent = SC[key].rev;
      const netEl = sim.querySelector('#sim-net');
      netEl.textContent = SC[key].net;
      netEl.classList.toggle('neg', /^[−-]/.test(SC[key].net.trim()));
      netEl.classList.toggle('pos', !/^[−-]/.test(SC[key].net.trim()));
      endG.innerHTML = endDots(key);
      const e = evtConfig[key];
      if (!e) { evt.style.display = 'none'; }
      else { evt.style.display = 'flex'; evt.textContent = e.txt; evt.style.background = e.bg; evt.style.borderColor = e.bd; evt.style.color = e.fg; }
    }

    chips.forEach((c) => c.addEventListener('click', () => select(c.dataset.scn)));

    // decorative view toggle (Cash position / Monthly net)
    sim.querySelectorAll('.sim-toggle button').forEach((b) => {
      b.addEventListener('click', () => {
        sim.querySelectorAll('.sim-toggle button').forEach((o) => o.classList.remove('active'));
        b.classList.add('active');
      });
    });

    select('hire');
  }

  /* ===========================================================
     Claims inbox — AI auto-fill + approve / reject
     =========================================================== */
  const claimsSection = document.getElementById('claims');
  if (claimsSection) {
    const bindActions = (scope) => {
      scope.querySelectorAll('.claim-btn').forEach((b) => {
        if (b.dataset.bound) return; b.dataset.bound = '1';
        b.addEventListener('click', () => {
          const approved = b.classList.contains('approve');
          const actions = b.closest('.claim-actions');
          actions.innerHTML = approved
            ? '<span class="claim-resolved ok">✓ Approved · synced to Zoho Books</span>'
            : '<span class="claim-resolved no">✕ Rejected · staff notified</span>';
          b.closest('.claim').classList.remove('live');
        });
      });
    };
    bindActions(claimsSection);

    // AI finishes analyzing the first claim once the section is in view
    const aiClaim = document.getElementById('claim-ai');
    const fillAi = () => {
      if (!aiClaim || aiClaim.dataset.filled) return; aiClaim.dataset.filled = '1';
      const amt = aiClaim.querySelector('.amt-val');
      if (amt) amt.textContent = 'EGP 180';
      const body = aiClaim.querySelector('.claim-body');
      body.innerHTML =
        '<div class="meta"><span class="chip indigo">Transport</span><span class="cdate">7 Jun 2026</span><span class="ai-tag">✦ AI filled</span></div>' +
        '<div class="claim-actions"><button class="claim-btn reject" type="button">Reject</button><button class="claim-btn approve" type="button">✓ Approve</button></div>';
      bindActions(aiClaim);
    };
    const claimIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setTimeout(fillAi, 1600); claimIo.disconnect(); } });
    }, { threshold: 0.35 });
    claimIo.observe(claimsSection);
    setTimeout(fillAi, 4000); // fallback if IO never fires
  }

  /* ===========================================================
     Contract generation — template ↔ generated merge
     =========================================================== */
  const cg = document.querySelector('.contract-gen');
  if (cg) {
    const phs = cg.querySelectorAll('.ph');
    const btns = cg.querySelectorAll('.sim-toggle button');
    const info = cg.querySelector('#cg-info');
    const setMode = (gen) => {
      phs.forEach((p) => { p.classList.toggle('filled', gen); p.textContent = gen ? p.dataset.val : p.dataset.ph; });
      if (btns[0]) btns[0].classList.toggle('active', !gen);
      if (btns[1]) btns[1].classList.toggle('active', gen);
      if (info) info.textContent = gen ? 'Merged from Mariam’s record' : '8 fields ready to merge';
    };
    btns.forEach((b, i) => b.addEventListener('click', () => setMode(i === 1)));
    const cgIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setTimeout(() => setMode(true), 900); cgIo.disconnect(); } });
    }, { threshold: 0.4 });
    cgIo.observe(cg);
    setMode(false);
  }

  /* ---------- form — Zoho CRM Web-to-Lead ---------- */
  // Zoho redirects back with ?booked=1 after a successful submission.
  // Detect it, clean the URL, then show the success state.
  const showFormSuccess = () => {
    const f = document.getElementById('trial-form');
    if (!f) return;
    const card = f.closest('.form-card');
    f.style.display = 'none';
    card.querySelector('.form-success').classList.add('show');
  };

  if (new URLSearchParams(window.location.search).get('booked') === '1') {
    history.replaceState(null, '', window.location.pathname + '#start');
    showFormSuccess();
  }

  // Basic client-side validation — runs before the POST reaches Zoho.
  const form = document.getElementById('trial-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      const name  = form.querySelector('[name="Last Name"]');
      const email = form.querySelector('[name="Email"]');
      let valid = true;
      [name, email].forEach((el) => {
        if (!el || !el.value.trim()) { el && el.classList.add('error'); valid = false; }
        else el && el.classList.remove('error');
      });
      if (!valid) e.preventDefault();
      // If valid, the form posts naturally to Zoho — no preventDefault.
    });
  }
})();
