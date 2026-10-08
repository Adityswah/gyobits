// Frontend API Client for STOKARA

export interface DashboardFinanceResponse {
  pendapatanKotor: number;
  pengeluaran: number;
  bersihCash: number;
  bersihBank: number;
  pendapatanBersih: number;
  identityCheck: boolean;
  chartData?: {
    labels: string[];
    pendapatan: number[];
    pengeluaran: number[];
  };
}

export interface ItemRecord {
  id: number;
  sku: string;
  name: string;
  category: string;
  stockMode: string;
  unitBase: string;
  displayUnit: string;
  displayFactor?: string;
  currentStockQty: string;
  currentStockValueRupiah: string;
  currentAvgCostRupiah?: string | null;
  minStockAlert?: string | null;
  sellPriceRupiah?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStockResponse {
  totalSku: number;
  kondisiKritis: number;
  nilaiStockTotal: number;
  items: ItemRecord[];
}

export interface ItemPayload {
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_VEGETABLE' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
  unitBase?: string;
  displayUnit?: string;
  displayFactor?: number;
  stockMode?: 'STOCKED' | 'EXPLODE_BOM';
  sellPriceRupiah?: number;
  minStockAlert?: number;
}

export interface PurchaseLinePayload {
  itemId: number;
  qty: number;
  lineTotalRupiah: number;
}

export interface PurchasePayload {
  purchaseDate: string;
  supplierName?: string;
  paymentChannel: 'CASH' | 'BANK';
  lines: PurchaseLinePayload[];
  userId?: number;
}

export interface YieldPrepPayload {
  sourceItemId: number;
  outputItemId: number;
  sourceQtyUsed: number;
  cleanOutputQty: number;
  wasteReason?: string;
  userId?: number;
}

export interface RecipeLineRecord {
  id: number;
  recipeId: number;
  itemId: number;
  itemName?: string;
  unit?: string;
  qtyPerBasis: string;
  isOverhead?: boolean;
}

export interface RecipeRecord {
  id: number;
  outputItemId: number;
  outputItemName?: string;
  outputItemUnit?: string;
  basisQty: string;
  version: number;
  isActive: boolean;
  lines: RecipeLineRecord[];
}

export interface RecipePayload {
  outputItemId: number;
  basisQty: number;
  lines: Array<{ itemId: number; qtyPerBasis: number; isOverhead?: boolean }>;
}

export interface BatchInputPayload {
  recipeId?: number;
  outputItemId: number;
  inputs: Array<{ itemId: number; qty: number; isOverhead?: boolean }>;
  qtyGood: number;
  qtyWaste?: number;
  wasteTreatment?: 'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK';
  batchDate?: string;
  notes?: string;
  userId?: number;
}

export interface SaleItemPayload {
  line_type: 'MENU' | 'SHIPPING';
  item_id?: number;
  item_name?: string;
  qty: number;
  unit_price: number;
  variant_name?: string;
}

export interface SaleSyncPayload {
  offline_invoice_id: string;
  device_id?: string;
  device_created_at?: string;
  shift_id?: number;
  payment_method: 'CASH' | 'BANK';
  payment_channel?: 'CASH' | 'BANK';
  items: SaleItemPayload[];
  shipping_cost?: number;
  discount?: number;
  userId?: number;
}

export interface FinanceTransactionRecord {
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
  createdAt: string;
}

export interface FinanceTransactionPayload {
  txnDate: string;
  kind: 'INCOME' | 'EXPENSE';
  channel: 'CASH' | 'BANK';
  categoryId?: number;
  categoryName?: string;
  amountRupiah: number;
  note?: string;
  sourceType?: string;
  userId?: number;
}

export interface FinanceCategoryRecord {
  id: number;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  isSystem: boolean;
  isActive: boolean;
}

// Client-side in-memory SWR cache for 0ms instant loading
const apiCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 25 * 1000; // 25s fresh window

export function clearApiCache() {
  apiCache.clear();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  // 1. Instant cache response if available
  if (isGet && apiCache.has(endpoint)) {
    const cached = apiCache.get(endpoint)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Background revalidate without blocking UI
      fetch(endpoint, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      })
        .then(r => r.json())
        .then(fresh => {
          if (fresh) apiCache.set(endpoint, { data: fresh, timestamp: Date.now() });
        })
        .catch(() => {});

      return cached.data as T;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  if (isGet) {
    apiCache.set(endpoint, { data, timestamp: Date.now() });
  } else {
    // Clear cache on write operations (POST, PUT, DELETE)
    apiCache.clear();
  }

  return data;
}

export const api = {
  dashboard: {
    getFinance: (params?: { from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return request<DashboardFinanceResponse>(`/api/dashboard/finance?${q.toString()}`);
    },
    getStock: () => request<DashboardStockResponse>('/api/dashboard/stock'),
  },

  items: {
    getAll: () => request<{ success: boolean; data: ItemRecord[] }>('/api/items'),
    create: (payload: ItemPayload) =>
      request<{ success: boolean; data: ItemRecord }>('/api/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/items?id=${id}`, {
        method: 'DELETE',
      }),
  },

  purchases: {
    getAll: () => request<{ success: boolean; data: Record<string, unknown>[] }>('/api/purchases'),
    create: (payload: PurchasePayload) =>
      request<{ success: boolean; data: Record<string, unknown> }>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/purchases?id=${id}`, {
        method: 'DELETE',
      }),
  },

  yields: {
    getAll: () => request<{ success: boolean; data: Record<string, unknown>[] }>('/api/yield-preps'),
    create: (payload: YieldPrepPayload) =>
      request<{ success: boolean; data: Record<string, unknown> }>('/api/yield-preps', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/yield-preps?id=${id}`, {
        method: 'DELETE',
      }),
  },

