// In-Memory Shared Store for STOKARA / GYOBITS
// Clean Baseline: Start from 0 (Empty Items & Transactions, Categories Only)

export interface ItemData {
  id: number;
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_VEGETABLE' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
  stockMode: 'STOCKED' | 'EXPLODE_BOM';
  unitBase: string;
  displayUnit: string;
  displayFactor: string;
  currentStockQty: string;
  currentStockValueRupiah: string;
  currentAvgCostRupiah: string;
  oversold: boolean;
  minStockAlert: string;
  normalShrinkMinPct?: string;
  normalShrinkMaxPct?: string;
  sellPriceRupiah?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategoryData {
  id: number;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  isSystem: boolean;
  isActive: boolean;
}

export interface FinanceTransactionData {
  id: number;
  txnDate: string;
  kind: 'INCOME' | 'EXPENSE';
  channel: 'CASH' | 'BANK' | null;
  categoryId: number;
  categoryName?: string;
  amountRupiah: string;
  sourceType: string;
  sourceId?: number | null;
  note?: string;
  createdBy: number;
  isReversed: boolean;
  createdAt: string;
}

export interface StockMovementData {
  id: number;
  itemId: number;
  itemName?: string;
  movementType: string;
  qtyDelta: string;
  valueDeltaRupiah: string;
  qtyAfter: string;
  valueAfterRupiah: string;
  referenceType: string;
  referenceId: number;
  notes?: string;
  occurredAt: string;
}

export interface PurchaseData {
  id: number;
  purchaseCode: string;
  supplierName: string;
  purchaseDate: string;
  paymentChannel: 'CASH' | 'BANK';
  totalRupiah: string;
  createdBy: number;
  createdAt: string;
  lines: Array<{
    itemId: number;
    itemName: string;
    qty: number;
    lineTotalRupiah: number;
  }>;
}

export interface YieldPrepData {
  id: number;
  prepCode: string;
  sourceItemId: number;
  outputItemId: number;
  sourceQtyUsed: string;
  cleanOutputQty: string;
  wasteQty: string;
  wasteReason?: string;
  transferredValueRupiah: string;
  prepDate: string;
  createdBy: number;
}

export interface RecipeLineData {
  id: number;
  recipeId: number;
  itemId: number;
  itemName?: string;
  unit?: string;
  qtyPerBasis: string;
  isOverhead?: boolean;
}

export interface RecipeData {
  id: number;
  outputItemId: number;
  outputItemName?: string;
  basisQty: string;
  version: number;
  isActive: boolean;
  lines: RecipeLineData[];
}

export interface ProductionBatchData {
  id: number;
  batchCode: string;
  recipeId?: number | null;
  outputItemId: number;
  status: string;
  batchDate: string;
  qtyGood: string;
  qtyWaste: string;
  wasteTreatment: string;
  totalCostRupiah: string;
  outputValueRupiah: string;
  lossValueRupiah: string;
  hppPerUnitRupiah: string;
  notes?: string;
  createdAt: string;
}

export interface SaleData {
  id: number;
  saleCode: string;
  offlineInvoiceId: string;
  paymentMethod: string;
  paymentChannel: 'CASH' | 'BANK';
  totalAmountRupiah: string;
  cogsRupiah: string;
  deviceCreatedAt: string;
  items: Array<{
    itemId?: number;
    name: string;
    qty: number;
    unitPrice: number;
  }>;
}

class InMemoryStore {
  items: ItemData[] = [];
  categories: FinanceCategoryData[] = [];
  transactions: FinanceTransactionData[] = [];
  movements: StockMovementData[] = [];
  purchases: PurchaseData[] = [];
  yieldPreps: YieldPrepData[] = [];
  batches: ProductionBatchData[] = [];
  sales: SaleData[] = [];
  recipes: RecipeData[] = [];

  private isInitialized = false;

  constructor() {
    this.init();
  }

  resetToZero() {
    this.items = [];
    this.recipes = [];
    this.batches = [];
    this.sales = [];
    this.purchases = [];
    this.yieldPreps = [];
    this.transactions = [];
    this.movements = [];
  }

  resetToExcelBaseline() {
    this.resetToZero();
  }

  clearAllTransactions() {
    this.transactions = [];
    this.movements = [];
    this.purchases = [];
    this.yieldPreps = [];
    this.batches = [];
    this.sales = [];
  }

  // HARD DELETE METHODS
  deleteItem(id: number): boolean {
    const prevLen = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    // Remove from recipes referencing this item
    this.recipes = this.recipes.filter((r) => r.outputItemId !== id);
    for (const r of this.recipes) {
      r.lines = r.lines.filter((l) => l.itemId !== id);
    }
    return this.items.length < prevLen;
  }

