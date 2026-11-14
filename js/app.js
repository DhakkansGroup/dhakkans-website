/**
 * Dhakkan's Expeditions — Master Application Controller
 * Handles cross-page routing, dynamic content binding from client database,
 * expedition finder search, booking modals with persistence, gallery lightbox,
 * Sahyadri / Maharashtra regular trekking showcase, and animated statistics.
 */

/* ============ FAST ZERO-HANG IMAGE FALLBACK ENGINE ============ */
const SVG_FALLBACK = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' width='1200' height='800'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23111A17'/%3E%3Cstop offset='100%25' stop-color='%231e332c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Cpath d='M200 620 L500 280 L800 620 Z' fill='%23274238' opacity='0.7'/%3E%3Cpath d='M550 620 L820 340 L1080 620 Z' fill='%2335574a' opacity='0.8'/%3E%3Ctext x='50%25' y='700' text-anchor='middle' fill='%23AFC8D1' font-family='system-ui, -apple-system, sans-serif' font-size='30' font-weight='600'%3EDHAKKAN%27S EXPEDITIONS%3C/text%3E%3C/svg%3E";
const UNS = id => `https://images.unsplash.com/photo-${String(id).replace(/^photo-/, '')}?auto=format&fit=crop&w=1200&q=80`;
const PIC = () => SVG_FALLBACK;

function resolveMediaUrl(raw) {
  if (!raw) return SVG_FALLBACK;
  raw = String(raw).trim();

  // If user pasted a Google Drive link (e.g. from drive.google.com)
  if (raw.includes('drive.google.com') || raw.includes('googleusercontent.com')) {
    let fileId = '';
    const dMatch = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) fileId = dMatch[1];
    else {
      const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) fileId = idMatch[1];
    }
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // If user pasted an Unsplash page URL (e.g. https://unsplash.com/photos/abc-1486870591958-9b9d0d1dda99 or https://unsplash.com/photos/xyz)
  if (raw.includes('unsplash.com/photos/')) {
    const m = raw.match(/(\d{10,}-[a-f0-9]+)/i) || raw.match(/photo-([a-f0-9-]+)/i);
    if (m && m[1]) return `https://images.unsplash.com/photo-${m[1]}?auto=format&fit=crop&w=1200&q=80`;
    try {
      const slug = raw.split('/photos/')[1].split(/[?#]/)[0].split('/')[0];
      if (slug) return `https://images.unsplash.com/photo-${slug}?auto=format&fit=crop&w=1200&q=80`;
    } catch (e) { }
  }

  if (raw.startsWith('http') || raw.startsWith('assets/') || raw.startsWith('./assets/') || raw.includes('/')) {
    return raw;
  }

  const cleanId = raw.replace(/^photo-/, '');
  return `https://images.unsplash.com/photo-${cleanId}?auto=format&fit=crop&w=1200&q=80`;
}

function setImg(el, unsplashId, seed) {
  if (!el) return;
  const src = resolveMediaUrl(unsplashId);
  el.src = src;
  el.onerror = () => {
    el.onerror = null;
    el.src = SVG_FALLBACK;
  };
}

function bgImg(id, unsplashId, seed) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  const src = resolveMediaUrl(unsplashId);
  el.style.backgroundImage = `url('${src}')`;
  const test = new Image();
  test.onerror = () => {
    el.style.backgroundImage = `url('${SVG_FALLBACK}')`;
  };
  test.src = src;
}

/* ============ STATUS BADGE CONFIGURATION ============ */
const statusClass = {
  open: 's-open',
  few: 's-few',
  full: 's-full'
};

const statusLabel = {
  open: 'Open',
  few: 'Few Slots',
  full: 'Sold Out'
};

/* ============ HEADER & SCROLL BEHAVIOR ============ */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('scrolled', y > 40);
  }
  document.querySelectorAll('.pb-bg').forEach(p => {
    const r = p.getBoundingClientRect();
    p.style.transform = `translateY(${(r.top) * -0.1}px)`;
  });
}, { passive: true });

/* ============ MOBILE NAVIGATION ============ */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

if (burger && nav) {
  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    nav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
    }
  });
}

function closeNav() {
  if (burger && nav) {
    burger.classList.remove('open');
    nav.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ============ SCROLL REVEALS ============ */
let revealObs;
function initReveals() {
  if (!revealObs) {
    revealObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          revealObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.1 });
  }
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObs.observe(el));
}

/* ============ STAT COUNTERS ============ */
function startCounters() {
  const counterEls = document.querySelectorAll('[data-count]');
  if (!counterEls.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        animateCount(en.target);
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.3 });

  counterEls.forEach(el => {
    el.textContent = '0';
    obs.observe(el);
  });
}

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.decimal || 0);
  const suffix = el.dataset.suffix || '';
  let start = null;
  const dur = 1500;

  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent = (dec ? val.toFixed(dec) : Math.floor(val).toLocaleString()) + suffix;
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = (dec ? target.toFixed(dec) : target.toLocaleString()) + suffix;
    }
  }
  requestAnimationFrame(step);
}

/* ============ UNIVERSAL BOOKING MODAL WITH PICKUP POINT SUPPORT ============ */
const modal = document.getElementById('bookModal');

function openBooking(presetId) {
  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  const sel = document.getElementById('bTrek');
  if (sel) {
    if (treks.length === 0) {
      sel.innerHTML = '<option value="">No open departures — Inquire for custom tour</option>';
    } else {
      sel.innerHTML = treks.filter(t => t.status !== 'full').map(t => {
        const priceText = `₹${(t.price || 0).toLocaleString('en-IN')}`;
        const tag = t.cat === 'Maharashtra' ? ' [Weekend Batch]' : '';
        return `<option value="${t.id}">${t.name}${tag} — ${priceText}</option>`;
      }).join('');

      if (presetId && treks.find(t => t.id === presetId && t.status !== 'full')) {
        sel.value = presetId;
      }
    }
  }
  const form = document.getElementById('bookForm');
  const screen = document.getElementById('confirmScreen');
  if (form) form.style.display = 'block';
  if (screen) screen.style.display = 'none';

  updateTrekOptions();
  if (modal) modal.classList.add('open');
}

function closeBooking() {
  if (modal) modal.classList.remove('open');
  setTimeout(() => {
    const form = document.getElementById('bookForm');
    const screen = document.getElementById('confirmScreen');
    if (form) form.style.display = 'block';
    if (screen) screen.style.display = 'none';
  }, 350);
}

