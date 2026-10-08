-- ====================================================================
-- STOKARA & GYOBITS SUPABASE MASTER DEPLOYMENT SCRIPT
-- PostgreSQL DDL + Trigger Functions + Production Seed Data
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------
-- 1. USERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('OWNER','KASIR','WAITER','CHEF')),
  password_hash TEXT NOT NULL,
  must_change_pw BOOLEAN NOT NULL DEFAULT FALSE,
  session_epoch INT NOT NULL DEFAULT 0,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 2. MASTER ITEMS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('RAW_PROTEIN','RAW_VEGETABLE','RAW_DRY','SEMI_FINISHED','FINISHED')),
  stock_mode VARCHAR(12) NOT NULL DEFAULT 'STOCKED' CHECK (stock_mode IN ('STOCKED','EXPLODE_BOM')),
  unit_base VARCHAR(5) NOT NULL CHECK (unit_base IN ('g','ml','pcs')),
  display_unit VARCHAR(10) NOT NULL DEFAULT 'g',
  display_factor NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (display_factor > 0),
  current_stock_qty NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_stock_value_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_avg_cost_rupiah NUMERIC(15,4) GENERATED ALWAYS AS (
    CASE WHEN current_stock_qty > 0 THEN round(current_stock_value_rupiah / current_stock_qty, 4) ELSE 0 END
  ) STORED,
  oversold BOOLEAN NOT NULL DEFAULT FALSE,
  min_stock_alert NUMERIC(15,4),
  normal_shrink_min_pct NUMERIC(5,2),
  normal_shrink_max_pct NUMERIC(5,2),
  sell_price_rupiah NUMERIC(15,0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_stock_qty >= 0 OR oversold),
  CHECK (stock_mode = 'STOCKED' OR (current_stock_qty = 0 AND current_stock_value_rupiah = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_items_name ON items (lower(name));
CREATE INDEX IF NOT EXISTS idx_items_category ON items (category) WHERE is_active;

-- --------------------------------------------------------------------
-- 3. RECIPES & RECIPE LINES (BOM)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  output_item_id INT NOT NULL REFERENCES items(id),
  basis_qty NUMERIC(15,4) NOT NULL CHECK (basis_qty > 0),
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (output_item_id, version)
);

CREATE TABLE IF NOT EXISTS recipe_lines (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL REFERENCES recipes(id),
  item_id INT NOT NULL REFERENCES items(id),
  qty_per_basis NUMERIC(15,4) NOT NULL CHECK (qty_per_basis > 0),
  is_overhead BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS doc_sequences (
  prefix VARCHAR(12) NOT NULL,
  business_date DATE NOT NULL,
  last_no INT NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, business_date)
);

-- --------------------------------------------------------------------
-- 4. TRANSAKSI PEMBELIAN (PURCHASES)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  purchase_code VARCHAR(40) NOT NULL UNIQUE,
  supplier_name VARCHAR(150),
  purchase_date DATE NOT NULL,
  payment_channel VARCHAR(4) NOT NULL CHECK (payment_channel IN ('CASH','BANK')),
  total_rupiah NUMERIC(15,0) NOT NULL CHECK (total_rupiah > 0),
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_by_id INT REFERENCES purchases(id),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id SERIAL PRIMARY KEY,
  purchase_id INT NOT NULL REFERENCES purchases(id),
  item_id INT NOT NULL REFERENCES items(id),
  qty NUMERIC(15,4) NOT NULL CHECK (qty > 0),
  line_total_rupiah NUMERIC(15,0) NOT NULL CHECK (line_total_rupiah > 0)
);

-- --------------------------------------------------------------------
-- 5. YIELD & PRE-PROCESSING PROTEIN
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_yield_preps (
  id SERIAL PRIMARY KEY,
  prep_code VARCHAR(50) NOT NULL UNIQUE,
  source_item_id INT NOT NULL REFERENCES items(id),
  output_item_id INT NOT NULL REFERENCES items(id),
  source_qty_used NUMERIC(15,4) NOT NULL CHECK (source_qty_used > 0),
  clean_output_qty NUMERIC(15,4) NOT NULL CHECK (clean_output_qty > 0),
  waste_qty NUMERIC(15,4) NOT NULL CHECK (waste_qty >= 0),
  waste_reason VARCHAR(100),
  transferred_value_rupiah NUMERIC(15,4) NOT NULL CHECK (transferred_value_rupiah > 0),
  prep_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INT NOT NULL REFERENCES users(id),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (clean_output_qty <= source_qty_used)
);

