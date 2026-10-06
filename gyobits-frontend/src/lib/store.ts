// In-Memory Shared Store for STOKARA
// Used as resilient fallback when PostgreSQL is offline or during offline/mock dev mode

export interface ItemData {
  id: number;
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
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

  private isInitialized = false;

  constructor() {
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Default Seed Items
    this.items = [
      {
        id: 1,
        sku: 'ING-KCP-01',
        name: 'Kecap Manis Indofood 700ml',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0.55',
        currentStockValueRupiah: '12650',
        currentAvgCostRupiah: '23000',
        oversold: false,
        minStockAlert: '4',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T14:20:00Z',
      },
      {
        id: 2,
        sku: 'RAW-DRY-GLM-02',
        name: 'Gula Merah',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'Kg',
        displayFactor: '1000',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '20',
        oversold: false,
        minStockAlert: '2000',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-04T11:00:00Z',
      },
      {
        id: 3,
        sku: 'RAW-DRY-PLS-01',
        name: 'Plastik Kemasan 1kg',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pax',
        displayFactor: '1',
        currentStockQty: '2',
        currentStockValueRupiah: '14000',
        currentAvgCostRupiah: '7000',
        oversold: false,
        minStockAlert: '2',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 4,
        sku: 'RAW-PRO-SP1',
        name: 'Daging Sapi Utuh (Raw)',
        category: 'RAW_PROTEIN',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'Kg',
        displayFactor: '1000',
        currentStockQty: '10000',
        currentStockValueRupiah: '380000',
        currentAvgCostRupiah: '38',
        oversold: false,
        minStockAlert: '5000',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T10:00:00Z',
      },
      {
        id: 5,
        sku: 'SEM-PRO-SP2',
        name: 'Daging Sapi Cincang Bersih',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'g',
        displayFactor: '1',
        currentStockQty: '8000',
        currentStockValueRupiah: '380000',
        currentAvgCostRupiah: '47.5',
        oversold: false,
        minStockAlert: '2000',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T10:00:00Z',
      },
      {
        id: 6,
        sku: 'RAW-DRY-KLT-01',
        name: 'Kulit Gyoza',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '100',
        currentStockValueRupiah: '15000',
        currentAvgCostRupiah: '150',
        oversold: false,
        minStockAlert: '30',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 7,
        sku: 'SEM-GYO-MNT',
        name: 'Gyoza Mentah Siap Masak',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '45',
        currentStockValueRupiah: '67500',
        currentAvgCostRupiah: '1500',
        oversold: false,
        minStockAlert: '10',
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T11:00:00Z',
      },
      {
        id: 8,
        sku: 'FNS-GYO-10',
        name: 'Gyoza Isi 10',
        category: 'FINISHED',
        stockMode: 'EXPLODE_BOM',
        unitBase: 'pcs',
        displayUnit: 'Porsi',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '0',
        oversold: false,
        minStockAlert: '0',
        sellPriceRupiah: '35000',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      },
      {
        id: 9,
        sku: 'FNS-GYO-08',
        name: 'Gyoza Isi 8',
        category: 'FINISHED',
        stockMode: 'EXPLODE_BOM',
        unitBase: 'pcs',
        displayUnit: 'Porsi',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '0',
        oversold: false,
        minStockAlert: '0',
        sellPriceRupiah: '28000',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      },
      {
        id: 10,
        sku: 'FNS-GYO-07',
        name: 'Gyoza Isi 7',
        category: 'FINISHED',
        stockMode: 'EXPLODE_BOM',
        unitBase: 'pcs',
        displayUnit: 'Porsi',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '0',
        oversold: false,
        minStockAlert: '0',
        sellPriceRupiah: '25000',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      },
      {
        id: 11,
        sku: 'FNS-MNM-EST',
        name: 'Es Teh Manis',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Gelas',
        displayFactor: '1',
        currentStockQty: '50',
        currentStockValueRupiah: '50000',
        currentAvgCostRupiah: '1000',
        oversold: false,
        minStockAlert: '5',
        sellPriceRupiah: '5000',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      },
      {
        id: 12,
        sku: 'FNS-EKS-CHO',
        name: 'Chili Oil Ekstra',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Cup',
        displayFactor: '1',
        currentStockQty: '30',
        currentStockValueRupiah: '30000',
        currentAvgCostRupiah: '1000',
        oversold: false,
        minStockAlert: '5',
        sellPriceRupiah: '3000',
        isActive: true,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      },
    ];

    // Default Finance Categories
    this.categories = [
      { id: 1, name: 'Penjualan Kasir', kind: 'INCOME', isSystem: true, isActive: true },
      { id: 2, name: 'Pendapatan Luar Usaha', kind: 'INCOME', isSystem: false, isActive: true },
      { id: 3, name: 'Pembelian Bahan Baku', kind: 'EXPENSE', isSystem: true, isActive: true },
      { id: 4, name: 'Biaya Pemasaran / Iklan', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 5, name: 'Gaji Karyawan', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 6, name: 'Sewa Tempat', kind: 'EXPENSE', isSystem: false, isActive: true },
      { id: 7, name: 'Loss Kerugian Produksi', kind: 'EXPENSE', isSystem: true, isActive: true },
      { id: 8, name: 'Operasional Lainnya', kind: 'EXPENSE', isSystem: false, isActive: true },
    ];

    // Default Finance Transactions
    this.transactions = [
      {
        id: 1,
        txnDate: '2026-10-02',
        kind: 'INCOME',
        channel: 'CASH',
        categoryId: 1,
        categoryName: 'Penjualan Kasir',
        amountRupiah: '350000',
        sourceType: 'SALE',
        note: 'Penjualan Shift Siang Offline',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-02T15:00:00Z',
      },
      {
        id: 2,
        txnDate: '2026-10-03',
        kind: 'INCOME',
        channel: 'BANK',
        categoryId: 1,
        categoryName: 'Penjualan Kasir',
        amountRupiah: '680000',
        sourceType: 'SALE',
        note: 'Penjualan Online QRIS & Transfer',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-03T20:00:00Z',
      },
      {
        id: 3,
        txnDate: '2026-10-04',
        kind: 'EXPENSE',
        channel: 'CASH',
        categoryId: 3,
        categoryName: 'Pembelian Bahan Baku',
        amountRupiah: '175000',
        sourceType: 'PURCHASE',
        note: 'Belanja sayur dan bumbu pasar',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-04T08:30:00Z',
      },
      {
        id: 4,
        txnDate: '2026-10-05',
        kind: 'EXPENSE',
        channel: 'BANK',
        categoryId: 4,
        categoryName: 'Biaya Pemasaran / Iklan',
        amountRupiah: '100000',
        sourceType: 'MANUAL',
        note: 'Iklan Instagram Story Promo Pembukaan',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-05T10:00:00Z',
      },
      {
        id: 5,
        txnDate: '2026-10-06',
        kind: 'INCOME',
        channel: 'CASH',
        categoryId: 1,
        categoryName: 'Penjualan Kasir',
        amountRupiah: '240000',
        sourceType: 'SALE',
        note: 'Penjualan Kasir Hari Ini (Cash)',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-06T14:00:00Z',
      },
      {
        id: 6,
        txnDate: '2026-10-06',
        kind: 'INCOME',
        channel: 'BANK',
        categoryId: 1,
        categoryName: 'Penjualan Kasir',
        amountRupiah: '390000',
        sourceType: 'SALE',
        note: 'Penjualan Kasir Hari Ini (Bank QRIS)',
        createdBy: 1,
        isReversed: false,
        createdAt: '2026-10-06T16:00:00Z',
      },
    ];

    // Seed Stock Movements
    this.movements = [
      {
        id: 1,
        itemId: 1,
        itemName: 'Kecap Manis Indofood 700ml',
        movementType: 'PRODUCTION_INPUT',
        qtyDelta: '-0.2',
        valueDeltaRupiah: '-4600',
        qtyAfter: '0.55',
        valueAfterRupiah: '12650',
        referenceType: 'PRODUCTION_BATCH',
        referenceId: 1,
        notes: 'Produksi Bumbu Gyoza',
        occurredAt: '2026-10-06T14:20:00Z',
      },
      {
        id: 2,
        itemId: 1,
        itemName: 'Kecap Manis Indofood 700ml',
        movementType: 'PURCHASE_IN',
        qtyDelta: '1',
        valueDeltaRupiah: '23000',
        qtyAfter: '0.75',
        valueAfterRupiah: '17250',
        referenceType: 'PURCHASE',
        referenceId: 1,
        notes: 'Restock Toko Sejahtera',
        occurredAt: '2026-10-05T09:15:00Z',
      },
    ];
  }
}

// Global singleton instance
const globalStore = (globalThis as unknown as { __stokaraStore?: InMemoryStore });
if (!globalStore.__stokaraStore) {
  globalStore.__stokaraStore = new InMemoryStore();
}

export const inMemoryStore = globalStore.__stokaraStore;
