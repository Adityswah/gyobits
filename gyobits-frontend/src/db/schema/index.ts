import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  numeric,
  uuid,
  bigserial,
  date,
  jsonb,
  inet,
  uniqueIndex,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 8.1 Master & Pengguna
// ==========================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 10 }).notNull(), // 'OWNER' | 'KASIR' | 'WAITER' | 'CHEF'
  passwordHash: text('password_hash').notNull(),
  mustChangePw: boolean('must_change_pw').notNull().default(false),
  sessionEpoch: integer('session_epoch').notNull().default(0),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 40 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(), // 'RAW_PROTEIN' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED'
  stockMode: varchar('stock_mode', { length: 12 }).notNull().default('STOCKED'), // 'STOCKED' | 'EXPLODE_BOM'
  unitBase: varchar('unit_base', { length: 5 }).notNull(), // 'g' | 'ml' | 'pcs'
  displayUnit: varchar('display_unit', { length: 10 }).notNull().default('g'),
  displayFactor: numeric('display_factor', { precision: 15, scale: 4 }).notNull().default('1'),
  currentStockQty: numeric('current_stock_qty', { precision: 15, scale: 4 }).notNull().default('0'),
  currentStockValueRupiah: numeric('current_stock_value_rupiah', { precision: 15, scale: 4 }).notNull().default('0'),
  // Generated column in Postgres: current_avg_cost_rupiah
  currentAvgCostRupiah: numeric('current_avg_cost_rupiah', { precision: 15, scale: 4 }),
  oversold: boolean('oversold').notNull().default(false),
  minStockAlert: numeric('min_stock_alert', { precision: 15, scale: 4 }),
  normalShrinkMinPct: numeric('normal_shrink_min_pct', { precision: 5, scale: 2 }),
  normalShrinkMaxPct: numeric('normal_shrink_max_pct', { precision: 5, scale: 2 }),
  sellPriceRupiah: numeric('sell_price_rupiah', { precision: 15, scale: 0 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_items_name').on(table.name),
  index('idx_items_category').on(table.category),
]);

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  outputItemId: integer('output_item_id').notNull().references(() => items.id),
  basisQty: numeric('basis_qty', { precision: 15, scale: 4 }).notNull(),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
});

export const recipeLines = pgTable('recipe_lines', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id),
  itemId: integer('item_id').notNull().references(() => items.id),
  qtyPerBasis: numeric('qty_per_basis', { precision: 15, scale: 4 }).notNull(),
  isOverhead: boolean('is_overhead').notNull().default(false),
});

export const docSequences = pgTable('doc_sequences', {
  prefix: varchar('prefix', { length: 12 }).notNull(),
  businessDate: date('business_date').notNull(),
  lastNo: integer('last_no').notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.prefix, table.businessDate] }),
]);

// ==========================================
// 8.2 Transaksi
// ==========================================

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  purchaseCode: varchar('purchase_code', { length: 40 }).notNull().unique(),
  supplierName: varchar('supplier_name', { length: 150 }),
  purchaseDate: date('purchase_date').notNull(),
  paymentChannel: varchar('payment_channel', { length: 4 }).notNull(), // 'CASH' | 'BANK'
  totalRupiah: numeric('total_rupiah', { precision: 15, scale: 0 }).notNull(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reversedById: integer('reversed_by_id'),
  isReversed: boolean('is_reversed').notNull().default(false),
});

export const purchaseLines = pgTable('purchase_lines', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
  itemId: integer('item_id').notNull().references(() => items.id),
  qty: numeric('qty', { precision: 15, scale: 4 }).notNull(),
  lineTotalRupiah: numeric('line_total_rupiah', { precision: 15, scale: 0 }).notNull(),
});