function updateTrekOptions() {
  const bTrek = document.getElementById('bTrek');
  const bDate = document.getElementById('bDate');
  const pickupGroup = document.getElementById('bPickupGroup');
  const pickupSel = document.getElementById('bPickup');
  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  if (!bTrek || !treks.length) return;

  const t = treks.find(x => x.id === bTrek.value);
  if (!t) return;

  // Update Dates
  if (bDate && t.dates) {
    bDate.innerHTML = t.dates.map(d => `<option>${d}</option>`).join('');
  }

  // Update Pickup Points for Maharashtra / Weekend Treks
  if (pickupGroup) {
    if (t.cat === 'Maharashtra' || t.isWeekendBatch || (t.pickupPoints && t.pickupPoints.length > 0)) {
      pickupGroup.style.display = 'block';
      if (pickupSel && t.pickupPoints && t.pickupPoints.length > 0) {
        pickupSel.innerHTML = t.pickupPoints.map(p => `<option value="${p}">${p}</option>`).join('');
      }
    } else {
      pickupGroup.style.display = 'none';
    }
  }

  updateCost();
}

function updateCost() {
  const bTrek = document.getElementById('bTrek');
  const bPersons = document.getElementById('bPersons');
  const costTotal = document.getElementById('costTotal');
  const costBreak = document.getElementById('costBreak');
  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  if (!bTrek || !bPersons || !costTotal || !costBreak || !treks.length) return;

  const t = treks.find(x => x.id === bTrek.value);
  if (!t) return;
  let n = parseInt(bPersons.value) || 1;
  n = Math.max(1, Math.min(25, n));
  const total = t.price * n;
  costTotal.innerHTML = `₹${total.toLocaleString('en-IN')}`;
  costBreak.textContent = `${n} ${n > 1 ? 'trekkers' : 'trekker'} × ₹${t.price.toLocaleString('en-IN')}`;
}

const bTrekEl = document.getElementById('bTrek');
if (bTrekEl) {
  bTrekEl.addEventListener('change', updateTrekOptions);
}

const bPersonsEl = document.getElementById('bPersons');
if (bPersonsEl) {
  bPersonsEl.addEventListener('input', updateCost);
}

const confirmBookEl = document.getElementById('confirmBook');
if (confirmBookEl) {
  confirmBookEl.addEventListener('click', async () => {
    const name = (document.getElementById('bName')?.value || '').trim();
    const email = (document.getElementById('bEmail')?.value || '').trim();
    const phone = (document.getElementById('bPhone')?.value || '').trim();
    const notes = (document.getElementById('bNotes')?.value || '').trim();
    const pickupPoint = document.getElementById('bPickupGroup')?.style.display !== 'none'
      ? (document.getElementById('bPickup')?.value || 'Designated Base Camp')
      : '';

    if (!name || !phone) {
      alert('Please fill in your name and phone number.');
      return;
    }

    const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
    const t = treks.find(x => x.id === document.getElementById('bTrek')?.value);
    const date = document.getElementById('bDate')?.value || '';
    const n = parseInt(document.getElementById('bPersons')?.value || '1');
    const totalPrice = t ? t.price * n : 0;
    const tourName = t ? t.name : 'Custom Tour / Trek';
    const priceText = `₹${totalPrice.toLocaleString('en-IN')}`;
    const personsText = `${n} ${n > 1 ? 'travelers' : 'traveler'}`;
    const bookingId = 'BK-' + Date.now().toString(36).toUpperCase();
    const createdAt = new Date().toISOString();
    const formattedTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

    // Show sending feedback on the button
    const originalBtnText = confirmBookEl.innerHTML;
    confirmBookEl.disabled = true;
    confirmBookEl.style.opacity = '0.75';
    confirmBookEl.style.cursor = 'wait';
    confirmBookEl.innerHTML = `<span style="display:inline-block;width:15px;height:15px;border:2px solid #ffffff;border-top-color:transparent;border-radius:50%;animation:spin 0.75s linear infinite;vertical-align:-2px;margin-right:8px;"></span> Registering Reservation...`;

    // 1. Prepare complete booking object
    const bookingData = {
      id: bookingId,
      name: name,
      phone: phone,
      email: email,
      notes: notes,
      pickupPoint: pickupPoint,
      trekId: t ? t.id : '',
      trekName: tourName,
      tourName: tourName,
      departureDate: date || 'Flexible / Next Batch',
      date: date || 'Flexible / Next Batch',
      trekkers: n,
      persons: n,
      totalPrice: totalPrice,
      priceText: priceText,
      status: 'Confirmed',
      createdAt: createdAt
    };

    // 2. Save directly to local/admin database engine
    if (window.DB && typeof window.DB.addBooking === 'function') {
      try {
        window.DB.addBooking(bookingData);
      } catch (err) {
        console.warn('DB.addBooking cache error:', err);
      }
    }

    // 3. Post to centralized server API
    fetch('/api/booking/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    }).catch(err => {
      console.log('Local server sync notice:', err.message);
    });

    // 4. Send single spot reservation email to official desk in background (non-blocking)
    const emailPayload = {
      _subject: `🏔️ Spot Reservation Request: ${tourName} — ${name} [${bookingId}]`,
      _template: 'table',
      _captcha: 'false',
      'Booking Reference ID': bookingId,
      'Tour / Expedition': tourName,
      'Departure Batch Date': date || 'Flexible / Next Batch',
      'Number of Trekkers / Travelers': personsText,
      'Boarding / Pickup Point': pickupPoint || 'Designated Base Camp / Direct Route',
      'Estimated Total Amount': priceText,
      'Traveler Full Name': name,
      'Contact Phone (WhatsApp)': phone,
      'Email Address': email || 'Not provided',
      'Special Requests / Notes': notes || 'None',
      'Reservation Timestamp': formattedTimestamp,
      'Dispatched To': 'dhakkanstreksandtours@gmail.com',
      'Platform': "Dhakkan's Tours & Travels"
    };

    fetch('https://formsubmit.co/ajax/dhakkanstreksandtours@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    }).catch(err => {
      console.warn('Spot reservation email dispatch notice:', err);
    });

    // 5. Render clean, complete confirmation screen without blocking
    const msgEl = document.getElementById('confirmMsg');
    if (msgEl) {
      msgEl.innerHTML = `
        <div style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3); border-radius: 14px; padding: 16px; margin: 12px 0 16px; text-align: left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(34,197,94,0.2); padding-bottom:8px;">
            <span style="font-size:0.82rem; font-weight:800; color:#15803d; text-transform:uppercase; letter-spacing:0.04em;">Reservation Received</span>
            <span style="font-size:0.8rem; font-weight:700; background:#22c55e; color:#ffffff; padding:2px 8px; border-radius:6px; font-family:monospace;">${bookingId}</span>
          </div>
          <div style="font-size:0.92rem; color:#1e293b; line-height:1.65;">
            <div><strong>Expedition:</strong> ${tourName}</div>
            <div><strong>Batch Date:</strong> ${date || 'Flexible / Next Batch'}</div>
            <div><strong>Travelers:</strong> ${personsText} &bull; <strong>Total:</strong> <span style="color:#b45309;font-weight:700;">${priceText}</span></div>
            ${pickupPoint ? `<div><strong>Pickup Point:</strong> <span style="color:#0f766e;font-weight:600;">${pickupPoint}</span></div>` : ''}
            <div style="margin-top:6px; padding-top:6px; border-top:1px dashed #cbd5e1;">
              <strong>Lead Traveler:</strong> ${name}<br>
              <strong>Phone:</strong> ${phone} ${email ? `&bull; <strong>Email:</strong> ${email}` : ''}
              ${notes ? `<br><strong>Special Requests:</strong> <em>${notes}</em>` : ''}
            </div>
          </div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; font-size:0.87rem; color:#475569; text-align:left; line-height:1.5;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; color:#0f172a; font-weight:700;">
            <span style="font-size:1.1rem;">✉️</span> Details shared with office desk
          </div>
          <div style="color:#64748b; font-size:0.84rem;">
            Our tour desk will review your spot request and connect with you directly at <b>${phone}</b> within 24 hours.
          </div>
        </div>
      `;
    }

    // Reset button state and transition to confirmation screen immediately
    setTimeout(() => {
      confirmBookEl.disabled = false;
      confirmBookEl.style.opacity = '1';
      confirmBookEl.style.cursor = 'pointer';
      confirmBookEl.innerHTML = originalBtnText;

      const form = document.getElementById('bookForm');
      const screen = document.getElementById('confirmScreen');
      if (form) form.style.display = 'none';
      if (screen) screen.style.display = 'block';
    }, 150);
  });
}

