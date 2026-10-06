-- STOKARA PostgreSQL Schema Master (PRD v3.0)
-- Can be executed directly in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 8.1 Master & Pengguna
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

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('RAW_PROTEIN','RAW_DRY','SEMI_FINISHED','FINISHED')),
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

-- 8.2 Transaksi
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

CREATE TABLE IF NOT EXISTS inventory_yield_preps (
  id SERIAL PRIMARY KEY,
  prep_code VARCHAR(50) NOT NULL UNIQUE,
  source_item_id INT NOT NULL REFERENCES items(id),
  output_item_id INT NOT NULL REFERENCES items(id),
  source_qty_used NUMERIC(15,4) NOT NULL CHECK (source_qty_used > 0),
  clean_output_qty NUMERIC(15,4) NOT NULL CHECK (clean_output_qty > 0),
  waste_qty NUMERIC(15,4) NOT NULL CHECK (waste_qty >= 0),
  waste_reason VARCHAR(100),
  transferred_value_rupiah NUMERIC(15,4) NOT NULL,
  prep_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INT NOT NULL REFERENCES users(id),
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (source_qty_used = clean_output_qty + waste_qty),
  CHECK (waste_qty = 0 OR waste_reason IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS production_batches (
  id SERIAL PRIMARY KEY,
  batch_code VARCHAR(100) NOT NULL UNIQUE,
  recipe_id INT REFERENCES recipes(id),
  output_item_id INT NOT NULL REFERENCES items(id),
  operator_id INT NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLETED')),
  batch_date TIMESTAMPTZ NOT NULL,
  qty_good NUMERIC(15,4),
  qty_waste NUMERIC(15,4) NOT NULL DEFAULT 0,
  waste_treatment VARCHAR(20) CHECK (waste_treatment IN ('ABSORBED_TO_HPP','LOSS','RETURNED_TO_STOCK')),
  total_cost_rupiah NUMERIC(15,4),
  output_value_rupiah NUMERIC(15,4),
  loss_value_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  hpp_per_unit_rupiah NUMERIC(15,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (status = 'DRAFT' OR (qty_good > 0 AND waste_treatment IS NOT NULL)),
  CHECK (status = 'DRAFT' OR total_cost_rupiah = output_value_rupiah + loss_value_rupiah)
);

CREATE TABLE IF NOT EXISTS production_inputs (
  id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL REFERENCES production_batches(id),
  item_id INT NOT NULL REFERENCES items(id),
  qty NUMERIC(15,4) NOT NULL CHECK (qty > 0),
  value_rupiah NUMERIC(15,4),
  is_overhead BOOLEAN NOT NULL DEFAULT FALSE
);

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
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH','TRANSFER','QRIS')),
  payment_channel VARCHAR(4) NOT NULL CHECK (payment_channel IN ('CASH','BANK')),
  is_offline_synced BOOLEAN NOT NULL DEFAULT TRUE,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (total_amount_rupiah = subtotal_rupiah + shipping_cost_rupiah - discount_rupiah)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id),
  line_type VARCHAR(8) NOT NULL CHECK (line_type IN ('MENU','SHIPPING')),
  item_id INT REFERENCES items(id),
  qty NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_rupiah NUMERIC(15,0) NOT NULL,
  line_total_rupiah NUMERIC(15,0) NOT NULL,
  hpp_snapshot_unit_rupiah NUMERIC(15,4) NOT NULL DEFAULT 0,
  reduction_type VARCHAR(16) NOT NULL CHECK (reduction_type IN ('BOM_EXPLODE','DIRECT_STOCK','NO_STOCK_IMPACT')),
  CHECK ((line_type = 'SHIPPING') = (reduction_type = 'NO_STOCK_IMPACT')),
  CHECK ((line_type = 'SHIPPING') = (item_id IS NULL))
);

CREATE TABLE IF NOT EXISTS sale_flags (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id),
  flag_type VARCHAR(20) NOT NULL CHECK (flag_type IN ('OVERSOLD','CLOCK_SKEW','STALE_OFFLINE','PRICE_MISMATCH')),
  detail JSONB,
  resolved_by INT REFERENCES users(id),
  resolved_at TIMESTAMPTZ
);

-- 8.3 Ledger, Opname, Finance, Audit
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'PURCHASE_IN','PURCHASE_RETURN','PRODUCTION_INPUT','PRODUCTION_OUTPUT',
    'SALE_OUT','SALE_RETURN','WASTE_OUT','OPNAME_ADJUSTMENT','MANUAL_ADJUSTMENT',
    'REVERSAL','PREP_OUT','PREP_IN'
  )),
  qty_delta NUMERIC(15,4) NOT NULL,
  value_delta_rupiah NUMERIC(15,4) NOT NULL,
  qty_after NUMERIC(15,4) NOT NULL,
  value_after_rupiah NUMERIC(15,4) NOT NULL,
  reference_type VARCHAR(30) NOT NULL,
  reference_id INT NOT NULL,
  reverses_movement_id BIGINT REFERENCES stock_movements(id),
  created_by INT REFERENCES users(id),
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sign(qty_delta) = sign(value_delta_rupiah) OR value_delta_rupiah = 0)
);

CREATE INDEX IF NOT EXISTS idx_sm_item_date ON stock_movements (item_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sm_ref ON stock_movements (reference_type, reference_id);

CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% pada % dilarang (append-only)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sm_immutable ON stock_movements;
CREATE TRIGGER trg_sm_immutable BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE IF NOT EXISTS opname_sessions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  session_date DATE NOT NULL,
  responsible_id INT NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','POSTED')),
  approved_by INT REFERENCES users(id),
  total_diff_value_rupiah NUMERIC(15,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS opname_lines (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES opname_sessions(id),
  item_id INT NOT NULL REFERENCES items(id),
  system_qty_snapshot NUMERIC(15,4) NOT NULL,
  counted_qty NUMERIC(15,4),
  system_qty_at_post NUMERIC(15,4),
  diff_qty NUMERIC(15,4),
  diff_value_rupiah NUMERIC(15,4),
  UNIQUE (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  isActive BOOLEAN NOT NULL DEFAULT TRUE
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
