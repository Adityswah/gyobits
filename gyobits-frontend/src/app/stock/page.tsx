'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Search, Eye, X, ArrowUpRight, ArrowDownLeft, Edit3, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, ItemRecord } from '@/lib/api';

interface StockMovement {
  waktu: string;
  tipe: 'masuk' | 'keluar';
  ref: string;
  qty: string;
  nominal: string;
  operator: string;
  keterangan: string;
}

interface StockItemDetail {
  id: string;
  name: string;
  sku: string;
  category: string;
  rawCategory: string;
  stock: string;
  min: string;
  status: string;
  value: string;
  avgCost: string;
  fill: number;
  color: string;
  movements: StockMovement[];
}

function mapCategory(cat: string): string {
  switch (cat) {
    case 'RAW_PROTEIN': return 'Protein';
    case 'RAW_DRY': return 'Bahan';
    case 'SEMI_FINISHED': return 'Bahan Jadi';
    case 'FINISHED': return 'Menu Kasir';
    default: return cat;
  }
}

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [selectedStock, setSelectedStock] = useState<StockItemDetail | null>(null);
  const [editingStock, setEditingStock] = useState<StockItemDetail | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const mapItemsToStocks = useCallback((itemsList: ItemRecord[]): StockItemDetail[] => {
    return itemsList.map((item) => {
      const stockQty = Number(item.currentStockQty || 0);
      const minAlert = Number(item.minStockAlert || 0);
      const stockVal = Number(item.currentStockValueRupiah || 0);
      const avgCost = Number(item.currentAvgCostRupiah || 0);
      const unit = item.displayUnit || item.unitBase || 'Pcs';

      let status = 'Aman';
      let color = 'bg-green';
      if (stockQty <= 0) {
        status = 'Habis';
        color = 'bg-line';
      } else if (stockQty <= minAlert) {
        status = 'Kritis';
        color = 'bg-red';
      }

      const benchmark = minAlert > 0 ? minAlert * 2 : 100;
      const fill = Math.min(100, Math.max(5, Math.round((stockQty / benchmark) * 100)));

      return {
        id: item.id.toString(),
        name: item.name,
        sku: item.sku,
        category: mapCategory(item.category),
        rawCategory: item.category,
        stock: `${stockQty.toLocaleString('id-ID')} ${unit}`,
        min: `${minAlert.toLocaleString('id-ID')} ${unit}`,
        status,
        value: `Rp ${stockVal.toLocaleString('id-ID')}`,
        avgCost: `Rp ${avgCost.toLocaleString('id-ID')} / ${unit}`,
        fill: stockQty <= 0 ? 0 : fill,
        color,
        movements: [
          {
            waktu: new Date(item.updatedAt || item.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            tipe: stockQty > 0 ? 'masuk' : 'keluar',
            ref: `SALDO-${item.sku}`,
            qty: `${stockQty} ${unit}`,
            nominal: `Rp ${stockVal.toLocaleString('id-ID')}`,
            operator: 'Sistem Stokara',
            keterangan: 'Pencatatan Saldo Bergerak Ledger',
          }
        ],
      };
    });
  }, []);

  const loadItems = useCallback(() => {
    setIsLoading(true);
    api.items.getAll()
      .then((res) => {
        setStocks(mapItemsToStocks(res.data || []));
      })
      .catch((err) => {
        console.error('Failed to load items:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [mapItemsToStocks]);

  useEffect(() => {
    let active = true;
    api.items.getAll()
      .then((res) => {
        if (active) {
          setStocks(mapItemsToStocks(res.data || []));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load items:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mapItemsToStocks]);

  const filteredStocks = stocks.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'Semua' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    setStocks(prev => prev.map(s => s.id === editingStock.id ? editingStock : s));
    showNotification(`Item ${editingStock.name} berhasil disimpan!`);
    setEditingStock(null);
  };

  const totalSku = stocks.length;
  const totalKritis = stocks.filter(s => s.status === 'Kritis').length;
  const totalHabis = stocks.filter(s => s.status === 'Habis').length;
  const totalNilai = stocks.reduce((acc, s) => {
    const num = parseInt(s.value.replace(/[^0-9]/g, ''), 10) || 0;
    return acc + num;
  }, 0);

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans relative">
      <Topbar />

      {/* Floating Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 bg-green text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            OPERASIONAL & AUDIT
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Penyimpanan & Manajemen Stok</h1>
        </div>
        <button
          onClick={loadItems}
          disabled={isLoading}
          className="bg-card border border-line text-ink hover:bg-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Perbarui Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
          <div className="text-[10px] text-side-text uppercase font-bold tracking-wider mb-1">Total SKU</div>
          <div className="font-mono text-2xl font-bold text-ink">{totalSku}</div>
          <div className="text-[11px] text-side-text mt-1">Item terdaftar di sistem</div>
        </div>
        <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
          <div className="text-[10px] text-side-text uppercase font-bold tracking-wider mb-1">Stok Kritis</div>
          <div className="font-mono text-2xl font-bold text-red">{totalKritis}</div>
          <div className="text-[11px] text-side-text mt-1">Perlu segera restock</div>
        </div>
        <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
          <div className="text-[10px] text-side-text uppercase font-bold tracking-wider mb-1">Stok Habis</div>
          <div className="font-mono text-2xl font-bold text-side-text">{totalHabis}</div>
          <div className="text-[11px] text-side-text mt-1">Saldo unit nol</div>
        </div>
        <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
          <div className="text-[10px] text-side-text uppercase font-bold tracking-wider mb-1">Total Valuasi</div>
          <div className="font-mono text-2xl font-bold text-green">Rp {totalNilai.toLocaleString('id-ID')}</div>
          <div className="text-[11px] text-side-text mt-1">Nilai aset di gudang</div>
        </div>
      </div>

      <div className="bg-card border border-line rounded-[14px] p-4 flex flex-col gap-4 shadow-sm">
        
        {/* Header Action */}
        <div className="flex justify-between items-center pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-ink text-base">Daftar Bahan & Menu</h3>
            {isLoading && <span className="text-xs text-side-text">(Memuat data...)</span>}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-side-text" size={14} />
              <input 
                type="text" 
                placeholder="Cari bahan atau SKU..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 bg-bg border border-line rounded-lg text-xs outline-none focus:border-gold w-56 text-ink"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-bg border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Protein">Protein</option>
              <option value="Bahan">Bahan Baku</option>
              <option value="Bahan Jadi">Bahan Jadi</option>
              <option value="Menu Kasir">Menu Kasir</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
              <tr>
                <th className="p-3">BAHAN / SKU</th>
                <th className="p-3">KATEGORI</th>
                <th className="p-3 w-48">STOK FISIK</th>
                <th className="p-3">MINIMUM</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">VALUASI</th>
                <th className="p-3 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-side-text">
                    {isLoading ? "Mengambil data stok dari server..." : "Tidak ada item yang sesuai dengan kriteria pencarian"}
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-bg'}>
                    <td className="p-3">
                      <div className="font-bold text-ink">{item.name}</div>
                      <div className="text-[10px] font-mono text-side-text">{item.sku}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-gold-soft border border-chip-border text-gold px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold w-20">{item.stock}</span>
                        <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.fill}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono">{item.min}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Aman' ? 'bg-green/10 text-green' :
                        item.status === 'Habis' ? 'bg-red/10 text-red opacity-70' :
                        item.status === 'Kritis' ? 'bg-red/10 text-red' :
                        'bg-gold-soft text-gold'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold">{item.value}</div>
                      <div className="text-[10px] text-side-text font-mono">{item.avgCost}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button 
                          onClick={() => setSelectedStock(item)}
                          className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-ink transition-colors shadow-xs"
                          title="Lihat Ledger"
                        >
                          <Eye size={12} /> Detail
                        </button>
                        <button 
                          onClick={() => setEditingStock({...item})}
                          className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors shadow-xs"
                          title="Edit Item Master"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedStock && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-side-text uppercase">{selectedStock.sku}</span>
                <h3 className="font-serif font-bold text-lg text-ink">{selectedStock.name}</h3>
              </div>
              <button onClick={() => setSelectedStock(null)} className="p-1 hover:bg-line rounded-full text-side-text">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-bg p-3.5 rounded-xl border border-line">
                <div>
                  <span className="text-[10px] text-side-text uppercase block font-bold">Kategori Master</span>
                  <span className="font-bold text-sm text-ink">{selectedStock.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-side-text uppercase block font-bold">Status Stok</span>
                  <span className="font-mono font-bold text-sm text-ink">{selectedStock.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-side-text uppercase block font-bold">Saldo Fisik Tersedia</span>
                  <span className="font-mono font-bold text-sm text-ink">{selectedStock.stock}</span>
                </div>
                <div>
                  <span className="text-[10px] text-side-text uppercase block font-bold">Rata-Rata Biaya (HPP)</span>
                  <span className="font-mono font-bold text-sm text-green">{selectedStock.avgCost}</span>
                </div>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-ink mb-2">Riwayat Kartu Stok (Ledger)</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedStock.movements.length === 0 ? (
                    <div className="text-center py-6 text-side-text text-xs border border-dashed border-line rounded-lg">
                      Belum ada mutasi perpindahan stok
                    </div>
                  ) : (
                    selectedStock.movements.map((m, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-stat border border-line rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          {m.tipe === 'masuk' ? (
                            <ArrowDownLeft size={16} className="text-green" />
                          ) : (
                            <ArrowUpRight size={16} className="text-gold" />
                          )}
                          <div>
                            <div className="font-bold text-ink">{m.keterangan}</div>
                            <div className="text-[10px] text-side-text">{m.waktu} · {m.ref}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono font-bold ${m.tipe === 'masuk' ? 'text-green' : 'text-gold'}`}>
                            {m.qty}
                          </div>
                          <div className="text-[10px] text-side-text font-mono">{m.nominal}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-line bg-stat flex justify-end">
              <button 
                onClick={() => setSelectedStock(null)}
                className="px-4 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingStock && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-side-text uppercase">Edit Item</span>
                <h3 className="font-serif font-bold text-lg text-ink">{editingStock.name}</h3>
              </div>
              <button type="button" onClick={() => setEditingStock(null)} className="p-1 hover:bg-line rounded-full text-side-text">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Item</label>
                <input 
                  type="text" 
                  value={editingStock.name}
                  onChange={(e) => setEditingStock({...editingStock, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 outline-none focus:border-gold font-bold text-ink"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">SKU</label>
                <input 
                  type="text" 
                  value={editingStock.sku}
                  onChange={(e) => setEditingStock({...editingStock, sku: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 outline-none focus:border-gold font-mono text-ink"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Batas Minimum Alert</label>
                <input 
                  type="text" 
                  value={editingStock.min}
                  onChange={(e) => setEditingStock({...editingStock, min: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 outline-none focus:border-gold font-mono text-ink"
                />
              </div>
            </div>

            <div className="p-3.5 border-t border-line bg-stat flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setEditingStock(null)}
                className="px-4 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-gold hover:bg-[#A38225] text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