-- --------------------------------------------------------------------
-- 6. PRODUKSI BATCH (BATCH PRODUCTION)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_batches (
  id SERIAL PRIMARY KEY,
  batch_code VARCHAR(100) NOT NULL UNIQUE,
  recipe_id INT REFERENCES recipes(id),
  output_item_id INT NOT NULL REFERENCES items(id),
  operator_id INT NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLETED')),
  batch_date TIMESTAMPTZ NOT NULL,
  qty_good NUMERIC(15,4) CHECK (qty_good > 0),
  qty_waste NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (qty_waste >= 0),
  waste_treatment VARCHAR(20) CHECK (waste_treatment IN ('ABSORBED_TO_HPP','LOSS','RETURNED_TO_STOCK')),
  total_cost_rupiah NUMERIC(15,4),
  output_value_rupiah NUMERIC(15,4),
  loss_value_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  hpp_per_unit_rupiah NUMERIC(15,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS production_inputs (
  id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL REFERENCES production_batches(id),
  item_id INT NOT NULL REFERENCES items(id),
  qty NUMERIC(15,4) NOT NULL CHECK (qty > 0),
  value_rupiah NUMERIC(15,4),
  is_overhead BOOLEAN NOT NULL DEFAULT FALSE
);

-- --------------------------------------------------------------------
-- 7. KASIR & PENJUALAN (POS & SALES)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  cashier_id INT NOT NULL REFERENCES users(id),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  opening_cash_rupiah NUMERIC(15,0) NOT NULL DEFAULT 0,
  counted_cash_rupiah NUMERIC(15,0)
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  sale_code VARCHAR(40) NOT NULL UNIQUE,
  offline_invoice_id UUID NOT NULL UNIQUE,
  offline_device_id VARCHAR(100),
  shift_id INT REFERENCES shifts(id),
  created_by INT NOT NULL REFERENCES users(id),
  device_created_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  business_date DATE NOT NULL,
  subtotal_rupiah NUMERIC(15,0) NOT NULL,
  shipping_cost_rupiah NUMERIC(15,0) NOT NULL DEFAULT 0,
  discount_rupiah NUMERIC(15,0) NOT NULL DEFAULT 0,
  total_amount_rupiah NUMERIC(15,0) NOT NULL,
  cogs_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL,
  payment_channel VARCHAR(4) NOT NULL CHECK (payment_channel IN ('CASH','BANK')),
  is_offline_synced BOOLEAN NOT NULL DEFAULT TRUE,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id),
  line_type VARCHAR(8) NOT NULL CHECK (line_type IN ('MENU','SHIPPING')),
  item_id INT REFERENCES items(id),
  qty NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price_rupiah NUMERIC(15,0) NOT NULL,
  line_total_rupiah NUMERIC(15,0) NOT NULL,
  hpp_snapshot_unit_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  reduction_type VARCHAR(16) NOT NULL CHECK (reduction_type IN ('BOM_EXPLODE','DIRECT_STOCK','NO_STOCK_IMPACT'))
);

CREATE TABLE IF NOT EXISTS sale_flags (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id),
  flag_type VARCHAR(20) NOT NULL,
  detail JSONB,
  resolved_by INT REFERENCES users(id),
  resolved_at TIMESTAMPTZ
);

-- --------------------------------------------------------------------
-- 8. LEDGER & KARTU STOK IMMUTABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id),
  movement_type VARCHAR(20) NOT NULL,
  qty_delta NUMERIC(15,4) NOT NULL,
  value_delta_rupiah NUMERIC(15,4) NOT NULL,
  qty_after NUMERIC(15,4) NOT NULL,
  value_after_rupiah NUMERIC(15,4) NOT NULL,
  reference_type VARCHAR(30) NOT NULL,
  reference_id INT NOT NULL,
  reverses_movement_id BIGINT REFERENCES stock_movements(id),
  created_by INT REFERENCES users(id),
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_item_date ON stock_movements (item_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sm_ref ON stock_movements (reference_type, reference_id);

CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% pada % dilarang (append-only ledger)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger immutable pada stock_movements agar hard delete pembatalan transaksi diizinkan
DROP TRIGGER IF EXISTS trg_sm_immutable ON stock_movements;

-- --------------------------------------------------------------------
-- 9. KEUANGAN & BUKU KAS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id SERIAL PRIMARY KEY,
  txn_date DATE NOT NULL,
  kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
  channel VARCHAR(4) CHECK (channel IN ('CASH','BANK')),
  category_id INT NOT NULL REFERENCES finance_categories(id),
  amount_rupiah NUMERIC(15,0) NOT NULL CHECK (amount_rupiah > 0),
  source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  source_id INT,
  note TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_date ON finance_transactions (txn_date, channel) WHERE NOT is_reversed;

-- --------------------------------------------------------------------
-- 10. AUDIT LOG
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id INT REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  before_json JSONB,
  after_json JSONB,
  ip INET,
  request_id UUID
);

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_log;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ====================================================================
-- INITIAL PRODUCTION SEED DATA (Idempotent: ON CONFLICT DO NOTHING)
-- ====================================================================

-- 1. Users
INSERT INTO users (id, username, display_name, role, password_hash, must_change_pw)
VALUES 
  (1, 'owner', 'Owner Stokara', 'OWNER', crypt('Stokara2026!', gen_salt('bf')), false),
  (2, 'kasir_01', 'Dina (Kasir)', 'KASIR', crypt('Kasir123!', gen_salt('bf')), false),
  (3, 'chef_budi', 'Budi (Dapur)', 'CHEF', crypt('Chef123!', gen_salt('bf')), false)
ON CONFLICT (username) DO NOTHING;

-- 2. Finance Categories
INSERT INTO finance_categories (id, name, kind, is_system, is_active)
VALUES
  (1, 'Penjualan Kasir', 'INCOME', true, true),
  (2, 'Pendapatan Luar Usaha', 'INCOME', false, true),
  (3, 'Pembelian Bahan Baku', 'EXPENSE', true, true),
  (4, 'Biaya Pemasaran / Iklan', 'EXPENSE', false, true),
  (5, 'Gaji Karyawan', 'EXPENSE', false, true),
  (6, 'Sewa Tempat', 'EXPENSE', false, true),
  (7, 'Loss Kerugian Produksi', 'EXPENSE', true, true),
  (8, 'Operasional Lainnya', 'EXPENSE', false, true)
ON CONFLICT (name) DO NOTHING;

-- START FROM 0: Bersih dari dummy items, recipes, dan transactions
-- Data master barang, BOM, dan operasional akan dimasukkan manual dari UI aplikasi.

