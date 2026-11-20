/**
 * Dhakkan's Expeditions — Master Admin Portal Controller
 * 100% Client-side static administration engine with full CRUD for
 * expeditions, field notes, bookings, site settings, and backup manager.
 */

// Global State
let currentEditingTrekId = null;
let currentEditingGalleryIndex = null;

/* ============ SECURITY & SANITIZATION UTILITIES ============ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function hashPassword(str) {
  try {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return str;
  }
}

/* ============ AUTHENTICATION SYSTEM ============ */
function checkAuth() {
  const isLogged = sessionStorage.getItem('dhakkans_admin_logged');
  const overlay = document.getElementById('loginOverlay');
  if (isLogged === 'true') {
    if (overlay) overlay.style.display = 'none';
    initAdminDashboard();
  } else {
    if (overlay) overlay.style.display = 'flex';
  }
}

async function handleLogin() {
  const user = (document.getElementById('loginUser')?.value || '').trim();
  const pass = (document.getElementById('loginPass')?.value || '').trim();
  const auth = DB.getAuth();
  const inputHash = await hashPassword(pass);

  const isValid = (user === auth.user) && (
    (auth.passHash && inputHash === auth.passHash) ||
    (auth.pass && pass === auth.pass)
  );

  if (isValid) {
    sessionStorage.setItem('dhakkans_admin_logged', 'true');
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
    showToast('Welcome back, Expedition Commander!', 'success');
    initAdminDashboard();
  } else {
    showToast('Invalid credentials. Check username/password.', 'error');
  }
}

function handleLogout() {
  sessionStorage.removeItem('dhakkans_admin_logged');
  window.location.reload();
}

/* ============ TOAST NOTIFICATIONS ============ */
function showToast(msg, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="display:flex;align-items:center;">${type === 'success' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}</span> <div>${msg}</div>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(40px)';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

/* ============ TAB NAVIGATION ============ */
function setupTabs() {
  const navBtns = document.querySelectorAll('.sidebar-nav .nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const titleEl = document.getElementById('currentTabTitle');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (!target) return;

      navBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`pane-${target}`);
      if (activePane) activePane.classList.add('active');

      if (titleEl) {
        const titleMap = {
          dashboard: 'Overview & Operations Dashboard',
          treks: 'Expeditions & Routes Management',
          gallery: 'Field Notes & Photo Journal',
          uploader: 'Common Image Uploader & CDN Link Generator',
          bookings: 'Trekker Booking Reservations',
          inquiries: 'Base Camp Contact Dispatches',
          github: 'GitHub Cloud Storage & Realtime Synchronization',
          settings: 'Site Identity, Content & Stats',
          backup: 'Data Backup & Factory Recovery'
        };
        titleEl.textContent = titleMap[target] || 'Admin Portal';
      }

      // Close mobile sidebar if open
      const sidebar = document.getElementById('adminSidebar');
      if (sidebar) sidebar.classList.remove('open');

      // Refresh corresponding data
      refreshTab(target);
    });
  });
}

function refreshTab(tab) {
  if (tab === 'dashboard') renderDashboardMetrics();
  if (tab === 'treks') renderTreksTable();
  if (tab === 'gallery') renderGalleryTable();
  if (tab === 'uploader') initUploaderTab();
  if (tab === 'bookings') renderBookingsTable();
  if (tab === 'inquiries') renderInquiriesTable();
  if (tab === 'github') renderGitHubTab();
  if (tab === 'settings') loadSettingsForm();
  if (tab === 'backup') loadBackupPreview();
}

/* ============ DASHBOARD METRICS ============ */
function renderDashboardMetrics() {
  const treks = DB.getTreks();
  const bookings = DB.getBookings();
  const inquiries = DB.getInquiries();
  const gallery = DB.getGallery();

  const totalRev = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);

  const mTreks = document.getElementById('metricTreks');
  const mBookings = document.getElementById('metricBookings');
  const mInquiries = document.getElementById('metricInquiries');
  const mRev = document.getElementById('metricRevenue');
  const mGallery = document.getElementById('metricGallery');

  if (mTreks) mTreks.textContent = treks.length;
  if (mBookings) mBookings.textContent = bookings.length;
  if (mInquiries) mInquiries.textContent = inquiries.length;
  if (mRev) mRev.textContent = '₹' + totalRev.toLocaleString('en-IN');
  if (mGallery) mGallery.textContent = gallery.length;

  // Recent Bookings mini-table
  const recentTable = document.getElementById('recentBookingsBody');
  if (recentTable) {
    if (bookings.length === 0) {
      recentTable.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No reservations recorded yet.</td></tr>`;
    } else {
      recentTable.innerHTML = bookings.slice(0, 5).map(b => `
        <tr>
          <td><b>${b.id}</b></td>
          <td>${b.name}</td>
          <td>${b.trekName || 'Expedition'}</td>
          <td><b>₹${(b.totalPrice || 0).toLocaleString('en-IN')}</b></td>
          <td><span class="badge-status badge-confirmed">${b.status || 'Confirmed'}</span></td>
        </tr>
      `).join('');
    }
  }
}

const SVG_FALLBACK_THUMB = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%231e332c'/%3E%3Cpath d='M20 90 L60 35 L100 90 Z' fill='%23274238'/%3E%3Cpath d='M55 90 L85 45 L115 90 Z' fill='%2335574a'/%3E%3C/svg%3E";

function cleanImageId(raw) {
  if (!raw) return '';
  raw = String(raw).trim();

  // If user pasted a Google Drive link
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

  if (raw.includes('unsplash.com/photos/')) {
    const m = raw.match(/(\d{10,}-[a-f0-9]+)/i) || raw.match(/photo-([a-f0-9-]+)/i);
    if (m && m[1]) return m[1];
    try {
      const slug = raw.split('/photos/')[1].split(/[?#]/)[0].split('/')[0];
      if (slug) return `https://unsplash.com/photos/${slug}/download?w=1200&q=80`;
    } catch(e) {}
  }
  if (raw.startsWith('photo-')) {
    return raw.replace(/^photo-/, '');
  }
  return raw;
}