const confirmDoneEl = document.getElementById('confirmDone');
if (confirmDoneEl) {
  confirmDoneEl.addEventListener('click', () => {
    closeBooking();
  });
}

const modalCloseEl = document.getElementById('modalClose');
if (modalCloseEl) {
  modalCloseEl.addEventListener('click', closeBooking);
}

if (modal) {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeBooking();
  });
}

// Global booking buttons
['navBook', 'heroBook', 'ctaBook', 'navBookMh'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => openBooking());
});

/* ============ HOME EXPEDITION FINDER & SETTINGS ============ */
function initHomeFinder() {
  const select = document.getElementById('finderRegion');
  const allTreks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);

  if (select && allTreks.length > 0) {
    // Only show categories that actually have active available expeditions
    const availableCats = new Set(
      allTreks
        .filter(t => t && t.cat && t.status !== 'cancelled' && t.status !== 'archived')
        .map(t => t.cat.trim())
        .filter(Boolean)
    );

    const catLabels = {
      'Premium Tours': 'Premium Tours (Peaceful Pan-India)',
      'Maharashtra': 'Maharashtra (Sahyadri Weekend Treks)',
      'Himalaya': 'Scenic Himalayan Trails (Gentle & Unhurried)',
      'Pilgrimage': 'Sacred & Spiritual Journeys',
      'Desert': 'Royal Desert Glamping (Rajasthan)',
      'South India': 'Kerala & Coastal South India Trails',
      'Kerala': 'Kerala & Western Ghats',
      'North East': 'Meghalaya & North East Nature Haven',
      'Coastal': 'Coastal & Beach Trails'
    };

    let html = '<option value="All">All Available Regions</option>';
    if (availableCats.has('Maharashtra')) {
      html += `<option value="Maharashtra">${catLabels['Maharashtra'] || 'Maharashtra'}</option>`;
    }
    availableCats.forEach(cat => {
      if (cat !== 'Maharashtra') {
        const label = catLabels[cat] || `${cat} Expeditions`;
        html += `<option value="${cat}">${label}</option>`;
      }
    });
    select.innerHTML = html;
  }

  const findBtn = document.getElementById('findExpeditionBtn');
  if (findBtn) {
    findBtn.addEventListener('click', () => {
      const region = document.getElementById('finderRegion')?.value || 'All';
      const difficulty = document.getElementById('finderDifficulty')?.value || 'All';
      if (region === 'Maharashtra') {
        const query = difficulty !== 'All' ? `?diff=${encodeURIComponent(difficulty)}` : '';
        window.location.href = `maharashtra-treks.html${query}`;
        return;
      }
      const query = new URLSearchParams();
      if (region !== 'All') query.set('region', region);
      if (difficulty !== 'All') query.set('diff', difficulty);
      window.location.href = `treks.html?${query.toString()}`;
    });
  }
}