  batches: {
    getAll: () => request<{ success: boolean; data: Record<string, unknown>[] }>('/api/production-batches'),
    create: (payload: BatchInputPayload) =>
      request<{ success: boolean; data: Record<string, unknown> }>('/api/production-batches', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/production-batches?id=${id}`, {
        method: 'DELETE',
      }),
  },

  recipes: {
    getAll: () => request<{ success: boolean; data: RecipeRecord[] }>('/api/recipes'),
    create: (payload: RecipePayload) =>
      request<{ success: boolean; data: RecipeRecord }>('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/recipes?id=${id}`, {
        method: 'DELETE',
      }),
  },

  sales: {
    getAll: () => request<{ success: boolean; data: Record<string, unknown>[] }>('/api/sales'),
    sync: (payload: SaleSyncPayload) =>
      request<{ success: boolean; sale_code: string; total_amount: number; flags: string[] }>('/api/sales/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id: number | string) =>
      request<{ success: boolean; message: string }>(`/api/sales?id=${id}`, {
        method: 'DELETE',
      }),
  },

  finance: {
    getTransactions: (params?: { from?: string; to?: string; kind?: string; channel?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.kind) q.set('kind', params.kind);
      if (params?.channel) q.set('channel', params.channel);
      return request<{ success: boolean; data: FinanceTransactionRecord[] }>(`/api/finance/transactions?${q.toString()}`);
    },
    createTransaction: (payload: FinanceTransactionPayload) =>
      request<{ success: boolean; data: FinanceTransactionRecord }>('/api/finance/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteTransaction: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/finance/transactions?id=${id}`, {
        method: 'DELETE',
      }),
    getCategories: () => request<{ success: boolean; data: FinanceCategoryRecord[] }>('/api/finance/categories'),
    createCategory: (payload: { name: string; kind: 'INCOME' | 'EXPENSE' }) =>
      request<{ success: boolean; data: FinanceCategoryRecord }>('/api/finance/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  system: {
    resetTransactions: (mode: 'baseline' | 'clean' = 'baseline') =>
      request<{ success: boolean; mode: string; message: string }>('/api/system/reset-transactions', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }),
  },
};
