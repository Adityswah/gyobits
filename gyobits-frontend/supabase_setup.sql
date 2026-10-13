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
  qty_per_basis NUMERIC(15,4) NOT NULL CHECK (qty_per_basis >= 0),
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
  (2, 'Setoran Modal Pemilik / Kas Kecil', 'INCOME', false, true),
  (3, 'Pendapatan Luar Usaha (Jual Limbah/Kardus)', 'INCOME', false, true),
  (4, 'Bunga Bank / Jasa Giro', 'INCOME', false, true),
  (5, 'Refund & Klaim Supplier', 'INCOME', false, true),
  (6, 'Koreksi Selisih Kas Lebih', 'INCOME', false, true),
  (7, 'Pembelian Bahan Baku', 'EXPENSE', true, true),
  (8, 'Biaya Pemasaran / Iklan', 'EXPENSE', false, true),
  (9, 'Gaji Karyawan', 'EXPENSE', false, true),
  (10, 'Biaya Utilitas (Listrik, Air, Gas)', 'EXPENSE', false, true),
  (11, 'Sewa Tempat', 'EXPENSE', false, true),
  (12, 'Loss Kerugian Produksi', 'EXPENSE', true, true),
  (13, 'Operasional Lainnya', 'EXPENSE', false, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Master Items (Sesuai Gambar 1 Excel)
INSERT INTO items (id, sku, name, category, stock_mode, unit_base, display_unit, display_factor, min_stock_alert, sell_price_rupiah, is_active)
VALUES
  (1, 'RAW-AYM-PTG', 'Ayam Potong', 'RAW_PROTEIN', 'STOCKED', 'g', 'G', 1, 1000, 40000, true),
  (2, 'RAW-KLT-AYM', 'Kulit Ayam', 'RAW_PROTEIN', 'STOCKED', 'g', 'G', 1, 1000, 39000, true),
  (3, 'RAW-TLR-BTR', 'Telur', 'RAW_PROTEIN', 'STOCKED', 'pcs', 'Butir', 1, 16, 30000, true),
  (4, 'RAW-SWI-PTH', 'Sawi Putih', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 15000, true),
  (5, 'RAW-DAN-PRE', 'Daun Pre', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 15000, true),
  (6, 'RAW-DAN-BWG', 'Daun Bawang', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 20000, true),
  (7, 'RAW-GBS-SAY', 'Gubis', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 10000, true),
  (8, 'RAW-BWG-PTH', 'Bawang Putih', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 38000, true),
  (9, 'RAW-JHE-SAY', 'Jahe', 'RAW_VEGETABLE', 'STOCKED', 'g', 'G', 1, 1000, 20000, true),
  (10, 'RAW-KLD-JMR', 'Kaldu Jamur', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 400, 60000, true),
  (11, 'RAW-MSG-MCN', 'MSG', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 1000, 58000, true),
  (12, 'RAW-GRM-DPR', 'Garam', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 500, 75000, true),
  (13, 'RAW-GLA-PSF', 'Gula', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 1000, 19000, true),
  (14, 'RAW-SAS-TRM', 'Saos Tiram', 'RAW_DRY', 'STOCKED', 'ml', 'ML', 1, 270, 25000, true),
  (15, 'RAW-MYK-WJN', 'Minyak Wijen', 'RAW_DRY', 'STOCKED', 'ml', 'ML', 1, 200, 70000, true),
  (16, 'RAW-MYK-GRG', 'Minyak Goreng', 'RAW_DRY', 'STOCKED', 'ml', 'ML', 1, 2000, 22000, true),
  (17, 'RAW-AIR-MNR', 'Air Mineral', 'RAW_DRY', 'STOCKED', 'ml', 'ML', 1, 15000, 8000, true),
  (18, 'RAW-TPG-TPK', 'Tepung Tapioka', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 500, 16000, true),
  (19, 'RAW-TPG-TRG', 'Tepung Terigu', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 500, 16000, true),
  (20, 'RAW-TPG-BRS', 'Tepung Beras', 'RAW_DRY', 'STOCKED', 'g', 'G', 1, 500, 15000, true),
  (21, 'RAW-KLT-GYO', 'Kulit Gyoza', 'RAW_DRY', 'STOCKED', 'pcs', 'Bks', 1, 1, 9000, true),
  (22, 'YLD-AYM-FLT', 'Daging Ayam Filet', 'SEMI_FINISHED', 'STOCKED', 'g', 'G', 1, 1000, null, true),
  (23, 'YLD-DAN-PRE', 'Daun Pre Bersih', 'SEMI_FINISHED', 'STOCKED', 'g', 'G', 1, 1000, null, true),
  (24, 'YLD-DAN-BWG', 'Daun Bawang Bersih', 'SEMI_FINISHED', 'STOCKED', 'g', 'G', 1, 1000, null, true),
  (25, 'YLD-SWI-PTH', 'Sawi Putih Bersih', 'SEMI_FINISHED', 'STOCKED', 'g', 'G', 1, 1000, null, true),
  (26, 'YLD-BWG-PTH', 'Bawang Putih Bersih', 'SEMI_FINISHED', 'STOCKED', 'g', 'G', 1, 1000, null, true),
  (27, 'SEM-GYO-MNT', 'Gyoza Mentah Siap Masak', 'SEMI_FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 50, null, true),
  (28, 'POS-GYO-10', 'Gyoza Isi 10', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 25000, true),
  (29, 'POS-GYO-8', 'Gyoza Isi 8', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 20000, true),
  (30, 'POS-GYO-7', 'Gyoza Isi 7', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 20000, true),
  (31, 'POS-GYO-FRZ-10', 'Gyoza Forze Isi 10', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 22500, true),
  (32, 'POS-GYO-TST', 'Tester Gyoza', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 0, true),
  (33, 'POS-CHL-OIL', 'Chili Oil', 'FINISHED', 'STOCKED', 'pcs', 'Pcs', 1, 0, 3000, true)
ON CONFLICT (sku) DO NOTHING;

SELECT setval('items_id_seq', (SELECT COALESCE(MAX(id), 33) FROM items));

-- 4. Master BOM Recipe (Basic Output: 150 Pcs)
INSERT INTO recipes (id, output_item_id, basis_qty, version, is_active)
VALUES (1, 27, 150, 1, true)
ON CONFLICT (output_item_id, version) DO UPDATE SET basis_qty = 150;

DELETE FROM recipe_lines WHERE recipe_id = 1;
INSERT INTO recipe_lines (id, recipe_id, item_id, qty_per_basis, is_overhead)
VALUES
  (1, 1, 22, 1000, false),
  (2, 1, 23, 70, false),
  (3, 1, 24, 70, false),
  (4, 1, 25, 300, false),
  (5, 1, 26, 80, false),
  (6, 1, 18, 200, false),
  (7, 1, 11, 0, false),
  (8, 1, 13, 15, false),
  (9, 1, 12, 10, false),
  (10, 1, 10, 4, false),
  (11, 1, 14, 10, false),
  (12, 1, 15, 10, false),
  (13, 1, 16, 50, false),
  (14, 1, 3, 1, false),
  (15, 1, 17, 50, false)
ON CONFLICT (id) DO NOTHING;

SELECT setval('recipes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recipes));
SELECT setval('recipe_lines_id_seq', (SELECT COALESCE(MAX(id), 15) FROM recipe_lines));