function resolveMediaUrl(raw, w = 120) {
  if (!raw) return SVG_FALLBACK_THUMB;
  raw = cleanImageId(raw);

  // If user pasted an Unsplash page URL (e.g. https://unsplash.com/photos/abc-1486870591958-9b9d0d1dda99 or https://unsplash.com/photos/xyz)
  if (raw.includes('unsplash.com/photos/')) {
    const m = raw.match(/(\d{10,}-[a-f0-9]+)/i) || raw.match(/photo-([a-f0-9-]+)/i);
    if (m && m[1]) return `https://images.unsplash.com/photo-${m[1]}?auto=format&fit=crop&w=${w}&q=80`;
    try {
      const slug = raw.split('/photos/')[1].split(/[?#]/)[0].split('/')[0];
      if (slug) return `https://images.unsplash.com/photo-${slug}?auto=format&fit=crop&w=${w}&q=80`;
    } catch(e) {}
  }

  if (raw.startsWith('http') || raw.startsWith('assets/') || raw.startsWith('./assets/') || raw.includes('/')) {
    return raw;
  }

  const cleanId = raw.replace(/^photo-/, '');
  return `https://images.unsplash.com/photo-${cleanId}?auto=format&fit=crop&w=${w}&q=80`;
}

function getThumbUrl(img, seed) {
  return resolveMediaUrl(img, 120);
}

function updateGalleryImagePreview(val) {
  const imgEl = document.getElementById('gImgPreview');
  const txtEl = document.getElementById('gImgPreviewText');
  if (!imgEl || !txtEl) return;

  if (!val || !val.trim()) {
    imgEl.src = SVG_FALLBACK_THUMB;
    txtEl.innerHTML = '<span style="color:var(--text-muted);">Enter a Photo ID or URL above to preview</span>';
    return;
  }

  const testUrl = resolveMediaUrl(val, 400);
  txtEl.innerHTML = '<span style="color:#0284c7;">Loading preview...</span>';
  imgEl.src = testUrl;
  imgEl.onload = () => {
    txtEl.innerHTML = '<span style="color:#16a34a; font-weight:600;">✓ Photo loaded successfully</span>';
  };
  imgEl.onerror = () => {
    txtEl.innerHTML = '<span style="color:#dc2626; font-weight:600;">⚠️ Could not load image. Check the ID or URL.</span>';
  };
}

function updateTrekImagePreview(val) {
  const imgEl = document.getElementById('tImgPreview');
  const txtEl = document.getElementById('tImgPreviewText');
  if (!imgEl || !txtEl) return;

  if (!val || !val.trim()) {
    imgEl.src = SVG_FALLBACK_THUMB;
    txtEl.innerHTML = '<span style="color:var(--text-muted);">Preview will show here</span>';
    return;
  }

  const testUrl = resolveMediaUrl(val, 400);
  txtEl.innerHTML = '<span style="color:#0284c7;">Loading...</span>';
  imgEl.src = testUrl;
  imgEl.onload = () => {
    txtEl.innerHTML = '<span style="color:#16a34a; font-weight:600;">✓ Photo loaded</span>';
  };
  imgEl.onerror = () => {
    txtEl.innerHTML = '<span style="color:#dc2626; font-weight:600;">⚠️ Could not load image</span>';
  };
}

/* ============ EXPEDITIONS (TREKS) CRUD ============ */
function renderTreksTable() {
  const tbody = document.getElementById('treksTableBody');
  if (!tbody) return;

  const treks = DB.getTreks();
  const searchQ = (document.getElementById('trekAdminSearch')?.value || '').toLowerCase().trim();

  let filtered = treks;
  if (searchQ) {
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(searchQ) || 
      t.loc.toLowerCase().includes(searchQ) ||
      t.cat.toLowerCase().includes(searchQ)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No expeditions match your criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const statusMap = {
      open: '<span class="badge-status badge-open">Open</span>',
      few: '<span class="badge-status badge-few">Few Slots</span>',
      full: '<span class="badge-status badge-full">Sold Out</span>'
    };
    const isMh = t.cat === 'Maharashtra';
    const priceText = `₹${(t.price || 0).toLocaleString('en-IN')}`;
    return `
      <tr>
        <td>
          <img class="table-thumb" src="${getThumbUrl(t.img, t.seed)}" onerror="this.src=SVG_FALLBACK_THUMB" alt="${t.name}">
        </td>
        <td>
          <b>${t.name}</b>
          ${isMh ? '<span class="badge-status" style="background:#fef3c7;color:#b45309;font-size:0.68rem;margin-left:6px;display:inline-flex;align-items:center;gap:3px;"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Weekend Batch</span>' : ''}
          <div style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${t.loc} &middot; <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 20 8.5 7 14 17 18 10 22 20"/></svg> ${t.altitude || 'High pass'}</div>
        </td>
        <td><b>${t.cat}</b></td>
        <td><b>${priceText}</b></td>
        <td>${t.duration}</td>
        <td>${statusMap[t.status] || '<span class="badge-status badge-open">Open</span>'}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon-action" title="Edit Expedition" onclick="openEditTrekModal('${t.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn-icon-action danger" title="Delete Expedition" onclick="deleteTrek('${t.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddTrekModal() {
  currentEditingTrekId = null;
  document.getElementById('trekModalTitle').textContent = 'Add New Expedition Route';
  document.getElementById('trekForm').reset();
  const tCatEl = document.getElementById('tCat');
  if (tCatEl) tCatEl.value = 'Himalaya';
  const tCatCustom = document.getElementById('tCatCustom');
  if (tCatCustom) {
    tCatCustom.value = '';
    tCatCustom.style.display = 'none';
  }
  document.getElementById('tFacilitiesWrap').innerHTML = '';
  document.getElementById('tItineraryWrap').innerHTML = '';

  // Add default starter rows
  addFacilityRow('Permits & Park Fees');
  addFacilityRow('Certified High-Altitude Guide');
  addItineraryRow('Day 1', 'Arrival & Base Camp Briefing', 'Meet your guide team and gear inspection.');

  updateTrekImagePreview('');
  openAdminModal('trekModal');
}

function openEditTrekModal(id) {
  const treks = DB.getTreks();
  const t = treks.find(x => x.id === id);
  if (!t) return;

  currentEditingTrekId = id;
  document.getElementById('trekModalTitle').textContent = `Edit Expedition: ${t.name}`;

  document.getElementById('tName').value = t.name || '';
  
  const tCatEl = document.getElementById('tCat');
  const tCatCustom = document.getElementById('tCatCustom');
  const catVal = t.cat || 'Himalaya';
  const hasOption = Array.from(tCatEl.options).some(o => o.value === catVal);
  if (hasOption) {
    tCatEl.value = catVal;
    if (tCatCustom) {
      tCatCustom.style.display = 'none';
      tCatCustom.value = '';
    }
  } else {
    tCatEl.value = '__custom__';
    if (tCatCustom) {
      tCatCustom.style.display = 'block';
      tCatCustom.value = catVal;
    }
  }

  document.getElementById('tLoc').value = t.loc || '';
  document.getElementById('tAltitude').value = t.altitude || '';
  document.getElementById('tPrice').value = t.price || 0;
  document.getElementById('tDuration').value = t.duration || '';
  document.getElementById('tDifficulty').value = t.difficulty || 'Moderate';
  document.getElementById('tStatus').value = t.status || 'open';
  document.getElementById('tSlots').value = t.slots || 8;
  document.getElementById('tTotalSlots').value = t.total || 12;
  document.getElementById('tTime').value = t.time || '07:00 AM departure';
  document.getElementById('tDates').value = (t.dates || []).join(', ');
  document.getElementById('tImg').value = t.img || '';
  document.getElementById('tSeed').value = t.seed || '';
  document.getElementById('tShort').value = t.short || '';
  document.getElementById('tDesc').value = t.desc || '';

  // Facilities
  const facWrap = document.getElementById('tFacilitiesWrap');
  facWrap.innerHTML = '';
  (t.facilities || []).forEach(f => addFacilityRow(f));

  // Itinerary
  const itinWrap = document.getElementById('tItineraryWrap');
  itinWrap.innerHTML = '';
  (t.itinerary || []).forEach(([d, h, p]) => addItineraryRow(d, h, p));

  updateTrekImagePreview(t.img || '');
  openAdminModal('trekModal');
}

function addFacilityRow(val = '') {
  const wrap = document.getElementById('tFacilitiesWrap');
  const row = document.createElement('div');
  row.className = 'builder-item';
  row.innerHTML = `
    <input type="text" class="fac-input" placeholder="e.g. Oxygen & First Aid Kit" value="${val}" style="flex:1;">
    <button type="button" class="btn-icon-action danger" onclick="this.parentElement.remove()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;
  wrap.appendChild(row);
}

function addItineraryRow(day = 'Day 1', title = '', desc = '') {
  const wrap = document.getElementById('tItineraryWrap');
  const row = document.createElement('div');
  row.className = 'builder-box';
  row.style.marginBottom = '8px';
  row.innerHTML = `
    <div style="display:flex; gap:8px; margin-bottom:6px;">
      <input type="text" class="itin-day" placeholder="Day 1" value="${day}" style="width:90px;">
      <input type="text" class="itin-title" placeholder="Milestone / Heading" value="${title}" style="flex:1;">
      <button type="button" class="btn-icon-action danger" onclick="this.parentElement.parentElement.remove()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <textarea class="itin-desc" placeholder="Day activity narrative..." style="width:100%; min-height:50px; font-size:0.84rem;">${desc}</textarea>
  `;
  wrap.appendChild(row);
}

function saveTrekForm() {
  const name = (document.getElementById('tName')?.value || '').trim();
  if (!name) {
    showToast('Please enter an expedition name.', 'error');
    return;
  }

  let cat = document.getElementById('tCat')?.value || 'Himalaya';
  if (cat === '__custom__') {
    cat = (document.getElementById('tCatCustom')?.value || '').trim() || 'Custom';
  }
  const loc = (document.getElementById('tLoc')?.value || '').trim();
  const altitude = (document.getElementById('tAltitude')?.value || '').trim();
  const price = parseInt(document.getElementById('tPrice')?.value || '0');
  const duration = (document.getElementById('tDuration')?.value || '7 Days').trim();
  const difficulty = document.getElementById('tDifficulty')?.value || 'Moderate';
  const status = document.getElementById('tStatus')?.value || 'open';
  const slots = parseInt(document.getElementById('tSlots')?.value || '8');
  const total = parseInt(document.getElementById('tTotalSlots')?.value || '12');
  const time = (document.getElementById('tTime')?.value || '07:00 AM').trim();
  const dates = (document.getElementById('tDates')?.value || '').split(',').map(d => d.trim()).filter(Boolean);
  const img = cleanImageId(document.getElementById('tImg')?.value) || '1486870591958-9b9d0d1dda99';
  const seed = (document.getElementById('tSeed')?.value || name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
  const short = (document.getElementById('tShort')?.value || '').trim();
  const desc = (document.getElementById('tDesc')?.value || '').trim();

  // Extract Facilities
  const facilities = [];
  document.querySelectorAll('#tFacilitiesWrap .fac-input').forEach(inp => {
    if (inp.value.trim()) facilities.push(inp.value.trim());
  });

  // Extract Itinerary
  const itinerary = [];
  document.querySelectorAll('#tItineraryWrap .builder-box').forEach(b => {
    const d = (b.querySelector('.itin-day')?.value || 'Day 1').trim();
    const h = (b.querySelector('.itin-title')?.value || '').trim();
    const p = (b.querySelector('.itin-desc')?.value || '').trim();
    if (h || p) itinerary.push([d, h, p]);
  });

  const treks = DB.getTreks();

  if (currentEditingTrekId) {
    // Update
    const idx = treks.findIndex(x => x.id === currentEditingTrekId);
    if (idx !== -1) {
      treks[idx] = {
        ...treks[idx],
        name, cat, loc, altitude, price, duration, difficulty, status,
        slots, total, time, dates, img, seed, short, desc, facilities, itinerary
      };
      DB.saveTreks(treks);
      showToast(`Updated "${name}" successfully!`, 'success');
    }
  } else {
    // Add New
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    const newTrek = {
      id: newId,
      name, cat, loc, altitude, price, duration, difficulty, status,
      slots, total, time, dates, img, seed, short, desc, facilities, itinerary,
      gallery: [img]
    };
    treks.unshift(newTrek);
    DB.saveTreks(treks);
    showToast(`Created new expedition "${name}"!`, 'success');
  }

  closeAdminModal('trekModal');
  renderTreksTable();
  renderDashboardMetrics();
}

function deleteTrek(id) {
  const treks = DB.getTreks();
  const t = treks.find(x => x.id === id);
  if (!t) return;

  if (confirm(`Are you sure you want to delete "${t.name}"? This action cannot be undone.`)) {
    const updated = treks.filter(x => x.id !== id);
    DB.saveTreks(updated);
    showToast(`Deleted "${t.name}".`, 'success');
    renderTreksTable();
    renderDashboardMetrics();
  }
}

/* ============ GALLERY (FIELD NOTES) CRUD ============ */
function renderGalleryTable() {
  const tbody = document.getElementById('galleryTableBody');
  if (!tbody) return;

  const list = DB.getGallery();

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No photo field notes found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((g, idx) => `
    <tr>
      <td>
        <img class="table-thumb" src="${getThumbUrl(g.img, g.seed)}" onerror="this.src=SVG_FALLBACK_THUMB" alt="${g.title}">
      </td>
      <td><b>${g.title}</b></td>
      <td><span style="display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${g.loc}</span></td>
      <td><b>${g.cat}</b></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon-action" title="Edit Photo" onclick="openEditGalleryModal(${idx})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon-action danger" title="Delete Photo" onclick="deleteGalleryItem(${idx})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddGalleryModal() {
  currentEditingGalleryIndex = null;
  document.getElementById('galleryModalTitle').textContent = 'Add Field Photograph';
  document.getElementById('galleryForm').reset();
  const gCatEl = document.getElementById('gCat');
  if (gCatEl) gCatEl.value = 'Himalaya';
  const gCatCustom = document.getElementById('gCatCustom');
  if (gCatCustom) {
    gCatCustom.value = '';
    gCatCustom.style.display = 'none';
  }
  updateGalleryImagePreview('');
  openAdminModal('galleryModal');
}

function openEditGalleryModal(idx) {
  const list = DB.getGallery();
  const g = list[idx];
  if (!g) return;

  currentEditingGalleryIndex = idx;
  document.getElementById('galleryModalTitle').textContent = 'Edit Field Photograph';
  document.getElementById('gTitle').value = g.title || '';
  document.getElementById('gLoc').value = g.loc || '';
  
  const gCatEl = document.getElementById('gCat');
  const gCatCustom = document.getElementById('gCatCustom');
  const catVal = g.cat || 'Himalaya';
  const hasOption = Array.from(gCatEl.options).some(o => o.value === catVal);
  if (hasOption) {
    gCatEl.value = catVal;
    if (gCatCustom) {
      gCatCustom.style.display = 'none';
      gCatCustom.value = '';
    }
  } else {
    gCatEl.value = '__custom__';
    if (gCatCustom) {
      gCatCustom.style.display = 'block';
      gCatCustom.value = catVal;
    }
  }

  document.getElementById('gImg').value = g.img || '';
  document.getElementById('gSeed').value = g.seed || '';

  updateGalleryImagePreview(g.img || '');
  openAdminModal('galleryModal');
}

function saveGalleryForm() {
  const title = (document.getElementById('gTitle')?.value || '').trim();
  const loc = (document.getElementById('gLoc')?.value || '').trim();
  let cat = document.getElementById('gCat')?.value || 'Himalaya';
  if (cat === '__custom__') {
    cat = (document.getElementById('gCatCustom')?.value || '').trim() || 'Custom';
  }
  const img = cleanImageId(document.getElementById('gImg')?.value) || '1486870591958-9b9d0d1dda99';
  const seed = (document.getElementById('gSeed')?.value || 'g' + Date.now().toString(36)).trim();

  if (!title || !loc) {
    showToast('Please provide both a photograph title and location.', 'error');
    return;
  }

  const list = DB.getGallery();
  const entry = { title, loc, cat, img, seed };

  if (currentEditingGalleryIndex !== null) {
    list[currentEditingGalleryIndex] = entry;
    showToast('Updated field photograph!', 'success');
  } else {
    list.unshift(entry);
    showToast('Added new field photograph to gallery!', 'success');
  }

  DB.saveGallery(list);
  closeAdminModal('galleryModal');
  renderGalleryTable();
  renderDashboardMetrics();
}

function deleteGalleryItem(idx) {
  const list = DB.getGallery();
  const g = list[idx];
  if (!g) return;

  if (confirm(`Remove photograph "${g.title}" from Field Notes?`)) {
    list.splice(idx, 1);
    DB.saveGallery(list);
    showToast('Photograph removed.', 'success');
    renderGalleryTable();
    renderDashboardMetrics();
  }
}

/* ============ BOOKINGS MANAGEMENT ============ */
function renderBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  const bookings = DB.getBookings();

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--text-muted)">No bookings submitted yet. Test the booking form on the public site!</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map((b, idx) => `
    <tr>
      <td><b>${escapeHtml(b.id)}</b></td>
      <td>
        <b>${escapeHtml(b.name)}</b>
        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${escapeHtml(b.phone) || '-'} &middot; <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${escapeHtml(b.email) || '-'}</div>
      </td>
      <td>
        <b>${escapeHtml(b.trekName || 'Route')}</b>
        ${b.pickupPoint ? `<div style="font-size:0.74rem;color:#b45309;font-weight:600;margin-top:2px;display:flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg> ${escapeHtml(b.pickupPoint)}</div>` : ''}
      </td>
      <td>${escapeHtml(b.departureDate || 'Anytime')}</td>
      <td>${escapeHtml(b.trekkers || 1)}</td>
      <td><b>₹${(parseFloat(b.totalPrice) || 0).toLocaleString('en-IN')}</b></td>
      <td>
        <select onchange="updateBookingStatus(${idx}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border-subtle);font-size:0.78rem;font-weight:600;">
          <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn-icon-action danger" title="Delete Booking" onclick="deleteBooking(${idx})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
      </td>
    </tr>
  `).join('');
}

function updateBookingStatus(idx, newStatus) {
  const bookings = DB.getBookings();
  if (bookings[idx]) {
    bookings[idx].status = newStatus;
    DB.saveBookings(bookings);
    showToast(`Booking ${bookings[idx].id} set to ${newStatus}`, 'success');
  }
}

function deleteBooking(idx) {
  const bookings = DB.getBookings();
  if (confirm('Delete this reservation record permanently?')) {
    bookings.splice(idx, 1);
    DB.saveBookings(bookings);
    showToast('Booking deleted.', 'success');
    renderBookingsTable();
    renderDashboardMetrics();
  }
}

function exportBookingsCSV() {
  const list = DB.getBookings();
  if (!list || list.length === 0) {
    showToast('No reservations to export yet.', 'error');
    return;
  }
  const headers = ['Booking ID', 'Date Created', 'Customer Name', 'Phone', 'Email', 'Expedition / Tour', 'Departure Date', 'Travelers', 'Total Cost', 'Pickup Point', 'Status', 'Special Notes'];
  const rows = list.map(b => [
    `"${(b.id || '').replace(/"/g, '""')}"`,
    `"${(b.createdAt || '').replace(/"/g, '""')}"`,
    `"${(b.name || '').replace(/"/g, '""')}"`,
    `"${(b.phone || '').replace(/"/g, '""')}"`,
    `"${(b.email || '').replace(/"/g, '""')}"`,
    `"${(b.tourName || b.trekName || '').replace(/"/g, '""')}"`,
    `"${(b.departureDate || b.date || '').replace(/"/g, '""')}"`,
    `"${b.trekkers || b.persons || 1}"`,
    `"${b.priceText || (b.totalPrice ? '₹' + b.totalPrice : '₹0')}"`,
    `"${(b.pickupPoint || '').replace(/"/g, '""')}"`,
    `"${(b.status || 'Confirmed').replace(/"/g, '""')}"`,
    `"${(b.notes || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dhakkans_reservations_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Reservations exported to CSV successfully!', 'success');
}

/* ============ INQUIRIES MANAGEMENT ============ */
function renderInquiriesTable() {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  const inquiries = DB.getInquiries();

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--text-muted)">No contact messages received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map((inq, idx) => `
    <tr>
      <td><b>${escapeHtml(inq.id)}</b></td>
      <td>
        <b>${escapeHtml(inq.name)}</b>
        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${escapeHtml(inq.email) || '-'} &middot; <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${escapeHtml(inq.phone) || '-'}</div>
      </td>
      <td><b>${escapeHtml(inq.subject || 'General Inquiry')}</b></td>
      <td style="max-width:320px; font-size:0.84rem; color:var(--text-body);">${escapeHtml(inq.message || '-')}</td>
      <td><span class="badge-status badge-new">${escapeHtml(inq.status || 'New')}</span></td>
      <td>
        <button class="btn-icon-action danger" title="Delete Inquiry" onclick="deleteInquiry(${idx})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
      </td>
    </tr>
  `).join('');
}

function deleteInquiry(idx) {
  const inquiries = DB.getInquiries();
  if (confirm('Delete this inquiry dispatch?')) {
    inquiries.splice(idx, 1);
    DB.saveInquiries(inquiries);
    showToast('Inquiry deleted.', 'success');
    renderInquiriesTable();
    renderDashboardMetrics();
  }
}

function exportInquiriesCSV() {
  const list = DB.getInquiries();
  if (!list || list.length === 0) {
    showToast('No inquiries to export yet.', 'error');
    return;
  }
  const headers = ['Inquiry ID', 'Date Created', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status'];
  const rows = list.map(i => [
    `"${(i.id || '').replace(/"/g, '""')}"`,
    `"${(i.createdAt || '').replace(/"/g, '""')}"`,
    `"${(i.name || '').replace(/"/g, '""')}"`,
    `"${(i.email || '').replace(/"/g, '""')}"`,
    `"${(i.phone || '').replace(/"/g, '""')}"`,
    `"${(i.subject || '').replace(/"/g, '""')}"`,
    `"${(i.message || '').replace(/"/g, '""')}"`,
    `"${(i.status || 'New').replace(/"/g, '""')}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dhakkans_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Inquiries exported to CSV successfully!', 'success');
}

/* ============ SITE SETTINGS ============ */
function loadSettingsForm() {
  const s = DB.getSettings();
  const auth = DB.getAuth();

  document.getElementById('sBrandName').value = s.brandName || "DHAKKAN'S";
  document.getElementById('sHeroBadge').value = s.heroBadge || '';
  document.getElementById('sHeroTitle').value = s.heroTitle || '';
  document.getElementById('sHeroDesc').value = s.heroDesc || '';
  document.getElementById('sPhone').value = s.phone || '';
  document.getElementById('sEmail').value = s.email || '';
  document.getElementById('sAddress').value = s.address || '';
  document.getElementById('sTimings').value = s.timings || '';

  // Stats
  document.getElementById('sStatExp').value = s.statExpeditions || '128';
  document.getElementById('sStatSucc').value = s.statSuccess || '98';
  document.getElementById('sStatYrs').value = s.statYears || '15';
  document.getElementById('sStatTrk').value = s.statTrekkers || '9800';

  // Auth User
  document.getElementById('sAuthUser').value = auth.user || 'admin';
}

async function saveSiteSettings() {
  const current = DB.getSettings();
  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = el.value.trim();
    return v !== '' ? v : fallback;
  };

  const updated = {
    ...current,
    brandName: getVal('sBrandName', current.brandName || "DHAKKAN'S"),
    heroBadge: getVal('sHeroBadge', current.heroBadge || ''),
    heroTitle: getVal('sHeroTitle', current.heroTitle || ''),
    heroDesc: getVal('sHeroDesc', current.heroDesc || ''),
    phone: getVal('sPhone', current.phone || ''),
    email: getVal('sEmail', current.email || ''),
    address: getVal('sAddress', current.address || ''),
    timings: getVal('sTimings', current.timings || ''),
    statExpeditions: getVal('sStatExp', current.statExpeditions || '128'),
    statSuccess: getVal('sStatSucc', current.statSuccess || '98'),
    statYears: getVal('sStatYrs', current.statYears || '15'),
    statTrekkers: getVal('sStatTrk', current.statTrekkers || '9800')
  };

  const btns = document.querySelectorAll('#pane-settings .btn-primary-action');
  const originalHtmls = Array.from(btns).map(b => b.innerHTML);
  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.75s linear infinite;vertical-align:-2px;margin-right:6px;"></span> Saving &amp; Syncing to GitHub...`;
  });

  // Update Auth if password provided
  const newPass = (document.getElementById('sAuthNewPass')?.value || '').trim();
  const newUser = (document.getElementById('sAuthUser')?.value || 'admin').trim();
  if (newPass) {
    const newPassHash = await hashPassword(newPass);
    DB.saveAuth({ user: newUser, passHash: newPassHash });
    document.getElementById('sAuthNewPass').value = '';
  } else {
    DB.saveAuth({ ...DB.getAuth(), user: newUser });
  }

  // Save settings (triggers auto-commit to GitHub if token configured)
  const commitPromise = DB.saveSettings(updated);
  const res = commitPromise ? await commitPromise : null;

  btns.forEach((b, i) => {
    b.disabled = false;
    b.innerHTML = originalHtmls[i];
  });

  if (res && res.success) {
    showToast('Site settings saved and pushed directly to live GitHub site!', 'success');
  } else if (res && res.message && !res.message.includes('No GitHub token')) {
    showToast(`Saved locally! GitHub notice: ${res.message}`, 'error');
  } else {
    showToast('Site settings saved! (To publish to live project, verify GitHub Token in GitHub Cloud Sync tab)', 'info');
  }
}

