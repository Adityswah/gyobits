'use client';
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Search, Plus, Minus, Trash2, Truck, CreditCard, Banknote, ShoppingCart, Image as ImageIcon, X, History, RefreshCw, CheckCircle2 } from 'lucide-react';

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

// Mock Data
const MENU_CATEGORIES = ['Semua', 'Gyoza', 'Minuman', 'Ekstra'];

const GYOZA_VARIANTS: Variant[] = [
  { id: 'v1', name: 'Goreng' },
  { id: 'v2', name: 'Kukus' },
  { id: 'v3', name: 'Grill' },
  { id: 'v4', name: 'Mix' },
];

const MOCK_ITEMS: MenuItem[] = [
  { id: 1, name: 'Gyoza Isi 10', price: 35000, category: 'Gyoza', image: '/images/gyoza-10.jpg', variants: GYOZA_VARIANTS },
  { id: 2, name: 'Gyoza Isi 8', price: 28000, category: 'Gyoza', image: '/images/gyoza-8.jpg', variants: GYOZA_VARIANTS },
  { id: 3, name: 'Gyoza Isi 7', price: 25000, category: 'Gyoza', image: '/images/gyoza-7.jpg', variants: GYOZA_VARIANTS },
  { id: 4, name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: '/images/es-teh.jpg' },
  { id: 5, name: 'Chili Oil Ekstra', price: 3000, category: 'Ekstra', image: '/images/chili-oil.jpg' },
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
  waktu: string;
  total: number;
  itemsCount: number;
  status: 'PENDING' | 'SYNCED';
}

