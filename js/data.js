/**
 * Dhakkan's Tours & Travels — Centralized Data & GitHub Sync Engine
 * Synchronizes website data (peaceful tours, scenic treks, prices in INR, departure dates, hero text, bookings, gallery)
 * between client-side localStorage, local backend server (db.json), and GitHub API.
 */

// =================== DEFAULT FALLBACK DATA (PEACEFUL TOURS & SCENIC TREKS) =================== //
const DEFAULT_SETTINGS = {
  "brandName": "DHAKKAN'S",
  "heroBadge": "Boutique Tours & Soulful Nature Treks Across India",
  "heroTitle": "Find Yourself. Breathe Freely. Never In A Rush.",
  "heroDesc": "Curated, slow-paced premium tours and serene nature treks across India — from mist-laden Sahyadri weekend trails and gentle Himalayan valleys to private Kerala backwaters and royal desert glamping. Crafted for travelers who value peace, comfort, and soulful experiences over crowded rush.",
  "statExpeditions": "150",
  "statSuccess": "100",
  "statYears": "15",
  "statTrekkers": "8500",
  "phone": "+91 79001 08067",
  "email": "info@dhakkans.com",
  "atulPhone": "+91 70393 47132",
  "address": "Dhanjiwadi, Rani Sati Marg, Malad, Mumbai - 400097, Maharashtra, India",
  "timings": "Monday – Saturday · 9:00 AM – 7:00 PM IST",
  "philosophyTitle": "Travel at the speed of peace — never in a rush.",
  "philosophyDesc": "We replace chaotic itineraries and crowded tourist rush with mindful pacing, handpicked comfortable stays, and soulful natural beauty across India."
};

const DEFAULT_TREKS = [];

const DEFAULT_GALLERY = [];

const DEFAULT_AUTH = {
  "user": "admin",
  "passHash": "2793636809a93caedf7717a9ae71c3d358e3958b76c7d6a9dda1284b0b1384ea"
};

let _cache = {
  settings: null,
  treks: null,
  gallery: null,
  bookings: null,
  inquiries: null,
  auth: null
};

let _lastDataFingerprint = '';
let _syncStatus = 'checking'; // 'connected' | 'syncing' | 'offline' | 'checking'
let _lastSyncTimestamp = null;
let _syncError = null;
let _isSyncing = false;
let _broadcastChannel = null;

// Initialize cross-tab BroadcastChannel for 0ms same-origin tab sync
try {
  if (typeof BroadcastChannel !== 'undefined') {
    _broadcastChannel = new BroadcastChannel('dhakkans_github_sync_channel');
    _broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'DATA_UPDATED') {
        loadInitialCache();
        DB._dispatchUpdate('broadcast');
      }
    };
  }
} catch (e) { }

// Get Active GitHub Configuration
function getActiveGitHubConfig() {
  let owner = "DhakkansGroup";
  let repo = "original-site";
  let branch = "main";
  let path = "data/db.json";
  let token = "";

  try {
    owner = localStorage.getItem('dhakkans_gh_owner') || (window.DHAKKANS_GITHUB_CONFIG?.owner || owner);
    repo = localStorage.getItem('dhakkans_gh_repo') || (window.DHAKKANS_GITHUB_CONFIG?.repo || repo);
    branch = localStorage.getItem('dhakkans_gh_branch') || (window.DHAKKANS_GITHUB_CONFIG?.branch || branch);
    path = localStorage.getItem('dhakkans_gh_path') || (window.DHAKKANS_GITHUB_CONFIG?.path || path);
    token = localStorage.getItem('dhakkans_gh_token') || (window.DHAKKANS_GITHUB_CONFIG?.token || token);
  } catch (e) { }

  return {
    owner: owner.trim(),
    repo: repo.trim(),
    branch: branch.trim() || 'main',
    path: path.trim() || 'data/db.json',
    token: token.trim()
  };
}

const CURRENT_DATA_VERSION = '2026_11_live_v1';