  deletePurchase(id: number): boolean {
    const pIndex = this.purchases.findIndex((p) => p.id === id);
    if (pIndex === -1) return false;
    const [deleted] = this.purchases.splice(pIndex, 1);

    // Revert stock deductions if desired or adjust stocks
    if (deleted?.lines) {
      for (const line of deleted.lines) {
        const it = this.items.find((i) => i.id === line.itemId);
        if (it) {
          const curQty = Number(it.currentStockQty) || 0;
          const curVal = Number(it.currentStockValueRupiah) || 0;
          const remQty = Math.max(0, curQty - line.qty);
          const remVal = Math.max(0, curVal - line.lineTotalRupiah);
          it.currentStockQty = remQty.toString();
          it.currentStockValueRupiah = remVal.toString();
          it.currentAvgCostRupiah = remQty > 0 ? (remVal / remQty).toFixed(2) : '0';
        }
      }
    }

    // Hard delete related finance transaction
    this.transactions = this.transactions.filter(
      (t) => !(t.sourceType === 'PURCHASE' && (t.sourceId === id || t.note?.includes(deleted.purchaseCode)))
    );

    // Hard delete related stock movements
    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'PURCHASE' && m.referenceId === id)
    );

    return true;
  }

  deleteYieldPrep(id: number): boolean {
    const yIndex = this.yieldPreps.findIndex((y) => y.id === id);
    if (yIndex === -1) return false;
    const [deleted] = this.yieldPreps.splice(yIndex, 1);

    // Hard delete related stock movements
    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'YIELD_PREP' && m.referenceId === id)
    );

    return true;
  }

  deleteBatch(id: number): boolean {
    const bIndex = this.batches.findIndex((b) => b.id === id);
    if (bIndex === -1) return false;
    const [deleted] = this.batches.splice(bIndex, 1);

    // Hard delete related stock movements
    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'PRODUCTION_BATCH' && m.referenceId === id)
    );

    return true;
  }

  deleteRecipe(id: number): boolean {
    const prevLen = this.recipes.length;
    this.recipes = this.recipes.filter((r) => r.id !== id);
    return this.recipes.length < prevLen;
  }

  deleteSale(idOrCode: number | string): boolean {
    const sIndex = this.sales.findIndex(
      (s) => s.id === Number(idOrCode) || s.saleCode === idOrCode || s.offlineInvoiceId === idOrCode
    );
    if (sIndex === -1) return false;
    const [deleted] = this.sales.splice(sIndex, 1);

    // Hard delete related finance transaction
    this.transactions = this.transactions.filter(
      (t) => !(t.sourceType === 'SALE' && (t.sourceId === deleted.id || t.note?.includes(deleted.saleCode)))
    );

    // Hard delete related stock movements
    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'SALE' && m.referenceId === deleted.id)
    );

    return true;
  }

  deleteTransaction(id: number): boolean {
    const prevLen = this.transactions.length;
    this.transactions = this.transactions.filter((t) => t.id !== id);
    return this.transactions.length < prevLen;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // START DARI 0: ITEMS KOSONG MURNI
    this.items = [];

    // START DARI 0: BOM / RESEP KOSONG MURNI
    this.recipes = [];

    // PERTAHANKAN KATEGORI KEUANGAN (STANDAR OPERASIONAL RESTORAN)
    this.categories = [
      { id: 1, name: 'Penjualan Kasir', kind: 'INCOME', isSystem: true, isActive: true },
      { id: 2, name: 'Setoran Modal Pemilik / Kas Kecil', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 3, name: 'Pendapatan Luar Usaha (Jual Limbah/Kardus)', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 4, name: 'Bunga Bank / Jasa Giro', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 5, name: 'Refund & Klaim Supplier', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 6, name: 'Koreksi Selisih Kas Lebih', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 7, name: 'Pembelian Bahan Baku', kind: 'EXPENSE', isSystem: true, isActive: true },
      { id: 8, name: 'Biaya Pemasaran / Iklan', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 9, name: 'Gaji Karyawan', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 10, name: 'Biaya Utilitas (Listrik, Air, Gas)', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 11, name: 'Sewa Tempat', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 12, name: 'Loss Kerugian Produksi', kind: 'EXPENSE', isSystem: true, isActive: true },
      { id: 13, name: 'Operasional Lainnya', kind: 'EXPENSE', isSystem: false, isActive: true },
    ];

    // START DARI 0: SEMUA RIWAYAT TRANSAKSI BERSIH
    this.batches = [];
    this.sales = [];
    this.purchases = [];
    this.yieldPreps = [];
    this.transactions = [];
    this.movements = [];
  }
}

// Global singleton instance
const globalStore = (globalThis as unknown as { __stokaraStore?: InMemoryStore });
if (!globalStore.__stokaraStore || typeof globalStore.__stokaraStore.deleteItem !== 'function') {
  globalStore.__stokaraStore = new InMemoryStore();
} else {
  // Reset store to zero cleanly
  globalStore.__stokaraStore.resetToZero();
}

export const inMemoryStore = globalStore.__stokaraStore;