/* ============ BACKUP & RECOVERY ============ */
function loadBackupPreview() {
  const data = {
    settings: DB.getSettings(),
    treks: DB.getTreks(),
    gallery: DB.getGallery(),
    bookings: DB.getBookings(),
    inquiries: DB.getInquiries(),
    exportedAt: new Date().toISOString()
  };
  const jsonBox = document.getElementById('backupJsonText');
  if (jsonBox) {
    jsonBox.value = JSON.stringify(data, null, 2);
  }
}

function downloadBackupJSON() {
  const data = {
    settings: DB.getSettings(),
    treks: DB.getTreks(),
    gallery: DB.getGallery(),
    bookings: DB.getBookings(),
    inquiries: DB.getInquiries(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dhakkans_expeditions_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON downloaded successfully!', 'success');
}

function importBackupJSON() {
  const fileInput = document.getElementById('backupFileInput');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Please select a JSON file to import.', 'error');
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.treks) DB.saveTreks(parsed.treks);
      if (parsed.gallery) DB.saveGallery(parsed.gallery);
      if (parsed.settings) DB.saveSettings(parsed.settings);
      if (parsed.bookings) DB.saveBookings(parsed.bookings);
      if (parsed.inquiries) DB.saveInquiries(parsed.inquiries);
      showToast('All website data restored from backup successfully!', 'success');
      loadBackupPreview();
    } catch(err) {
      showToast('Invalid JSON file format. Could not import.', 'error');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('DANGER: This will reset all custom expeditions, photos, and settings back to original factory defaults! Continue?')) {
    DB.resetToDefaults();
    showToast('Reset back to factory defaults.', 'success');
    setTimeout(() => window.location.reload(), 1000);
  }
}

