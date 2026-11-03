-- KawanDigi Creator Studio - Cloudflare D1 Distributed SQL Schema
-- Ultra-high scalability: supports millions of members and activity logs with zero quotas bottlenecks.
-- Privacy friendly: zero phone numbers or unnecessary personal data.

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    picture TEXT,
    plan TEXT DEFAULT 'Free Trial',
    total_generates INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 10,
    level TEXT DEFAULT 'Novice Creator',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_xp ON members(xp DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    tool TEXT NOT NULL,
    detail TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    hour_wib INTEGER NOT NULL,
    day_wib TEXT NOT NULL,
    xp_earned INTEGER DEFAULT 10
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_hour ON activity_logs(hour_wib);
CREATE INDEX IF NOT EXISTS idx_activity_email ON activity_logs(email);
