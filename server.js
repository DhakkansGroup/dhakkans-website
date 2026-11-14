/**
 * Dhakkan's Tours & Travels — Peaceful Journeys, Sacred Yatras & Scenic Treks
 * Server & Centralized Permanent Storage Engine
 * Provides static file serving and persistent REST API for multi-browser administration.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const GDRIVE_WEBHOOK_URL = process.env.GDRIVE_WEBHOOK || '';

// MIME Type Mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Ensure data directory and db.json exist
function ensureDatabase() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      settings: {
        brandName: "DHAKKAN'S",
        heroBadge: "Boutique Tours & Soulful Nature Treks Across India",
        heroTitle: "Find Yourself. Breathe Freely. Never In A Rush.",
        heroDesc: "Curated, slow-paced premium tours and serene nature treks across India — from mist-laden Sahyadri weekend trails and gentle Himalayan valleys to private Kerala backwaters and royal desert glamping. Crafted for travelers who value peace, comfort, and authentic experiences over crowded rush.",
        statExpeditions: "150",
        statSuccess: "100",
        statYears: "15",
        statTrekkers: "8500",
        phone: "+91 79001 08067",
        email: "info@dhakkans.com",
        atulPhone: "+91 70393 47132",
        address: "Dhanjiwadi, Rani Sati Marg, Malad, Mumbai - 400097, Maharashtra, India",
        timings: "Monday – Saturday · 9:00 AM – 7:00 PM IST",
        philosophyTitle: "Travel at the speed of peace — never in a rush.",
        philosophyDesc: "We replace chaotic tourist rush with mindful pacing, handpicked comfortable stays, and soulful natural beauty across India."
      },
      treks: [],
      gallery: [],
      bookings: [],
      inquiries: [],
      auth: { user: 'admin', passHash: '2793636809a93caedf7717a9ae71c3d358e3958b76c7d6a9dda1284b0b1384ea' }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read database from disk
function readDatabase() {
  try {
    ensureDatabase();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      settings: {},
      treks: [],
      gallery: [],
      bookings: [],
      inquiries: [],
      auth: { user: 'admin', passHash: '2793636809a93caedf7717a9ae71c3d358e3958b76c7d6a9dda1284b0b1384ea' }
    };
  }
}

// Write database to disk safely
function writeDatabase(data) {
  try {
    ensureDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Helper: parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Safeguard against very large payloads
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper: send JSON response
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(payload));
}


// Create HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // =================== REST API ROUTES =================== //
  if (pathname.startsWith('/api/')) {
    try {
      // GET: Retrieve whole database or specific section
      if (req.method === 'GET') {
        const db = readDatabase();

        if (pathname === '/api/data' || pathname === '/api/all') {
          return sendJSON(res, 200, { success: true, data: db });
        }
        if (pathname === '/api/settings') {
          return sendJSON(res, 200, { success: true, data: db.settings || {} });
        }
        if (pathname === '/api/treks') {
          return sendJSON(res, 200, { success: true, data: db.treks || [] });
        }
        if (pathname === '/api/gallery') {
          return sendJSON(res, 200, { success: true, data: db.gallery || [] });
        }
        if (pathname === '/api/bookings') {
          return sendJSON(res, 200, { success: true, data: db.bookings || [] });
        }
        if (pathname === '/api/inquiries') {
          return sendJSON(res, 200, { success: true, data: db.inquiries || [] });
        }
        if (pathname === '/api/auth') {
          return sendJSON(res, 200, { success: true, data: { user: (db.auth && db.auth.user) || 'admin', hasAuth: true } });
        }
        if (pathname === '/api/health') {
          return sendJSON(res, 200, { success: true, status: 'online', time: new Date().toISOString() });
        }

        return sendJSON(res, 404, { success: false, error: 'Endpoint not found' });
      }

      // POST: Update whole database or specific section
      if (req.method === 'POST') {
        const body = await parseRequestBody(req);
        const db = readDatabase();

        if (pathname === '/api/save') {
          const { key, data } = body;
          if (key && data !== undefined) {
            db[key] = data;
          } else if (body.settings || body.treks || body.gallery) {
            // Whole payload
            if (body.settings) db.settings = body.settings;
            if (body.treks) db.treks = body.treks;
            if (body.gallery) db.gallery = body.gallery;
            if (body.bookings) db.bookings = body.bookings;
            if (body.inquiries) db.inquiries = body.inquiries;
            if (body.auth) db.auth = body.auth;
          } else {
            return sendJSON(res, 400, { success: false, error: 'Invalid payload' });
          }

          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Saved permanently to server database', data: db });
        }

        if (pathname === '/api/settings') {
          db.settings = body;
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Settings saved', data: db.settings });
        }

        if (pathname === '/api/treks') {
          db.treks = Array.isArray(body) ? body : (body.treks || []);
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Treks saved', data: db.treks });
        }

        if (pathname === '/api/gallery') {
          db.gallery = Array.isArray(body) ? body : (body.gallery || []);
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Gallery saved', data: db.gallery });
        }

        if (pathname === '/api/bookings') {
          db.bookings = Array.isArray(body) ? body : (body.bookings || []);
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Bookings saved', data: db.bookings });
        }

        if (pathname === '/api/booking/add') {
          const newEntry = {
            id: body.id || ('BK-' + Date.now().toString(36).toUpperCase()),
            createdAt: body.createdAt || new Date().toISOString(),
            status: body.status || 'Confirmed',
            ...body
          };
          db.bookings = db.bookings || [];
          // Avoid duplicate entry if same ID is passed
          const existingIdx = db.bookings.findIndex(b => b.id === newEntry.id);
          if (existingIdx >= 0) {
            db.bookings[existingIdx] = newEntry;
          } else {
            db.bookings.unshift(newEntry);
          }
          writeDatabase(db);
          return sendJSON(res, 201, { success: true, message: 'Booking registered', data: newEntry });
        }

        if (pathname === '/api/inquiries') {
          db.inquiries = Array.isArray(body) ? body : (body.inquiries || []);
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Inquiries saved', data: db.inquiries });
        }

        if (pathname === '/api/inquiry/add') {
          const newEntry = {
            id: 'INQ-' + Date.now().toString(36).toUpperCase(),
            createdAt: new Date().toISOString(),
            status: 'New',
            ...body
          };
          db.inquiries = db.inquiries || [];
          db.inquiries.unshift(newEntry);
          writeDatabase(db);
          return sendJSON(res, 201, { success: true, message: 'Inquiry registered', data: newEntry });
        }

        if (pathname === '/api/auth') {
          db.auth = { user: body.user || 'admin', passHash: body.passHash || '2793636809a93caedf7717a9ae71c3d358e3958b76c7d6a9dda1284b0b1384ea' };
          writeDatabase(db);
          return sendJSON(res, 200, { success: true, message: 'Admin credentials saved' });
        }

        if (pathname === '/api/upload') {
          const { filename, base64, webhookUrl } = body;
          if (!filename || !base64) {
            return sendJSON(res, 400, { success: false, error: 'Missing filename or base64 data' });
          }

          const targetWebhook = (webhookUrl || GDRIVE_WEBHOOK_URL || '').trim();
          if (!targetWebhook || !targetWebhook.startsWith('http')) {
            return sendJSON(res, 400, {
              success: false,
              error: 'Google Apps Script Web App URL is required. Please paste your Google Drive Webhook URL in the uploader.'
            });
          }

          try {
            const cleanBase64 = base64.replace(/^data:image\/[a-z0-9-+.]+;base64,/i, '');
            const ext = (path.extname(filename) || '.jpg').toLowerCase().replace('.', '');
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const base = path.basename(filename, path.extname(filename)).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
            const safeName = `${Date.now()}-${base}.${ext === 'png' ? 'png' : 'jpg'}`;

            // Direct upload to Google Drive Webhook (dhakkanstreksandtours@gmail.com)
            const gdriveResp = await fetch(targetWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                name: safeName,
                base64: cleanBase64,
                type: mimeType
              })
            });

            if (gdriveResp.ok) {
              const gdriveJson = await gdriveResp.json();
              if (gdriveJson.success && gdriveJson.url) {
                return sendJSON(res, 200, {
                  success: true,
                  url: gdriveJson.url,
                  fileId: gdriveJson.fileId,
                  storage: 'Google Drive',
                  message: 'Uploaded to Google Drive successfully'
                });
              }
            }

            return sendJSON(res, 502, { success: false, error: 'Google Drive upload returned invalid response' });
          } catch (err) {
            console.error('Error uploading to Google Drive:', err);
            return sendJSON(res, 500, { success: false, error: err.message });
          }
        }

        if (pathname === '/api/reset') {
          // Reset to default seed
          ensureDatabase();
          // We can delete and re-create from initial seed
          return sendJSON(res, 200, { success: true, message: 'Database reset' });
        }

        return sendJSON(res, 404, { success: false, error: 'Endpoint not found' });
      }

      return sendJSON(res, 405, { success: false, error: 'Method not allowed' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, 500, { success: false, error: err.message || 'Internal server error' });
    }
  }

  // =================== STATIC FILE SERVING =================== //
  // Handle favicon.ico cleanly
  if (pathname === '/favicon.ico') {
    const icoPath = path.join(PUBLIC_DIR, 'favicon.ico');
    if (fs.existsSync(icoPath)) {
      res.writeHead(200, { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(icoPath).pipe(res);
    }
    const logoFallback = path.join(PUBLIC_DIR, 'assets', 'images', 'logo.png');
    if (fs.existsSync(logoFallback)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(logoFallback).pipe(res);
    }
    res.writeHead(204);
    return res.end();
  }

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  // Block legacy admin.html directly
  if (safePath.toLowerCase().endsWith('admin.html')) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="background:#0B1A14;color:#fff;text-align:center;padding:80px 20px;font-family:sans-serif;"><h1>404</h1><p>Trail not found.</p><a href="/" style="color:#7AC1B4;">Return to Base Camp</a></body></html>`);
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path doesn't have an extension, try appending .html
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found — Dhakkan's</title><meta charset="utf-8"></head>
<body style="font-family:sans-serif; text-align:center; padding:80px 20px; background:#0B1A14; color:#EEF2F0;">
  <h1 style="font-size:3rem; margin-bottom:10px;">404</h1>
  <p style="color:#A1B5AB; margin-bottom:24px;">The requested trail or file was not found.</p>
  <a href="/index.html" style="display:inline-block; padding:12px 24px; background:#7AC1B4; color:#0B1A14; text-decoration:none; border-radius:30px; font-weight:700;">Return to Base Camp</a>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.json' || ext === '.css'
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=86400'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Start Server
ensureDatabase();
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`[SERVER]  Dhakkan's Expeditions Web Server & Central Database`);
  console.log(`[READY]   Server running live at: http://localhost:${PORT}`);
  console.log(`[STORAGE] Persistent database: ${DB_FILE}`);
  console.log(`[ADMIN]   Admin Portal: http://localhost:${PORT}/dhakkans-hq-ops-2026.html`);
  console.log('====================================================');
});
