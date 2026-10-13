// Persistent and In-Memory Shared Store for STOKARA / GYOBITS
// Master Data Seeded directly from Image 1 (EXCEL RESEP & MASTER DATA GYOZA)
import fs from 'fs';
import path from 'path';

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
  minStockAlert?: string;
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
    isTester?: boolean;
  }>;
}

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'store_snapshot.json');

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

  constructor() {
    this.init();
  }

  persist() {
    try {
      const dir = path.dirname(SNAPSHOT_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        items: this.items,
        categories: this.categories,
        transactions: this.transactions,
        movements: this.movements,
        purchases: this.purchases,
        yieldPreps: this.yieldPreps,
        batches: this.batches,
        sales: this.sales,
        recipes: this.recipes,
      };
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to persist store snapshot to disk:', e);
    }
  }

  loadFromDisk(): boolean {
    try {
      if (fs.existsSync(SNAPSHOT_PATH)) {
        const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          this.items = data.items;
          this.categories = data.categories || [];
          this.transactions = data.transactions || [];
          this.movements = data.movements || [];
          this.purchases = data.purchases || [];
          this.yieldPreps = data.yieldPreps || [];
          this.batches = data.batches || [];
          this.sales = data.sales || [];
          this.recipes = data.recipes || [];
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load store snapshot from disk:', e);
    }
    return false;
  }

  init() {
    if (this.loadFromDisk()) {
      return;
    }

    // Default Seed Master Data strictly from Excel Image 1
    this.seedFromExcelImage();
    this.persist();
  }

  seedFromExcelImage() {
    const now = new Date().toISOString();

    // 1. Master Items: Protein, Sayuran, Bahan Kering, Barang Yield, Central Batch, POS Finished Goods
    this.items = [
      // PROTEIN
      {
        id: 1,
        sku: 'RAW-AYM-PTG',
        name: 'Ayam Potong',
        category: 'RAW_PROTEIN',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '40',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '40000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        sku: 'RAW-KLT-AYM',
        name: 'Kulit Ayam',
        category: 'RAW_PROTEIN',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '39',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '39000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        sku: 'RAW-TLR-BTR',
        name: 'Telur',
        category: 'RAW_PROTEIN',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Butir',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '1875',
        oversold: false,
        minStockAlert: '16',
        sellPriceRupiah: '30000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },

      // SAYURAN
      {
        id: 4,
        sku: 'RAW-SWI-PTH',
        name: 'Sawi Putih',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '15',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '15000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 5,
        sku: 'RAW-DAN-PRE',
        name: 'Daun Pre',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '15',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '15000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 6,
        sku: 'RAW-DAN-BWG',
        name: 'Daun Bawang',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '20',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '20000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 7,
        sku: 'RAW-GBS-SAY',
        name: 'Gubis',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '10',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '10000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 8,
        sku: 'RAW-BWG-PTH',
        name: 'Bawang Putih',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '38',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '38000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 9,
        sku: 'RAW-JHE-SAY',
        name: 'Jahe',
        category: 'RAW_VEGETABLE',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '20',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '20000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },

      // BAHAN KERING
      {
        id: 10,
        sku: 'RAW-KLD-JMR',
        name: 'Kaldu Jamur',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '150',
        oversold: false,
        minStockAlert: '400',
        sellPriceRupiah: '60000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 11,
        sku: 'RAW-MSG-MCN',
        name: 'MSG',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '58',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '58000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 12,
        sku: 'RAW-GRM-DPR',
        name: 'Garam',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '150',
        oversold: false,
        minStockAlert: '500',
        sellPriceRupiah: '75000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 13,
        sku: 'RAW-GLA-PSF',
        name: 'Gula',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '19',
        oversold: false,
        minStockAlert: '1000',
        sellPriceRupiah: '19000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 14,
        sku: 'RAW-SAS-TRM',
        name: 'Saos Tiram',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'ml',
        displayUnit: 'ML',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '92.59',
        oversold: false,
        minStockAlert: '270',
        sellPriceRupiah: '25000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 15,
        sku: 'RAW-MYK-WJN',
        name: 'Minyak Wijen',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'ml',
        displayUnit: 'ML',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '350',
        oversold: false,
        minStockAlert: '200',
        sellPriceRupiah: '70000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 16,
        sku: 'RAW-MYK-GRG',
        name: 'Minyak Goreng',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'ml',
        displayUnit: 'ML',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '11',
        oversold: false,
        minStockAlert: '2000',
        sellPriceRupiah: '22000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 17,
        sku: 'RAW-AIR-MNR',
        name: 'Air Mineral',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'ml',
        displayUnit: 'ML',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '0.53',
        oversold: false,
        minStockAlert: '15000',
        sellPriceRupiah: '8000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 18,
        sku: 'RAW-TPG-TPK',
        name: 'Tepung Tapioka',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '32',
        oversold: false,
        minStockAlert: '500',
        sellPriceRupiah: '16000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 19,
        sku: 'RAW-TPG-TRG',
        name: 'Tepung Terigu',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '32',
        oversold: false,
        minStockAlert: '500',
        sellPriceRupiah: '16000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 20,
        sku: 'RAW-TPG-BRS',
        name: 'Tepung Beras',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '30',
        oversold: false,
        minStockAlert: '500',
        sellPriceRupiah: '15000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 21,
        sku: 'RAW-KLT-GYO',
        name: 'Kulit Gyoza',
        category: 'RAW_DRY',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Bks',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '9000',
        oversold: false,
        minStockAlert: '1',
        sellPriceRupiah: '9000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },

      // BARANG YIELD (Hasil Prep Bersih)
      {
        id: 22,
        sku: 'YLD-AYM-FLT',
        name: 'Daging Ayam Filet',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '45',
        oversold: false,
        minStockAlert: '1000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 23,
        sku: 'YLD-DAN-PRE',
        name: 'Daun Pre Bersih',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '17',
        oversold: false,
        minStockAlert: '1000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 24,
        sku: 'YLD-DAN-BWG',
        name: 'Daun Bawang Bersih',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '22',
        oversold: false,
        minStockAlert: '1000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 25,
        sku: 'YLD-SWI-PTH',
        name: 'Sawi Putih Bersih',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '18',
        oversold: false,
        minStockAlert: '1000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 26,
        sku: 'YLD-BWG-PTH',
        name: 'Bawang Putih Bersih',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'g',
        displayUnit: 'G',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '42',
        oversold: false,
        minStockAlert: '1000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },

      // CENTRAL BATCH PRODUKSI
      {
        id: 27,
        sku: 'SEM-GYO-MNT',
        name: 'Gyoza Mentah Siap Masak',
        category: 'SEMI_FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '917.14',
        oversold: false,
        minStockAlert: '50',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },

      // POS FINISHED GOODS
      {
        id: 28,
        sku: 'POS-GYO-10',
        name: 'Gyoza Isi 10',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '9171.4',
        oversold: false,
        sellPriceRupiah: '25000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 29,
        sku: 'POS-GYO-8',
        name: 'Gyoza Isi 8',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '7337.1',
        oversold: false,
        sellPriceRupiah: '20000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 30,
        sku: 'POS-GYO-7',
        name: 'Gyoza Isi 7',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '6420.0',
        oversold: false,
        sellPriceRupiah: '20000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 31,
        sku: 'POS-GYO-FRZ-10',
        name: 'Gyoza Forze Isi 10',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '9171.4',
        oversold: false,
        sellPriceRupiah: '22500',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 32,
        sku: 'POS-GYO-TST',
        name: 'Tester Gyoza',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '917.14',
        oversold: false,
        sellPriceRupiah: '0',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 33,
        sku: 'POS-CHL-OIL',
        name: 'Chili Oil',
        category: 'FINISHED',
        stockMode: 'STOCKED',
        unitBase: 'pcs',
        displayUnit: 'Pcs',
        displayFactor: '1',
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '1000',
        oversold: false,
        sellPriceRupiah: '3000',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 2. KATEGORI KEUANGAN
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

    // 3. BOM RESEP RESMI DARI EXCEL GAMBAR 1 (RESEP GYOZA PER BATCH: OUTPUT 150 PCS)
    this.recipes = [
      {
        id: 1,
        outputItemId: 27, // Gyoza Mentah Siap Masak
        outputItemName: 'Gyoza Mentah Siap Masak',
        basisQty: '150',
        version: 1,
        isActive: true,
        lines: [
          { id: 1, recipeId: 1, itemId: 22, itemName: 'Daging Ayam Filet', unit: 'G', qtyPerBasis: '1000' },
          { id: 2, recipeId: 1, itemId: 23, itemName: 'Daun Pre Bersih', unit: 'G', qtyPerBasis: '70' },
          { id: 3, recipeId: 1, itemId: 24, itemName: 'Daun Bawang Bersih', unit: 'G', qtyPerBasis: '70' },
          { id: 4, recipeId: 1, itemId: 25, itemName: 'Sawi Putih Bersih', unit: 'G', qtyPerBasis: '300' },
          { id: 5, recipeId: 1, itemId: 26, itemName: 'Bawang Putih Bersih', unit: 'G', qtyPerBasis: '80' },
          { id: 6, recipeId: 1, itemId: 18, itemName: 'Tepung Tapioka', unit: 'G', qtyPerBasis: '200' },
          { id: 7, recipeId: 1, itemId: 11, itemName: 'MSG', unit: 'G', qtyPerBasis: '0' },
          { id: 8, recipeId: 1, itemId: 13, itemName: 'Gula', unit: 'G', qtyPerBasis: '15' },
          { id: 9, recipeId: 1, itemId: 12, itemName: 'Garam', unit: 'G', qtyPerBasis: '10' },
          { id: 10, recipeId: 1, itemId: 10, itemName: 'Kaldu Jamur', unit: 'G', qtyPerBasis: '4' },
          { id: 11, recipeId: 1, itemId: 14, itemName: 'Saos Tiram', unit: 'ML', qtyPerBasis: '10' },
          { id: 12, recipeId: 1, itemId: 15, itemName: 'Minyak Wijen', unit: 'ML', qtyPerBasis: '10' },
          { id: 13, recipeId: 1, itemId: 16, itemName: 'Minyak Goreng', unit: 'ML', qtyPerBasis: '50' },
          { id: 14, recipeId: 1, itemId: 3, itemName: 'Telur', unit: 'Butir', qtyPerBasis: '1' },
          { id: 15, recipeId: 1, itemId: 17, itemName: 'Air Mineral', unit: 'ML', qtyPerBasis: '50' },
        ],
      },
    ];

    // Transaksi kosong dari awal (clean slate)
    this.batches = [];
    this.sales = [];
    this.purchases = [];
    this.yieldPreps = [];
    this.transactions = [];
    this.movements = [];
  }

  resetToZero() {
    this.seedFromExcelImage();
    this.persist();
  }

  resetToExcelBaseline() {
    this.seedFromExcelImage();
    this.persist();
  }

  clearAllTransactions() {
    this.transactions = [];
    this.movements = [];
    this.purchases = [];
    this.yieldPreps = [];
    this.batches = [];
    this.sales = [];
    this.persist();
  }

  // MUTATION METHODS WITH AUTO-PERSISTENCE
  addItem(item: ItemData) {
    this.items.unshift(item);
    this.persist();
  }

  deleteItem(id: number): boolean {
    const prevLen = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    this.recipes = this.recipes.filter((r) => r.outputItemId !== id);
    for (const r of this.recipes) {
      r.lines = r.lines.filter((l) => l.itemId !== id);
    }
    const success = this.items.length < prevLen;
    if (success) this.persist();
    return success;
  }

  deletePurchase(id: number): boolean {
    const pIndex = this.purchases.findIndex((p) => p.id === id);
    if (pIndex === -1) return false;
    const [deleted] = this.purchases.splice(pIndex, 1);

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

    this.transactions = this.transactions.filter(
      (t) => !(t.sourceType === 'PURCHASE' && (t.sourceId === id || t.note?.includes(deleted.purchaseCode)))
    );

    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'PURCHASE' && m.referenceId === id)
    );

    this.persist();
    return true;
  }

  deleteYieldPrep(id: number): boolean {
    const yIndex = this.yieldPreps.findIndex((y) => y.id === id);
    if (yIndex === -1) return false;
    this.yieldPreps.splice(yIndex, 1);

    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'YIELD_PREP' && m.referenceId === id)
    );

    this.persist();
    return true;
  }

  deleteBatch(id: number): boolean {
    const bIndex = this.batches.findIndex((b) => b.id === id);
    if (bIndex === -1) return false;
    this.batches.splice(bIndex, 1);

    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'PRODUCTION_BATCH' && m.referenceId === id)
    );

    this.persist();
    return true;
  }

  deleteRecipe(id: number): boolean {
    const prevLen = this.recipes.length;
    this.recipes = this.recipes.filter((r) => r.id !== id);
    const success = this.recipes.length < prevLen;
    if (success) this.persist();
    return success;
  }

  deleteSale(idOrCode: number | string): boolean {
    const sIndex = this.sales.findIndex(
      (s) => s.id === Number(idOrCode) || s.saleCode === idOrCode || s.offlineInvoiceId === idOrCode
    );
    if (sIndex === -1) return false;
    const [deleted] = this.sales.splice(sIndex, 1);

    this.transactions = this.transactions.filter(
      (t) => !(t.sourceType === 'SALE' && (t.sourceId === deleted.id || t.note?.includes(deleted.saleCode)))
    );

    this.movements = this.movements.filter(
      (m) => !(m.referenceType === 'SALE' && m.referenceId === deleted.id)
    );

    this.persist();
    return true;
  }

  deleteTransaction(id: number): boolean {
    const prevLen = this.transactions.length;
    this.transactions = this.transactions.filter((t) => t.id !== id);
    const success = this.transactions.length < prevLen;
    if (success) this.persist();
    return success;
  }
}

// Global singleton instance across Next.js HMR
const globalStore = (globalThis as unknown as { __stokaraStore?: InMemoryStore });
if (!globalStore.__stokaraStore || typeof globalStore.__stokaraStore.deleteItem !== 'function') {
  globalStore.__stokaraStore = new InMemoryStore();
} else {
  Object.setPrototypeOf(globalStore.__stokaraStore, InMemoryStore.prototype);
  if (globalStore.__stokaraStore.recipes?.[0]?.basisQty === '1870') {
    globalStore.__stokaraStore.recipes[0].basisQty = '150';
    globalStore.__stokaraStore.persist();
  }
}

export const inMemoryStore = globalStore.__stokaraStore;
