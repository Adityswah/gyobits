'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Minus, Trash2, Truck, Image as ImageIcon, X, CheckCircle2, Store, History, RefreshCw } from 'lucide-react';
import { api, SaleSyncPayload } from '@/lib/api';
import { useApp } from '@/context/AppContext';

interface Variant {
  id: string;
  name: string;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  variants?: Variant[];
}

const MENU_CATEGORIES = ['Semua', 'Gyoza', 'Minuman', 'Ekstra'];

const VARIANTS_ISI_10: Variant[] = [
  { id: 'kukus', name: 'Kukus' },
  { id: 'goreng', name: 'Goreng' },
  { id: 'grill', name: 'Grill' },
  { id: 'mix', name: 'Mix' },
];

const VARIANTS_ISI_8_7: Variant[] = [
  { id: 'kukus', name: 'Kukus' },
  { id: 'goreng', name: 'Goreng' },
  { id: 'grill', name: 'Grill' },
  { id: 'frozen', name: 'Frozen' },
  { id: 'mix', name: 'Mix' },
];

const OFFICIAL_POS_MENUS: MenuItem[] = [
  {
    id: 101,
    name: 'Gyoza Isi 10',
    price: 25000,
    category: 'Gyoza',
    image: '/images/gyoza10.jpg',
    variants: VARIANTS_ISI_10,
  },
  {
    id: 102,
    name: 'Gyoza Isi 10 Frozen',
    price: 22500,
    category: 'Gyoza',
    image: '/images/gyoza10-frozen.jpg',
  },
  {
    id: 103,
    name: 'Gyoza Isi 8',
    price: 20000,
    category: 'Gyoza',
    image: '/images/gyoza8.jpg',
    variants: VARIANTS_ISI_8_7,
  },
  {
    id: 104,
    name: 'Gyoza Isi 7',
    price: 20000,
    category: 'Gyoza',
    image: '/images/gyoza7.jpg',
    variants: VARIANTS_ISI_8_7,
  },
  {
    id: 105,
    name: 'Chili Oil',
    price: 3000,
    category: 'Ekstra',
    image: '/images/chilioil.jpg',
  },
];

const CUSTOMER_SOURCES = ['Offline', 'WhatsApp', 'Threads', 'Shopee', 'Lainnya'];

interface CartItem {
  id: string;
  item: MenuItem;
  qty: number;
  selectedVariant?: Variant;
}

interface OutboxTransaction {
  id: string;
  offlineInvoiceId: string;
  waktu: string;
  total: number;
  itemsCount: number;
  status: 'PENDING' | 'SYNCED';
  payload: SaleSyncPayload;
}

interface DbSaleItem {
  id: number;
  itemName: string;
  qty: number;
  unitPriceRupiah: string;
}

interface DbSaleRecord {
  id: number;
  saleCode: string;
  deviceCreatedAt?: string;
  totalAmountRupiah: string;
  paymentMethod?: string;
  paymentChannel?: string;
  items?: DbSaleItem[];
}