export const inventoryYieldPreps = pgTable('inventory_yield_preps', {
  id: serial('id').primaryKey(),
  prepCode: varchar('prep_code', { length: 50 }).notNull().unique(),
  sourceItemId: integer('source_item_id').notNull().references(() => items.id),
  outputItemId: integer('output_item_id').notNull().references(() => items.id),
  sourceQtyUsed: numeric('source_qty_used', { precision: 15, scale: 4 }).notNull(),
  cleanOutputQty: numeric('clean_output_qty', { precision: 15, scale: 4 }).notNull(),
  wasteQty: numeric('waste_qty', { precision: 15, scale: 4 }).notNull(),
  wasteReason: varchar('waste_reason', { length: 100 }),
  transferredValueRupiah: numeric('transferred_value_rupiah', { precision: 15, scale: 4 }).notNull(),
  prepDate: timestamp('prep_date', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  isReversed: boolean('is_reversed').notNull().default(false),
});

export const productionBatches = pgTable('production_batches', {
  id: serial('id').primaryKey(),
  batchCode: varchar('batch_code', { length: 100 }).notNull().unique(),
  recipeId: integer('recipe_id').references(() => recipes.id),
  outputItemId: integer('output_item_id').notNull().references(() => items.id),
  operatorId: integer('operator_id').notNull().references(() => users.id),
  status: varchar('status', { length: 10 }).notNull().default('DRAFT'), // 'DRAFT' | 'COMPLETED'
  batchDate: timestamp('batch_date', { withTimezone: true }).notNull(),
  qtyGood: numeric('qty_good', { precision: 15, scale: 4 }),
  qtyWaste: numeric('qty_waste', { precision: 15, scale: 4 }).notNull().default('0'),
  wasteTreatment: varchar('waste_treatment', { length: 20 }), // 'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK'
  totalCostRupiah: numeric('total_cost_rupiah', { precision: 15, scale: 4 }),
  outputValueRupiah: numeric('output_value_rupiah', { precision: 15, scale: 4 }),
  lossValueRupiah: numeric('loss_value_rupiah', { precision: 15, scale: 4 }).notNull().default('0'),
  hppPerUnitRupiah: numeric('hpp_per_unit_rupiah', { precision: 15, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isReversed: boolean('is_reversed').notNull().default(false),
});

export const productionInputs = pgTable('production_inputs', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').notNull().references(() => productionBatches.id),
  itemId: integer('item_id').notNull().references(() => items.id),
  qty: numeric('qty', { precision: 15, scale: 4 }).notNull(),
  valueRupiah: numeric('value_rupiah', { precision: 15, scale: 4 }),
  isOverhead: boolean('is_overhead').notNull().default(false),
});

export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  cashierId: integer('cashier_id').notNull().references(() => users.id),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  openingCashRupiah: numeric('opening_cash_rupiah', { precision: 15, scale: 0 }).notNull().default('0'),
  countedCashRupiah: numeric('counted_cash_rupiah', { precision: 15, scale: 0 }),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  saleCode: varchar('sale_code', { length: 40 }).notNull().unique(), // SALE-YYYYMMDD-XXX
  offlineInvoiceId: uuid('offline_invoice_id').notNull().unique(), // Idempotency
  offlineDeviceId: varchar('offline_device_id', { length: 100 }),
  shiftId: integer('shift_id').references(() => shifts.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  deviceCreatedAt: timestamp('device_created_at', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  businessDate: date('business_date').notNull(),
  subtotalRupiah: numeric('subtotal_rupiah', { precision: 15, scale: 0 }).notNull(),
  shippingCostRupiah: numeric('shipping_cost_rupiah', { precision: 15, scale: 0 }).notNull().default('0'),
  discountRupiah: numeric('discount_rupiah', { precision: 15, scale: 0 }).notNull().default('0'),
  totalAmountRupiah: numeric('total_amount_rupiah', { precision: 15, scale: 0 }).notNull(),
  cogsRupiah: numeric('cogs_rupiah', { precision: 15, scale: 4 }).notNull().default('0'),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // 'CASH' | 'TRANSFER' | 'QRIS'
  paymentChannel: varchar('payment_channel', { length: 4 }).notNull(), // 'CASH' | 'BANK'
  isOfflineSynced: boolean('is_offline_synced').notNull().default(true),
  isReversed: boolean('is_reversed').notNull().default(false),
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  lineType: varchar('line_type', { length: 8 }).notNull(), // 'MENU' | 'SHIPPING'
  itemId: integer('item_id').references(() => items.id),
  qty: numeric('qty', { precision: 15, scale: 4 }).notNull().default('1'),
  unitPriceRupiah: numeric('unit_price_rupiah', { precision: 15, scale: 0 }).notNull(),
  lineTotalRupiah: numeric('line_total_rupiah', { precision: 15, scale: 0 }).notNull(),
  hppSnapshotUnitRupiah: numeric('hpp_snapshot_unit_rupiah', { precision: 15, scale: 4 }).notNull().default('0'),
  reductionType: varchar('reduction_type', { length: 16 }).notNull(), // 'BOM_EXPLODE' | 'DIRECT_STOCK' | 'NO_STOCK_IMPACT'
});

export const saleFlags = pgTable('sale_flags', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  flagType: varchar('flag_type', { length: 20 }).notNull(), // 'OVERSOLD' | 'CLOCK_SKEW' | 'STALE_OFFLINE' | 'PRICE_MISMATCH'
  detail: jsonb('detail'),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// ==========================================
// 8.3 Ledger, Opname, Finance, Audit
// ==========================================

export const stockMovements = pgTable('stock_movements', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id),
  movementType: varchar('movement_type', { length: 20 }).notNull(),
  // 'PURCHASE_IN'|'PURCHASE_RETURN'|'PRODUCTION_INPUT'|'PRODUCTION_OUTPUT'|'SALE_OUT'|'SALE_RETURN'|
  // 'WASTE_OUT'|'OPNAME_ADJUSTMENT'|'MANUAL_ADJUSTMENT'|'REVERSAL'|'PREP_OUT'|'PREP_IN'
  qtyDelta: numeric('qty_delta', { precision: 15, scale: 4 }).notNull(),
  valueDeltaRupiah: numeric('value_delta_rupiah', { precision: 15, scale: 4 }).notNull(),
  qtyAfter: numeric('qty_after', { precision: 15, scale: 4 }).notNull(),
  valueAfterRupiah: numeric('value_after_rupiah', { precision: 15, scale: 4 }).notNull(),
  referenceType: varchar('reference_type', { length: 30 }).notNull(),
  referenceId: integer('reference_id').notNull(),
  reversesMovementId: bigserial('reverses_movement_id', { mode: 'number' }),
  createdBy: integer('created_by').references(() => users.id),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sm_item_date').on(table.itemId, table.occurredAt),
  index('idx_sm_ref').on(table.referenceType, table.referenceId),
]);

export const opnameSessions = pgTable('opname_sessions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  sessionDate: date('session_date').notNull(),
  responsibleId: integer('responsible_id').notNull().references(() => users.id),
  status: varchar('status', { length: 10 }).notNull().default('DRAFT'), // 'DRAFT' | 'PENDING' | 'POSTED'
  approvedBy: integer('approved_by').references(() => users.id),
  totalDiffValueRupiah: numeric('total_diff_value_rupiah', { precision: 15, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
});

export const opnameLines = pgTable('opname_lines', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => opnameSessions.id),
  itemId: integer('item_id').notNull().references(() => items.id),
  systemQtySnapshot: numeric('system_qty_snapshot', { precision: 15, scale: 4 }).notNull(),
  countedQty: numeric('counted_qty', { precision: 15, scale: 4 }),
  systemQtyAtPost: numeric('system_qty_at_post', { precision: 15, scale: 4 }),
  diffQty: numeric('diff_qty', { precision: 15, scale: 4 }),
  diffValueRupiah: numeric('diff_value_rupiah', { precision: 15, scale: 4 }),
}, (table) => [
  uniqueIndex('uq_opname_session_item').on(table.sessionId, table.itemId),
]);