/* ============ GITHUB SYNCHRONIZATION CONTROLLER ============ */
function renderGitHubTab(forceUpdateInputs = false) {
  const config = DB.getGitHubConfig();
  const status = DB.getGitHubStatus();

  const ownerInput = document.getElementById('ghOwnerInput');
  const repoInput = document.getElementById('ghRepoInput');
  const branchInput = document.getElementById('ghBranchInput');
  const tokenInput = document.getElementById('ghTokenInput');

  // Prevent erasing user input while typing or if token is already in field
  if (ownerInput && (forceUpdateInputs || (!ownerInput.value && document.activeElement !== ownerInput))) {
    ownerInput.value = config.owner || 'DhakkansGroup';
  }
  if (repoInput && (forceUpdateInputs || (!repoInput.value && document.activeElement !== repoInput))) {
    repoInput.value = config.repo || 'dhakkans-website';
  }
  if (branchInput && (forceUpdateInputs || (!branchInput.value && document.activeElement !== branchInput))) {
    branchInput.value = config.branch || 'main';
  }
  if (tokenInput && (forceUpdateInputs || (!tokenInput.value && document.activeElement !== tokenInput))) {
    tokenInput.value = config.token || '';
  }

  const mTreks = document.getElementById('metricGhTreks');
  const mBookings = document.getElementById('metricGhBookings');
  const mSyncTime = document.getElementById('metricGhSyncTime');

  if (mTreks) mTreks.textContent = status.trekCount || 0;
  if (mBookings) mBookings.textContent = status.bookingCount || 0;
  if (mSyncTime) {
    if (status.lastSyncTimestamp) {
      mSyncTime.textContent = new Date(status.lastSyncTimestamp).toLocaleTimeString();
    } else {
      mSyncTime.textContent = 'Active (Live)';
    }
  }

  const badge = document.getElementById('githubStatusBadge');
  const label = document.getElementById('githubStatusLabel');
  if (badge && label) {
    badge.className = `cloud-badge ${status.status}`;
    if (status.status === 'connected') {
      label.textContent = `GitHub Active (${config.owner}/${config.repo})`;
      badge.style.background = 'rgba(34,197,94,0.12)';
      badge.style.color = '#15803d';
      badge.style.borderColor = 'rgba(34,197,94,0.3)';
    } else if (status.status === 'syncing') {
      label.textContent = 'Pushing to GitHub...';
      badge.style.background = 'rgba(234,179,8,0.12)';
      badge.style.color = '#a16207';
      badge.style.borderColor = 'rgba(234,179,8,0.3)';
    } else {
      label.textContent = 'Local Standalone';
      badge.style.background = 'rgba(100,116,139,0.12)';
      badge.style.color = '#475569';
      badge.style.borderColor = 'rgba(100,116,139,0.3)';
    }
  }
}

