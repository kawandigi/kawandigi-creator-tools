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
      globalThis.__kd_members = globalThis.__kd_members || [];

      // Helper to ensure D1 tables exist
      const ensureD1Tables = async () => {
        if (!db) return;
        try {
          await db.prepare(`
            CREATE TABLE IF NOT EXISTS members (
              id TEXT PRIMARY KEY,
              name TEXT,
              email TEXT UNIQUE,
              picture TEXT,
              plan TEXT,
              total_generates INTEGER DEFAULT 0,
              xp INTEGER DEFAULT 10,
              level TEXT DEFAULT 'Novice Creator',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              last_active DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();

          await db.prepare(`
            CREATE TABLE IF NOT EXISTS activity_logs (
              id TEXT PRIMARY KEY,
              email TEXT,
              name TEXT,
              tool TEXT,
              detail TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              hour_wib INTEGER,
              day_wib TEXT,
              xp_earned INTEGER DEFAULT 10
            )
          `).run();

          await db.prepare(`
            CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();

          await db.prepare(`
            CREATE TABLE IF NOT EXISTS device_licenses (
              license_key TEXT PRIMARY KEY,
              tier TEXT NOT NULL,
              tier_name TEXT NOT NULL,
              device_id TEXT NOT NULL,
              device_name TEXT,
              email TEXT,
              activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              last_verified DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        } catch (e) {
          console.warn('D1 table creation check:', e.message);
        }
      };

      // 1. Leaderboard Ranking API (Email is completely omitted for privacy)
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        let results = [];
        if (db) {
          try {
            await ensureD1Tables();
            const res = await db.prepare('SELECT id, name, picture, plan, total_generates, xp, level FROM members ORDER BY xp DESC LIMIT 50').all();
            if (res && res.results && res.results.length > 0) {
              results = res.results;
            }
          } catch (e) {
            console.error('D1 leaderboard error:', e);
          }
        }

        if (results.length === 0 && globalThis.__kd_members.length > 0) {
          results = globalThis.__kd_members
            .slice()
            .sort((a, b) => (b.xp || 0) - (a.xp || 0))
            .slice(0, 50)
            .map(m => ({
              id: m.id,
              name: m.name,
              picture: m.picture,
              plan: m.plan,
              total_generates: m.total_generates || m.totalGenerates || 0,
              xp: m.xp || 0,
              level: m.level
            }));
        }

        return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
      }

      // 2. 24-Hour Peak Activity Analytics API
      if (url.pathname === '/api/analytics/hours' && request.method === 'GET') {
        if (!db) {
          return new Response(JSON.stringify({ status: 'local_fallback', message: 'D1 database not bound yet' }), { headers: corsHeaders });
        }
        try {
          await ensureD1Tables();
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
          if (body.email) {
            const now = new Date();
            const hourWib = (now.getUTCHours() + 7) % 24;
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const dayWib = days[now.getUTCDay()];
            const actId = 'act_' + Date.now();

            if (db) {
              await ensureD1Tables();
              await db.prepare('INSERT INTO activity_logs (id, email, name, tool, detail, timestamp, hour_wib, day_wib, xp_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(actId, body.email, body.name || 'Member', body.tool, body.detail || '', now.toISOString(), hourWib, dayWib, body.xp || 10)
                .run();

              await db.prepare('UPDATE members SET total_generates = total_generates + 1, xp = xp + ?, last_active = ? WHERE email = ?')
                .bind(body.xp || 10, now.toISOString(), body.email)
                .run();
            }

            const mem = globalThis.__kd_members.find(m => m.email.toLowerCase() === body.email.toLowerCase());
            if (mem) {
              mem.total_generates = (mem.total_generates || 0) + 1;
              mem.xp = (mem.xp || 0) + (body.xp || 10);
              mem.last_active = now.toISOString();
            }
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
          if (!body || !body.email) {
            return new Response(JSON.stringify({ status: 'error', message: 'Email is required' }), { status: 400, headers: corsHeaders });
          }

          const plan = body.plan || (body.subscription && body.subscription.plan) || 'VIP Master Lifetime';
          const totalGenerates = body.totalGenerates ?? body.total_generates ?? 0;
          const xp = body.xp ?? 10;
          const level = body.level || 'Novice Creator';
          const nowStr = new Date().toISOString();

          // Sync into worker memory store fallback
          const memberIdx = globalThis.__kd_members.findIndex(m => m.email.toLowerCase() === body.email.toLowerCase());
          const memberRecord = {
            id: body.id || 'usr_' + Date.now(),
            name: body.name || 'Member KawanDigi',
            email: body.email.toLowerCase(),
            picture: body.picture || 'assets/icons/favicon.png',
            plan: plan,
            totalGenerates: totalGenerates,
            total_generates: totalGenerates,
            xp: xp,
            level: level,
            lastActive: nowStr,
            last_active: nowStr,
            createdAt: body.joinedAt || nowStr
          };

          if (memberIdx >= 0) {
            globalThis.__kd_members[memberIdx] = {
              ...globalThis.__kd_members[memberIdx],
              ...memberRecord,
              totalGenerates: Math.max(globalThis.__kd_members[memberIdx].totalGenerates || 0, totalGenerates),
              total_generates: Math.max(globalThis.__kd_members[memberIdx].total_generates || 0, totalGenerates),
              xp: Math.max(globalThis.__kd_members[memberIdx].xp || 0, xp)
            };
          } else {
            globalThis.__kd_members.push(memberRecord);
          }

          // Sync into D1 database
          if (db) {
            await ensureD1Tables();
            await db.prepare(`
              INSERT INTO members (id, name, email, picture, plan, total_generates, xp, level, created_at, last_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                picture = excluded.picture,
                plan = excluded.plan,
                total_generates = MAX(members.total_generates, excluded.total_generates),
                xp = MAX(members.xp, excluded.xp),
                level = excluded.level,
                last_active = CURRENT_TIMESTAMP
            `).bind(
              memberRecord.id,
              memberRecord.name,
              memberRecord.email,
              memberRecord.picture,
              memberRecord.plan,
              memberRecord.total_generates,
              memberRecord.xp,
              memberRecord.level
            ).run();
          }

          return new Response(JSON.stringify({ status: 'success', data: memberRecord }), { headers: corsHeaders });
        } catch (e) {
          console.error('Auth google sync error:', e);
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 4b. Member List API (For Superadmin Console Centralized Sync)
      if (url.pathname === '/api/members' && request.method === 'GET') {
        let membersList = [...globalThis.__kd_members];

        if (db) {
          try {
            await ensureD1Tables();
            const { results } = await db.prepare('SELECT id, name, email, picture, plan, total_generates, xp, level, created_at, last_active FROM members ORDER BY last_active DESC').all();
            if (results && results.length > 0) {
              const emailMap = new Set();
              const merged = [];
              for (const r of results) {
                if (r.email) {
                  emailMap.add(r.email.toLowerCase());
                  merged.push({
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    picture: r.picture,
                    plan: r.plan,
                    totalGenerates: r.total_generates || 0,
                    xp: r.xp || 10,
                    level: r.level || 'Novice Creator',
                    createdAt: r.created_at,
                    joinedAt: r.created_at,
                    lastActive: r.last_active,
                    status: 'Active'
                  });
                }
              }
              for (const m of membersList) {
                if (m.email && !emailMap.has(m.email.toLowerCase())) {
                  merged.push(m);
                }
              }
              membersList = merged;
            }
          } catch (e) {
            console.error('D1 members fetch error:', e);
          }
        }

        return new Response(JSON.stringify({ status: 'success', data: membersList }), { headers: corsHeaders });
      }

      // 5. Cloudflare Centralized Settings API (Google OAuth & System Config)
      if (url.pathname === '/api/settings') {
        globalThis.__kd_settings = globalThis.__kd_settings || {};
        if (request.method === 'GET') {
          let clientId = (
            env.GOOGLE_CLIENT_ID ||
            env.google_client_id ||
            env.GOOGLE_OAUTH_CLIENT_ID ||
            env.google_oauth_client_id ||
            env.GOOGLE_CLIENTID ||
            env.CLIENT_ID ||
            env.client_id ||
            env.OAUTH_CLIENT_ID ||
            globalThis.__kd_settings.google_client_id ||
            '172006612908-ah493a9uj6hm0csnv6q29q6apgvi1fm1.apps.googleusercontent.com'
          ).trim();

          let adminEmail = (
            env.ADMIN_EMAIL ||
            env.admin_email ||
            env.SUPERADMIN_EMAIL ||
            env.superadmin_email ||
            globalThis.__kd_settings.admin_email ||
            'admin.kawandigi@gmail.com'
          ).trim().toLowerCase();

          if (db) {
            try {
              await ensureD1Tables();
              const rowClient = await db.prepare("SELECT value FROM app_settings WHERE key = 'google_client_id'").first();
              if (rowClient && rowClient.value) {
                clientId = rowClient.value.trim();
              }
              const rowAdmin = await db.prepare("SELECT value FROM app_settings WHERE key = 'admin_email'").first();
              if (rowAdmin && rowAdmin.value) {
                adminEmail = rowAdmin.value.trim().toLowerCase();
              }
            } catch (e) {
              console.error("D1 app_settings read error:", e);
            }
          }
          return new Response(JSON.stringify({
            status: 'success',
            data: {
              google_client_id: clientId || '172006612908-ah493a9uj6hm0csnv6q29q6apgvi1fm1.apps.googleusercontent.com',
              admin_email: adminEmail
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
              await ensureD1Tables();
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

      // 6. License Device-Lock API (Strictly 1 License per 1 Physical Device)
      if (url.pathname === '/api/license/activate' && request.method === 'POST') {
        try {
          const body = await request.json();
          const rawKey = (body.key || '').trim().toUpperCase();
          const deviceId = (body.device_id || '').trim();
          const deviceName = (body.device_name || 'Perangkat Web').trim();
          const userEmail = (body.email || '').toLowerCase().trim();

          if (!rawKey) {
            return new Response(JSON.stringify({ success: false, message: 'Kode lisensi harus diisi.' }), { status: 400, headers: corsHeaders });
          }
          if (!deviceId) {
            return new Response(JSON.stringify({ success: false, message: 'Device ID tidak terdeteksi.' }), { status: 400, headers: corsHeaders });
          }

          // Validate key format and determine tier
          let tier = '';
          let tierName = '';
          if (rawKey === 'KAWANDIGI-VIP-UNLIMITED' || rawKey.startsWith('KD-VIP-')) {
            tier = 'all_access';
            tierName = 'All-Access VIP';
          } else if (rawKey === 'KAWANDIGI-UGC-PRO' || rawKey.startsWith('KD-UGC-')) {
            tier = 'ugc';
            tierName = 'AI UGC Affiliate Pro';
          } else if (rawKey === 'KAWANDIGI-DRAMA-PRO' || rawKey.startsWith('KD-DRAMA-')) {
            tier = 'drama';
            tierName = 'AI Drama & Series Pro';
          } else {
            return new Response(JSON.stringify({ success: false, message: 'Kode lisensi tidak valid atau format salah.' }), { status: 400, headers: corsHeaders });
          }

          globalThis.__kd_device_licenses = globalThis.__kd_device_licenses || {};
          let existing = globalThis.__kd_device_licenses[rawKey];

          if (db) {
            await ensureD1Tables();
            try {
              const row = await db.prepare('SELECT license_key, tier, tier_name, device_id, device_name, email, activated_at FROM device_licenses WHERE license_key = ?').bind(rawKey).first();
              if (row) {
                existing = row;
                globalThis.__kd_device_licenses[rawKey] = row;
              }
            } catch (e) {
              console.warn('D1 query license error:', e.message);
            }
          }

          // DEVICE MISMATCH CHECK: Key is already bound to another physical device!
          if (existing && existing.device_id && existing.device_id !== deviceId) {
            return new Response(JSON.stringify({
              success: false,
              code: 'DEVICE_MISMATCH',
              message: `Kode lisensi ini sudah aktif dan terikat pada perangkat lain (${existing.device_name || 'Device Sebelumnya'}). Sesuai ketentuan, 1 lisensi berlaku seumur hidup khusus untuk 1 device. Silakan beli lisensi tambahan untuk perangkat baru ini.`
            }), { headers: corsHeaders });
          }

          // Bind key to this device
          const record = {
            license_key: rawKey,
            tier: tier,
            tier_name: tierName,
            device_id: deviceId,
            device_name: deviceName,
            email: userEmail,
            activated_at: existing?.activated_at || new Date().toISOString()
          };
          globalThis.__kd_device_licenses[rawKey] = record;

          if (db) {
            await ensureD1Tables();
            try {
              await db.prepare(`
                INSERT INTO device_licenses (license_key, tier, tier_name, device_id, device_name, email, activated_at, last_verified)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(license_key) DO UPDATE SET
                  device_name = excluded.device_name,
                  email = excluded.email,
                  last_verified = CURRENT_TIMESTAMP
              `).bind(rawKey, tier, tierName, deviceId, deviceName, userEmail).run();

              if (userEmail) {
                await db.prepare(`
                  UPDATE members SET plan = ?, last_active = CURRENT_TIMESTAMP WHERE email = ?
                `).bind(`${tierName} (${deviceName})`, userEmail).run();
              }
            } catch (e) {
              console.warn('D1 insert device license error:', e.message);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            tier: tier,
            tierName: tierName,
            key: rawKey,
            device_id: deviceId,
            device_name: deviceName,
            message: `Selamat! Lisensi ${tierName} berhasil diaktifkan dan dikunci khusus untuk perangkat ini (${deviceName}).`
          }), { headers: corsHeaders });

        } catch (e) {
          return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
        }
      }
    }

    // Default: serve static SPA assets
    return env.ASSETS.fetch(request);
  }
};
