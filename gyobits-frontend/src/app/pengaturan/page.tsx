'use client';
import React, { useState } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Edit2, KeyRound, Download, Save, HardDrive, X } from 'lucide-react';

type TabType = 'master-stock' | 'master-finance' | 'karyawan' | 'sistem';

interface StockItem {
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
  unit: string;
  unitBase: string;
  stockMode: 'STOCKED' | 'EXPLODE_BOM';
  sellPrice?: number;
}

interface FinanceCat {
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  status: string;
}

interface Employee {
  username: string;
  displayName: string;
  role: 'OWNER' | 'KASIR' | 'CHEF' | 'WAITER';
  status: string;
}

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<TabType>('master-stock');

  // Stock Items State
  const [items, setItems] = useState<StockItem[]>([
    { sku: 'ITM-001', name: 'Gyoza Mentah', category: 'SEMI_FINISHED', unit: 'Pcs', unitBase: 'Pcs', stockMode: 'STOCKED' },
    { sku: 'ITM-002', name: 'Gyoza Goreng', category: 'FINISHED', unit: 'Porsi', unitBase: 'Porsi', stockMode: 'EXPLODE_BOM', sellPrice: 35000 },
    { sku: 'ITM-003', name: 'Daging Sapi', category: 'RAW_PROTEIN', unit: 'Kg', unitBase: 'g', stockMode: 'STOCKED' },
  ]);

  // Finance Categories State
  const [financeCats, setFinanceCats] = useState<FinanceCat[]>([
    { name: 'Biaya Pemasaran / Iklan', kind: 'EXPENSE', status: 'Aktif' },
    { name: 'Pendapatan Luar Usaha', kind: 'INCOME', status: 'Aktif' },
  ]);

  // Employee State
  const [employees, setEmployees] = useState<Employee[]>([
    { username: 'owner', displayName: 'Owner', role: 'OWNER', status: 'Aktif' },
    { username: 'kasir_01', displayName: 'Dina (Kasir)', role: 'KASIR', status: 'Aktif' },
    { username: 'chef_budi', displayName: 'Budi (Dapur)', role: 'CHEF', status: 'Aktif' },
  ]);

  // Modal Dialog States
  const [showItemModal, setShowItemModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);

  // Form States - Item
  const [newItem, setNewItem] = useState<Partial<StockItem>>({
    category: 'RAW_DRY',
    unitBase: 'pcs',
    stockMode: 'STOCKED'
  });

  // Form States - Finance Cat
  const [newCat, setNewCat] = useState<{ name: string; kind: 'INCOME' | 'EXPENSE' }>({
    name: '',
    kind: 'EXPENSE'
  });

  // Form States - Employee
  const [newEmp, setNewEmp] = useState<{ username: string; displayName: string; role: 'OWNER' | 'KASIR' | 'CHEF' | 'WAITER' }>({
    username: '',
    displayName: '',
    role: 'KASIR'
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.sku || !newItem.name) return;
    setItems(prev => [...prev, {
      sku: newItem.sku || 'ITM-NEW',
      name: newItem.name || '',
      category: newItem.category || 'RAW_DRY',
      unit: newItem.unit || 'Pcs',
      unitBase: newItem.unitBase || 'pcs',
      stockMode: newItem.stockMode || 'STOCKED',
      sellPrice: newItem.sellPrice
    }]);
    setShowItemModal(false);
    setNewItem({ category: 'RAW_DRY', unitBase: 'pcs', stockMode: 'STOCKED' });
  };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;
    setFinanceCats(prev => [...prev, { name: newCat.name, kind: newCat.kind, status: 'Aktif' }]);
    setShowFinanceModal(false);
    setNewCat({ name: '', kind: 'EXPENSE' });
  };

  const handleAddEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.username || !newEmp.displayName) return;
    setEmployees(prev => [...prev, {
      username: newEmp.username,
      displayName: newEmp.displayName,
      role: newEmp.role,
      status: 'Aktif'
    }]);
    setShowEmployeeModal(false);
    setNewEmp({ username: '', displayName: '', role: 'KASIR' });
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1200px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            SETTING
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Pengaturan & Master Data</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-px overflow-x-auto hidden-scrollbar">
        {[
          { id: 'master-stock', label: 'Master Data Stock' },
          { id: 'master-finance', label: 'Master Data Finance' },
          { id: 'karyawan', label: 'Kelola Karyawan' },
          { id: 'sistem', label: 'Preferensi Sistem' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-gold text-gold bg-gold-soft/50 rounded-t-lg' 
                : 'border-transparent text-side-text hover:text-ink hover:bg-stat rounded-t-lg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-line rounded-[14px] p-6 shadow-sm min-h-[500px]">
        
        {/* TAB: MASTER DATA STOCK */}
        {activeTab === 'master-stock' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                  MASTER DATA
                </div>
                <h2 className="font-serif font-bold text-xl text-ink">Katalog Item & BOM</h2>
              </div>
              <button 
                onClick={() => setShowItemModal(true)}
                className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus size={16} /> Tambah Item
              </button>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">NAMA ITEM</th>
                    <th className="p-3">KATEGORI</th>
                    <th className="p-3">SATUAN</th>
                    <th className="p-3">MODE STOK</th>
                    <th className="p-3 text-right">HARGA JUAL</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white hover:bg-bg transition-colors" : "bg-bg hover:bg-white transition-colors"}>
                      <td className="p-3 font-mono text-side-text">{item.sku}</td>
                      <td className="p-3 font-bold">{item.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.category === 'SEMI_FINISHED' ? 'bg-gold-soft text-gold' :
                          item.category === 'FINISHED' ? 'bg-green/10 text-green font-bold' :
                          'bg-red/10 text-red'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3">{item.unit} <span className="text-[10px] text-side-text">(Dasar: {item.unitBase})</span></td>
                      <td className="p-3 font-mono text-[11px]">{item.stockMode}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {item.sellPrice ? `Rp ${item.sellPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button className="text-side-text hover:text-gold p-1"><Edit2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-[11px] text-side-text">
              *Item berstatus FINISHED adalah produk yang dapat dijual langsung di POS Terminal.
            </div>
          </div>
        )}

        {/* TAB: MASTER DATA FINANCE */}
        {activeTab === 'master-finance' && (
          <div className="max-w-3xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                  MASTER DATA
                </div>
                <h2 className="font-serif font-bold text-xl text-ink">Kategori Finance</h2>
              </div>
              <button 
                onClick={() => setShowFinanceModal(true)}
                className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus size={16} /> Tambah Kategori
              </button>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">NAMA KATEGORI</th>
                    <th className="p-3">JENIS</th>
                    <th className="p-3 text-center">STATUS</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {financeCats.map((cat, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-bg"}>
                      <td className="p-3 font-bold">{cat.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          cat.kind === 'EXPENSE' ? 'bg-red/10 text-red' : 'bg-green/10 text-green'
                        }`}>
                          {cat.kind}
                        </span>
                      </td>
                      <td className="p-3 text-center"><span className="text-green font-bold">{cat.status}</span></td>
                      <td className="p-3 text-center">
                        <button className="text-side-text hover:text-gold p-1"><Edit2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: KARYAWAN */}
        {activeTab === 'karyawan' && (
          <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                  OTORISASI
                </div>
                <h2 className="font-serif font-bold text-xl text-ink">Kelola Akun Karyawan</h2>
              </div>
              <button 
                onClick={() => setShowEmployeeModal(true)}
                className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus size={16} /> Karyawan Baru
              </button>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">USERNAME</th>
                    <th className="p-3">NAMA TAMPILAN</th>
                    <th className="p-3">ROLE</th>
                    <th className="p-3 text-center">STATUS</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {employees.map((emp, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-bg"}>
                      <td className="p-3 font-mono text-side-text">{emp.username}</td>
                      <td className="p-3 font-bold">{emp.displayName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          emp.role === 'OWNER' ? 'bg-gold-soft border border-chip-border text-gold font-bold' : 'bg-line text-ink'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-3 text-center"><span className="text-green font-bold">{emp.status}</span></td>
                      <td className="p-3 text-center">
                        <button className="text-side-text hover:text-gold p-1 mr-2" title="Edit"><Edit2 size={14}/></button>
                        <button 
                          onClick={() => setShowResetModal(emp.displayName)}
                          className="text-side-text hover:text-red p-1" 
                          title="Reset Password"
                        >
                          <KeyRound size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-bg border border-line rounded-lg p-3 text-xs text-side-text">
              <span className="font-bold text-ink">Catatan Keamanan:</span> Password disimpan menggunakan argon2id. Reset password akan menghasilkan sandi sementara yang wajib diganti oleh karyawan saat login pertama kali.
            </div>
          </div>
        )}

        {/* TAB: SISTEM */}
        {activeTab === 'sistem' && (
          <div className="max-w-2xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              KONFIGURASI
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Preferensi Sistem & Backup</h2>
            
            <div className="space-y-6">
              
              <div className="bg-stat border border-line rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2">Parameter Operasional</h3>
                
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Ambang Batas Approve Opname (Rp)</label>
                  <p className="text-[11px] text-side-text mb-2">Opname dengan selisih di atas angka ini membutuhkan persetujuan Owner secara manual.</p>
                  <input type="number" defaultValue={50000} className="w-full max-w-[200px] bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-gold" />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Jam Tutup Bisnis</label>
                  <p className="text-[11px] text-side-text mb-2">Menentukan pergantian tanggal logika operasional (Business Date WIB).</p>
                  <input type="time" defaultValue="00:00" className="w-full max-w-[200px] bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-gold" />
                </div>

                <div className="pt-2">
                  <button className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2">
                    <Save size={14} /> Simpan Preferensi
                  </button>
                </div>
              </div>

              <div className="bg-bg border border-line rounded-xl p-5">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2 mb-4">Pemulihan & Backup Database</h3>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
                      <HardDrive size={16} className="text-green" />
                      Status Backup Terakhir: <span className="text-green">Berhasil</span>
                    </div>
                    <div className="text-xs text-side-text font-mono">6 Oktober 2026, 03:00 WIB</div>
                    <p className="text-xs text-side-text mt-3 max-w-sm">
                      Sistem melakukan backup berkala secara otomatis. Anda dapat mengunduh seluruh data dalam format CSV untuk audit offline.
                    </p>
                  </div>
                  <button className="bg-white border border-line hover:bg-stat text-ink font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2">
                    <Download size={14} /> Unduh CSV Backup
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: FORM TAMBAH ITEM MASTER */}
      {showItemModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-ink">Form Tambah Item Master</h3>
              <button onClick={() => setShowItemModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">SKU</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: ITM-004" 
                    required 
                    onChange={e => setNewItem({...newItem, sku: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    onChange={e => setNewItem({...newItem, category: e.target.value as StockItem['category']})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    <option value="RAW_DRY">RAW_DRY (Bahan Kering)</option>
                    <option value="RAW_PROTEIN">RAW_PROTEIN (Daging/Basah)</option>
                    <option value="SEMI_FINISHED">SEMI_FINISHED (Olahan)</option>
                    <option value="FINISHED">FINISHED (Menu Siap Jual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Item</label>
                <input 
                  type="text" 
                  placeholder="Nama item atau bahan..." 
                  required 
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Dasar</label>
                  <select 
                    onChange={e => setNewItem({...newItem, unitBase: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">g (gram)</option>
                    <option value="ml">ml (milliliter)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Tampilan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Pack / Porsi / Kg" 
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Mode Stok</label>
                  <select 
                    onChange={e => setNewItem({...newItem, stockMode: e.target.value as StockItem['stockMode']})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    <option value="STOCKED">STOCKED (Gudang)</option>
                    <option value="EXPLODE_BOM">EXPLODE_BOM (Resep)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Harga Jual (Rp)</label>
                  <input 
                    type="number" 
                    placeholder="Opsional jika menu" 
                    onChange={e => setNewItem({...newItem, sellPrice: Number(e.target.value)})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">Simpan Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM TAMBAH KATEGORI FINANCE */}
      {showFinanceModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-ink">Tambah Kategori Finance</h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddCat} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Kategori</label>
                <input 
                  type="text" 
                  placeholder="Misal: Biaya Listrik & Air" 
                  required 
                  value={newCat.name}
                  onChange={e => setNewCat({...newCat, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis Aliran Dana</label>
                <select 
                  value={newCat.kind}
                  onChange={e => setNewCat({...newCat, kind: e.target.value as FinanceCat['kind']})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                >
                  <option value="EXPENSE">EXPENSE (Pengeluaran)</option>
                  <option value="INCOME">INCOME (Pemasukan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">Simpan Kategori</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FORM TAMBAH KARYAWAN */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-ink">Tambah Akun Karyawan</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEmp} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Username</label>
                <input 
                  type="text" 
                  placeholder="Contoh: kasir_siti" 
                  required 
                  value={newEmp.username}
                  onChange={e => setNewEmp({...newEmp, username: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Tampilan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Siti (Kasir Sore)" 
                  required 
                  value={newEmp.displayName}
                  onChange={e => setNewEmp({...newEmp, displayName: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Role / Hak Akses</label>
                <select 
                  value={newEmp.role}
                  onChange={e => setNewEmp({...newEmp, role: e.target.value as Employee['role']})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                >
                  <option value="KASIR">KASIR (POS & Operasional Shift)</option>
                  <option value="CHEF">CHEF (Dapur, Produksi Batch & Yield)</option>
                  <option value="WAITER">WAITER (Lihat Menu & Stok)</option>
                  <option value="OWNER">OWNER (Semua Akses Penuh)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">Simpan Akun</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DIALOG RESET PASSWORD */}
      {showResetModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-sm shadow-xl p-5 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-gold-soft text-gold mx-auto flex items-center justify-center mb-3">
              <KeyRound size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg text-ink mb-1">Reset Password</h3>
            <p className="text-xs text-side-text mb-4">
              Password sementara untuk karyawan <span className="font-bold text-ink">{showResetModal}</span> telah digenerate:
            </p>
            <div className="bg-stat border border-chip-border p-3 rounded-lg font-mono font-bold text-lg text-gold tracking-widest mb-4">
              GYO-93821
            </div>
            <p className="text-[10px] text-side-text mb-4 leading-tight">
              Karyawan wajib mengganti password ini saat pertama kali melakukan login ulang.
            </p>
            <button 
              onClick={() => setShowResetModal(null)}
              className="w-full bg-gold hover:bg-[#A38225] text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