function saveGitHubSettings() {
  const owner = (document.getElementById('ghOwnerInput')?.value || 'DhakkansGroup').trim();
  const repo = (document.getElementById('ghRepoInput')?.value || 'dhakkans-website').trim();
  const branch = (document.getElementById('ghBranchInput')?.value || 'main').trim();
  const token = (document.getElementById('ghTokenInput')?.value || '').trim();

  if (!owner || !repo) {
    showToast('Please enter your GitHub Owner and Repository name.', 'error');
    return;
  }

  DB.setGitHubConfig({ owner, repo, branch, token }, false);
  showToast('GitHub configuration saved permanently in your session!', 'success');
  renderGitHubTab(true);
  updateSyncStatusUI();
}

function clearGitHubToken() {
  const tokenInput = document.getElementById('ghTokenInput');
  if (tokenInput) tokenInput.value = '';
  try {
    localStorage.removeItem('dhakkans_gh_token');
    if (window.DHAKKANS_GITHUB_CONFIG) {
      window.DHAKKANS_GITHUB_CONFIG.token = '';
    }
  } catch (e) { }
  showToast('GitHub Personal Access Token cleared from session.', 'info');
  renderGitHubTab(true);
  updateSyncStatusUI();
}

async function testGitHubSettings() {
  const owner = (document.getElementById('ghOwnerInput')?.value || 'DhakkansGroup').trim();
  const repo = (document.getElementById('ghRepoInput')?.value || 'dhakkans-website').trim();
  const branch = (document.getElementById('ghBranchInput')?.value || 'main').trim();
  const token = (document.getElementById('ghTokenInput')?.value || '').trim();

  // Save config immediately so token is never lost
  DB.setGitHubConfig({ owner, repo, branch, token }, false);

  const resBox = document.getElementById('ghTestResult');
  if (resBox) {
    resBox.style.display = 'block';
    resBox.style.background = 'rgba(175,200,209,0.2)';
    resBox.style.color = '#1e6378';
    resBox.style.border = '1px solid #afc8d1';
    resBox.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Testing repository access on GitHub...</span>';
  }

  const testRes = await DB.testGitHubConnection(owner, repo, token, branch, 'data/db.json');
  if (resBox) {
    if (testRes.success) {
      resBox.style.background = 'rgba(34,197,94,0.12)';
      resBox.style.color = '#15803d';
      resBox.style.border = '1px solid #22c55e';
      resBox.innerHTML = `<b><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>GitHub Access Verified:</b> ${testRes.message}`;
      showToast('GitHub connection test passed!', 'success');
    } else {
      resBox.style.background = 'rgba(239,68,68,0.12)';
      resBox.style.color = '#b91c1c';
      resBox.style.border = '1px solid #ef4444';
      resBox.innerHTML = `<b><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Connection Notice:</b> ${testRes.message}`;
      showToast('Could not reach repository. Please check details below.', 'error');
    }
  }
  renderGitHubTab(false);
}

