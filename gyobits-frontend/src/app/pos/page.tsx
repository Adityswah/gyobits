'use client';
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Search, Plus, Minus, Trash2, Truck, ShoppingCart, Image as ImageIcon, X, History, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api, SaleSyncPayload } from '@/lib/api';

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

const GYOZA_VARIANTS: Variant[] = [
  { id: 'v1', name: 'Goreng' },
  { id: 'v2', name: 'Kukus' },
  { id: 'v3', name: 'Grill' },
  { id: 'v4', name: 'Mix' },
];

const DEFAULT_ITEMS: MenuItem[] = [
  { id: 8, name: 'Gyoza Isi 10', price: 35000, category: 'Gyoza', image: '/images/gyoza-10.jpg', variants: GYOZA_VARIANTS },
  { id: 9, name: 'Gyoza Isi 8', price: 28000, category: 'Gyoza', image: '/images/gyoza-8.jpg', variants: GYOZA_VARIANTS },
  { id: 10, name: 'Gyoza Isi 7', price: 25000, category: 'Gyoza', image: '/images/gyoza-7.jpg', variants: GYOZA_VARIANTS },
  { id: 11, name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: '/images/es-teh.jpg' },
  { id: 12, name: 'Chili Oil Ekstra', price: 3000, category: 'Ekstra', image: '/images/chili-oil.jpg' },
];

const CUSTOMER_SOURCES = ['Offline', 'WhatsApp', 'X (Twitter)', 'Threads', 'Lainnya'];

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