/* ============ SIGNATURE EXPEDITIONS SHOWCASE (index.html) ============ */
function initFeaturedExpeditions() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const allTreks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  // Filter active expeditions (excluding Maharashtra / weekend treks)
  const expeditions = allTreks.filter(t => t.cat !== 'Maharashtra' && !t.isWeekendBatch && t.status !== 'cancelled' && t.status !== 'archived');

  const MAX_HOME_EXPEDITIONS = 6;
  const displayList = expeditions.slice(0, MAX_HOME_EXPEDITIONS);

  grid.innerHTML = '';
  if (displayList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted);">
      Upcoming signature departures will be posted shortly.
    </div>`;
  } else {
    displayList.forEach(t => {
      const card = document.createElement('a');
      card.href = `trek-detail.html?id=${t.id}`;
      card.className = 'trek-card';

      const tagBadge = `<span class="tc-loc"><svg class="inline-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${t.loc}</span>`;
      const priceText = `₹${t.price.toLocaleString('en-IN')}<small>per person</small>`;

      card.innerHTML = `
        <div class="tc-img">
          <img alt="${t.name}">
          ${tagBadge}
          <span class="tc-status ${statusClass[t.status] || 's-open'}">${statusLabel[t.status] || 'Open'}</span>
        </div>
        <div class="tc-body">
          <div style="font-size:0.76rem;font-weight:700;color:var(--cedar-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${t.loc}</div>
          <h3>${t.name}</h3>
          <p>${t.short}</p>
          <div class="tc-meta">
            <span class="mi"><svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t.duration} &middot; <svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4 15 8 9 12 11 16 7 20 12 4 12"/></svg>${t.difficulty}</span>
            <div class="price">${priceText}</div>
          </div>
        </div>`;
      setImg(card.querySelector('img'), t.img, t.seed);
      grid.appendChild(card);
    });
  }

  // More button handling: if more than 6, show single button below to redirect to treks.html
  const moreWrap = document.getElementById('featuredMore');
  const headerLink = document.getElementById('featuredHeaderLink');
  if (moreWrap) {
    if (expeditions.length > MAX_HOME_EXPEDITIONS) {
      moreWrap.style.display = 'block';
      const btn = moreWrap.querySelector('a');
      if (btn) btn.textContent = `Explore All Expeditions (${expeditions.length}) →`;
    } else {
      moreWrap.style.display = 'none';
    }
  }
  if (headerLink) {
    headerLink.style.display = expeditions.length > MAX_HOME_EXPEDITIONS ? 'inline-block' : 'none';
  }
}

/* ============ SAHYADRI & MAHARASHTRA SHOWCASE (index.html) ============ */
function initSahyadriShowcase() {
  const grid = document.getElementById('sahyadriGrid');
  if (!grid) return;

  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  const maharashtraTreks = treks.filter(t => (t.cat === 'Maharashtra' || t.isWeekendBatch) && t.status !== 'cancelled' && t.status !== 'archived');

  const MAX_HOME_MAHARASHTRA = 6;
  const displayList = maharashtraTreks.slice(0, MAX_HOME_MAHARASHTRA);

  grid.innerHTML = '';
  if (displayList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted);">
      Upcoming Sahyadri weekend departures will be posted shortly.
    </div>`;
  } else {
    displayList.forEach(t => {
      const card = document.createElement('a');
      card.href = `trek-detail.html?id=${t.id}`;
      card.className = 'trek-card';

      const tagBadge = `<span class="tc-loc s-maharashtra-tag" style="top:12px;left:12px;position:absolute;"><svg class="inline-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Weekend Batch</span>`;
      const priceText = `₹${t.price.toLocaleString('en-IN')}<small>per person</small>`;

      card.innerHTML = `
        <div class="tc-img">
          <img alt="${t.name}">
          ${tagBadge}
          <span class="tc-status ${statusClass[t.status] || 's-open'}">${statusLabel[t.status] || 'Open'}</span>
        </div>
        <div class="tc-body">
          <div style="font-size:0.76rem;font-weight:700;color:var(--cedar-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${t.loc}</div>
          <h3>${t.name}</h3>
          <p>${t.short}</p>
          <div class="tc-meta">
            <span class="mi"><svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t.duration} &middot; <svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4 15 8 9 12 11 16 7 20 12 4 12"/></svg>${t.difficulty}</span>
            <div class="price">${priceText}</div>
          </div>
        </div>`;
      setImg(card.querySelector('img'), t.img, t.seed);
      grid.appendChild(card);
    });
  }

  // More button handling: if more than 6, show single button below to redirect to maharashtra-treks.html
  const moreWrap = document.getElementById('sahyadriMore');
  const headerLink = document.getElementById('sahyadriHeaderLink');
  if (moreWrap) {
    if (maharashtraTreks.length > MAX_HOME_MAHARASHTRA) {
      moreWrap.style.display = 'block';
      const btn = moreWrap.querySelector('a');
      if (btn) btn.textContent = `Explore All Maharashtra Treks (${maharashtraTreks.length}) →`;
    } else {
      moreWrap.style.display = 'none';
    }
  }
  if (headerLink) {
    headerLink.style.display = maharashtraTreks.length > MAX_HOME_MAHARASHTRA ? 'inline-block' : 'none';
  }
}