async function commitToGitHubNow() {
  const owner = (document.getElementById('ghOwnerInput')?.value || 'DhakkansGroup').trim();
  const repo = (document.getElementById('ghRepoInput')?.value || 'dhakkans-website').trim();
  const branch = (document.getElementById('ghBranchInput')?.value || 'main').trim();
  const token = (document.getElementById('ghTokenInput')?.value || '').trim();

  if (!token) {
    showToast('Please enter a GitHub Personal Access Token to commit automatically.', 'error');
    const tokenInput = document.getElementById('ghTokenInput');
    if (tokenInput) tokenInput.focus();
    return;
  }

  // Persist config without triggering a sync that could overwrite in-memory edits
  DB.setGitHubConfig({ owner, repo, branch, token }, false);

  const btn = document.getElementById('btnCommitGh');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 2-2 4-6 4M6 9v2c0 2 2 4 6 4"/></svg>Committing to GitHub...';
  }

  const commitRes = await DB.commitToGitHub('Update website database via Admin Operations Desk');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 2-2 4-6 4M6 9v2c0 2 2 4 6 4"/></svg>Commit &amp; Push to GitHub';
  }

  const resBox = document.getElementById('ghTestResult');
  if (commitRes.success) {
    showToast('Database committed and pushed directly to GitHub!', 'success');
    if (resBox) {
      resBox.style.display = 'block';
      resBox.style.background = 'rgba(34,197,94,0.12)';
      resBox.style.color = '#15803d';
      resBox.style.border = '1px solid #22c55e';
      resBox.innerHTML = `<b><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Commit Successful!</b> ${commitRes.message} <a href="${commitRes.commitUrl}" target="_blank" style="font-weight:700; color:#15803d; text-decoration:underline;">View on GitHub ↗</a>`;
    }
    renderGitHubTab(false);
    updateSyncStatusUI();
  } else {
    showToast(`GitHub commit failed: ${commitRes.message}`, 'error');
    if (resBox) {
      resBox.style.display = 'block';
      resBox.style.background = 'rgba(239,68,68,0.12)';
      resBox.style.color = '#b91c1c';
      resBox.style.border = '1px solid #ef4444';
      resBox.innerHTML = `<b><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Commit Error:</b> ${commitRes.message}`;
    }
  }
}

function downloadUpdatedDbJson() {
  const json = DB.getFullDatabaseJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'db.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Downloaded db.json! You can place it into your repo\'s data/ folder.', 'success');
}

function copyDbJsonToClipboard() {
  const json = DB.getFullDatabaseJSON();
  navigator.clipboard.writeText(json).then(() => {
    showToast('db.json content copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy to clipboard. Download file instead.', 'error');
  });
}

function updateSyncStatusUI() {
  const statusText = document.getElementById('dbSyncText');
  const statusDot = document.getElementById('githubStatusDot');
  if (!statusText || !statusDot) return;

  const cfg = DB.getGitHubConfig();
  const status = DB.getGitHubStatus();

  if (status.status === 'connected') {
    statusDot.style.background = '#22c55e';
    statusDot.style.boxShadow = '0 0 8px #22c55e';
    statusText.textContent = `GitHub Storage Active · ${cfg.owner} (100% Free & Unlimited)`;
  } else if (status.status === 'syncing') {
    statusDot.style.background = '#eab308';
    statusDot.style.boxShadow = '0 0 8px #eab308';
    statusText.textContent = 'Committing updates to GitHub...';
  } else {
    statusDot.style.background = '#94a3b8';
    statusDot.style.boxShadow = '0 0 8px #94a3b8';
    statusText.textContent = 'GitHub Offline / Standalone Cache';
  }
}

/* ============ MODAL HELPERS ============ */
function openAdminModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeAdminModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

/* ============ INIT ADMIN ============ */
function initAdminDashboard() {
  setupTabs();
  renderDashboardMetrics();
  renderTreksTable();
  renderGalleryTable();
  renderBookingsTable();
  renderInquiriesTable();
  renderGitHubTab();
  loadSettingsForm();
  initUploaderTab();
  updateSyncStatusUI();
}

function refreshActiveTab() {
  const activeBtn = document.querySelector('.sidebar-nav .nav-item.active');
  const target = activeBtn ? activeBtn.dataset.tab : 'dashboard';
  refreshTab(target);
  updateSyncStatusUI();
}

// Attach globally for inline HTML event handlers
window.saveGitHubSettings = saveGitHubSettings;
window.testGitHubSettings = testGitHubSettings;
window.commitToGitHubNow = commitToGitHubNow;
window.downloadUpdatedDbJson = downloadUpdatedDbJson;
window.copyDbJsonToClipboard = copyDbJsonToClipboard;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.saveSiteSettings = saveSiteSettings;
window.downloadBackupJSON = downloadBackupJSON;
window.importBackupJSON = importBackupJSON;
window.resetAllData = resetAllData;
window.exportBookingsCSV = exportBookingsCSV;
window.exportInquiriesCSV = exportInquiriesCSV;