// Synchronous local cache loader (Fast 0ms page start)
function loadInitialCache() {
  try {
    const storedVersion = localStorage.getItem('dhakkans_data_version');
    if (storedVersion !== CURRENT_DATA_VERSION) {
      localStorage.setItem('dhakkans_data_version', CURRENT_DATA_VERSION);
      localStorage.setItem('dhakkans_settings', JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('dhakkans_treks', JSON.stringify([]));
      localStorage.setItem('dhakkans_gallery', JSON.stringify([]));
      _cache.settings = { ...DEFAULT_SETTINGS };
      _cache.treks = [];
      _cache.gallery = [];
      return;
    }
  } catch (e) { }

  try {
    const s = localStorage.getItem('dhakkans_settings');
    _cache.settings = s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch (e) { _cache.settings = { ...DEFAULT_SETTINGS }; }

  try {
    const t = localStorage.getItem('dhakkans_treks');
    if (t) {
      const parsed = JSON.parse(t);
      _cache.treks = Array.isArray(parsed) ? parsed : [];
    } else {
      _cache.treks = [];
    }
  } catch (e) { _cache.treks = []; }

  try {
    const g = localStorage.getItem('dhakkans_gallery');
    if (g) {
      const parsed = JSON.parse(g);
      _cache.gallery = Array.isArray(parsed) ? parsed : [];
    } else {
      _cache.gallery = [];
    }
  } catch (e) { _cache.gallery = []; }

  try {
    const b = localStorage.getItem('dhakkans_bookings');
    _cache.bookings = b ? JSON.parse(b) : [];
  } catch (e) { _cache.bookings = []; }

  try {
    const i = localStorage.getItem('dhakkans_inquiries');
    _cache.inquiries = i ? JSON.parse(i) : [];
  } catch (e) { _cache.inquiries = []; }

  try {
    const a = localStorage.getItem('dhakkans_auth');
    _cache.auth = a ? JSON.parse(a) : DEFAULT_AUTH;
    // Migrate to secure SHA-256 passHash if legacy plain-text pass was stored
    if (!_cache.auth || !_cache.auth.passHash) {
      _cache.auth = { user: (_cache.auth && _cache.auth.user) || 'admin', passHash: DEFAULT_AUTH.passHash };
      localStorage.setItem('dhakkans_auth', JSON.stringify(_cache.auth));
    }
  } catch (e) { _cache.auth = DEFAULT_AUTH; }
}

loadInitialCache();

const DB = {
  isServerConnected() {
    return _syncStatus === 'connected';
  },

  getGitHubStatus() {
    const cfg = getActiveGitHubConfig();
    return {
      status: _syncStatus,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      path: cfg.path,
      hasToken: Boolean(cfg.token),
      lastSyncTimestamp: _lastSyncTimestamp,
      error: _syncError,
      trekCount: (_cache.treks || []).length,
      bookingCount: (_cache.bookings || []).length,
      inquiryCount: (_cache.inquiries || []).length
    };
  },

  // Alias for backwards compatibility
  getCloudStatus() {
    return this.getGitHubStatus();
  },

  getGitHubConfig() {
    return getActiveGitHubConfig();
  },

  setGitHubConfig(cfg) {
    if (!cfg) return;
    try {
      if (cfg.owner !== undefined) localStorage.setItem('dhakkans_gh_owner', cfg.owner.trim());
      if (cfg.repo !== undefined) localStorage.setItem('dhakkans_gh_repo', cfg.repo.trim());
      if (cfg.branch !== undefined) localStorage.setItem('dhakkans_gh_branch', cfg.branch.trim());
      if (cfg.path !== undefined) localStorage.setItem('dhakkans_gh_path', cfg.path.trim());
      if (cfg.token !== undefined) {
        if (cfg.token && cfg.token.trim()) {
          localStorage.setItem('dhakkans_gh_token', cfg.token.trim());
        } else {
          localStorage.removeItem('dhakkans_gh_token');
        }
      }

      if (window.DHAKKANS_GITHUB_CONFIG) {
        Object.assign(window.DHAKKANS_GITHUB_CONFIG, cfg);
      }
    } catch (e) { }

    this.syncFromGitHub(true);
    return true;
  },

  /* ============ LIVE GITHUB TESTER ============ */
  async testGitHubConnection(testOwner, testRepo, testToken = '', testBranch = 'main', testPath = 'data/db.json') {
    const owner = (testOwner || getActiveGitHubConfig().owner).trim();
    const repo = (testRepo || getActiveGitHubConfig().repo).trim();
    const token = (testToken !== undefined ? testToken : getActiveGitHubConfig().token).trim();
    const branch = (testBranch || getActiveGitHubConfig().branch).trim() || 'main';
    const path = (testPath || getActiveGitHubConfig().path).trim() || 'data/db.json';

    if (!owner || !repo) {
      return { success: false, message: 'Please enter both GitHub Owner and Repository Name.' };
    }

    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      // 1. Check if repository is reachable
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          return {
            success: false,
            message: `Repository "${owner}/${repo}" was not found on GitHub. Please check: 1) Does https://github.com/${owner}/${repo} exist? 2) If the repo is under your personal GitHub username instead of "${owner}", change the Owner field above. 3) If private, make sure your token has "repo" scope.`
          };
        }
        if (repoRes.status === 401) {
          return { success: false, message: 'Invalid GitHub Personal Access Token. Please verify you copied the full token (starts with ghp_ or github_pat_).' };
        }
        if (repoRes.status === 403) {
          return { success: false, message: 'GitHub API rate limit exceeded or access forbidden. Check token permissions.' };
        }
        return { success: false, message: `GitHub API error: HTTP ${repoRes.status}` };
      }

      // 2. Check if db.json file exists
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers });
      const hasFile = fileRes.ok;

      return {
        success: true,
        message: `Successfully connected to repository https://github.com/${owner}/${repo} (Branch: ${branch})${hasFile ? ` · "${path}" is active` : ` · "${path}" will be created on first commit`}.`,
        hasFile
      };
    } catch (err) {
      return {
        success: false,
        message: `Network error connecting to GitHub: ${err.message || 'Check your internet connection'}`
      };
    }
  },

  /* ============ SYNC FROM GITHUB & STATIC STORAGE (NO LIMITS) ============ */
  async syncFromGitHub(force = false) {
    if (_isSyncing) return false;
    _isSyncing = true;
    try {
      const { owner, repo, branch, path } = getActiveGitHubConfig();
      const cacheBust = force ? `?t=${Date.now()}` : '';

      // Prioritize local relative endpoints first for instant responses without hitting external networks
      const endpoints = [
        '/api/data',
        `./${path}${cacheBust}`,
        `./data/db.json${cacheBust}`
      ];

      // If viewing from an alternate local port (e.g. IntelliJ or live-server), also try port 3000
      if (typeof window !== 'undefined' && window.location && window.location.port && window.location.port !== '3000') {
        endpoints.push('http://localhost:3000/api/data');
      }

      // Only attempt remote GitHub raw if hosted on GitHub Pages (github.io) or if a custom repo/token is set
      const isGitHubPages = typeof window !== 'undefined' && window.location && window.location.hostname.includes('github.io');
      const cfg = getActiveGitHubConfig();
      if (isGitHubPages || (cfg && cfg.token)) {
        endpoints.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}${cacheBust}`);
      }

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(url, { signal: controller.signal, cache: force ? 'no-store' : 'default' });
          clearTimeout(timeoutId);

          if (!res.ok) continue;
          const body = await res.json();
          const data = (body && body.data) ? body.data : body;

          if (data && (data.settings || data.treks || data.gallery)) {
            _syncStatus = 'connected';
            _lastSyncTimestamp = new Date();
            _syncError = null;

            const fingerprint = JSON.stringify(data);
            const hasChanged = fingerprint !== _lastDataFingerprint;
            _lastDataFingerprint = fingerprint;

            if (hasChanged || force) {
              if (data.settings) _cache.settings = { ...DEFAULT_SETTINGS, ...data.settings };
              if (data.treks && Array.isArray(data.treks)) _cache.treks = data.treks;
              if (data.gallery && Array.isArray(data.gallery)) _cache.gallery = data.gallery;
              if (data.bookings && Array.isArray(data.bookings)) _cache.bookings = data.bookings;
              if (data.inquiries && Array.isArray(data.inquiries)) _cache.inquiries = data.inquiries;
              if (data.auth) _cache.auth = { ...DEFAULT_AUTH, ...data.auth };

              // Save to localStorage for instant startup
              try {
                if (_cache.settings) localStorage.setItem('dhakkans_settings', JSON.stringify(_cache.settings));
                if (_cache.treks) localStorage.setItem('dhakkans_treks', JSON.stringify(_cache.treks));
                if (_cache.gallery) localStorage.setItem('dhakkans_gallery', JSON.stringify(_cache.gallery));
                if (_cache.bookings) localStorage.setItem('dhakkans_bookings', JSON.stringify(_cache.bookings));
                if (_cache.inquiries) localStorage.setItem('dhakkans_inquiries', JSON.stringify(_cache.inquiries));
                if (_cache.auth) localStorage.setItem('dhakkans_auth', JSON.stringify(_cache.auth));
              } catch (e) { }

              this._dispatchUpdate('sync');
            }

            this._dispatchStatus();
            return true;
          }
        } catch (err) {
          _syncError = err.message;
        }
      }

      _syncStatus = 'connected'; // Local cache is active
      this._dispatchStatus();
      return false;
    } finally {
      _isSyncing = false;
    }
  },

  // Backward compatibility alias
  async syncWithServer() {
    return this.syncFromGitHub();
  },

  /* ============ COMMIT DATABASE DIRECTLY TO GITHUB REPOSITORY ============ */
  async commitToGitHub(customMessage = '') {
    const { owner, repo, branch, path, token } = getActiveGitHubConfig();

    if (!token) {
      return {
        success: false,
        message: 'Please provide a GitHub Personal Access Token with "repo" or "Contents: Read & Write" permission to commit directly.'
      };
    }

    const payload = {
      settings: _cache.settings || DEFAULT_SETTINGS,
      treks: _cache.treks || DEFAULT_TREKS,
      gallery: _cache.gallery || DEFAULT_GALLERY,
      bookings: _cache.bookings || [],
      inquiries: _cache.inquiries || [],
      auth: _cache.auth || DEFAULT_AUTH,
      lastUpdated: new Date().toISOString()
    };

    const jsonString = JSON.stringify(payload, null, 2);
    // Universal UTF-8 base64 encoder
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const base64Content = btoa(binary);

    try {
      _syncStatus = 'syncing';
      this._dispatchStatus();

      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      };

      // 1. Get file SHA if it already exists
      let sha = null;
      const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers
      });
      if (checkRes.ok) {
        const fileInfo = await checkRes.json();
        sha = fileInfo.sha;
      }

      // 2. Commit file via GitHub API
      const commitBody = {
        message: customMessage || `Update website database via Admin Panel [skip ci]`,
        content: base64Content,
        branch: branch
      };
      if (sha) commitBody.sha = sha;

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(commitBody)
      });

      if (putRes.ok) {
        const result = await putRes.json();
        _syncStatus = 'connected';
        _lastSyncTimestamp = new Date();
        this._dispatchStatus();
        this._dispatchBroadcast();
        return {
          success: true,
          commitUrl: result.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`,
          message: `Successfully committed changes directly to https://github.com/${owner}/${repo}!`
        };
      } else {
        const errData = await putRes.json();
        _syncStatus = 'offline';
        _syncError = errData.message;
        this._dispatchStatus();
        return {
          success: false,
          message: `GitHub Commit Error: ${errData.message || 'Permission denied'}`
        };
      }
    } catch (err) {
      _syncStatus = 'offline';
      _syncError = err.message;
      this._dispatchStatus();
      return { success: false, message: `Network error: ${err.message}` };
    }
  },

  /* ============ GENERATE FULL JSON DATABASE SNAPSHOT ============ */
  getFullDatabaseJSON() {
    const payload = {
      settings: _cache.settings || DEFAULT_SETTINGS,
      treks: _cache.treks || DEFAULT_TREKS,
      gallery: _cache.gallery || DEFAULT_GALLERY,
      bookings: _cache.bookings || [],
      inquiries: _cache.inquiries || [],
      auth: _cache.auth || DEFAULT_AUTH,
      lastUpdated: new Date().toISOString()
    };
    return JSON.stringify(payload, null, 2);
  },

  /* ============ LOCAL SERVER SYNC HELPER ============ */
  async _postToLocalServer(key, data) {
    const payload = key === 'all' ? data : { key, data };
    const endpoints = ['/api/save', 'http://localhost:3000/api/save'];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return true;
      } catch (e) { }
    }
    return false;
  },

  /* ============ ENTITY GETTERS & SETTERS ============ */
  getSettings() {
    if (!_cache.settings) loadInitialCache();
    return _cache.settings || { ...DEFAULT_SETTINGS };
  },

  saveSettings(s) {
    _cache.settings = { ..._cache.settings, ...s };
    try { localStorage.setItem('dhakkans_settings', JSON.stringify(_cache.settings)); } catch (e) { }
    this._dispatchUpdate('settings');
    this._postToLocalServer('settings', _cache.settings);
    return this._autoCommitIfConfigured('Update website settings via Admin Customizer');
  },

  getTreks() {
    if (!_cache.treks) loadInitialCache();
    return _cache.treks || DEFAULT_TREKS;
  },

  saveTreks(t) {
    _cache.treks = Array.isArray(t) ? t : DEFAULT_TREKS;
    try { localStorage.setItem('dhakkans_treks', JSON.stringify(_cache.treks)); } catch (e) { }
    this._dispatchUpdate('treks');
    this._postToLocalServer('treks', _cache.treks);
    return this._autoCommitIfConfigured('Update expeditions and treks via Admin Portal');
  },

  getGallery() {
    if (!_cache.gallery) loadInitialCache();
    return _cache.gallery || DEFAULT_GALLERY;
  },

  saveGallery(g) {
    _cache.gallery = Array.isArray(g) ? g : DEFAULT_GALLERY;
    try { localStorage.setItem('dhakkans_gallery', JSON.stringify(_cache.gallery)); } catch (e) { }
    this._dispatchUpdate('gallery');
    this._postToLocalServer('gallery', _cache.gallery);
    return this._autoCommitIfConfigured('Update gallery via Admin Portal');
  },

  getBookings() {
    if (!_cache.bookings) loadInitialCache();
    return _cache.bookings || [];
  },

  saveBookings(b) {
    _cache.bookings = Array.isArray(b) ? b : [];
    try { localStorage.setItem('dhakkans_bookings', JSON.stringify(_cache.bookings)); } catch (e) { }
    this._dispatchUpdate('bookings');
    this._postToLocalServer('bookings', _cache.bookings);
    // Note: Bookings intentionally DO NOT commit to Git to protect the 500-build monthly quota!
  },

  addBooking(b) {
    const list = this.getBookings();
    const newEntry = {
      id: 'BK-' + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: 'Confirmed',
      ...b
    };
    list.unshift(newEntry);
    this.saveBookings(list);
    return newEntry;
  },

  getInquiries() {
    if (!_cache.inquiries) loadInitialCache();
    return _cache.inquiries || [];
  },

  saveInquiries(i) {
    _cache.inquiries = Array.isArray(i) ? i : [];
    try { localStorage.setItem('dhakkans_inquiries', JSON.stringify(_cache.inquiries)); } catch (e) { }
    this._dispatchUpdate('inquiries');
    this._postToLocalServer('inquiries', _cache.inquiries);
    // Note: Inquiries intentionally DO NOT commit to Git to protect the 500-build monthly quota!
  },

  addInquiry(inq) {
    const list = this.getInquiries();
    const newEntry = {
      id: 'INQ-' + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: 'New',
      ...inq
    };
    list.unshift(newEntry);
    this.saveInquiries(list);
    return newEntry;
  },

  getAuth() {
    if (!_cache.auth) loadInitialCache();
    return _cache.auth || DEFAULT_AUTH;
  },

  saveAuth(auth) {
    _cache.auth = { ..._cache.auth, ...auth };
    try { localStorage.setItem('dhakkans_auth', JSON.stringify(_cache.auth)); } catch (e) { }
    this._dispatchUpdate('auth');
    this._postToLocalServer('auth', _cache.auth);
  },

  resetToDefaults() {
    _cache.settings = { ...DEFAULT_SETTINGS };
    _cache.treks = JSON.parse(JSON.stringify(DEFAULT_TREKS));
    _cache.gallery = JSON.parse(JSON.stringify(DEFAULT_GALLERY));
    _cache.bookings = [];
    _cache.inquiries = [];
    _cache.auth = { ...DEFAULT_AUTH };

    try {
      localStorage.setItem('dhakkans_settings', JSON.stringify(_cache.settings));
      localStorage.setItem('dhakkans_treks', JSON.stringify(_cache.treks));
      localStorage.setItem('dhakkans_gallery', JSON.stringify(_cache.gallery));
      localStorage.setItem('dhakkans_bookings', JSON.stringify([]));
      localStorage.setItem('dhakkans_inquiries', JSON.stringify([]));
      localStorage.setItem('dhakkans_auth', JSON.stringify(_cache.auth));
    } catch (e) { }

    this._dispatchUpdate('all');
    this._postToLocalServer('all', {
      settings: _cache.settings,
      treks: _cache.treks,
      gallery: _cache.gallery,
      bookings: _cache.bookings,
      inquiries: _cache.inquiries,
      auth: _cache.auth
    });
  },

  _autoCommitIfConfigured(message = 'Update website content via Admin Portal') {
    const cfg = getActiveGitHubConfig();
    if (cfg && cfg.token) {
      // Commit content changes directly to GitHub repository
      return this.commitToGitHub(message);
    }
    return Promise.resolve({ success: false, message: 'No GitHub token configured' });
  },

  _dispatchUpdate(reason = 'update') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dhakkans:dataupdated', {
        detail: { reason, cache: _cache, syncStatus: _syncStatus }
      }));
    }
  },

  _dispatchStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dhakkans:githubstatus', {
        detail: this.getGitHubStatus()
      }));
      window.dispatchEvent(new CustomEvent('dhakkans:cloudstatus', {
        detail: this.getGitHubStatus()
      }));
    }
  },

  _dispatchBroadcast() {
    try {
      if (_broadcastChannel) {
        _broadcastChannel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
      }
    } catch (e) { }
  }
};