/* ============ TREKS PAGE CONTROLLER (treks.html) ============ */
function initTreksPage() {
  const grid = document.getElementById('trekGrid');
  const searchInput = document.getElementById('trekSearch');
  const pillsWrap = document.getElementById('filterPills');
  if (!grid || !pillsWrap) return;

  const urlParams = new URLSearchParams(window.location.search);
  // If user navigated with region=Maharashtra, redirect to dedicated Maharashtra page
  if (urlParams.get('region') === 'Maharashtra') {
    window.location.replace('maharashtra-treks.html');
    return;
  }

  const allTreks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  // Remove Maharashtra treks from main Expeditions
  const treks = allTreks.filter(t => t.cat !== 'Maharashtra' && !t.isWeekendBatch);

  let currentCategory = urlParams.get('region') || 'All';
  let currentDifficulty = urlParams.get('diff') || 'All';
  let currentSearch = '';

  function render(list) {
    grid.innerHTML = '';

    if (list.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.style.gridColumn = '1/-1';
      emptyBox.style.textAlign = 'center';
      emptyBox.style.padding = '60px 20px';
      if (allTreks.length === 0) {
        emptyBox.innerHTML = `
          <svg style="width:48px;height:48px;margin:0 auto 12px;color:var(--text-muted);display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-dark); margin-bottom: 8px;">Upcoming Curated Tours Coming Soon</h3>
          <p style="color: var(--text-muted); max-width: 520px; margin: 0 auto 20px;">We are finalizing our upcoming seasonal departures. Inquire with our operations desk to organize a bespoke private tour or get early priority batch updates.</p>
          <a class="nav-cta" href="contact.html" style="display:inline-block; padding:11px 26px; font-size:0.86rem; text-decoration:none;">Contact Operations Desk →</a>
        `;
      } else {
        emptyBox.innerHTML = `
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-dark); margin-bottom: 8px;">No expeditions match your criteria</h3>
          <p style="color: var(--text-muted);">Try adjusting your search criteria or resetting filters.</p>
        `;
      }
      grid.appendChild(emptyBox);
      return;
    }

    list.forEach((t) => {
      const card = document.createElement('a');
      card.href = `trek-detail.html?id=${t.id}`;
      card.className = 'trek-card';

      const tagBadge = `<span class="tc-loc"><svg class="inline-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${t.loc}</span>`;
      const priceText = `₹${t.price.toLocaleString('en-IN')}<small>per person</small>`;

      card.innerHTML = `
        <div class="tc-img">
          <img alt="${t.name}">
          ${tagBadge}
          <span class="tc-status ${statusClass[t.status] || 's-open'}">${statusLabel[t.status] || 'Open'}</span>
        </div>
        <div class="tc-body">
          <div style="font-size:0.76rem;font-weight:700;color:var(--cedar-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${t.loc}</div>
          <h3>${t.name}</h3>
          <p>${t.short}</p>
          <div class="tc-meta">
            <span class="mi"><svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t.duration} &middot; <svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4 15 8 9 12 11 16 7 20 12 4 12"/></svg>${t.difficulty}</span>
            <div class="price">${priceText}</div>
          </div>
        </div>`;
      setImg(card.querySelector('img'), t.img, t.seed);
      grid.appendChild(card);
    });
  }

  function filterTreks() {
    let filtered = treks;
    if (currentCategory !== 'All') {
      filtered = filtered.filter(t => t.cat === currentCategory);
    }
    if (currentDifficulty !== 'All') {
      filtered = filtered.filter(t => t.difficulty.toLowerCase() === currentDifficulty.toLowerCase());
    }
    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.loc.toLowerCase().includes(q) ||
        t.difficulty.toLowerCase().includes(q) ||
        t.cat.toLowerCase().includes(q)
      );
    }
    render(filtered);
  }

  // Render Category Pills — strictly show only available categories that have active expeditions
  if (pillsWrap) {
    const validTreks = treks.filter(t => t && t.cat && t.status !== 'cancelled' && t.status !== 'archived');
    const availableCats = ['All', ...new Set(validTreks.map(t => t.cat.trim()).filter(Boolean))];

    if (currentCategory !== 'All' && !availableCats.includes(currentCategory)) {
      currentCategory = 'All';
    }

    pillsWrap.innerHTML = '';
    availableCats.forEach(c => {
      const p = document.createElement('button');
      p.className = 'pill' + (c === currentCategory ? ' active' : '');
      p.dataset.cat = c;
      p.textContent = c;
      p.onclick = () => {
        pillsWrap.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        currentCategory = c;
        filterTreks();
      };
      pillsWrap.appendChild(p);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentSearch = e.target.value;
      filterTreks();
    });
  }

  filterTreks();
}