window.addEventListener('DOMContentLoaded', () => {
  // Check login
  checkAuth();
  updateSyncStatusUI();

  // Login handler
  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  const passInp = document.getElementById('loginPass');
  if (passInp) {
    passInp.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // Toggle password visibility in login modal
  const toggleLoginPassBtn = document.getElementById('toggleLoginPass');
  if (toggleLoginPassBtn && passInp) {
    toggleLoginPassBtn.addEventListener('click', () => {
      const isPass = passInp.type === 'password';
      passInp.type = isPass ? 'text' : 'password';
      toggleLoginPassBtn.innerHTML = isPass
        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  }

  // Logout handler
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  // Mobile menu toggle
  const toggleBtn = document.getElementById('adminMenuToggle');
  const sidebar = document.getElementById('adminSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Search input for treks
  const tSearch = document.getElementById('trekAdminSearch');
  if (tSearch) {
    tSearch.addEventListener('input', renderTreksTable);
  }

  // Toggle custom category inputs
  const tCatEl = document.getElementById('tCat');
  const tCatCustom = document.getElementById('tCatCustom');
  if (tCatEl && tCatCustom) {
    tCatEl.addEventListener('change', () => {
      tCatCustom.style.display = tCatEl.value === '__custom__' ? 'block' : 'none';
      if (tCatEl.value === '__custom__') tCatCustom.focus();
    });
  }

  const gCatEl = document.getElementById('gCat');
  const gCatCustom = document.getElementById('gCatCustom');
  if (gCatEl && gCatCustom) {
    gCatEl.addEventListener('change', () => {
      gCatCustom.style.display = gCatEl.value === '__custom__' ? 'block' : 'none';
      if (gCatEl.value === '__custom__') gCatCustom.focus();
    });
  }

  const gdriveInput = document.getElementById('gdriveWebhookInput');
  if (gdriveInput) {
    gdriveInput.value = localStorage.getItem('dhakkans_gdrive_webhook') || window.DHAKKANS_GDRIVE_WEBHOOK || '';
  }
});

// Real-time synchronization across browser tabs, incognito windows, and devices
window.addEventListener('dhakkans:dataupdated', () => {
  if (sessionStorage.getItem('dhakkans_admin_logged') === 'true') {
    refreshActiveTab();
  }
});

window.addEventListener('dhakkans:dataready', () => {
  if (sessionStorage.getItem('dhakkans_admin_logged') === 'true') {
    refreshActiveTab();
  }
});

window.addEventListener('dhakkans:githubstatus', () => {
  if (sessionStorage.getItem('dhakkans_admin_logged') === 'true') {
    updateSyncStatusUI();
    const activeBtn = document.querySelector('.sidebar-nav .nav-item.active');
    if (activeBtn && activeBtn.dataset.tab === 'github') {
      renderGitHubTab();
    }
  }
});

window.addEventListener('storage', () => {
  if (sessionStorage.getItem('dhakkans_admin_logged') === 'true') {
    refreshActiveTab();
  }
});

/* ============ DIRECT PHOTO UPLOADER ENGINE ============ */

// Compress & optimize image on client side (max width 1400px, 84% quality)
function compressImageFile(file, maxWidth = 1400, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Session-only Webhook Helper (Never kept in persistent browser disk, auto-removed on tab close)
function getOrPromptGDriveWebhook() {
  let webhook = (sessionStorage.getItem('dhakkans_gdrive_webhook') || window.DHAKKANS_GDRIVE_WEBHOOK || '').trim();
  if (!webhook) {
    const inputEl = document.getElementById('gdriveWebhookInput');
    if (inputEl && inputEl.value && inputEl.value.trim().startsWith('http')) {
      webhook = inputEl.value.trim();
      sessionStorage.setItem('dhakkans_gdrive_webhook', webhook);
      window.DHAKKANS_GDRIVE_WEBHOOK = webhook;
    }
  }

  if (!webhook) {
    const entered = window.prompt('Please enter your Google Apps Script Web App URL to upload to your Google Drive:\n(e.g. https://script.google.com/macros/s/.../exec)');
    if (entered && entered.trim().startsWith('http')) {
      webhook = entered.trim();
      sessionStorage.setItem('dhakkans_gdrive_webhook', webhook);
      window.DHAKKANS_GDRIVE_WEBHOOK = webhook;
      const inputEl = document.getElementById('gdriveWebhookInput');
      if (inputEl) inputEl.value = webhook;
      showToast('Google Drive Webhook connected for this tab session!', 'success');
    }
  }

  return webhook || '';
}

// Upload file directly to Google Drive (via server proxy or direct Google Webhook)
async function uploadImageToServerOrGitHub(file) {
  const gdriveWebhook = getOrPromptGDriveWebhook();
  if (!gdriveWebhook) {
    throw new Error('Google Apps Script Web App URL is required to upload to Google Drive.');
  }

  const base64Data = await compressImageFile(file);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const cleanBase = file.name.substring(0, file.name.lastIndexOf('.') || file.name.length)
    .toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const safeName = `${Date.now()}-${cleanBase || 'photo'}.${ext === 'png' ? 'png' : 'jpg'}`;
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9-+.]+;base64,/i, '');

  // 1. Try server proxy upload first (forwards to Google Drive and handles redirects with 0 CORS restrictions)
  try {
    const srvResp = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: safeName, base64: base64Data, webhookUrl: gdriveWebhook })
    });
    if (srvResp.ok) {
      const srvData = await srvResp.json();
      if (srvData.success && srvData.url) {
        return { success: true, url: srvData.url, type: 'Google Drive' };
      }
    }
  } catch (err) { }

  // 2. Direct client-side upload to Google Drive Webhook (for GitHub Pages & static hosting)
  try {
    const resp = await fetch(gdriveWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: safeName,
        base64: cleanBase64,
        type: ext === 'png' ? 'image/png' : 'image/jpeg'
      })
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && json.url) {
        return { success: true, url: json.url, type: 'Google Drive' };
      }
    }
  } catch (err) {
    console.warn('Direct Google Drive webhook error:', err);
    throw new Error('Could not upload to Google Drive. Check your Webhook URL or permissions.');
  }

  throw new Error('Google Drive upload failed. Please verify your Webhook URL.');
}

// Modal In-Place Uploader Handler
async function handleDirectPhotoUpload(inputEl, targetInputId, previewImgId, previewTxtId) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  const targetInput = document.getElementById(targetInputId);
  const previewImg = document.getElementById(previewImgId);
  const previewTxt = document.getElementById(previewTxtId);

  if (previewTxt) {
    previewTxt.innerHTML = '<span style="color:#0284c7;font-weight:600;">Optimizing &amp; Uploading photo...</span>';
  }

  try {
    const res = await uploadImageToServerOrGitHub(file);
    if (res.success && res.url) {
      if (targetInput) {
        targetInput.value = res.url;
      }
      if (previewImg) {
        previewImg.src = res.url;
      }
      if (previewTxt) {
        previewTxt.innerHTML = `<span style="color:#16a34a;font-weight:600;">✓ Photo ready (${res.type})</span>`;
      }
      showToast(`Photo uploaded successfully!`, 'success');
    }
  } catch (err) {
    console.error('Upload failed:', err);
    if (previewTxt) {
      previewTxt.innerHTML = `<span style="color:#dc2626;font-weight:600;">⚠️ Upload failed: ${err.message}</span>`;
    }
    showToast('Could not upload photo. Try another file.', 'error');
  } finally {
    inputEl.value = '';
  }
}

