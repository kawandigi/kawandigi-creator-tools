/**
 * KawanDigi Creator Tools - Cloudflare Worker & D1 API Backend
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
              device_scope TEXT DEFAULT 'single_device',
              status TEXT DEFAULT 'active',
              notes TEXT DEFAULT '',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              last_verified DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();

          // Safely add any new columns for migrations (SQLite forbids CURRENT_TIMESTAMP in ALTER TABLE ADD COLUMN)
          try { await db.prepare("ALTER TABLE device_licenses ADD COLUMN device_scope TEXT DEFAULT 'single_device'").run(); } catch (_) {}
          try { await db.prepare("ALTER TABLE device_licenses ADD COLUMN status TEXT DEFAULT 'active'").run(); } catch (_) {}
          try { await db.prepare("ALTER TABLE device_licenses ADD COLUMN notes TEXT DEFAULT ''").run(); } catch (_) {}
          try { await db.prepare("ALTER TABLE device_licenses ADD COLUMN created_at DATETIME").run(); } catch (_) {}
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

              const resUpdate = await db.prepare('UPDATE members SET total_generates = total_generates + 1, xp = xp + ?, last_active = ? WHERE email = ?')
                .bind(body.xp || 10, now.toISOString(), body.email)
                .run();

              if (!resUpdate.meta?.changes || resUpdate.meta.changes === 0) {
                await db.prepare(`
                  INSERT INTO members (id, name, email, picture, plan, total_generates, xp, level, created_at, last_active)
                  VALUES (?, ?, ?, ?, 'Free Trial', 1, ?, 'Novice Creator', ?, ?)
                  ON CONFLICT(email) DO UPDATE SET total_generates = total_generates + 1, xp = xp + excluded.xp, last_active = excluded.last_active
                `).bind(
                  'usr_' + Date.now(),
                  body.name || 'Member',
                  body.email,
                  body.picture || 'assets/icons/favicon.png',
                  body.xp || 10,
                  now.toISOString(),
                  now.toISOString()
                ).run();
              }
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
            memberRecord.totalGenerates = globalThis.__kd_members[memberIdx].totalGenerates;
            memberRecord.total_generates = globalThis.__kd_members[memberIdx].total_generates;
            memberRecord.xp = globalThis.__kd_members[memberIdx].xp;
            memberRecord.level = globalThis.__kd_members[memberIdx].level || memberRecord.level;
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

            // Fetch the updated member record from D1 to return the true database values
            const d1User = await db.prepare('SELECT id, name, email, picture, plan, total_generates, xp, level, created_at, last_active FROM members WHERE email = ?').bind(memberRecord.email).first();
            if (d1User) {
              memberRecord.totalGenerates = d1User.total_generates || 0;
              memberRecord.total_generates = d1User.total_generates || 0;
              memberRecord.xp = d1User.xp || 10;
              memberRecord.level = d1User.level || memberRecord.level;
              memberRecord.plan = d1User.plan || memberRecord.plan;
            }
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

      // 5. Cloudflare Centralized Settings API (Google OAuth, Admin WhatsApp & Custom Pricing)
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

          let adminWhatsapp = (
            env.ADMIN_WHATSAPP ||
            globalThis.__kd_settings.admin_whatsapp ||
            '6281234567890'
          ).trim();

          let priceVip1Dev = Number(globalThis.__kd_settings.price_vip_1dev) || 199000;
          let priceOriginal1Dev = Number(globalThis.__kd_settings.price_original_1dev) || 399000;
          let priceVipAllDev = Number(globalThis.__kd_settings.price_vip_alldev) || 349000;
          let priceOriginalAllDev = Number(globalThis.__kd_settings.price_original_alldev) || 699000;
          let priceUgc = Number(globalThis.__kd_settings.price_ugc) || 59000;
          let priceDrama = Number(globalThis.__kd_settings.price_drama) || 79000;
          let featureFlags = globalThis.__kd_settings.feature_flags || null;
          let digitalProducts = globalThis.__kd_settings.digital_products || null;
          let tutorialVideos = globalThis.__kd_settings.tutorial_videos || null;

          if (db) {
            try {
              await ensureD1Tables();
              const rows = await db.prepare("SELECT key, value FROM app_settings").all();
              if (rows && rows.results) {
                for (const r of rows.results) {
                  if (r.key === 'google_client_id' && r.value) clientId = r.value.trim();
                  if (r.key === 'admin_email' && r.value) adminEmail = r.value.trim().toLowerCase();
                  if (r.key === 'admin_whatsapp' && r.value) adminWhatsapp = r.value.trim();
                  if (r.key === 'price_vip_1dev' && r.value) priceVip1Dev = parseInt(r.value, 10) || priceVip1Dev;
                  if (r.key === 'price_original_1dev' && r.value) priceOriginal1Dev = parseInt(r.value, 10) || priceOriginal1Dev;
                  if (r.key === 'price_vip_alldev' && r.value) priceVipAllDev = parseInt(r.value, 10) || priceVipAllDev;
                  if (r.key === 'price_original_alldev' && r.value) priceOriginalAllDev = parseInt(r.value, 10) || priceOriginalAllDev;
                  if (r.key === 'price_ugc' && r.value) priceUgc = parseInt(r.value, 10) || priceUgc;
                  if (r.key === 'price_drama' && r.value) priceDrama = parseInt(r.value, 10) || priceDrama;
                  if (r.key === 'feature_flags' && r.value) {
                    try { featureFlags = JSON.parse(r.value); } catch (_) {}
                  }
                  if (r.key === 'digital_products' && r.value) {
                    try { digitalProducts = JSON.parse(r.value); } catch (_) {}
                  }
                  if (r.key === 'tutorial_videos' && r.value) {
                    try { tutorialVideos = JSON.parse(r.value); } catch (_) {}
                  }
                }
              }
            } catch (e) {
              console.error("D1 app_settings read error:", e);
            }
          }
          return new Response(JSON.stringify({
            status: 'success',
            data: {
              google_client_id: clientId || '172006612908-ah493a9uj6hm0csnv6q29q6apgvi1fm1.apps.googleusercontent.com',
              admin_email: adminEmail,
              admin_whatsapp: adminWhatsapp,
              price_vip_1dev: priceVip1Dev,
              price_original_1dev: priceOriginal1Dev,
              price_vip_alldev: priceVipAllDev,
              price_original_alldev: priceOriginalAllDev,
              price_ugc: priceUgc,
              price_drama: priceDrama,
              feature_flags: featureFlags,
              digital_products: Array.isArray(digitalProducts) ? digitalProducts : [],
              tutorial_videos: Array.isArray(tutorialVideos) ? tutorialVideos : []
            }
          }), { headers: corsHeaders });
        }

        if (request.method === 'POST') {
          try {
            const body = await request.json();
            const newClientId = (body.google_client_id || '').trim();
            const newAdminEmail = (body.admin_email || '').trim();
            const newAdminWhatsapp = (body.admin_whatsapp || '').trim();
            const newPriceVip1Dev = body.price_vip_1dev !== undefined ? Number(body.price_vip_1dev) : null;
            const newPriceOriginal1Dev = body.price_original_1dev !== undefined ? Number(body.price_original_1dev) : null;
            const newPriceVipAllDev = body.price_vip_alldev !== undefined ? Number(body.price_vip_alldev) : null;
            const newPriceOriginalAllDev = body.price_original_alldev !== undefined ? Number(body.price_original_alldev) : null;
            const newPriceUgc = body.price_ugc !== undefined ? Number(body.price_ugc) : null;
            const newPriceDrama = body.price_drama !== undefined ? Number(body.price_drama) : null;
            const newFeatureFlags = body.feature_flags !== undefined ? body.feature_flags : null;
            const newDigitalProducts = body.digital_products !== undefined ? body.digital_products : null;
            const newTutorialVideos = body.tutorial_videos !== undefined ? body.tutorial_videos : null;

            if (newClientId) globalThis.__kd_settings.google_client_id = newClientId;
            if (newAdminEmail) globalThis.__kd_settings.admin_email = newAdminEmail;
            if (newAdminWhatsapp) globalThis.__kd_settings.admin_whatsapp = newAdminWhatsapp;
            if (newPriceVip1Dev) globalThis.__kd_settings.price_vip_1dev = newPriceVip1Dev;
            if (newPriceOriginal1Dev) globalThis.__kd_settings.price_original_1dev = newPriceOriginal1Dev;
            if (newPriceVipAllDev) globalThis.__kd_settings.price_vip_alldev = newPriceVipAllDev;
            if (newPriceOriginalAllDev) globalThis.__kd_settings.price_original_alldev = newPriceOriginalAllDev;
            if (newPriceUgc) globalThis.__kd_settings.price_ugc = newPriceUgc;
            if (newPriceDrama) globalThis.__kd_settings.price_drama = newPriceDrama;
            if (newFeatureFlags) globalThis.__kd_settings.feature_flags = newFeatureFlags;
            if (newDigitalProducts !== null) globalThis.__kd_settings.digital_products = newDigitalProducts;
            if (newTutorialVideos !== null) globalThis.__kd_settings.tutorial_videos = newTutorialVideos;

            if (db) {
              await ensureD1Tables();
              const upsertSetting = async (k, v) => {
                await db.prepare(`
                  INSERT INTO app_settings (key, value, updated_at)
                  VALUES (?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
                `).bind(k, String(v)).run();
              };

              if (newClientId) await upsertSetting('google_client_id', newClientId);
              if (newAdminEmail) await upsertSetting('admin_email', newAdminEmail);
              if (newAdminWhatsapp) await upsertSetting('admin_whatsapp', newAdminWhatsapp);
              if (newPriceVip1Dev !== null) await upsertSetting('price_vip_1dev', newPriceVip1Dev);
              if (newPriceOriginal1Dev !== null) await upsertSetting('price_original_1dev', newPriceOriginal1Dev);
              if (newPriceVipAllDev !== null) await upsertSetting('price_vip_alldev', newPriceVipAllDev);
              if (newPriceOriginalAllDev !== null) await upsertSetting('price_original_alldev', newPriceOriginalAllDev);
              if (newPriceUgc !== null) await upsertSetting('price_ugc', newPriceUgc);
              if (newPriceDrama !== null) await upsertSetting('price_drama', newPriceDrama);
              if (newFeatureFlags !== null) await upsertSetting('feature_flags', JSON.stringify(newFeatureFlags));
              if (newDigitalProducts !== null) await upsertSetting('digital_products', JSON.stringify(newDigitalProducts));
              if (newTutorialVideos !== null) await upsertSetting('tutorial_videos', JSON.stringify(newTutorialVideos));
            }
            return new Response(JSON.stringify({
              status: 'success',
              message: 'Pengaturan berhasil disimpan di Cloudflare',
              data: {
                google_client_id: newClientId || globalThis.__kd_settings.google_client_id || '',
                admin_email: newAdminEmail || globalThis.__kd_settings.admin_email || 'admin.kawandigi@gmail.com',
                admin_whatsapp: newAdminWhatsapp || globalThis.__kd_settings.admin_whatsapp || '6281234567890',
                price_vip_1dev: newPriceVip1Dev || globalThis.__kd_settings.price_vip_1dev || 199000,
                price_original_1dev: newPriceOriginal1Dev || globalThis.__kd_settings.price_original_1dev || 399000,
                price_vip_alldev: newPriceVipAllDev || globalThis.__kd_settings.price_vip_alldev || 349000,
                price_original_alldev: newPriceOriginalAllDev || globalThis.__kd_settings.price_original_alldev || 699000,
                price_ugc: newPriceUgc || globalThis.__kd_settings.price_ugc || 99000,
                price_drama: newPriceDrama || globalThis.__kd_settings.price_drama || 149000,
                digital_products: Array.isArray(newDigitalProducts) ? newDigitalProducts : (Array.isArray(globalThis.__kd_settings.digital_products) ? globalThis.__kd_settings.digital_products : []),
                tutorial_videos: newTutorialVideos || globalThis.__kd_settings.tutorial_videos || null
              }
            }), { headers: corsHeaders });
          } catch (e) {
            return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
          }
        }
      }

      // 6. Admin License Management API (List All Licenses)
      if (url.pathname === '/api/admin/licenses' && request.method === 'GET') {
        let list = [];
        let d1Error = null;
        if (db) {
          try {
            await ensureD1Tables();
            const res = await db.prepare(`
              SELECT license_key, tier, tier_name, device_scope, status, notes, device_id, device_name, email, created_at, activated_at, last_verified
              FROM device_licenses
              ORDER BY rowid DESC
            `).all();
            list = res.results || [];
          } catch (e) {
            d1Error = e.message;
            console.warn('D1 get admin licenses error:', e.message);
          }
        }
        if (list.length === 0 && globalThis.__kd_device_licenses) {
          list = Object.values(globalThis.__kd_device_licenses);
        }
        return new Response(JSON.stringify({ status: 'success', data: list }), { headers: corsHeaders });
      }

      // 7. Admin License Generator API (Create 1-Device or All-Device License Keys)
      if (url.pathname === '/api/admin/licenses/generate' && request.method === 'POST') {
        try {
          const body = await request.json();
          const tier = (body.tier || 'all_access').toLowerCase().trim();
          const deviceScope = (body.device_scope || 'single_device').toLowerCase().trim(); // 'single_device' | 'all_devices'
          const notes = (body.notes || '').trim();

          let tierName = 'All-Access VIP';
          let prefix = 'KD-VIP';
          if (tier === 'ugc') {
            tierName = 'AI UGC Affiliate Pro';
            prefix = 'KD-UGC';
          } else if (tier === 'drama') {
            tierName = 'AI Drama & Series Pro';
            prefix = 'KD-DRAMA';
          }

          const scopePrefix = deviceScope === 'all_devices' ? 'ALL' : '1DEV';
          const randPart = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Date.now().toString(36).substring(4).toUpperCase();
          const newKey = `${prefix}-${scopePrefix}-${randPart}`;

          const newRecord = {
            license_key: newKey,
            tier: tier,
            tier_name: tierName,
            device_scope: deviceScope,
            status: 'unused',
            notes: notes,
            device_id: '',
            device_name: '',
            email: '',
            created_at: new Date().toISOString(),
            activated_at: null,
            last_verified: null
          };

          globalThis.__kd_device_licenses = globalThis.__kd_device_licenses || {};
          globalThis.__kd_device_licenses[newKey] = newRecord;

          if (db) {
            await ensureD1Tables();
            try {
              await db.prepare(`
                INSERT INTO device_licenses (license_key, tier, tier_name, device_scope, status, notes, device_id, device_name, email, created_at)
                VALUES (?, ?, ?, ?, 'unused', ?, '', '', '', datetime('now'))
              `).bind(newKey, tier, tierName, deviceScope, notes).run();
            } catch (e) {
              console.warn('D1 insert generated license error:', e.message);
            }
          }

          return new Response(JSON.stringify({ status: 'success', data: newRecord }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 8. Admin License Revoke / Delete API
      if (url.pathname === '/api/admin/licenses/revoke' && request.method === 'POST') {
        try {
          const body = await request.json();
          const key = (body.key || '').trim().toUpperCase();
          if (db) {
            await ensureD1Tables();
            await db.prepare('DELETE FROM device_licenses WHERE license_key = ?').bind(key).run();
          }
          if (globalThis.__kd_device_licenses) {
            delete globalThis.__kd_device_licenses[key];
          }
          return new Response(JSON.stringify({ status: 'success', message: 'Lisensi berhasil dihapus' }), { headers: corsHeaders });
        } catch (e) {
          return new Response(JSON.stringify({ status: 'error', error: e.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 9. License User & Device Status Query API
      if (url.pathname === '/api/license/user-status' && request.method === 'GET') {
        const email = (url.searchParams.get('email') || '').toLowerCase().trim();
        const deviceId = (url.searchParams.get('device_id') || '').trim();

        let activeLicenses = [];
        let otherBoundDevice = null;

        if (db && (email || deviceId)) {
          try {
            await ensureD1Tables();
            const rows = await db.prepare(`
              SELECT license_key, tier, tier_name, device_scope, status, device_id, device_name, email
              FROM device_licenses
              WHERE (email = ? AND email != '') OR (device_id = ? AND device_id != '')
            `).bind(email, deviceId).all();

            const list = rows.results || [];
            for (const r of list) {
              if (r.status === 'revoked') continue;
              if (r.device_scope === 'all_devices') {
                if (email && r.email === email) {
                  activeLicenses.push(r);
                }
              } else {
                if (r.device_id === deviceId) {
                  activeLicenses.push(r);
                } else if (email && r.email === email && r.device_id && r.device_id !== deviceId) {
                  otherBoundDevice = r.device_name || 'Perangkat Lain';
                }
              }
            }
          } catch (e) {
            console.warn('D1 query user-status error:', e.message);
          }
        }

        return new Response(JSON.stringify({
          status: 'success',
          activeLicenses: activeLicenses,
          otherBoundDevice: otherBoundDevice
        }), { headers: corsHeaders });
      }

      // 10. License Activation API (Handles 1-Device and All-Device Lifetime Keys)
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

          let isAllDevice = rawKey.includes('-ALL-');
          let deviceScope = isAllDevice ? 'all_devices' : 'single_device';

          globalThis.__kd_device_licenses = globalThis.__kd_device_licenses || {};
          let existing = globalThis.__kd_device_licenses[rawKey];

          if (db) {
            await ensureD1Tables();
            try {
              const row = await db.prepare('SELECT license_key, tier, tier_name, device_scope, status, device_id, device_name, email, activated_at FROM device_licenses WHERE license_key = ?').bind(rawKey).first();
              if (row) {
                existing = row;
                if (row.device_scope) {
                  deviceScope = row.device_scope;
                  isAllDevice = (deviceScope === 'all_devices');
                }
                globalThis.__kd_device_licenses[rawKey] = row;
              }
            } catch (e) {
              console.warn('D1 query license error:', e.message);
            }
          }

          // Check if key is revoked
          if (existing && existing.status === 'revoked') {
            return new Response(JSON.stringify({
              success: false,
              code: 'LICENSE_REVOKED',
              message: 'Kode lisensi ini telah dinonaktifkan oleh Admin.'
            }), { headers: corsHeaders });
          }

          // Check Scope Validation
          if (isAllDevice) {
            // All Devices: Bound to Google Account Email
            if (!userEmail) {
              return new Response(JSON.stringify({
                success: false,
                code: 'EMAIL_REQUIRED',
                message: 'Lisensi All-Device memerlukan Anda masuk dengan akun Google terlebih dahulu agar lisensi dapat digunakan bebas di semua HP & PC Anda.'
              }), { headers: corsHeaders });
            }
            if (existing && existing.email && existing.email !== userEmail) {
              return new Response(JSON.stringify({
                success: false,
                code: 'EMAIL_MISMATCH',
                message: `Lisensi All-Device ini sudah terikat ke akun Google lain (${existing.email}). Silakan masuk dengan akun Google tersebut.`
              }), { headers: corsHeaders });
            }
          } else {
            // Single Device (1 Device): Bound strictly to hardware device_id
            if (existing && existing.device_id && existing.device_id !== '' && existing.device_id !== deviceId) {
              return new Response(JSON.stringify({
                success: false,
                code: 'DEVICE_MISMATCH',
                message: `Kode lisensi ini sudah aktif dan terikat pada perangkat lain (${existing.device_name || 'Device Sebelumnya'}). Sesuai ketentuan, 1 lisensi berlaku seumur hidup khusus untuk 1 device. Silakan beli lisensi tambahan untuk perangkat baru ini.`
              }), { headers: corsHeaders });
            }
          }

          // Bind and save
          const record = {
            license_key: rawKey,
            tier: tier,
            tier_name: tierName,
            device_scope: deviceScope,
            status: 'active',
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
                INSERT INTO device_licenses (license_key, tier, tier_name, device_scope, status, device_id, device_name, email, activated_at, last_verified)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(license_key) DO UPDATE SET
                  device_scope = excluded.device_scope,
                  status = 'active',
                  device_id = excluded.device_id,
                  device_name = excluded.device_name,
                  email = excluded.email,
                  last_verified = CURRENT_TIMESTAMP
              `).bind(rawKey, tier, tierName, deviceScope, deviceId, deviceName, userEmail).run();

              if (userEmail) {
                const planTitle = isAllDevice 
                  ? `${tierName} (All-Device Selamanya)` 
                  : `${tierName} (${deviceName})`;
                await db.prepare(`
                  UPDATE members SET plan = ?, last_active = CURRENT_TIMESTAMP WHERE email = ?
                `).bind(planTitle, userEmail).run();
              }
            } catch (e) {
              console.warn('D1 insert device license error:', e.message);
            }
          }

          const successMsg = isAllDevice
            ? `Selamat! Lisensi ${tierName} (All-Device) berhasil diaktifkan! Anda bebas menggunakannya di semua perangkat dengan akun Google ${userEmail}.`
            : `Selamat! Lisensi ${tierName} berhasil diaktifkan dan dikunci khusus untuk perangkat ini (${deviceName}) seumur hidup.`;

          return new Response(JSON.stringify({
            success: true,
            tier: tier,
            tierName: tierName,
            key: rawKey,
            device_scope: deviceScope,
            device_id: deviceId,
            device_name: deviceName,
            message: successMsg
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
