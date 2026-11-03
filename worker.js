/**
 * KawanDigi Creator Studio - Cloudflare Worker & D1 API Backend
 * Serves Static Assets and Ultra-Scalable REST API for Centralized Member Hub, Gamification & 24h Peak Usage Analytics
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Routes for Centralized Database & Analytics
    if (url.pathname.startsWith('/api/')) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const db = env.DB;

      // 1. Leaderboard Ranking API
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        if (!db) {
          return new Response(JSON.stringify({ status: 'local_fallback', message: 'D1 database not bound yet, using client storage' }), { headers: corsHeaders });
        }
        try {
          const { results } = await db.prepare('SELECT id, name, email, picture, plan, total_generates, xp, level FROM members ORDER BY xp DESC LIMIT 50').all();
          return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 2. 24-Hour Peak Activity Analytics API
      if (url.pathname === '/api/analytics/hours' && request.method === 'GET') {
        if (!db) {
          return new Response(JSON.stringify({ status: 'local_fallback', message: 'D1 database not bound yet' }), { headers: corsHeaders });
        }
        try {
          const { results } = await db.prepare('SELECT hour_wib AS hour, COUNT(*) AS count FROM activity_logs GROUP BY hour_wib ORDER BY hour_wib ASC').all();
          return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 3. Track Member Activity & Award XP API
      if (url.pathname === '/api/activity/track' && request.method === 'POST') {
        try {
          const body = await request.json();
          if (db && body.email) {
            const now = new Date();
            const hourWib = (now.getUTCHours() + 7) % 24;
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const dayWib = days[now.getUTCDay()];
            const actId = 'act_' + Date.now();

            await db.prepare('INSERT INTO activity_logs (id, email, name, tool, detail, timestamp, hour_wib, day_wib, xp_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(actId, body.email, body.name || 'Member', body.tool, body.detail || '', now.toISOString(), hourWib, dayWib, body.xp || 10)
              .run();

            await db.prepare('UPDATE members SET total_generates = total_generates + 1, xp = xp + ?, last_active = ? WHERE email = ?')
              .bind(body.xp || 10, now.toISOString(), body.email)
              .run();
          }
          return new Response(JSON.stringify({ status: 'success' }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 4. Sync Member Google Sign-In API
      if (url.pathname === '/api/auth/google' && request.method === 'POST') {
        try {
          const body = await request.json();
          if (db && body.email) {
            await db.prepare(`
              INSERT INTO members (id, name, email, picture, plan, total_generates, xp, level, last_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                picture = excluded.picture,
                last_active = CURRENT_TIMESTAMP
            `).bind(body.id || 'usr_' + Date.now(), body.name, body.email, body.picture, body.plan || 'Free Trial', body.total_generates || 0, body.xp || 10, body.level || 'Novice Creator').run();
          }
          return new Response(JSON.stringify({ status: 'success' }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 5. Cloudflare Centralized Settings API (Google OAuth & System Config)
      if (url.pathname === '/api/settings') {
        globalThis.__kd_settings = globalThis.__kd_settings || {};
        if (request.method === 'GET') {
          let clientId = env.GOOGLE_CLIENT_ID || globalThis.__kd_settings.google_client_id || '';
          let adminEmail = env.ADMIN_EMAIL || globalThis.__kd_settings.admin_email || 'admin.kawandigi@gmail.com';
          if (db) {
            try {
              await db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
              const rowClient = await db.prepare("SELECT value FROM app_settings WHERE key = 'google_client_id'").first();
              if (rowClient && rowClient.value) {
                clientId = rowClient.value;
              }
              const rowAdmin = await db.prepare("SELECT value FROM app_settings WHERE key = 'admin_email'").first();
              if (rowAdmin && rowAdmin.value) {
                adminEmail = rowAdmin.value;
              }
            } catch (e) {
              console.error("D1 app_settings read error:", e);
            }
          }
          return new Response(JSON.stringify({
            status: 'success',
            data: {
              google_client_id: (clientId || env.GOOGLE_CLIENT_ID || globalThis.__kd_settings.google_client_id || '').trim(),
              admin_email: (adminEmail || env.ADMIN_EMAIL || globalThis.__kd_settings.admin_email || 'admin.kawandigi@gmail.com').trim()
            }
          }), { headers: corsHeaders });
        }

        if (request.method === 'POST') {
          try {
            const body = await request.json();
            const newClientId = (body.google_client_id || '').trim();
            const newAdminEmail = (body.admin_email || '').trim();

            if (newClientId) globalThis.__kd_settings.google_client_id = newClientId;
            if (newAdminEmail) globalThis.__kd_settings.admin_email = newAdminEmail;

            if (db) {
              await db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
              if (newClientId) {
                await db.prepare(`
                  INSERT INTO app_settings (key, value, updated_at)
                  VALUES ('google_client_id', ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
                `).bind(newClientId).run();
              }
              if (newAdminEmail) {
                await db.prepare(`
                  INSERT INTO app_settings (key, value, updated_at)
                  VALUES ('admin_email', ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
                `).bind(newAdminEmail).run();
              }
            }
            return new Response(JSON.stringify({
              status: 'success',
              message: 'Pengaturan berhasil disimpan di Cloudflare',
              google_client_id: newClientId || globalThis.__kd_settings.google_client_id || '',
              admin_email: newAdminEmail || globalThis.__kd_settings.admin_email || 'admin.kawandigi@gmail.com'
            }), { headers: corsHeaders });
          } catch (e) {
            return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
          }
        }
      }
    }

    // Default: serve static SPA assets
    return env.ASSETS.fetch(request);
  }
};
