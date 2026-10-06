'use client';
import React, { useState } from 'react';
import Topbar from "@/components/Topbar";
import { Search, Eye, X, ArrowUpRight, ArrowDownLeft, Edit3, CheckCircle2 } from 'lucide-react';

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
  stock: string;
  min: string;
  status: string;
  value: string;
  avgCost: string;
  fill: number;
  color: string;
  movements: StockMovement[];
}

const initialStocks: StockItemDetail[] = [
  { 
    id: '1',
    name: 'Kecap Manis Indofood 700ml', 
    sku: 'ING-KCP-01',
    category: 'Bahan', 
    stock: '0.55 Pcs', 
    min: '4 Pcs', 
    status: 'Kritis', 
    value: 'Rp 12.650', 
    avgCost: 'Rp 23.000 / Pcs',
    fill: 15, 
    color: 'bg-red',
    movements: [
      { waktu: '06/10/2026, 14:20', tipe: 'keluar', ref: 'BCH-20261006-01', qty: '-0.2 Pcs', nominal: 'Rp 4.600', operator: 'Budi (Chef)', keterangan: 'Produksi Bumbu Gyoza' },
      { waktu: '05/10/2026, 09:15', tipe: 'masuk', ref: 'PUR-20261005-03', qty: '+1 Pcs', nominal: 'Rp 23.000', operator: 'Owner', keterangan: 'Restock Toko Sejahtera' },
    ]
  },
  { 
    id: '2',
    name: 'Gula Merah', 
    sku: 'ING-GLM-02',
    category: 'Bahan', 
    stock: '0 Kg', 
    min: '2 Kg', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 20.000 / Kg',
    fill: 0, 
    color: 'bg-line',
    movements: [
      { waktu: '04/10/2026, 11:00', tipe: 'keluar', ref: 'BCH-20261004-02', qty: '-0.5 Kg', nominal: 'Rp 10.000', operator: 'Budi (Chef)', keterangan: 'Produksi Batch Sambal' }
    ]
  },
  { 
    id: '3',
    name: 'Pisang', 
    sku: 'RAW-PSG-01',
    category: 'Sayuran', 
    stock: '0 Pcs', 
    min: '1 Pcs', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 2.500 / Pcs',
    fill: 0, 
    color: 'bg-line',
    movements: []
  },
  { 
    id: '4',
    name: 'Sereh', 
    sku: 'RAW-SRH-01',
    category: 'Bumbu', 
    stock: '0 Kg', 
    min: '2 Kg', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 6.000 / Kg',
    fill: 0, 
    color: 'bg-line',
    movements: []
  },
  { 
    id: '5',
    name: 'Tempe Besar', 
    sku: 'RAW-TMP-01',
    category: 'Sayuran', 
    stock: '0 Pcs', 
    min: '1 Pcs', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 5.000 / Pcs',
    fill: 0, 
    color: 'bg-line',
    movements: []
  },
  { 
    id: '6',
    name: 'Minyak 1L', 
    sku: 'ING-MYK-01',
    category: 'Bahan', 
    stock: '0 Pcs', 
    min: '4 Pcs', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 22.000 / Pcs',
    fill: 0, 
    color: 'bg-line',
    movements: []
  },
  { 
    id: '7',
    name: 'Telor Ayam', 
    sku: 'RAW-TLR-01',
    category: 'Protein', 
    stock: '0 Kg', 
    min: '2 Kg', 
    status: 'Habis', 
    value: 'Rp 0', 
    avgCost: 'Rp 28.000 / Kg',
    fill: 0, 
    color: 'bg-line',
    movements: []
  },
  { 
    id: '8',
    name: 'Plastik 1kg', 
    sku: 'PCK-PLS-01',
    category: 'Plastik', 
    stock: '2 Pax', 
    min: '2 Pax', 
    status: 'Aman', 
    value: 'Rp 14.000', 
    avgCost: 'Rp 7.000 / Pax',
    fill: 100, 
    color: 'bg-gold',
    movements: []
  },
  { 
    id: '9',
    name: 'Krupuk', 
    sku: 'KSR-KRP-01',
    category: 'Kasir', 
    stock: '8 Pax', 
    min: '1 Pax', 
    status: 'Aman', 
    value: 'Rp 400.000', 
    avgCost: 'Rp 50.000 / Pax',
    fill: 100, 
    color: 'bg-gold',
    movements: []
  },
  { 
    id: '10',
    name: 'Sterofoam', 
    sku: 'PCK-STF-01',
    category: 'Bahan', 
    stock: '1 Pax', 
    min: '2 Pax', 
    status: 'Rendah', 
    value: 'Rp 25.000', 
    avgCost: 'Rp 25.000 / Pax',
    fill: 50, 
    color: 'bg-gold',
    movements: []
  },
  { 
    id: '11',
    name: 'Merica', 
    sku: 'ING-MRC-01',
    category: 'Bumbu', 
    stock: '0.05 Kg', 
    min: '2 Kg', 
    status: 'Kritis', 
    value: 'Rp 8.250', 
    avgCost: 'Rp 165.000 / Kg',
    fill: 5, 
    color: 'bg-red',
    movements: []
  },
];

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItemDetail[]>(initialStocks);
  const [selectedStock, setSelectedStock] = useState<StockItemDetail | null>(null);
  const [editingStock, setEditingStock] = useState<StockItemDetail | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const filteredStocks = stocks.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'Semua' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

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

      <div className="bg-card border border-line rounded-[14px] p-4 flex flex-col gap-4 mt-2 shadow-sm">
        
        {/* Header Action */}
        <div className="flex justify-between items-center pb-2">
          <h3 className="font-serif font-bold text-ink text-base">Daftar Stok dari API</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-side-text" size={14} />
              <input 
                type="text" 
                placeholder="Cari bahan..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 bg-bg border border-line rounded-lg text-xs outline-none focus:border-gold w-48 text-ink"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-bg border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none"
            >
              <option value="Semua">Semua</option>
              <option value="Bahan">Bahan</option>
              <option value="Sayuran">Sayuran</option>
              <option value="Bumbu">Bumbu</option>
              <option value="Protein">Protein</option>
              <option value="Plastik">Plastik</option>
              <option value="Kasir">Kasir</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
              <tr>
                <th className="p-3">BAHAN</th>
                <th className="p-3">KATEGORI</th>
                <th className="p-3 w-48">STOK</th>
                <th className="p-3">MINIMUM</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">NILAI</th>
                <th className="p-3 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredStocks.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-bg'}>
                  <td className="p-3 font-bold">{item.name}</td>
                  <td className="p-3">
                    <span className="bg-gold-soft border border-chip-border text-gold px-3 py-0.5 rounded-full text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold w-16">{item.stock}</span>
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
                  <td className="p-3 font-mono">{item.value}</td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedStock(item)}
                        className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-ink transition-colors"
                        title="Lihat Ledger"
                      >
                        <Eye size={12} /> Detail
                      </button>
                      <button 
                        onClick={() => setEditingStock({...item})}
                        className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                        title="Edit Item Master"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              <button onClick={() => setSelectedStock(null)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-bg border border-line rounded-xl p-3 text-xs">
                <div>
                  <div className="text-[10px] text-side-text uppercase font-bold">Saldo Stok</div>
                  <div className="font-mono font-bold text-sm text-ink">{selectedStock.stock}</div>
                </div>
                <div>
                  <div className="text-[10px] text-side-text uppercase font-bold">Rata-rata Biaya (Avg)</div>
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
                          <tr key={mIdx} className="bg-white">
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
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
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
                    <option value="Bahan">Bahan</option>
                    <option value="Sayuran">Sayuran</option>
                    <option value="Bumbu">Bumbu</option>
                    <option value="Protein">Protein</option>
                    <option value="Plastik">Plastik</option>
                    <option value="Kasir">Kasir</option>
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

              <div className="bg-bg border border-line rounded-lg p-2.5 text-[11px] text-side-text">
                💡 <span className="font-bold text-ink">Catatan PRD:</span> Saldo stok fisik tidak dapat diubah sembarangan di sini demi integritas ledger, tetapi parameter nama, batas minimum alert, dan kategori dapat Anda perbarui langsung.
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
                  className="px-4 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-xs shadow-sm"
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