export const financeCategories = pgTable('finance_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  kind: varchar('kind', { length: 7 }).notNull(), // 'INCOME' | 'EXPENSE'
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

export const financeTransactions = pgTable('finance_transactions', {
  id: serial('id').primaryKey(),
  txnDate: date('txn_date').notNull(),
  kind: varchar('kind', { length: 7 }).notNull(), // 'INCOME' | 'EXPENSE'
  channel: varchar('channel', { length: 4 }), // 'CASH' | 'BANK' | NULL
  categoryId: integer('category_id').notNull().references(() => financeCategories.id),
  amountRupiah: numeric('amount_rupiah', { precision: 15, scale: 0 }).notNull(),
  sourceType: varchar('source_type', { length: 20 }).notNull().default('MANUAL'), // 'MANUAL' | 'SALE' | 'PURCHASE' | 'BATCH_LOSS'
  sourceId: integer('source_id'),
  note: text('note'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  isReversed: boolean('is_reversed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_fin_date').on(table.txnDate, table.channel),
]);

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 50 }),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  ip: inet('ip'),
  requestId: uuid('request_id'),
});

// Relations
export const itemsRelations = relations(items, ({ many }) => ({
  movements: many(stockMovements),
  recipeLines: many(recipeLines),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  outputItem: one(items, { fields: [recipes.outputItemId], references: [items.id] }),
  lines: many(recipeLines),
}));

export const recipeLinesRelations = relations(recipeLines, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeLines.recipeId], references: [recipes.id] }),
  item: one(items, { fields: [recipeLines.itemId], references: [items.id] }),
}));

export const salesRelations = relations(sales, ({ many, one }) => ({
  items: many(saleItems),
  flags: many(saleFlags),
  shift: one(shifts, { fields: [sales.shiftId], references: [shifts.id] }),
  cashier: one(users, { fields: [sales.createdBy], references: [users.id] }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  item: one(items, { fields: [saleItems.itemId], references: [items.id] }),
}));
