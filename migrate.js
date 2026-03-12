// utils/migrate.js - Run once during install
require('dotenv').config();
const { connectDB, query } = require('../config/database');

const migrations = `
-- ═══════════════════════════════════════════════
--  NEXAISP DATABASE SCHEMA v1.0
-- ═══════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users / Admin
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('superadmin','admin','staff','cs')),
  is_active   BOOLEAN DEFAULT true,
  last_login  TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Packages / Paket Internet
CREATE TABLE IF NOT EXISTS packages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  price        BIGINT NOT NULL,
  speed_down   INTEGER NOT NULL,  -- Mbps
  speed_up     INTEGER NOT NULL,  -- Mbps
  type         VARCHAR(20) DEFAULT 'pppoe' CHECK (type IN ('pppoe','static','hotspot')),
  profile_mk   VARCHAR(100),      -- Mikrotik profile name
  burst_limit  VARCHAR(50),
  burst_time   VARCHAR(50),
  burst_threshold VARCHAR(50),
  data_quota   BIGINT DEFAULT 0,  -- 0 = unlimited (bytes)
  validity_days INTEGER DEFAULT 30,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Customers / Pelanggan
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_no     VARCHAR(20) UNIQUE NOT NULL,  -- CUST-0001
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  phone           VARCHAR(20) NOT NULL,
  address         TEXT,
  lat             DECIMAL(10,8),
  lng             DECIMAL(11,8),
  package_id      UUID REFERENCES packages(id),
  mikrotik_id     UUID,           -- FK to mikrotik_devices
  username        VARCHAR(100) UNIQUE,  -- PPPoE username
  password        VARCHAR(255),         -- PPPoE password (encrypted)
  ip_address      VARCHAR(20),          -- Static IP if any
  ip_pool         VARCHAR(50),          -- PPPoE pool name
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','isolated','terminated','pending')),
  isolation_reason TEXT,
  olt_port        VARCHAR(50),
  onu_sn          VARCHAR(100),
  install_date    DATE,
  billing_date    INTEGER DEFAULT 1,    -- day of month
  balance         BIGINT DEFAULT 0,
  notes           TEXT,
  whatsapp        VARCHAR(20),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Mikrotik Devices
CREATE TABLE IF NOT EXISTS mikrotik_devices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  host        VARCHAR(100) NOT NULL,
  port        INTEGER DEFAULT 8728,
  username    VARCHAR(100) DEFAULT 'admin',
  password    VARCHAR(255),
  api_ssl     BOOLEAN DEFAULT false,
  location    VARCHAR(100),
  status      VARCHAR(20) DEFAULT 'unknown',
  last_check  TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no    VARCHAR(30) UNIQUE NOT NULL,  -- INV-202407-0001
  customer_id   UUID REFERENCES customers(id),
  amount        BIGINT NOT NULL,
  tax           BIGINT DEFAULT 0,
  total         BIGINT NOT NULL,
  type          VARCHAR(20) DEFAULT 'monthly' CHECK (type IN ('monthly','installation','extra')),
  status        VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue','cancelled')),
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMP,
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(30),
  gateway_trx_id  VARCHAR(200),
  gateway_payload JSONB,
  period_start  DATE,
  period_end    DATE,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id     UUID REFERENCES invoices(id),
  customer_id    UUID REFERENCES customers(id),
  amount         BIGINT NOT NULL,
  gateway        VARCHAR(30) NOT NULL,  -- midtrans, xendit, cash
  gateway_trx_id VARCHAR(200),
  status         VARCHAR(20) DEFAULT 'pending',
  payload        JSONB,
  paid_at        TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Isolation Log
CREATE TABLE IF NOT EXISTS isolation_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID REFERENCES customers(id),
  action       VARCHAR(20) NOT NULL CHECK (action IN ('isolate','restore')),
  reason       TEXT,
  performed_by UUID REFERENCES users(id),
  mk_result    TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- WhatsApp Logs
CREATE TABLE IF NOT EXISTS wa_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  phone       VARCHAR(20) NOT NULL,
  type        VARCHAR(50) NOT NULL,  -- invoice, isolation, welcome, custom
  message     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending',
  fonnte_id   VARCHAR(100),
  response    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ACS / GenieACS Devices (ONU/CPE)
CREATE TABLE IF NOT EXISTS acs_devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES customers(id),
  device_id       VARCHAR(200) UNIQUE NOT NULL,  -- GenieACS device ID
  serial_number   VARCHAR(100),
  mac_address     VARCHAR(20),
  model           VARCHAR(100),
  manufacturer    VARCHAR(100),
  firmware        VARCHAR(100),
  ip_address      VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'unknown',
  last_seen       TIMESTAMP,
  inform_interval INTEGER DEFAULT 300,
  tags            TEXT[],
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Customer Location / Mapping
CREATE TABLE IF NOT EXISTS customer_locations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID REFERENCES customers(id) UNIQUE,
  lat          DECIMAL(10,8) NOT NULL,
  lng          DECIMAL(11,8) NOT NULL,
  address      TEXT,
  area_name    VARCHAR(100),
  pole_id      VARCHAR(50),    -- tiang/ODP terdekat
  cable_length INTEGER,        -- meter
  notes        TEXT,
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Network Areas
CREATE TABLE IF NOT EXISTS network_areas (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(10) DEFAULT '#00D4AA',
  boundary   JSONB,   -- GeoJSON polygon
  mikrotik_id UUID REFERENCES mikrotik_devices(id),
  notes      TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  type       VARCHAR(20) DEFAULT 'string',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(50),
  entity_id   UUID,
  detail      JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_status    ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due        ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_gateway    ON payments(gateway_trx_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_customer    ON wa_logs(customer_id);

-- ── Default Settings ─────────────────────────────────────
INSERT INTO settings (key, value, type) VALUES
  ('isp_name',           'NexaISP',          'string'),
  ('isp_address',        '',                 'string'),
  ('isp_phone',          '',                 'string'),
  ('isp_email',          '',                 'string'),
  ('isp_logo',           '',                 'string'),
  ('midtrans_server_key','',                 'secret'),
  ('midtrans_client_key','',                 'secret'),
  ('midtrans_mode',      'sandbox',          'string'),
  ('xendit_secret_key',  '',                 'secret'),
  ('xendit_callback_token','',               'secret'),
  ('fonnte_token',       '',                 'secret'),
  ('wa_invoice_template','Halo {name}, tagihan internet Anda sebesar Rp {amount} jatuh tempo {due_date}. Bayar: {link}', 'text'),
  ('wa_isolir_template', 'Halo {name}, layanan internet Anda diisolir karena {reason}. Hubungi kami untuk info pembayaran.', 'text'),
  ('wa_aktivasi_template','Halo {name}, selamat! Layanan internet {package} Anda telah aktif. Username: {username}', 'text'),
  ('invoice_due_days',   '10',               'number'),
  ('auto_isolate_days',  '7',                'number'),
  ('genieacs_url',       'http://localhost:7557', 'string'),
  ('genieacs_user',      'admin',            'string'),
  ('genieacs_pass',      '',                 'secret'),
  ('maps_api_key',       '',                 'string'),
  ('tax_percent',        '11',               'number'),
  ('currency',           'IDR',              'string')
ON CONFLICT (key) DO NOTHING;
`;

(async () => {
  console.log('[MIGRATE] Connecting to database...');
  await connectDB();
  console.log('[MIGRATE] Running migrations...');
  await query(migrations);

  // Create default superadmin
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(process.env.ADMIN_PASS || 'admin123', 10);
  await query(`
    INSERT INTO users (name, email, password, role)
    VALUES ('Super Admin', $1, $2, 'superadmin')
    ON CONFLICT (email) DO NOTHING
  `, [process.env.ADMIN_EMAIL || 'admin@nexaisp.local', hash]);

  console.log('[MIGRATE] ✓ All tables created');
  console.log('[MIGRATE] ✓ Default admin created');
  process.exit(0);
})().catch(err => { console.error('[MIGRATE] Error:', err); process.exit(1); });
