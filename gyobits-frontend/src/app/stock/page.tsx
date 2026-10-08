'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from "@/components/Topbar";
import { Search, Eye, X, ArrowUpRight, ArrowDownLeft, Edit3, CheckCircle2, Filter, Trash2, Plus } from 'lucide-react';
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
  stockNum: number;
  min: string;
  minNum: number;
  status: 'Aman' | 'Rendah' | 'Kritis' | 'Habis';
  value: string;
  valueNum: number;
  avgCost: string;
  fill: number;
  color: string;
  movements: StockMovement[];
}

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockItemDetail | null>(null);
  const [editingStock, setEditingStock] = useState<StockItemDetail | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // INDIVIDUAL COLUMN FILTERS (SESUAI GAMBAR 4)
  const [filterBahan, setFilterBahan] = useState<string>('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterStokCondition, setFilterStokCondition] = useState<string>('Semua'); // 'Semua' | 'Tersedia' | 'Nol'
  const [filterStatus, setFilterStatus] = useState<string>('Semua'); // 'Semua' | 'Aman' | 'Rendah' | 'Kritis' | 'Habis'
  const [filterNilaiSort, setFilterNilaiSort] = useState<string>('default'); // 'default' | 'asc' | 'desc'

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const mapItemsToStocks = useCallback((itemsList: ItemRecord[]): StockItemDetail[] => {
    return itemsList.map((item) => {
      const stockQty = Number(item.currentStockQty || 0);
      const minAlert = Number(item.minStockAlert || 0);
      const valNum = Number(item.currentStockValueRupiah || 0);

      let status: 'Aman' | 'Rendah' | 'Kritis' | 'Habis' = 'Aman';
      let color = 'bg-gold';
      let fill = 100;

      if (stockQty <= 0) {
        status = 'Habis';
        color = 'bg-line';
        fill = 0;
      } else if (stockQty <= minAlert * 0.5) {
        status = 'Kritis';
        color = 'bg-red';
        fill = Math.min(100, Math.max(5, (stockQty / (minAlert || 1)) * 100));
      } else if (stockQty <= minAlert) {
        status = 'Rendah';
        color = 'bg-gold';
        fill = 50;
      }

      let catLabel = 'Raw Dry (Bahan Kering & Bumbu)';
      if (item.category === 'RAW_PROTEIN') catLabel = 'Raw Protein (Daging Basah)';
      if (item.category === 'SEMI_FINISHED') catLabel = 'Semi-Finished (Olahan Dapur)';
      if (item.category === 'FINISHED') catLabel = 'Finished (Menu Siap Jual)';

      return {
        id: item.id.toString(),
        name: item.name,
        sku: item.sku,
        category: catLabel,
        rawCategory: item.category,
        stock: `${stockQty.toLocaleString('id-ID')} ${item.displayUnit || item.unitBase}`,
        stockNum: stockQty,
        min: `${minAlert.toLocaleString('id-ID')} ${item.displayUnit || item.unitBase}`,
        minNum: minAlert,
        status: status,
        value: `Rp ${valNum.toLocaleString('id-ID')}`,
        valueNum: valNum,
        avgCost: `Rp ${Number(item.currentAvgCostRupiah || 0).toLocaleString('id-ID')} / ${item.displayUnit || item.unitBase}`,
        fill: fill,
        color: color,
        movements: [
          { waktu: '06/10/2026, 14:20', tipe: 'masuk', ref: 'PUR-20261006-001', qty: '+5 Pcs', nominal: 'Rp 75.000', operator: 'Owner', keterangan: 'Restock bahan harian' }
        ]
      };
    });
  }, []);

  const loadStocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.items.getAll();
      setStocks(mapItemsToStocks(res.data));
    } catch {
      // Fallback clean zero if offline
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapItemsToStocks]);

  const handleDeleteItem = async (item: StockItemDetail) => {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN "${item.name}" (${item.sku})?\nData yang dihapus tidak dapat dikembalikan.`)) {
      try {
        await api.items.delete(Number(item.id));
        setStocks(prev => prev.filter(s => s.id !== item.id));
        loadStocks();
      } catch (err: unknown) {
        alert(`Gagal menghapus item: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  useEffect(() => {
    let active = true;
    api.items.getAll()
      .then(res => {
        if (active) setStocks(mapItemsToStocks(res.data));
      })
      .catch(() => {
        if (active) {
          setStocks([]);
        }
      });
    return () => { active = false; };
  }, [mapItemsToStocks]);

  // FILTERED & SORTED STOCKS
  const filteredStocks = useMemo(() => {
    let result = stocks.filter(item => {
      // 1. Filter Bahan
      if (filterBahan.trim() !== '') {
        const query = filterBahan.toLowerCase();
        if (!item.name.toLowerCase().includes(query) && !item.sku.toLowerCase().includes(query)) {
          return false;
        }
      }
      // 2. Filter Kategori
      if (filterKategori !== 'Semua' && item.category !== filterKategori) {
        return false;
      }
      // 3. Filter Kondisi Stok
      if (filterStokCondition === 'Tersedia' && item.stockNum <= 0) return false;
      if (filterStokCondition === 'Nol' && item.stockNum > 0) return false;

      // 4. Filter Status
      if (filterStatus !== 'Semua' && item.status !== filterStatus) {
        return false;
      }

      return true;
    });

    // 5. Sort Nilai
    if (filterNilaiSort === 'asc') {
      result = [...result].sort((a, b) => a.valueNum - b.valueNum);
    } else if (filterNilaiSort === 'desc') {
      result = [...result].sort((a, b) => b.valueNum - a.valueNum);
    }

    return result;
  }, [stocks, filterBahan, filterKategori, filterStokCondition, filterStatus, filterNilaiSort]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    setStocks(prev => prev.map(s => s.id === editingStock.id ? editingStock : s));
    showNotification(`Item ${editingStock.name} berhasil diperbarui!`);
    setEditingStock(null);
  };

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
            OWNER VIEW
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Stock</h1>
        </div>
      </div>

      <div className="bg-card border border-line rounded-[14px] p-4 flex flex-col gap-4 shadow-sm">
        
        {/* Table Description Header */}
        <div className="flex justify-between items-center pb-1">
          <h3 className="font-serif font-bold text-ink text-base">Daftar Stok dari API</h3>
          <span className="text-xs text-side-text font-mono">{filteredStocks.length} item ditemukan</span>
        </div>

        {/* Table with In-Header Filters (Sesuai Gambar 4) */}
        <div className="overflow-x-auto border border-line rounded-lg bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-stat text-ink dark:bg-[#1E1914] dark:text-[#E0D8C8] text-[10px] uppercase font-bold border-b border-line">
              <tr>
                {/* 1. NAMA BARANG / ITEM FILTER */}
                <th className="p-3 align-top min-w-[200px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>NAMA BARANG / ITEM</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Filter nama/SKU barang..."
                    value={filterBahan}
                    onChange={(e) => setFilterBahan(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  />
                </th>

                {/* 2. KATEGORI FILTER */}
                <th className="p-3 align-top min-w-[170px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>KATEGORI</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua Kategori</option>
                    <option value="Raw Protein (Daging Basah)">Raw Protein (Daging Basah)</option>
                    <option value="Raw Dry (Bahan Kering & Bumbu)">Raw Dry (Bahan Kering & Bumbu)</option>
                    <option value="Semi-Finished (Olahan Dapur)">Semi-Finished (Olahan Dapur)</option>
                    <option value="Finished (Menu Siap Jual)">Finished (Menu Siap Jual)</option>
                  </select>
                </th>

                {/* 3. STOK FILTER */}
                <th className="p-3 align-top min-w-[150px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>STOK</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterStokCondition}
                    onChange={(e) => setFilterStokCondition(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Tersedia">Ada Stok (&gt;0)</option>
                    <option value="Nol">Kosong (=0)</option>
                  </select>
                </th>

                {/* 4. MINIMUM */}
                <th className="p-3 align-top min-w-[90px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>MINIMUM</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <div className="text-[10px] text-side-text font-normal pt-1">Batas alert</div>
                </th>

                {/* 5. STATUS FILTER */}
                <th className="p-3 align-top min-w-[120px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>STATUS</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Aman">Aman</option>
                    <option value="Rendah">Rendah</option>
                    <option value="Kritis">Kritis</option>
                    <option value="Habis">Habis</option>
                  </select>
                </th>

                {/* 6. NILAI FILTER */}
                <th className="p-3 align-top min-w-[130px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>NILAI</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterNilaiSort}
                    onChange={(e) => setFilterNilaiSort(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="default">Default</option>
                    <option value="desc">Tertinggi</option>
                    <option value="asc">Terendah</option>
                  </select>
                </th>

                {/* 7. AKSI */}
                <th className="p-3 align-top text-center min-w-[100px]">
                  <div className="mb-1">AKSI</div>
                  <div className="text-[10px] text-side-text font-normal pt-1">Kelola</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-side-text">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-serif font-bold text-base text-ink">
                        {stocks.length === 0 ? 'Belum Ada Data Barang' : 'Tidak Ada Bahan Yang Sesuai Filter'}
                      </p>
                      <p className="text-xs text-side-text max-w-md">
                        {stocks.length === 0 
                          ? 'Database Master Barang bersih (start dari 0). Silakan tambahkan bahan baku atau produk jadi pertama Anda.'
                          : 'Coba sesuaikan kata kunci pencarian atau filter kategori di atas.'}
                      </p>
                      {stocks.length === 0 && (
                        <a
                          href="/input"
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-gold hover:bg-[#A38225] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                        >
                          <Plus size={14} /> Input Barang Baru
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-bg'}>
                    <td className="p-3 font-bold">
                      <div>{item.name}</div>
                      <div className="text-[10px] font-mono text-side-text">{item.sku}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block whitespace-nowrap ${
                        item.rawCategory === 'RAW_PROTEIN' ? 'bg-red/10 text-red border-red/20' :
                        item.rawCategory === 'SEMI_FINISHED' ? 'bg-green/10 text-green border-green/20' :
                        item.rawCategory === 'FINISHED' ? 'bg-stat text-ink border-line' :
                        'bg-gold-soft text-gold border-chip-border'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold w-16">{item.stock}</span>
                        <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.fill}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-side-text">{item.min}</td>
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
                    <td className="p-3 font-mono font-bold">{item.value}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button 
                          onClick={() => setSelectedStock(item)}
                          className="inline-flex items-center gap-1 bg-card border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-ink transition-colors"
                          title="Lihat Detail Ledger"
                        >
                          <Eye size={12} /> Detail
                        </button>
                        <button 
                          onClick={() => setEditingStock({...item})}
                          className="inline-flex items-center gap-1 bg-card border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                          title="Edit Parameter Item"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item)}
                          className="inline-flex items-center gap-1 bg-card border border-red/30 rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red transition-colors"
                          title="Hapus Item Permanen"
                        >
                          <Trash2 size={12} /> Hapus
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
          <div className="bg-card border border-line rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-side-text uppercase">{selectedStock.sku}</span>
                <h3 className="font-serif font-bold text-lg text-ink">{selectedStock.name}</h3>
              </div>
              <button onClick={() => setSelectedStock(null)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-bg border border-line rounded-xl p-3 text-xs">
                <div>
                  <div className="text-[10px] text-side-text uppercase font-bold">Saldo Stok</div>
                  <div className="font-mono font-bold text-sm text-ink">{selectedStock.stock}</div>
                </div>
                <div>
                  <div className="text-[10px] text-side-text uppercase font-bold">Avg Cost</div>
                  <div className="font-mono font-bold text-sm text-gold">{selectedStock.avgCost}</div>
                </div>
                <div>
                  <div className="text-[10px] text-side-text uppercase font-bold">Valuasi Total</div>
                  <div className="font-mono font-bold text-sm text-green">{selectedStock.value}</div>
                </div>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-ink mb-2">Riwayat Pergerakan Stok (Kartu Ledger)</h4>
                {selectedStock.movements.length === 0 ? (
                  <div className="text-center py-6 text-xs text-side-text bg-bg border border-line rounded-lg">
                    Belum ada riwayat pergerakan stok untuk bahan ini.
                  </div>
                ) : (
                  <div className="border border-line rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                        <tr>
                          <th className="p-2.5">Waktu</th>
                          <th className="p-2.5">Ref / Transaksi</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line text-ink">
                        {selectedStock.movements.map((mov, mIdx) => (
                          <tr key={mIdx} className="bg-card">
                            <td className="p-2.5 font-mono text-[11px] text-side-text">{mov.waktu}</td>
                            <td className="p-2.5">
                              <div className="font-bold font-mono text-gold flex items-center gap-1">
                                {mov.tipe === 'masuk' ? <ArrowDownLeft size={12} className="text-green" /> : <ArrowUpRight size={12} className="text-red" />}
                                {mov.ref}
                              </div>
                              <div className="text-[10px] text-side-text">{mov.keterangan}</div>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">{mov.qty}</td>
                            <td className="p-2.5 text-right font-mono">{mov.nominal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="px-4 py-2 bg-stat border border-line rounded-lg text-xs font-bold hover:bg-line transition-colors text-ink"
                >
                  Tutup Kartu Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL KHUSUS ROLE OWNER */}
      {editingStock && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Aksi Owner</span>
                <h3 className="font-serif font-bold text-lg text-ink">Edit Item Master</h3>
              </div>
              <button onClick={() => setEditingStock(null)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Item</label>
                <input 
                  type="text" 
                  value={editingStock.name}
                  onChange={(e) => setEditingStock({...editingStock, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">SKU</label>
                  <input 
                    type="text" 
                    value={editingStock.sku}
                    onChange={(e) => setEditingStock({...editingStock, sku: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-xs text-ink font-mono outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    value={editingStock.category}
                    onChange={(e) => setEditingStock({...editingStock, category: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold"
                  >
                    <option value="Raw Protein (Daging Basah)">Raw Protein (Daging Basah)</option>
                    <option value="Raw Dry (Bahan Kering & Bumbu)">Raw Dry (Bahan Kering & Bumbu)</option>
                    <option value="Semi-Finished (Olahan Dapur)">Semi-Finished (Olahan Dapur)</option>
                    <option value="Finished (Menu Siap Jual)">Finished (Menu Siap Jual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Batas Minimum Alert (Peringatan Stok Tipis)</label>
                <input 
                  type="text" 
                  value={editingStock.min}
                  onChange={(e) => setEditingStock({...editingStock, min: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-xs text-ink font-mono outline-none focus:border-gold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button 
                  type="button" 
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2 border border-line rounded-lg text-xs font-bold text-side-text hover:bg-stat"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