/* ============ COMMON IMAGE UPLOADER & CDN TAB ============ */
let dropzoneBound = false;

function initUploaderTab() {
  // Never keep in persistent browser disk - purge any legacy localStorage
  try {
    localStorage.removeItem('dhakkans_gdrive_webhook');
  } catch (e) {}

  const webhookInput = document.getElementById('gdriveWebhookInput');
  if (webhookInput) {
    // Only load from active tab session
    const saved = sessionStorage.getItem('dhakkans_gdrive_webhook') || window.DHAKKANS_GDRIVE_WEBHOOK || '';
    webhookInput.value = saved;
  }
  setupCommonDropzone();
}

function setupCommonDropzone() {
  if (dropzoneBound) return;
  const dropzone = document.getElementById('commonDropzone');
  if (!dropzone) return;
  dropzoneBound = true;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '#2563eb';
      dropzone.style.background = '#eff6ff';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '#94a3b8';
      dropzone.style.background = '#f8fafc';
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt && dt.files;
    if (files && files.length > 0) {
      handlePhotoFile(files[0]);
    }
  });
}

async function handleCommonPhotoUpload(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  await handlePhotoFile(file);
  inputEl.value = '';
}

async function handlePhotoFile(file) {
  const progressBox = document.getElementById('commonUploadProgress');
  const resultBox = document.getElementById('commonUploadResult');
  const previewImg = document.getElementById('commonPreviewImg');
  const urlOutput = document.getElementById('commonUrlOutput');
  const typeBadge = document.getElementById('commonStorageType');

  if (progressBox) progressBox.style.display = 'block';
  if (resultBox) resultBox.style.display = 'none';

  try {
    const res = await uploadImageToServerOrGitHub(file);
    if (res && res.success && res.url) {
      if (previewImg) previewImg.src = res.url;
      if (urlOutput) urlOutput.value = res.url;
      if (typeBadge) typeBadge.textContent = `${res.type || 'Cloud'} Storage`;
      if (progressBox) progressBox.style.display = 'none';
      if (resultBox) resultBox.style.display = 'block';

      // Auto-copy URL to clipboard for effortless workflow
      try {
        await navigator.clipboard.writeText(res.url);
        showToast('Photo uploaded & CDN URL copied to clipboard!', 'success');
      } catch (e) {
        showToast('Photo uploaded successfully! Direct CDN URL ready.', 'success');
      }
    } else {
      throw new Error((res && res.error) || 'Upload returned empty response');
    }
  } catch (err) {
    console.error('Common photo upload error:', err);
    if (progressBox) progressBox.style.display = 'none';
    showToast(`Upload failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

function copyCommonUrl() {
  const urlOutput = document.getElementById('commonUrlOutput');
  const btn = document.getElementById('btnCopyCommonUrl');
  if (!urlOutput || !urlOutput.value) {
    showToast('No URL to copy. Please upload an image first.', 'warning');
    return;
  }
  urlOutput.select();
  navigator.clipboard.writeText(urlOutput.value).then(() => {
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>✓ Copied!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
    showToast('Direct Image URL copied to clipboard!', 'success');
  }).catch(() => {
    document.execCommand('copy');
    showToast('Direct Image URL copied!', 'success');
  });
}

function useInExpeditions() {
  const urlOutput = document.getElementById('commonUrlOutput');
  const url = (urlOutput && urlOutput.value) ? urlOutput.value.trim() : '';
  if (!url) {
    showToast('Please upload an image first to get its URL.', 'warning');
    return;
  }
  // 1. Switch tab to treks
  const treksTabBtn = document.querySelector('.sidebar-nav .nav-item[data-tab="treks"]');
  if (treksTabBtn) treksTabBtn.click();
  // 2. Open Add Trek modal
  openAddTrekModal();
  // 3. Populate image URL and trigger preview
  const tImg = document.getElementById('tImg');
  if (tImg) {
    tImg.value = url;
    updateTrekImagePreview(url);
  }
  showToast('Image URL applied to new Expedition!', 'success');
}

function useInFieldNotes() {
  const urlOutput = document.getElementById('commonUrlOutput');
  const url = (urlOutput && urlOutput.value) ? urlOutput.value.trim() : '';
  if (!url) {
    showToast('Please upload an image first to get its URL.', 'warning');
    return;
  }
  // 1. Switch tab to gallery
  const galleryTabBtn = document.querySelector('.sidebar-nav .nav-item[data-tab="gallery"]');
  if (galleryTabBtn) galleryTabBtn.click();
  // 2. Open Add Gallery modal
  openAddGalleryModal();
  // 3. Populate image URL and trigger preview
  const gImg = document.getElementById('gImg');
  if (gImg) {
    gImg.value = url;
    updateGalleryImagePreview(url);
  }
  showToast('Image URL applied to new Photograph!', 'success');
}

// Standalone Direct Photo Uploader Widget Handler (Backward Compatibility Alias)
async function handleStandaloneUpload(inputEl) {
  return handleCommonPhotoUpload(inputEl);
}

function copyStandaloneUrl() {
  return copyCommonUrl();
}

function saveGDriveWebhook() {
  const input = document.getElementById('gdriveWebhookInput');
  const val = (input?.value || '').trim();
  try {
    localStorage.removeItem('dhakkans_gdrive_webhook');
  } catch (e) {}

  if (val) {
    sessionStorage.setItem('dhakkans_gdrive_webhook', val);
    if (window.DHAKKANS_GDRIVE_WEBHOOK !== undefined) window.DHAKKANS_GDRIVE_WEBHOOK = val;
    showToast('Google Drive Webhook set for this session (will be removed when tab is closed).', 'success');
  } else {
    sessionStorage.removeItem('dhakkans_gdrive_webhook');
    if (window.DHAKKANS_GDRIVE_WEBHOOK !== undefined) window.DHAKKANS_GDRIVE_WEBHOOK = '';
    showToast('Google Drive Webhook cleared.', 'info');
  }
}

function clearGDriveWebhook() {
  const input = document.getElementById('gdriveWebhookInput');
  if (input) input.value = '';
  try {
    localStorage.removeItem('dhakkans_gdrive_webhook');
  } catch (e) {}
  sessionStorage.removeItem('dhakkans_gdrive_webhook');
  if (window.DHAKKANS_GDRIVE_WEBHOOK !== undefined) window.DHAKKANS_GDRIVE_WEBHOOK = '';
  showToast('Google Drive Webhook cleared from this session.', 'info');
}

// Attach Common Uploader helpers to window
window.getOrPromptGDriveWebhook = getOrPromptGDriveWebhook;
window.initUploaderTab = initUploaderTab;
window.handleCommonPhotoUpload = handleCommonPhotoUpload;
window.copyCommonUrl = copyCommonUrl;
window.useInExpeditions = useInExpeditions;
window.useInFieldNotes = useInFieldNotes;
window.handleStandaloneUpload = handleStandaloneUpload;
window.copyStandaloneUrl = copyStandaloneUrl;
window.saveGDriveWebhook = saveGDriveWebhook;
window.clearGDriveWebhook = clearGDriveWebhook;
window.handleDirectPhotoUpload = handleDirectPhotoUpload;