export default function POSPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_ITEMS);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const discount = 0;
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [customerSource, setCustomerSource] = useState('Offline');

  // Modal States
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<MenuItem | null>(null);
  const [showOutboxModal, setShowOutboxModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Outbox / Offline Queue State with lazy initialization from localStorage
  const [outbox, setOutbox] = useState<OutboxTransaction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stokara_pos_outbox');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        id: 'OFF-7F1C2A',
        offlineInvoiceId: '7f1c2a00-0000-4000-8000-000000000001',
        waktu: '11:42',
        total: 60000,
        itemsCount: 2,
        status: 'SYNCED',
        payload: {
          offline_invoice_id: '7f1c2a00-0000-4000-8000-000000000001',
          payment_method: 'CASH',
          items: [{ line_type: 'MENU', qty: 2, unit_price: 30000, item_name: 'Gyoza Isi 8' }]
        }
      }
    ];
  });

  // Shift State
  const [shiftOpen, setShiftOpen] = useState(true);
  const [modalCashInput, setModalCashInput] = useState('');

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  useEffect(() => {
    let active = true;
    api.items.getAll()
      .then((res) => {
        if (!active || !res.data) return;
        const sellable = res.data.filter((i) => {
          const price = Number(i.sellPriceRupiah || 0);
          return i.category === 'FINISHED' || price > 0;
        });

        if (sellable.length > 0) {
          const mapped: MenuItem[] = sellable.map((i) => {
            let cat = 'Gyoza';
            if (i.name.toLowerCase().includes('teh') || i.name.toLowerCase().includes('kopi')) cat = 'Minuman';
            else if (i.name.toLowerCase().includes('chili') || i.name.toLowerCase().includes('saus')) cat = 'Ekstra';

            return {
              id: i.id,
              name: i.name,
              price: Number(i.sellPriceRupiah) || 25000,
              category: cat,
              image: '/images/gyoza-10.jpg',
              variants: i.name.toLowerCase().includes('gyoza') ? GYOZA_VARIANTS : undefined,
            };
          });
          setMenuItems(mapped);
        }
      })
      .catch((err) => {
        console.warn('Using default menu items:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Save outbox to localStorage on change
  useEffect(() => {
    localStorage.setItem('stokara_pos_outbox', JSON.stringify(outbox));
  }, [outbox]);

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

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const invoiceUuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const shortId = `OFF-${invoiceUuid.slice(-6).toUpperCase()}`;

    const payload: SaleSyncPayload = {
      offline_invoice_id: invoiceUuid,
      device_id: 'DEVICE-POS-01',
      device_created_at: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_channel: paymentMethod,
      shipping_cost: Number(shippingCost) || 0,
      discount: Number(discount) || 0,
      items: cart.map(c => ({
        line_type: 'MENU',
        item_id: c.item.id,
        item_name: c.selectedVariant ? `${c.item.name} (${c.selectedVariant.name})` : c.item.name,
        qty: c.qty,
        unit_price: c.item.price,
        variant_name: c.selectedVariant?.name,
      })),
    };

    let status: 'PENDING' | 'SYNCED' = 'PENDING';

    if (isOnline) {
      try {
        await api.sales.sync(payload);
        status = 'SYNCED';
        showNotification(`Transaksi berhasil diproses & sinkron ke backend (${shortId})!`);
      } catch (err) {
        console.warn('Sync failed, queued locally:', err);
        status = 'PENDING';
        showNotification(`Tersimpan ke antrean offline (${shortId}).`);
      }
    } else {
      showNotification(`Transaksi disimpan offline (${shortId}).`);
    }

    const newTx: OutboxTransaction = {
      id: shortId,
      offlineInvoiceId: invoiceUuid,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      total: total,
      itemsCount: cart.reduce((a, c) => a + c.qty, 0),
      status,
      payload,
    };

    setOutbox(prev => [newTx, ...prev]);
    setCart([]);
    setShippingCost(0);
  };

  const handleSyncAll = async () => {
    const pending = outbox.filter(t => t.status === 'PENDING');
    if (pending.length === 0) {
      showNotification("Tidak ada transaksi antrean yang perlu disinkronkan.");
      return;
    }

    setIsSyncing(true);
    let successCount = 0;

    const updatedOutbox = [...outbox];

    for (const tx of pending) {
      try {
        await api.sales.sync(tx.payload);
        const index = updatedOutbox.findIndex(o => o.id === tx.id);
        if (index !== -1) {
          updatedOutbox[index] = { ...updatedOutbox[index], status: 'SYNCED' };
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to sync ${tx.id}:`, err);
      }
    }

    setOutbox(updatedOutbox);
    setIsSyncing(false);
    showNotification(`${successCount} dari ${pending.length} transaksi antrean berhasil disinkronkan!`);
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden relative font-sans">
      
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
            <div className="bg-white rounded-[14px] shadow-lg border border-line w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
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
                    className="py-4 bg-white border border-line rounded-xl font-bold text-ink hover:border-gold hover:bg-gold-soft transition-colors target-touch"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POS Header */}
        <div className="p-4 border-b border-line flex justify-between items-center bg-stat">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-serif font-bold text-ink">POS Terminal</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
              {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            {/* Shift Action Button */}
            <button 
              onClick={() => setShowShiftModal(true)}
              className="text-xs bg-white border border-line hover:bg-stat text-ink font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              Shift: {shiftOpen ? 'Buka' : 'Tutup'}
            </button>

            {/* Sync Queue Modal Button */}
            <button 
              onClick={() => setShowOutboxModal(true)}
              className="text-xs bg-gold-soft border border-chip-border text-gold font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <History size={14} /> Antrean ({outbox.filter(t => t.status === 'PENDING').length})
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-side-text" size={16} />
            <input 
              type="text" 
              placeholder="Cari menu..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm outline-none focus:border-gold w-64 text-ink"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex px-4 py-3 gap-2 overflow-x-auto hidden-scrollbar border-b border-line">
          {MENU_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-bold min-w-max transition-colors target-touch ${
                activeCategory === cat 
                  ? 'bg-gold text-white shadow-sm' 
                  : 'bg-white border border-line text-ink hover:bg-bg'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-bg">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => handleProductClick(item)}
              className="bg-card border border-line rounded-xl p-3 flex flex-col justify-between hover:border-gold transition-all cursor-pointer shadow-xs group target-touch"
            >
              <div className="w-full aspect-video bg-stat rounded-lg mb-3 flex items-center justify-center text-side-text group-hover:bg-gold-soft/50 transition-colors">
                <ImageIcon size={32} className="opacity-40" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">{item.category}</span>
                <h3 className="font-bold text-ink text-sm line-clamp-1">{item.name}</h3>
                <div className="font-mono font-bold text-green mt-1 text-sm">
                  Rp {item.price.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT: CART & CHECKOUT PANEL */}
      <div className="w-96 flex flex-col bg-card rounded-[14px] border border-line shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-gold" />
            <h2 className="font-serif font-bold text-base text-ink">Keranjang Pesanan</h2>
          </div>
          <span className="text-xs text-side-text font-mono font-bold">
            {cart.reduce((a, c) => a + c.qty, 0)} item
          </span>
        </div>

        {/* Customer Source Selection */}
        <div className="px-4 py-2.5 border-b border-line bg-bg flex items-center justify-between">
          <span className="text-xs text-side-text font-bold uppercase">Sumber Transaksi</span>
          <select 
            value={customerSource} 
            onChange={(e) => setCustomerSource(e.target.value)}
            className="bg-card border border-line rounded px-2 py-1 text-xs text-ink outline-none cursor-pointer"
          >
            {CUSTOMER_SOURCES.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-line">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-side-text gap-2">
              <ShoppingCart size={32} className="opacity-30" />
              <p className="text-xs">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(c => (
              <div key={c.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-xs text-ink leading-tight">{c.item.name}</div>
                  {c.selectedVariant && (
                    <div className="text-[10px] text-gold font-bold">Varian: {c.selectedVariant.name}</div>
                  )}
                  <div className="font-mono text-xs text-side-text mt-0.5">
                    Rp {c.item.price.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-line rounded-lg bg-bg overflow-hidden">
                    <button 
                      onClick={() => updateQty(c.id, -1)}
                      className="p-1 hover:bg-line text-ink target-touch"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-2 font-mono text-xs font-bold text-ink">{c.qty}</span>
                    <button 
                      onClick={() => updateQty(c.id, 1)}
                      className="p-1 hover:bg-line text-ink target-touch"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeCartItem(c.id)}
                    className="p-1 text-red/60 hover:text-red hover:bg-red/10 rounded target-touch"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Billing & Payment Section */}
        <div className="p-4 border-t border-line bg-stat flex flex-col gap-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-side-text">
              <span>Subtotal Menu</span>
              <span className="font-mono text-ink">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between items-center text-side-text">
              <span className="flex items-center gap-1"><Truck size={12} /> Ongkir</span>
              <input 
                type="number" 
                value={shippingCost || ''}
                placeholder="0"
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="w-20 bg-white border border-line rounded px-1.5 py-0.5 text-right font-mono text-ink text-xs outline-none focus:border-gold"
              />
            </div>

            <div className="flex justify-between font-bold text-sm text-ink pt-2 border-t border-line">
              <span>Total Tagihan</span>
              <span className="font-mono text-base text-green">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all target-touch ${
                paymentMethod === 'CASH'
                  ? 'border-gold bg-gold-soft text-gold shadow-xs'
                  : 'border-line bg-white text-ink hover:bg-bg'
              }`}
            >
              CASH (Tunai)
            </button>
            <button
              onClick={() => setPaymentMethod('BANK')}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all target-touch ${
                paymentMethod === 'BANK'
                  ? 'border-gold bg-gold-soft text-gold shadow-xs'
                  : 'border-line bg-white text-ink hover:bg-bg'
              }`}
            >
              BANK / QRIS
            </button>
          </div>

          {/* Primary Action Button */}
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md target-touch ${
              cart.length > 0 
                ? 'bg-gold hover:bg-[#A38225] text-white' 
                : 'bg-line text-side-text cursor-not-allowed'
            }`}
          >
            Bayar & Simpan Pesanan (Rp {total.toLocaleString('id-ID')})
          </button>
        </div>
      </div>

      {/* OUTBOX / SYNC QUEUE MODAL */}
      {showOutboxModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">Antrean Transaksi POS</h3>
                <p className="text-xs text-side-text">Daftar transaksi tersimpan di memori terminal</p>
              </div>
              <button onClick={() => setShowOutboxModal(false)} className="p-1 hover:bg-line rounded-full text-side-text">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {outbox.length === 0 ? (
                <div className="text-center py-8 text-side-text text-xs">Belum ada antrean transaksi</div>
              ) : (
                outbox.map(tx => (
                  <div key={tx.id} className="p-3 bg-stat border border-line rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{tx.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'SYNCED' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-side-text text-[11px] mt-0.5">{tx.waktu} · {tx.itemsCount} Menu item</div>
                    </div>
                    <div className="font-mono font-bold text-sm text-ink">
                      Rp {tx.total.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-line bg-stat flex justify-between items-center">
              <span className="text-xs text-side-text">
                {outbox.filter(t => t.status === 'PENDING').length} menunggu sinkronisasi
              </span>
              <button 
                onClick={handleSyncAll}
                disabled={isSyncing || outbox.filter(t => t.status === 'PENDING').length === 0}
                className="bg-gold hover:bg-[#A38225] disabled:bg-line disabled:text-side-text text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Menyinkronkan..." : "Sinkronkan Semua Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT OPEN/CLOSE MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-ink">
                {shiftOpen ? 'Tutup Shift Kasir' : 'Buka Shift Kasir'}
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="p-1 hover:bg-line rounded-full text-side-text">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-side-text font-bold block mb-1">
                  {shiftOpen ? 'Kas Fisik Terhitung Saat Ini (Closing)' : 'Kas Awal Laci (Modal Awal)'}
                </label>
                <input 
                  type="number"
                  placeholder="200000"
                  value={modalCashInput}
                  onChange={(e) => setModalCashInput(e.target.value)}
                  className="w-full bg-bg border border-line rounded-lg p-2.5 font-mono text-ink text-sm outline-none focus:border-gold"
                />
              </div>
              <p className="text-[11px] text-side-text leading-tight">
                {shiftOpen 
                  ? 'Menutup shift akan mengunci transaksi sesi ini dan menghitung selisih kas fisik vs sistem.'
                  : 'Membuka shift diperlukan sebelum mencatat transaksi kasir hari ini.'}
              </p>
            </div>

            <div className="p-4 border-t border-line bg-stat flex justify-end gap-2">
              <button 
                onClick={() => setShowShiftModal(false)}
                className="px-3 py-1.5 border border-line bg-white rounded-lg text-xs font-bold text-ink hover:bg-bg"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setShiftOpen(!shiftOpen);
                  setShowShiftModal(false);
                  setModalCashInput('');
                  showNotification(shiftOpen ? "Shift kasir berhasil ditutup!" : "Shift kasir berhasil dibuka!");
                }}
                className="px-4 py-1.5 bg-gold hover:bg-[#A38225] text-white rounded-lg text-xs font-bold"
              >
                {shiftOpen ? 'Konfirmasi Tutup Shift' : 'Buka Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