/* ============ TREK DETAIL PAGE (trek-detail.html) ============ */
function initDetailPage() {
  const container = document.getElementById('detailContainer');
  if (!container) return;

  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  if (!treks.length) {
    container.innerHTML = `
      <section style="min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 80px 20px;">
        <div style="max-width: 560px;">
          <svg style="width:52px;height:52px;margin:0 auto 16px;color:var(--text-muted);display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          <h2 style="font-family: var(--font-heading); font-size: 1.75rem; color: var(--text-dark); margin-bottom: 12px;">Expedition Departures Coming Soon</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px; line-height: 1.6; font-size: 0.95rem;">We are finalizing upcoming seasonal departures. Connect directly with our operations desk to organize a bespoke private tour or receive early priority announcements.</p>
          <a class="nav-cta" href="contact.html" style="display:inline-block; padding:12px 28px; text-decoration:none; font-size:0.88rem;">Contact Operations Desk →</a>
        </div>
      </section>
    `;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const trekId = urlParams.get('id') || treks[0].id;
  const t = treks.find(x => x.id === trekId) || treks[0];

  const pct = Math.round(((t.slots || 1) / (t.total || 10)) * 100);
  const isMh = t.cat === 'Maharashtra' || t.isWeekendBatch;

  const extraTags = isMh ? `
    <span class="dh-tag" style="background:rgba(217,119,6,0.2); border-color:rgba(217,119,6,0.5); color:#fbbf24;"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><b>Weekly Weekend Batch</b></span>
    <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="15" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="7" cy="15" r="1.5"/><circle cx="17" cy="15" r="1.5"/></svg><b>Mumbai &amp; Navi Mumbai Pickups</b></span>
    <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg><b>Authentic Village Bhojan</b></span>
  ` : '';

  const pickupRouteBlock = isMh && t.pickupPoints && t.pickupPoints.length > 0 ? `
    <div class="pickup-route-box">
      <h4><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" style="width:18px;height:18px;"><rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="7" cy="15" r="1.5"/><circle cx="17" cy="15" r="1.5"/></svg> Designated City Pickup Locations (Mumbai &amp; Navi Mumbai)</h4>
      <p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:12px;">
        Direct, comfortable AC bus transit with multiple convenient pickup coordinates. Select your pickup point when reserving your spot:
      </p>
      <div class="pickup-stops-grid">
        ${t.pickupPoints.map(p => `
          <div class="pickup-stop-item">
            <span class="dot"></span>
            <span>${p}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const priceFormatted = `₹${t.price.toLocaleString('en-IN')}<small>per person</small>`;

  const backLinkHref = isMh ? 'maharashtra-treks.html' : 'treks.html';
  const backLinkLabel = isMh ? '← All Maharashtra Treks' : '← All Expeditions &amp; Treks';

  container.innerHTML = `
    <div class="detail-hero">
      <div class="dbg" id="detailBg"></div>
      <div class="dh-inner">
        <a class="back-link" href="${backLinkHref}">${backLinkLabel}</a>
        <h1>${t.name}</h1>
        <div class="dh-tags">
          <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><b>${t.loc}</b></span>
          <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 20 8.5 7 14 17 18 10 22 20"/></svg><b>${t.altitude || 'High Altitude'}</b></span>
          <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg><b>${t.duration}</b></span>
          <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4 15 8 9 12 11 16 7 20 12 4 12"/></svg><b>${t.difficulty}</b></span>
          <span class="dh-tag"><svg class="dh-tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><b>${t.time}</b></span>
          ${extraTags}
        </div>
      </div>
    </div>
    <section class="block">
      <div class="detail-body">
        <div>
          <div class="d-section">
            <h2>About This ${isMh ? 'Sahyadri Trek' : 'Expedition'}</h2>
            <p>${t.desc}</p>
            ${pickupRouteBlock}
          </div>
          <div class="d-section">
            <h2>Included Services &amp; Logistics</h2>
            <div class="fac-grid">
              ${(t.facilities || []).map(f => `<div class="fac"><span class="fc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg></span><span>${f}</span></div>`).join('')}
            </div>
          </div>
          <div class="d-section">
            <h2>Day-by-Day ${isMh ? 'Weekend Schedule' : 'Expedition Itinerary'}</h2>
            <div class="timeline">
              ${(t.itinerary || []).map(([d, h, p]) => `<div class="tl-item"><div class="day">${d}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}
            </div>
          </div>
          <div class="d-section">
            <h2>Expedition &amp; Trail Photography</h2>
            <div class="dg-grid" id="detailGallery"></div>
          </div>
        </div>
        <aside>
          <div class="book-card">
            <div class="price">${priceFormatted}</div>
            <div style="margin:16px 0 8px">
              <div class="bc-row"><span>Next Batch Departure</span><b>${(t.dates && t.dates[0]) || 'Flexible'}</b></div>
              <div class="bc-row"><span>Departure Time</span><b>${t.time}</b></div>
              <div class="bc-row"><span>Terrain Difficulty</span><b>${t.difficulty}</b></div>
              <div class="bc-row" style="border:none"><span>Remaining Slots</span><b>${t.slots} / ${t.total} Spots Left</b></div>
              <div class="slot-bar"><i style="width:${pct}%"></i></div>
            </div>
            <button class="btn-book-primary" id="detailBook" ${t.status === 'full' ? 'disabled style="opacity:.5"' : ''} style="${isMh ? 'background:#d97706;' : ''}">
              ${t.status === 'full' ? 'Sold Out' : (isMh ? 'Reserve Weekend Spot' : 'Reserve Spot Now')}
            </button>
          </div>
        </aside>
      </div>
    </section>`;

  // Gallery
  const dg = container.querySelector('#detailGallery');
  if (dg && t.gallery) {
    t.gallery.forEach((g, i) => {
      const d = document.createElement('div');
      d.className = 'g';
      const im = document.createElement('img');
      im.alt = `${t.name} photo ${i + 1}`;
      setImg(im, g, t.seed + g);
      d.appendChild(im);
      d.onclick = () => openLightbox(g.startsWith('http') || g.startsWith('assets/') ? g : UNS(g), `${t.name} — Expedition Frame`);
      dg.appendChild(d);
    });
  }

  bgImg('detailBg', t.img, t.seed);

  if (t.status !== 'full') {
    const bookBtn = container.querySelector('#detailBook');
    if (bookBtn) bookBtn.onclick = () => openBooking(t.id);
  }
}

/* ============ GALLERY PAGE CONTROLLER (gallery.html) ============ */
function initGalleryPage() {
  const m = document.getElementById('masonry');
  const wrap = document.getElementById('galleryPills');
  if (!m) return;

  const galleryList = window.DB ? window.DB.getGallery() : (typeof GALLERY !== 'undefined' ? GALLERY : []);

  function render(list) {
    m.innerHTML = '';
    if (list.length === 0) {
      m.style.columns = 'auto';
      m.innerHTML = `
        <div style="width: 100%; max-width: 600px; margin: 0 auto; text-align: center; padding: 70px 20px 90px;">
          <div style="width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 50%; background: var(--bg-card-subtle); display: flex; align-items: center; justify-content: center; color: var(--cedar-brown); border: 1px solid var(--border-subtle);">
            <svg style="width:28px;height:28px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 1.45rem; color: var(--text-dark); margin-bottom: 8px;">Field Notes &amp; Photo Journal</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin: 0 auto;">Admin will upload photographs shortly.</p>
        </div>`;
      return;
    }
    m.style.columns = '';
    list.forEach(g => {
      const it = document.createElement('div');
      it.className = 'm-item';
      const im = document.createElement('img');
      im.alt = g.title || g.loc;
      setImg(im, g.img, g.seed);
      it.appendChild(im);
      const cap = document.createElement('div');
      cap.className = 'm-cap';
      cap.innerHTML = `<span>${g.cat} · ${g.loc}</span><b>${g.title || g.loc}</b>`;
      it.appendChild(cap);

      const src = resolveMediaUrl(g.img);
      it.onclick = () => openLightbox(src, `${g.title || g.loc} (${g.loc})`);
      m.appendChild(it);
    });
  }

  if (wrap) {
    if (galleryList.length === 0) {
      wrap.style.display = 'none';
    } else {
      wrap.style.display = 'flex';
      const cats = ['All', ...new Set(galleryList.map(g => g.cat))];
      wrap.innerHTML = '';
      cats.forEach((c, i) => {
        const p = document.createElement('button');
        p.className = 'pill' + (i === 0 ? ' active' : '');
        p.innerHTML = c === 'Maharashtra' ? '<svg class="foot-icon-inline" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>Maharashtra (Sahyadri)' : c;
        p.onclick = () => {
          wrap.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
          p.classList.add('active');
          const filtered = c === 'All' ? galleryList : galleryList.filter(g => g.cat === c);
          render(filtered);
        };
        wrap.appendChild(p);
      });
    }
  }

  render(galleryList);
}

// Lightbox
function openLightbox(src, caption) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <button class="lightbox-close" id="lbClose" aria-label="Close image"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="lightbox-content">
        <img id="lbImg" src="" alt="Full view">
        <div class="lightbox-caption" id="lbCap"></div>
      </div>`;
    document.body.appendChild(lb);

    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.closest('#lbClose')) {
        lb.classList.remove('open');
      }
    });
  }

  document.getElementById('lbImg').src = src;
  document.getElementById('lbCap').textContent = caption || '';
  lb.classList.add('open');
}

/* ============ CONTACT PAGE CONTROLLER (contact.html) ============ */
function initContactPage() {
  const contactSend = document.getElementById('contactSend');
  if (contactSend) {
    contactSend.addEventListener('click', () => {
      const n = (document.getElementById('cName')?.value || '').trim();
      const e = (document.getElementById('cEmail')?.value || '').trim();
      const p = (document.getElementById('cPhone')?.value || '').trim();
      const s = (document.getElementById('cSubject')?.value || 'General Inquiry').trim();
      const m = (document.getElementById('cMsg')?.value || '').trim();
      if (!n || !e) {
        alert('Please provide your name and email.');
        return;
      }

      // Save to client database
      if (window.DB) {
        window.DB.addInquiry({
          name: n,
          email: e,
          phone: p,
          subject: s,
          message: m
        });
      }

      // Direct email dispatch to official desk (100% free, 0 builds used)
      fetch('https://formsubmit.co/ajax/dhakkanstreksandtours@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `📩 Contact Message: ${s} — ${n}`,
          _template: 'table',
          _captcha: 'false',
          'Full Name': n,
          'Email Address': e,
          'Contact Phone': p || 'Not provided',
          'Subject': s,
          'Message': m || 'None',
          'Sent Timestamp': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
        })
      }).catch(err => {
        console.warn('Inquiry dispatch notice:', err);
      });

      const note = document.getElementById('contactNote');
      if (note) note.classList.add('show');
      if (document.getElementById('cName')) document.getElementById('cName').value = '';
      if (document.getElementById('cEmail')) document.getElementById('cEmail').value = '';
      if (document.getElementById('cPhone')) document.getElementById('cPhone').value = '';
      if (document.getElementById('cMsg')) document.getElementById('cMsg').value = '';
    });
  }
}

/* ============ DYNAMIC SITE SETTINGS INJECTOR ============ */
function applySiteSettings() {
  if (!window.DB) return;
  const s = window.DB.getSettings();
  if (!s) return;

  // 1. Stats Counters on Home Page
  const statExp = document.querySelector('[data-stat="expeditions"]');
  if (statExp && s.statExpeditions !== undefined) {
    statExp.setAttribute('data-count', s.statExpeditions);
  }

  const statSucc = document.querySelector('[data-stat="success"]');
  if (statSucc && s.statSuccess !== undefined) {
    statSucc.setAttribute('data-count', s.statSuccess);
  }

  const statYrs = document.querySelector('[data-stat="years"]');
  if (statYrs && s.statYears !== undefined) {
    statYrs.setAttribute('data-count', s.statYears);
  }

  const statTrk = document.querySelector('[data-stat="trekkers"]');
  if (statTrk && s.statTrekkers !== undefined) {
    statTrk.setAttribute('data-count', s.statTrekkers);
  }

  // Positional fallback for counters if data-stat was missing
  const counterItems = document.querySelectorAll('.counters-strip .counter .n');
  if (counterItems.length >= 4) {
    if (s.statExpeditions !== undefined && !statExp) counterItems[0].setAttribute('data-count', s.statExpeditions);
    if (s.statSuccess !== undefined && !statSucc) counterItems[1].setAttribute('data-count', s.statSuccess);
    if (s.statYears !== undefined && !statYrs) counterItems[2].setAttribute('data-count', s.statYears);
    if (s.statTrekkers !== undefined && !statTrk) counterItems[3].setAttribute('data-count', s.statTrekkers);
  }

  // 2. Brand Name
  if (s.brandName) {
    document.querySelectorAll('.brand-name').forEach(el => {
      if (s.brandName.includes("'")) {
        const parts = s.brandName.split("'");
        el.innerHTML = `${parts[0]}<b>'${parts.slice(1).join("'")}</b>`;
      } else {
        el.textContent = s.brandName;
      }
    });
  }

  // 3. Hero Section (index.html)
  const heroBadge = document.querySelector('[data-setting="heroBadge"]') || document.querySelector('.hero .badge-tag');
  if (heroBadge && s.heroBadge) {
    heroBadge.innerHTML = `<i></i> ${s.heroBadge}`;
  }

  const heroTitle = document.querySelector('[data-setting="heroTitle"]') || document.querySelector('.hero-content h1');
  if (heroTitle && s.heroTitle) {
    heroTitle.innerHTML = s.heroTitle.includes('<') ? s.heroTitle : s.heroTitle.replace(/\n/g, '<br>');
  }

  const heroDesc = document.querySelector('[data-setting="heroDesc"]') || document.querySelector('.hero-content > p');
  if (heroDesc && s.heroDesc) {
    heroDesc.textContent = s.heroDesc;
  }

  // 4. Contact & Footer Coordinates
  if (s.phone) {
    document.querySelectorAll('[data-setting="phone"]').forEach(el => {
      el.textContent = s.phone;
      if (el.tagName === 'A') el.href = `tel:${s.phone.replace(/[^0-9+]/g, '')}`;
    });
    document.querySelectorAll('footer a[href^="tel:"]').forEach(el => {
      el.textContent = s.phone;
      el.href = `tel:${s.phone.replace(/[^0-9+]/g, '')}`;
    });
  }

  if (s.email) {
    document.querySelectorAll('[data-setting="email"]').forEach(el => {
      el.textContent = s.email;
      if (el.tagName === 'A') el.href = `mailto:${s.email}`;
    });
    document.querySelectorAll('footer a[href^="mailto:"]').forEach(el => {
      el.textContent = s.email;
      el.href = `mailto:${s.email}`;
    });
  }

  if (s.address) {
    document.querySelectorAll('[data-setting="address"]').forEach(el => {
      el.innerHTML = s.address.replace(/\n/g, '<br>');
    });
    const mapIframe = document.getElementById('contactMapIframe');
    if (mapIframe) {
      mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(s.address.replace(/\n/g, ' '))}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
  }

  if (s.timings) {
    document.querySelectorAll('[data-setting="timings"]').forEach(el => {
      el.textContent = s.timings;
    });
  }
}