export default function POSPage() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  
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

  // Outbox / Offline Queue State
  const [outbox, setOutbox] = useState<OutboxTransaction[]>([
    { id: 'OFF-7F1C2A', waktu: '11:42', total: 60000, itemsCount: 2, status: 'PENDING' },
    { id: 'OFF-3AB910', waktu: '11:55', total: 35000, itemsCount: 1, status: 'PENDING' },
  ]);

  // Shift State
  const [shiftOpen, setShiftOpen] = useState(true);
  const [modalCashInput, setModalCashInput] = useState('');

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

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

  const filteredItems = MOCK_ITEMS.filter(item => {
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

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const newTx: OutboxTransaction = {
      id: `OFF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      total: total,
      itemsCount: cart.reduce((a, c) => a + c.qty, 0),
      status: isOnline ? 'SYNCED' : 'PENDING'
    };

    setOutbox(prev => [newTx, ...prev]);
    setCart([]);
    setShippingCost(0);
    showNotification(`Transaksi berhasil disimpan (${newTx.id})!`);
  };

  const handleSyncAll = () => {
    setOutbox(prev => prev.map(tx => ({ ...tx, status: 'SYNCED' })));
    showNotification("Semua transaksi antrean berhasil disinkronkan ke server!");
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
                  : 'bg-white border border-line text-side-text hover:bg-stat'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleProductClick(item)}
                className="bg-white border border-line rounded-xl overflow-hidden flex flex-col hover:border-gold hover:shadow-sm transition-all active:scale-95 target-touch text-left group"
              >
                <div className="w-full h-32 bg-stat border-b border-line flex items-center justify-center relative overflow-hidden text-side-text group-hover:opacity-90">
                  <div className="flex flex-col items-center opacity-40">
                    <ImageIcon size={32} />
                    <span className="text-[10px] mt-2 font-mono">{item.image}</span>
                  </div>
                </div>
                
                <div className="p-3 w-full">
                  <h3 className="text-sm font-bold text-ink mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-gold font-mono font-bold text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-10 text-center text-side-text">
                Menu tidak ditemukan
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: CART */}
      <div className="w-[380px] shrink-0 bg-card rounded-[14px] border border-line shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-line bg-stat">
          <h2 className="font-serif font-bold text-lg text-ink flex justify-between items-center">
            Keranjang
            <span className="bg-ink text-white text-xs px-2 py-1 rounded-full font-sans">
              {cart.reduce((a,c) => a + c.qty, 0)} item
            </span>
          </h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-side-text space-y-2 opacity-50">
              <ShoppingCart size={48} />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(c => (
              <div key={c.id} className="bg-white border border-line rounded-lg p-3 flex gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-ink truncate">{c.item.name}</h4>
                  {c.selectedVariant && (
                    <span className="inline-block px-2 py-0.5 bg-gold-soft text-gold text-[10px] font-bold rounded mt-1 uppercase tracking-wider">
                      {c.selectedVariant.name}
                    </span>
                  )}
                  <p className="text-gold font-mono text-xs font-bold mt-1">Rp {c.item.price.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-line rounded-lg overflow-hidden h-9">
                    <button onClick={() => updateQty(c.id, -1)} className="w-9 h-full flex items-center justify-center bg-stat hover:bg-line text-ink target-touch">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-ink">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="w-9 h-full flex items-center justify-center bg-stat hover:bg-line text-ink target-touch">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeCartItem(c.id)} className="text-red/50 hover:text-red p-2 target-touch">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations & Payment */}
        <div className="border-t border-line p-4 bg-white space-y-4">
          
          {/* Customer Source Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-side-text uppercase tracking-wider">Sumber Pelanggan</label>
            <select 
              value={customerSource}
              onChange={(e) => setCustomerSource(e.target.value)}
              className="w-full bg-stat border border-line rounded-lg px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-gold"
            >
              {CUSTOMER_SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="h-px bg-line w-full" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-side-text">
              <span>Subtotal</span>
              <span className="font-mono text-ink font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between items-center text-side-text">
              <div className="flex items-center gap-2 cursor-pointer hover:text-ink" onClick={() => setShippingCost(shippingCost === 0 ? 10000 : 0)}>
                <Truck size={14} />
                <span>Ongkir (Opsional)</span>
              </div>
              <span className="font-mono text-ink font-bold">Rp {shippingCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="h-px bg-line w-full" />

          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-ink">Total Tagihan</span>
            <span className="text-2xl font-mono font-bold text-green">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all target-touch ${paymentMethod === 'CASH' ? 'border-gold bg-gold-soft text-gold font-bold' : 'border-line text-side-text hover:bg-stat'}`}
            >
              <Banknote size={18} />
              CASH
            </button>
            <button 
              onClick={() => setPaymentMethod('BANK')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all target-touch ${paymentMethod === 'BANK' ? 'border-gold bg-gold-soft text-gold font-bold' : 'border-line text-side-text hover:bg-stat'}`}
            >
              <CreditCard size={18} />
              BANK
            </button>
          </div>

          {/* Checkout Button */}
          <button 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 target-touch transition-transform active:scale-[0.98] ${
              cart.length === 0 ? 'bg-line cursor-not-allowed' : 'bg-gold hover:bg-[#A38225]'
            }`}
          >
            BAYAR SEKARANG
          </button>
        </div>
      </div>

      {/* MODAL: SINKRONISASI OFFLINE POS (PRD 5.7 & 10.7) */}
      {showOutboxModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green' : 'bg-red'}`} />
                <h3 className="font-serif font-bold text-lg text-ink">Sinkronisasi Offline POS</h3>
              </div>
              <button onClick={() => setShowOutboxModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs text-side-text">
                Daftar transaksi yang disimpan lokal di IndexedDB perangkat saat offline:
              </div>

              <div className="border border-line rounded-xl overflow-hidden divide-y divide-line text-xs">
                {outbox.map((tx) => (
                  <div key={tx.id} className="p-3 flex justify-between items-center bg-bg">
                    <div>
                      <div className="font-bold font-mono text-ink">{tx.id}</div>
                      <div className="text-[10px] text-side-text">{tx.waktu} · {tx.itemsCount} item</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-ink">Rp {tx.total.toLocaleString('id-ID')}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        tx.status === 'SYNCED' ? 'bg-green/10 text-green' : 'bg-gold-soft text-gold'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-side-text">
                  {outbox.filter(t => t.status === 'PENDING').length} transaksi pending
                </div>
                <button 
                  onClick={handleSyncAll}
                  className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Paksa Sinkronisasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHIFT KASIR (PRD 5.7 Buka/Tutup Shift) */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-ink">
                {shiftOpen ? 'Tutup Shift Kasir' : 'Buka Shift Kasir'}
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-side-text leading-relaxed">
                {shiftOpen 
                  ? 'Masukkan jumlah uang tunai fisik yang ada di laci kasir saat ini untuk rekonsiliasi akhir shift:'
                  : 'Masukkan kas awal (modal receh) sebelum memulai transaksi:'}
              </p>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">
                  {shiftOpen ? 'UANG TUNAI FISIK DI LACI (RP)' : 'MODAL KAS AWAL (RP)'}
                </label>
                <input 
                  type="number" 
                  placeholder="Contoh: 150000" 
                  value={modalCashInput}
                  onChange={(e) => setModalCashInput(e.target.value)}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-base font-bold font-mono text-ink outline-none focus:border-gold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button 
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 border border-line rounded-lg text-xs font-bold text-side-text hover:bg-stat"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setShiftOpen(!shiftOpen);
                    setShowShiftModal(false);
                    setModalCashInput('');
                    showNotification(shiftOpen ? "Shift kasir berhasil ditutup!" : "Shift kasir baru berhasil dibuka!");
                  }}
                  className="px-4 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  {shiftOpen ? 'Konfirmasi Tutup Shift' : 'Buka Shift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Base styles for target touch >= 48dp */}
      <style dangerouslySetInnerHTML={{__html: `
        .target-touch { min-height: 48px; min-width: 48px; }
      `}} />
    </div>
  );
}