// Global exports
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'TREKS', {
    get() { return DB.getTreks(); },
    configurable: true
  });
  Object.defineProperty(window, 'GALLERY', {
    get() { return DB.getGallery(); },
    configurable: true
  });
  window.DB = DB;

  // Non-blocking sync after initial page load completes
  const scheduleInitialSync = () => {
    setTimeout(() => {
      DB.syncFromGitHub().then(synced => {
        if (synced) {
          window.dispatchEvent(new CustomEvent('dhakkans:dataready', { detail: _cache }));
        }
      });
    }, 150);
  };

  if (document.readyState === 'complete') {
    scheduleInitialSync();
  } else {
    window.addEventListener('load', scheduleInitialSync);
  }

  // Debounced re-sync on window focus
  let _lastFocusSync = 0;
  const debouncedFocusSync = () => {
    const now = Date.now();
    if (now - _lastFocusSync > 10000) {
      _lastFocusSync = now;
      DB.syncFromGitHub();
    }
  };
  window.addEventListener('focus', debouncedFocusSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      debouncedFocusSync();
    }
  });

  // Background sync ONLY on Admin Operations Desk (every 45s), never spams visitor pages
  const isAdmin = typeof window !== 'undefined' && window.location && (window.location.pathname.includes('dhakkans-hq-ops-2026') || window.location.pathname.includes('admin'));
  if (isAdmin) {
    setInterval(() => {
      DB.syncFromGitHub();
    }, 45000);
  }
}