/* ============ MAHARASHTRA TREKS PAGE CONTROLLER (maharashtra-treks.html) ============ */
function initMaharashtraPage() {
  const grid = document.getElementById('mhTreksGrid');
  const searchInput = document.getElementById('mhTrekSearch');
  const pillsWrap = document.getElementById('mhFilterPills');
  if (!grid) return;

  const treks = window.DB ? window.DB.getTreks() : (typeof TREKS !== 'undefined' ? TREKS : []);
  const maharashtraTreks = treks.filter(t => t.cat === 'Maharashtra' || t.isWeekendBatch);

  let currentDiff = 'All';
  let currentSearch = '';

  function render(list) {
    grid.innerHTML = '';
    if (list.length === 0) {
      if (maharashtraTreks.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <svg style="width:48px;height:48px;margin:0 auto 12px;color:var(--text-muted);display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-dark); margin-bottom: 8px;">Upcoming Sahyadri Treks Announced Soon</h3>
          <p style="color: var(--text-muted); max-width: 520px; margin: 0 auto 20px;">Weekend batch schedules for Sahyadri forts, summits, and waterfall trails are being scheduled. Reach out to our desk for custom group batches.</p>
          <a class="nav-cta" href="contact.html" style="display:inline-block; padding:11px 26px; font-size:0.86rem; text-decoration:none;">Contact Operations Desk →</a>
        </div>`;
      } else {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-dark); margin-bottom: 8px;">No Sahyadri treks match your criteria</h3>
          <p style="color: var(--text-muted);">Try adjusting your search criteria or resetting filters.</p>
        </div>`;
      }
      return;
    }

    list.forEach(t => {
      const card = document.createElement('a');
      card.href = `trek-detail.html?id=${t.id}`;
      card.className = 'trek-card';

      const tagBadge = `<span class="tc-loc s-maharashtra-tag" style="top:12px;left:12px;position:absolute;"><svg class="inline-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Weekend Batch</span>`;
      const priceText = `₹${t.price.toLocaleString('en-IN')}<small>per person</small>`;

      card.innerHTML = `
        <div class="tc-img">
          <img alt="${t.name}">
          ${tagBadge}
          <span class="tc-status ${statusClass[t.status] || 's-open'}">${statusLabel[t.status] || 'Open'}</span>
        </div>
        <div class="tc-body">
          <div style="font-size:0.76rem;font-weight:700;color:var(--cedar-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${t.loc}</div>
          <h3>${t.name}</h3>
          <p>${t.short}</p>
          <div class="tc-meta">
            <span class="mi"><svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t.duration} &middot; <svg class="inline-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4 15 8 9 12 11 16 7 20 12 4 12"/></svg>${t.difficulty}</span>
            <div class="price">${priceText}</div>
          </div>
        </div>`;
      setImg(card.querySelector('img'), t.img, t.seed);
      grid.appendChild(card);
    });
  }

  function filterMhTreks() {
    let filtered = maharashtraTreks;
    if (currentDiff !== 'All') {
      filtered = filtered.filter(t => t.difficulty.toLowerCase() === currentDiff.toLowerCase());
    }
    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.loc.toLowerCase().includes(q) ||
        t.difficulty.toLowerCase().includes(q) ||
        (t.short && t.short.toLowerCase().includes(q))
      );
    }
    render(filtered);
  }

  if (pillsWrap) {
    pillsWrap.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        pillsWrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDiff = btn.dataset.filter || 'All';
        filterMhTreks();
      };
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentSearch = e.target.value;
      filterMhTreks();
    });
  }

  filterMhTreks();
}