export default function POSPage() {
  const { addAuditLog } = useApp();
  const [isOnline, setIsOnline] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(OFFICIAL_POS_MENUS);
  const [rawBatchStock, setRawBatchStock] = useState<number>(0);

  // Sales History & Hard Delete State
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);
  const [dbSales, setDbSales] = useState<DbSaleRecord[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  const loadMenuItems = useCallback(async () => {
    try {
      const res = await api.items.getAll();
      if (res.data && Array.isArray(res.data)) {
        // Find raw batch stock
        const mentah = res.data.find(i => 
          i.sku === 'SEM-GYO-MNT' || i.name.toLowerCase().includes('gyoza mentah')
        );
        setRawBatchStock(mentah ? Number(mentah.currentStockQty) || 0 : 0);

        // Filter finished goods for POS menu
        const finishedGoods = res.data.filter(i => i.category === 'FINISHED');
        const combined = [...OFFICIAL_POS_MENUS];

        for (const item of finishedGoods) {
          const idx = combined.findIndex(c => c.name.toLowerCase() === item.name.toLowerCase());
          if (idx !== -1) {
            combined[idx].id = item.id;
            combined[idx].price = Number(item.sellPriceRupiah) || combined[idx].price;
          } else {
            const lowerName = item.name.toLowerCase();
            let cat = 'Gyoza';
            if (lowerName.includes('teh') || lowerName.includes('es') || lowerName.includes('minum')) {
              cat = 'Minuman';
            } else if (lowerName.includes('chili') || lowerName.includes('saus') || lowerName.includes('ekstra') || lowerName.includes('sambal')) {
              cat = 'Ekstra';
            }

            const is10 = lowerName.includes('10');
            const variants = is10 ? VARIANTS_ISI_10 : VARIANTS_ISI_8_7;
            combined.push({
              id: item.id,
              name: item.name,
              price: Number(item.sellPriceRupiah || item.currentAvgCostRupiah || 0),
              category: cat,
              image: `/images/${item.sku?.toLowerCase() || 'item'}.jpg`,
              variants: lowerName.includes('gyoza') && !lowerName.includes('frozen') ? variants : undefined,
            });
          }
        }
        setMenuItems(combined);
      }
    } catch (err) {
      console.warn('Failed to load menu items:', err);
    }
  }, []);

  const loadDbSales = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const res = await api.sales.getAll();
      if (res.data) {
        setDbSales(res.data as unknown as DbSaleRecord[]);
      }
    } catch (err) {
      console.warn('Failed to load sales history:', err);
    } finally {
      setIsLoadingSales(false);
    }
  }, []);

  const handleDeleteDbSale = async (id: number) => {
    if (confirm(`Hapus permanen nota penjualan #${id}? Transaksi, mutasi stok, dan pembukuan kas terkait akan dibatalkan.`)) {
      try {
        await api.sales.delete(id);
        showNotification(`Transaksi penjualan #${id} berhasil dihapus.`);
        loadDbSales();
        loadMenuItems();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  const handleDeleteOutbox = (id: string) => {
    if (confirm(`Hapus transaksi outbox ${id}?`)) {
      setOutbox(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('stokara_pos_outbox', JSON.stringify(updated));
        return updated;
      });
      showNotification(`Transaksi outbox ${id} dihapus.`);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const discount = 0;
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [customerSource, setCustomerSource] = useState('Offline');

  // Modals & Notifications
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<MenuItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // SHIFT STATE (SABTU & MINGGU LOGIC)
  // Day check: 0 is Sunday, 6 is Saturday
  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const [shiftStarted, setShiftStarted] = useState<boolean>(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [showStartShiftModal, setShowStartShiftModal] = useState<boolean>(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState<boolean>(false);

  // End Shift Form Fields
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [actualTotalCash, setActualTotalCash] = useState<number>(0);
  const [revenueTF, setRevenueTF] = useState<number>(0);
  const [revenueQRIS, setRevenueQRIS] = useState<number>(0);

  // Track session sales
  const [sessionCashIncome, setSessionCashIncome] = useState<number>(0);

  // Outbox / Offline Queue State
  const [outbox, setOutbox] = useState<OutboxTransaction[]>([]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Check initial shift requirement on weekend
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const savedOutbox = localStorage.getItem('stokara_pos_outbox');
        if (savedOutbox) {
          try { setOutbox(JSON.parse(savedOutbox)); } catch {}
        }

        const savedShift = localStorage.getItem('gyobits_shift_active');
        if (savedShift) {
          setShiftStarted(true);
          const savedModal = localStorage.getItem('gyobits_shift_modal');
          if (savedModal) setOpeningCash(Number(savedModal));
        } else if (isWeekend) {
          setShowStartShiftModal(true);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isWeekend]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchCat = activeCategory === 'Semua' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleProductClick = (item: MenuItem) => {
    if (item.variants && item.variants.length > 0) {
      setSelectedProductForVariant(item);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, variant?: Variant) => {
    const cartItemId = variant ? `${item.id}-${variant.id}` : `${item.id}`;
    
    setCart(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i => i.id === cartItemId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: cartItemId, item, qty: 1, selectedVariant: variant }];
    });
    
    setSelectedProductForVariant(null);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === cartItemId) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }));
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.id !== cartItemId));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.item.price * i.qty), 0);
  const total = subtotal + shippingCost - discount;

  // FAST OPTIMISTIC CHECKOUT (No freeze)
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Check shift if weekend
    if (isWeekend && !shiftStarted) {
      setShowStartShiftModal(true);
      return;
    }

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const now = new Date();
    const invoiceNumber = `POS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(100 + Math.random() * 900)}`;

    const payload: SaleSyncPayload = {
      offline_invoice_id: uuid,
      device_id: 'TAB-01',
      device_created_at: now.toISOString(),
      shift_id: shiftStarted ? 1 : undefined,
      payment_method: paymentMethod,
      shipping_cost: shippingCost,
      discount: discount,
      items: cart.map(c => ({
        line_type: 'MENU',
        item_id: c.item.id,
        item_name: c.selectedVariant ? `${c.item.name} (${c.selectedVariant.name})` : c.item.name,
        qty: c.qty,
        unit_price: c.item.price,
        variant_name: c.selectedVariant?.name,
      }))
    };

    if (shippingCost > 0) {
      payload.items.push({
        line_type: 'SHIPPING',
        qty: 1,
        unit_price: shippingCost
      });
    }

    const newTx: OutboxTransaction = {
      id: invoiceNumber,
      offlineInvoiceId: uuid,
      waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      total: total,
      itemsCount: cart.reduce((a, c) => a + c.qty, 0),
      status: 'PENDING',
      payload: payload
    };

    // Immediate UI Feedback (0 delay)
    const updatedOutbox = [newTx, ...outbox];
    setOutbox(updatedOutbox);
    localStorage.setItem('stokara_pos_outbox', JSON.stringify(updatedOutbox));

    if (paymentMethod === 'CASH') {
      setSessionCashIncome(prev => prev + total);
    } else {
      setRevenueQRIS(prev => prev + total);
    }

    // Record into global audit log
    const itemsDescription = cart.map(c => `${c.qty}x ${c.item.name}`).join(', ');
    addAuditLog({
      ref: invoiceNumber,
      tipe: 'POS',
      operator: 'Kasir',
      nominal: total,
      keterangan: `Penjualan POS (${itemsDescription})`
    });

    setCart([]);
    setShippingCost(0);
    showNotification(`Transaksi ${invoiceNumber} tersimpan!`);

    // Background sync without blocking user
    if (isOnline) {
      fetch('/api/sales/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (res.ok) {
          loadMenuItems();
          setOutbox(prev => {
            const synced = prev.map(t => t.id === invoiceNumber ? { ...t, status: 'SYNCED' as const } : t);
            localStorage.setItem('stokara_pos_outbox', JSON.stringify(synced));
            return synced;
          });
        }
      })
      .catch(err => {
        console.warn('Sync delayed:', err);
      });
    }
  };

  // Start Shift Handler
  const handleConfirmStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    setShiftStarted(true);
    localStorage.setItem('gyobits_shift_active', 'true');
    localStorage.setItem('gyobits_shift_modal', openingCash.toString());
    setShowStartShiftModal(false);
    showNotification(`Shift Kasir berhasil dibuka dengan modal Rp ${openingCash.toLocaleString('id-ID')}`);
  };

  // End Shift Calculations
  // Selisih Cash = ((Modal Awal + Pendapatan Cash - Pengeluaran) - Total Cash Sebenarnya)
  const expectedCash = (openingCash + sessionCashIncome - otherExpenses);
  const diffCash = expectedCash - actualTotalCash;
  const totalBankIncome = revenueTF + revenueQRIS;
  const totalDailyRevenue = sessionCashIncome + totalBankIncome;

  const handleConfirmEndShift = (e: React.FormEvent) => {
    e.preventDefault();
    setShiftStarted(false);
    localStorage.removeItem('gyobits_shift_active');
    localStorage.removeItem('gyobits_shift_modal');
    setShowEndShiftModal(false);
    showNotification("Shift kasir akhir pekan berhasil ditutup & diarsipkan!");
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden relative font-sans">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 right-6 bg-green text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* LEFT: MENU GRID */}
      <div className="flex-1 flex flex-col bg-card rounded-[14px] border border-line shadow-sm overflow-hidden relative">
        
        {/* Modal Variant */}
        {selectedProductForVariant && (
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <div className="bg-card rounded-[14px] shadow-lg border border-line w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-line flex justify-between items-center bg-stat">
                <h3 className="font-serif font-bold text-lg text-ink">Pilih Varian {selectedProductForVariant.name}</h3>
                <button onClick={() => setSelectedProductForVariant(null)} className="p-2 hover:bg-line rounded-full text-side-text">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 bg-bg">
                {selectedProductForVariant.variants?.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => addToCart(selectedProductForVariant, v)}
                    className="py-4 bg-surface border border-line rounded-xl font-bold text-ink hover:border-gold hover:bg-gold-soft transition-colors target-touch"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POS Header */}
        <div className="p-3.5 sm:p-4 border-b border-line flex flex-wrap justify-between items-center gap-3 bg-stat">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-serif font-bold text-ink">POS Terminal</h1>

            {/* Stok Batch Mentah Central Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-line rounded-lg text-xs shadow-xs">
              <span className={`w-2 h-2 rounded-full ${rawBatchStock > 20 ? 'bg-green' : 'bg-gold'} animate-pulse`} />
              <span className="text-side-text font-bold hidden sm:inline">Stok Dapur (Batch Mentah):</span>
              <span className="font-mono font-bold text-ink">{rawBatchStock} pcs</span>
              <span className="text-[10px] text-side-text font-medium">(&asymp;{Math.floor(rawBatchStock / 8)} porsi)</span>
            </div>
            
            {/* Riwayat Transaksi Button */}
            <button 
              onClick={() => {
                setShowSalesHistoryModal(true);
                loadDbSales();
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors bg-card border border-line text-ink hover:border-gold hover:text-gold"
              title="Lihat riwayat nota penjualan & hapus transaksi yang salah"
            >
              <History size={13} />
              Riwayat Nota ({dbSales.length + outbox.length})
            </button>

            {/* Shift Button (Weekend only indicator) */}
            {isWeekend && (
              <button 
                onClick={() => shiftStarted ? setShowEndShiftModal(true) : setShowStartShiftModal(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors ${
                  shiftStarted 
                    ? 'bg-gold text-white hover:bg-[#A38225]' 
                    : 'bg-card border border-line text-ink hover:bg-stat'
                }`}
              >
                <Store size={13} />
                {shiftStarted ? 'End Shift' : 'Start Shift'}
              </button>
            )}
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-side-text" size={16} />
            <input 
              type="text" 
              placeholder="Cari menu gyoza..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-surface border border-line rounded-lg text-sm outline-none focus:border-gold w-full sm:w-60 text-ink"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex px-4 py-3 gap-2 overflow-x-auto hidden-scrollbar border-b border-line bg-card">
          {MENU_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold min-w-max transition-colors target-touch ${
                activeCategory === cat 
                  ? 'bg-gold text-white shadow-xs' 
                  : 'bg-surface border border-line text-side-text hover:bg-stat'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg">
          {menuItems.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-card/60 border border-dashed border-line rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gold-soft border border-chip-border text-gold flex items-center justify-center mb-4">
                <Store size={32} />
              </div>
              <h3 className="font-serif font-bold text-lg text-ink mb-1">Belum Ada Menu Jual (FINISHED)</h3>
              <p className="text-xs text-side-text max-w-sm mb-5 leading-relaxed">
                Database bersih dari dummy data (start dari 0). Tambahkan produk jadi siap jual (misal: Gyoza Isi 10, Gyoza Isi 8, Es Teh) dengan kategori <span className="font-bold text-ink">FINISHED</span> di Master Data.
              </p>
              <Link 
                href="/stock"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-[#A38225] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus size={15} /> + Tambah Produk di Master Data
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleProductClick(item)}
                  className="bg-card border border-line rounded-xl overflow-hidden flex flex-col hover:border-gold hover:shadow-sm transition-all active:scale-95 text-left group"
                >
                  <div className="w-full h-28 bg-stat border-b border-line flex items-center justify-center relative overflow-hidden text-side-text group-hover:opacity-90">
                    <div className="flex flex-col items-center opacity-40">
                      <ImageIcon size={28} />
                      <span className="text-[9px] mt-1.5 font-mono">{item.name}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 w-full">
                    <h3 className="text-xs font-bold text-ink mb-1 line-clamp-1">{item.name}</h3>
                    <p className="text-gold font-mono font-bold text-xs">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-side-text text-xs">
                  Menu tidak ditemukan untuk pencarian ini
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CART */}
      <div className="w-full lg:w-[380px] shrink-0 bg-card rounded-[14px] border border-line shadow-sm flex flex-col overflow-hidden">
        <div className="p-3.5 border-b border-line bg-stat flex justify-between items-center">
          <h2 className="font-serif font-bold text-base text-ink flex items-center gap-2">
            Keranjang
            <span className="bg-ink text-white text-[11px] px-2 py-0.5 rounded-full font-sans">
              {cart.reduce((a,c) => a + c.qty, 0)} item
            </span>
          </h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-bg max-h-72 lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-48 lg:h-full flex flex-col items-center justify-center text-side-text space-y-2 opacity-50">
              <Store size={40} />
              <p className="text-xs">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(c => (
              <div key={c.id} className="bg-card border border-line rounded-lg p-3 flex gap-2.5 items-center">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-ink truncate">{c.item.name}</h4>
                  {c.selectedVariant && (
                    <span className="inline-block px-1.5 py-0.5 bg-gold-soft text-gold text-[9px] font-bold rounded mt-0.5 uppercase tracking-wider">
                      {c.selectedVariant.name}
                    </span>
                  )}
                  <p className="text-gold font-mono text-xs font-bold mt-0.5">Rp {c.item.price.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-line rounded-lg overflow-hidden h-8">
                    <button onClick={() => updateQty(c.id, -1)} className="w-8 h-full flex items-center justify-center bg-stat hover:bg-line text-ink">
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-ink font-mono">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="w-8 h-full flex items-center justify-center bg-stat hover:bg-line text-ink">
                      <Plus size={13} />
                    </button>
                  </div>
                  <button onClick={() => removeCartItem(c.id)} className="text-red/50 hover:text-red p-1.5">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations & Payment */}
        <div className="border-t border-line p-4 bg-card space-y-3.5">
          
          {/* Customer Source Section */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-side-text uppercase tracking-wider">Sumber Pelanggan</label>
            <select 
              value={customerSource}
              onChange={(e) => setCustomerSource(e.target.value)}
              className="w-full bg-stat border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-gold"
            >
              {CUSTOMER_SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-side-text">
              <span>Subtotal</span>
              <span className="font-mono text-ink font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between items-center text-side-text">
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-ink" onClick={() => setShippingCost(shippingCost === 0 ? 10000 : 0)}>
                <Truck size={13} />
                <span>Ongkir (Opsional)</span>
              </div>
              <span className="font-mono text-ink font-bold">Rp {shippingCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="h-px bg-line w-full" />

          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-ink">Total Tagihan</span>
            <span className="text-xl font-mono font-bold text-green">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button 
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 transition-all text-xs ${paymentMethod === 'CASH' ? 'border-gold bg-gold-soft text-gold font-bold' : 'border-line text-side-text hover:bg-stat'}`}
            >
              CASH
            </button>
            <button 
              onClick={() => setPaymentMethod('BANK')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 transition-all text-xs ${paymentMethod === 'BANK' ? 'border-gold bg-gold-soft text-gold font-bold' : 'border-line text-side-text hover:bg-stat'}`}
            >
              BANK / QRIS
            </button>
          </div>

          {/* Checkout Button */}
          <button 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
              cart.length === 0 ? 'bg-line cursor-not-allowed' : 'bg-gold hover:bg-[#A38225]'
            }`}
          >
            BAYAR SEKARANG
          </button>
        </div>
      </div>

      {/* START SHIFT MODAL (SABTU / MINGGU) */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl p-5 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-gold-soft text-gold flex items-center justify-center mb-3">
              <Store size={20} />
            </div>
            <h3 className="font-serif font-bold text-lg text-ink mb-1">Mulai Shift Stan (Akhir Pekan)</h3>
            <p className="text-xs text-side-text mb-4 leading-relaxed">
              Hari ini adalah hari operasional stan Anda. Silakan masukkan modal awal uang tunai (cash) di laci kasir:
            </p>
            <form onSubmit={handleConfirmStartShift} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">NOMINAL MODAL CASH HARI INI</label>
                <input 
                  type="number"
                  required
                  placeholder="Contoh: 150000"
                  value={openingCash || ''}
                  onChange={(e) => setOpeningCash(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-ink outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowStartShiftModal(false)}
                  className="w-1/2 py-2.5 border border-line rounded-xl text-xs font-bold text-side-text hover:bg-stat"
                >
                  Nanti Saja
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-gold hover:bg-[#A38225] text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Buka Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* END SHIFT MODAL 3-BAGIAN SESUAI PERMINTAAN */}
      {showEndShiftModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-line rounded-2xl w-full max-w-2xl shadow-xl p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-line mb-4">
              <div>
                <span className="text-[9px] font-bold text-gold uppercase tracking-wider">FORM REKONSILIASI KASIR AKHIR PEKAN</span>
                <h3 className="font-serif font-bold text-lg text-ink">Tutup Shift Kasir (End Shift)</h3>
              </div>
              <button onClick={() => setShowEndShiftModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleConfirmEndShift} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* BAGIAN KIRI: MODAL AWAL - PENDAPATAN CASH - PENGELUARAN - TOTAL CASH - SELISIH CASH */}
                <div className="bg-stat border border-line rounded-xl p-4 space-y-3">
                  <h4 className="font-serif font-bold text-xs text-ink uppercase tracking-wider border-b border-line pb-1.5">
                    1. Rekonsiliasi Kas Tunai (Cash)
                  </h4>
                  
                  <div>
                    <label className="text-[10px] text-side-text uppercase block">Modal Awal</label>
                    <div className="font-mono font-bold text-xs text-ink">Rp {openingCash.toLocaleString('id-ID')}</div>
                  </div>

                  <div>
                    <label className="text-[10px] text-side-text uppercase block">Pendapatan Cash (Sistem)</label>
                    <div className="font-mono font-bold text-xs text-green">Rp {sessionCashIncome.toLocaleString('id-ID')}</div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Pengeluaran Lain-Lain (Rp)</label>
                    <input 
                      type="number"
                      value={otherExpenses || ''}
                      onChange={(e) => setOtherExpenses(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-red outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Total Cash Sebenarnya di Laci (Rp)</label>
                    <input 
                      type="number"
                      required
                      value={actualTotalCash || ''}
                      onChange={(e) => setActualTotalCash(Number(e.target.value))}
                      placeholder="Hitung uang fisik..."
                      className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                    />
                  </div>

                  <div className="bg-card border border-line rounded-lg p-2.5 text-xs">
                    <span className="text-[10px] text-side-text block">Selisih Cash Fisik vs Sistem</span>
                    <span className={`font-mono font-bold text-sm ${diffCash === 0 ? 'text-green' : 'text-red'}`}>
                      {diffCash === 0 ? 'Rp 0 (Cocok)' : `Rp ${diffCash.toLocaleString('id-ID')}`}
                    </span>
                    <p className="text-[9px] text-side-text mt-0.5">Rumus: ((Modal Awal + Pendapatan Cash - Pengeluaran) - Total Cash Sebenarnya)</p>
                  </div>
                </div>

                {/* BAGIAN KANAN: PENDAPATAN TF - PENDAPATAN QRIS - TOTAL PENDAPATAN BANK */}
                <div className="bg-stat border border-line rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-xs text-ink uppercase tracking-wider border-b border-line pb-1.5 mb-3">
                      2. Pendapatan Non-Tunai (Bank)
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Pendapatan Transfer Bank (Rp)</label>
                        <input 
                          type="number"
                          value={revenueTF || ''}
                          onChange={(e) => setRevenueTF(Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Pendapatan QRIS (Rp)</label>
                        <input 
                          type="number"
                          value={revenueQRIS || ''}
                          onChange={(e) => setRevenueQRIS(Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-line rounded-lg p-2.5 text-xs">
                    <span className="text-[10px] text-side-text block">Total Pendapatan Bank</span>
                    <span className="font-mono font-bold text-sm text-gold">
                      Rp {totalBankIncome.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

              </div>

              {/* BAGIAN BAWAH: TOTAL PENDAPATAN HARIAN */}
              <div className="bg-gold-soft border border-chip-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
                    3. TOTAL PENDAPATAN HARIAN (OMZET STAN)
                  </span>
                  <div className="font-mono font-bold text-xl text-ink">
                    Rp {totalDailyRevenue.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setShowEndShiftModal(false)}
                    className="px-4 py-2 border border-line rounded-lg text-xs font-bold text-side-text hover:bg-stat"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-xs shadow-xs"
                  >
                    Simpan & Tutup Shift
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SALES HISTORY & HARD DELETE MODAL */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-line rounded-2xl w-full max-w-3xl shadow-2xl p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-line mb-4">
              <div>
                <span className="text-[10px] font-bold text-red uppercase tracking-wider bg-red/10 px-2 py-0.5 rounded-full border border-red/20">
                  HARD DELETE & RIWAYAT PENJUALAN
                </span>
                <h3 className="font-serif font-bold text-lg text-ink mt-1">Riwayat Nota Transaksi POS</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadDbSales}
                  disabled={isLoadingSales}
                  className="p-2 border border-line rounded-lg text-side-text hover:text-ink hover:bg-stat transition-colors"
                  title="Muat Ulang Transaksi"
                >
                  <RefreshCw size={16} className={isLoadingSales ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowSalesHistoryModal(false)} className="p-2 border border-line rounded-lg text-side-text hover:text-ink hover:bg-stat transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Database Sales Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Nota Tersimpan di Server / Database ({dbSales.length})
                  </h4>
                  <span className="text-[10px] text-side-text">Klik ikon sampah merah untuk Hard Delete</span>
                </div>

                <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">No Nota / ID</th>
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3">Item Menu Terjual</th>
                        <th className="py-2.5 px-3">Metode</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dbSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-side-text italic">
                            Belum ada riwayat transaksi penjualan di database.
                          </td>
                        </tr>
                      ) : (
                        dbSales.map(sale => (
                          <tr key={sale.id} className="hover:bg-stat/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-gold">
                              {sale.saleCode || `#${sale.id}`}
                            </td>
                            <td className="py-2.5 px-3 text-side-text text-[11px]">
                              {sale.deviceCreatedAt ? new Date(sale.deviceCreatedAt).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-ink max-w-[200px]">
                              {sale.items && sale.items.length > 0 ? (
                                <div className="space-y-0.5">
                                  {sale.items.map(it => (
                                    <div key={it.id} className="text-[11px] truncate">
                                      <span className="font-bold text-ink">{it.qty}x</span> {it.itemName}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-side-text italic">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-line/60 text-ink">
                                {sale.paymentMethod || sale.paymentChannel || 'CASH'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-right text-green">
                              Rp {Number(sale.totalAmountRupiah || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteDbSale(sale.id)}
                                className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                                title="Hapus Permanen Nota Ini"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Offline Outbox Section */}
              {outbox.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Antrean Outbox Perangkat ({outbox.length})
                    </h4>
                  </div>
                  <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">ID Nota</th>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3 text-center">Item</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {outbox.map(t => (
                          <tr key={t.id} className="hover:bg-stat/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-gold">{t.id}</td>
                            <td className="py-2.5 px-3 text-side-text">{t.waktu}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-ink">{t.itemsCount}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-right text-green">Rp {t.total.toLocaleString('id-ID')}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.status === 'SYNCED' ? 'bg-green/10 text-green' : 'bg-gold/10 text-gold'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteOutbox(t.id)}
                                className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                                title="Hapus dari Outbox"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-line mt-4 flex justify-end">
              <button 
                onClick={() => setShowSalesHistoryModal(false)}
                className="px-4 py-2 bg-surface border border-line hover:bg-stat text-xs font-bold text-ink rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