/* ============ FIRST-LANDING 3-SECOND SPLASH LOADER (SIMPLE & MINIMALIST) ============ */
function initDhakkansSplashLoader() {
  const splash = document.getElementById('dhakkansSplashLoader');
  if (!splash) return;

  const isFirstLanding = !sessionStorage.getItem('dhakkans_first_landing');
  const forceLoader = window.location.search.includes('loader');

  // If returning in the same session and not testing with ?loader=1
  if (!isFirstLanding && !forceLoader) {
    splash.style.display = 'none';
    document.documentElement.classList.remove('dh-splash-active');
    document.body.classList.remove('dh-splash-active');
    return;
  }

  // Active scroll lock
  document.documentElement.classList.add('dh-splash-active');
  document.body.classList.add('dh-splash-active');

  const bar = document.getElementById('dhSplashBar');
  const DURATION = 3000; // Exactly 3 seconds
  let startTime = null;
  let rafId = null;
  let completed = false;

  function finishLoader() {
    if (completed) return;
    completed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (bar) bar.style.width = '100%';

    try {
      sessionStorage.setItem('dhakkans_first_landing', 'seen');
    } catch (e) { }

    setTimeout(() => {
      splash.classList.add('dh-splash-exit');

      setTimeout(() => {
        document.documentElement.classList.remove('dh-splash-active');
        document.body.classList.remove('dh-splash-active');
      }, 300);

      setTimeout(() => {
        splash.style.display = 'none';
      }, 650);
    }, 150);
  }

  function frame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const rawProgress = Math.min(elapsed / DURATION, 1);

    if (bar) bar.style.width = (rawProgress * 100) + '%';

    if (elapsed < DURATION) {
      rafId = requestAnimationFrame(frame);
    } else {
      finishLoader();
    }
  }

  rafId = requestAnimationFrame(frame);
}

/* ============ INITIALIZATION ============ */
window.addEventListener('DOMContentLoaded', () => {
  initDhakkansSplashLoader();
  applySiteSettings();

  // Background images
  bgImg('heroBg', '1483728642387-6c3bdd6c93e5', 'hero');
  bgImg('pageBannerBg', '1464822759023-fed622ff2c3b', 'banner');
  bgImg('mhPageBannerBg', 'https://lh3.googleusercontent.com/d/1ld0fduEFNmT4nJzgsuoeufoWTXUoDAdD', 'mhbanner');

  // Page Specific Inits
  initHomeFinder();
  initFeaturedExpeditions();
  initSahyadriShowcase();
  initTreksPage();
  initMaharashtraPage();
  initDetailPage();
  initGalleryPage();
  initContactPage();
  startCounters();
});

function refreshAllPageContent() {
  applySiteSettings();
  initFeaturedExpeditions();
  initSahyadriShowcase();
  initTreksPage();
  initMaharashtraPage();
  initDetailPage();
  initGalleryPage();
  initContactPage();
  const counterEls = document.querySelectorAll('[data-count]');
  counterEls.forEach(el => animateCount(el));
}

// Real-time synchronization across browser tabs and devices
window.addEventListener('dhakkans:dataupdated', () => {
  refreshAllPageContent();
});

window.addEventListener('dhakkans:dataready', () => {
  refreshAllPageContent();
});

window.addEventListener('storage', e => {
  if (e.key === 'dhakkans_settings') {
    applySiteSettings();
    const counterEls = document.querySelectorAll('[data-count]');
    counterEls.forEach(el => animateCount(el));
  }
  if (e.key === 'dhakkans_treks') {
    initFeaturedExpeditions();
    initSahyadriShowcase();
    initTreksPage();
    initMaharashtraPage();
    initDetailPage();
  }
  if (e.key === 'dhakkans_gallery') {
    initGalleryPage();
  }
});

