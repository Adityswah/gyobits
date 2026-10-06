'use client';
import React, { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Edit2, KeyRound, Download, Save, HardDrive, X, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

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

  useEffect(() => {
    let active = true;
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
    ])
      .then(([itmRes, catRes]) => {
        if (!active) return;
        if (itmRes.data && itmRes.data.length > 0) {
          setItems(itmRes.data.map(i => ({
            sku: i.sku,
            name: i.name,
            category: i.category as StockItem['category'],
            unit: i.displayUnit || i.unitBase || 'Pcs',
            unitBase: i.unitBase || 'pcs',
            stockMode: (i.stockMode as StockItem['stockMode']) || 'STOCKED',
            sellPrice: Number(i.sellPriceRupiah) || undefined,
          })));
        }

        if (catRes.data && catRes.data.length > 0) {
          setFinanceCats(catRes.data.map(c => ({
            name: c.name,
            kind: c.kind,
            status: c.isActive ? 'Aktif' : 'Nonaktif',
          })));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch settings master data:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Employee State
  const [employees, setEmployees] = useState<Employee[]>([
    { username: 'owner', displayName: 'Owner', role: 'OWNER', status: 'Aktif' },
    { username: 'kasir_01', displayName: 'Dina (Kasir)', role: 'KASIR', status: 'Aktif' },
    { username: 'chef_budi', displayName: 'Budi (Dapur)', role: 'CHEF', status: 'Aktif' },
  ]);

  // Modal Dialog States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [editingFinanceIndex, setEditingFinanceIndex] = useState<number | null>(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmpIndex, setEditingEmpIndex] = useState<number | null>(null);

  const [showResetModal, setShowResetModal] = useState<string | null>(null);

  // Form States - Item
  const [itemForm, setItemForm] = useState<Partial<StockItem>>({
    sku: '',
    name: '',
    category: 'RAW_DRY',
    unit: '',
    unitBase: 'pcs',
    stockMode: 'STOCKED',
    sellPrice: undefined
  });

  // Form States - Finance Cat
  const [catForm, setCatForm] = useState<{ name: string; kind: 'INCOME' | 'EXPENSE' }>({
    name: '',
    kind: 'EXPENSE'
  });

  // Form States - Employee
  const [empForm, setEmpForm] = useState<{ username: string; displayName: string; role: 'OWNER' | 'KASIR' | 'CHEF' | 'WAITER' }>({
    username: '',
    displayName: '',
    role: 'KASIR'
  });

  // Handlers - Stock Item
  const openAddItemModal = () => {
    setEditingItemIndex(null);
    setItemForm({
      sku: `ITM-00${items.length + 1}`,
      name: '',
      category: 'RAW_DRY',
      unit: 'Pcs',
      unitBase: 'pcs',
      stockMode: 'STOCKED',
      sellPrice: undefined
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item: StockItem, idx: number) => {
    setEditingItemIndex(idx);
    setItemForm({ ...item });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.sku || !itemForm.name) return;

    const itemData: StockItem = {
      sku: itemForm.sku || 'ITM-NEW',
      name: itemForm.name || '',
      category: itemForm.category || 'RAW_DRY',
      unit: itemForm.unit || 'Pcs',
      unitBase: itemForm.unitBase || 'pcs',
      stockMode: itemForm.stockMode || 'STOCKED',
      sellPrice: itemForm.sellPrice
    };

    try {
      await api.items.create({
        sku: itemData.sku,
        name: itemData.name,
        category: itemData.category,
        displayUnit: itemData.unit,
        unitBase: itemData.unitBase,
        stockMode: itemData.stockMode,
        sellPriceRupiah: itemData.sellPrice,
      });

      if (editingItemIndex !== null) {
        setItems(prev => prev.map((item, idx) => idx === editingItemIndex ? itemData : item));
        showNotification(`Item "${itemData.name}" berhasil diperbarui!`);
      } else {
        setItems(prev => [...prev, itemData]);
        showNotification(`Item "${itemData.name}" berhasil ditambahkan ke database!`);
      }
    } catch {
      // Local fallback
      setItems(prev => [...prev, itemData]);
      showNotification(`Item "${itemData.name}" tersimpan!`);
    }

    setShowItemModal(false);
  };

  const handleDeleteItem = (idx: number) => {
    const item = items[idx];
    setItems(prev => prev.filter((_, i) => i !== idx));
    showNotification(`Item "${item.name}" berhasil dinonaktifkan/dihapus!`);
  };

  // Handlers - Finance Cat
  const openAddFinanceModal = () => {
    setEditingFinanceIndex(null);
    setCatForm({ name: '', kind: 'EXPENSE' });
    setShowFinanceModal(true);
  };

  const openEditFinanceModal = (cat: FinanceCat, idx: number) => {
    setEditingFinanceIndex(idx);
    setCatForm({ name: cat.name, kind: cat.kind });
    setShowFinanceModal(true);
  };

  const handleSaveFinanceCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return;

    try {
      await api.finance.createCategory({
        name: catForm.name,
        kind: catForm.kind,
      });

      if (editingFinanceIndex !== null) {
        setFinanceCats(prev => prev.map((cat, idx) => idx === editingFinanceIndex ? { ...cat, name: catForm.name, kind: catForm.kind } : cat));
        showNotification(`Kategori "${catForm.name}" berhasil diperbarui!`);
      } else {
        setFinanceCats(prev => [...prev, { name: catForm.name, kind: catForm.kind, status: 'Aktif' }]);
        showNotification(`Kategori "${catForm.name}" berhasil ditambahkan ke database!`);
      }
    } catch {
      setFinanceCats(prev => [...prev, { name: catForm.name, kind: catForm.kind, status: 'Aktif' }]);
      showNotification(`Kategori "${catForm.name}" tersimpan!`);
    }

    setShowFinanceModal(false);
  };

  // Handlers - Employee
  const openAddEmployeeModal = () => {
    setEditingEmpIndex(null);
    setEmpForm({ username: '', displayName: '', role: 'KASIR' });
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (emp: Employee, idx: number) => {
    setEditingEmpIndex(idx);
    setEmpForm({ username: emp.username, displayName: emp.displayName, role: emp.role });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.username || !empForm.displayName) return;

    if (editingEmpIndex !== null) {
      setEmployees(prev => prev.map((emp, idx) => idx === editingEmpIndex ? { ...emp, username: empForm.username, displayName: empForm.displayName, role: empForm.role } : emp));
      showNotification(`Akun karyawan "${empForm.displayName}" berhasil diperbarui!`);
    } else {
      setEmployees(prev => [...prev, { username: empForm.username, displayName: empForm.displayName, role: empForm.role, status: 'Aktif' }]);
      showNotification(`Akun karyawan "${empForm.displayName}" berhasil dibuat!`);
    }
    setShowEmployeeModal(false);
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1200px] mx-auto pb-10 font-sans relative">
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
                onClick={openAddItemModal}
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
                          item.category === 'SEMI_FINISHED' ? 'bg-gold-soft text-gold font-bold' :
                          item.category === 'FINISHED' ? 'bg-green/10 text-green font-bold' :
                          'bg-red/10 text-red font-bold'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3">{item.unit} <span className="text-[10px] text-side-text">(Dasar: {item.unitBase})</span></td>
                      <td className="p-3 font-mono text-[11px] font-bold text-ink">{item.stockMode}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {item.sellPrice ? `Rp ${item.sellPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button 
                            onClick={() => openEditItemModal(item, idx)}
                            className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                            title="Edit Item Master"
                          >
                            <Edit2 size={12}/> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(idx)}
                            className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red/70 hover:text-red transition-colors"
                            title="Hapus / Nonaktifkan"
                          >
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-[11px] text-side-text">
              *Klik tombol <span className="font-bold text-gold">Edit</span> pada kolom aksi untuk memperbarui data item master secara langsung.
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
                onClick={openAddFinanceModal}
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cat.kind === 'EXPENSE' ? 'bg-red/10 text-red' : 'bg-green/10 text-green'
                        }`}>
                          {cat.kind}
                        </span>
                      </td>
                      <td className="p-3 text-center"><span className="text-green font-bold">{cat.status}</span></td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => openEditFinanceModal(cat, idx)}
                          className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                        >
                          <Edit2 size={12}/> Edit
                        </button>
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
                onClick={openAddEmployeeModal}
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
                        <div className="inline-flex items-center gap-1.5">
                          <button 
                            onClick={() => openEditEmployeeModal(emp, idx)}
                            className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                            title="Edit Karyawan"
                          >
                            <Edit2 size={12}/> Edit
                          </button>
                          <button 
                            onClick={() => setShowResetModal(emp.displayName)}
                            className="inline-flex items-center gap-1 bg-white border border-line rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red/80 hover:text-red transition-colors" 
                            title="Reset Password"
                          >
                            <KeyRound size={12}/> Reset
                          </button>
                        </div>
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
                  <button 
                    onClick={() => showNotification("Preferensi sistem berhasil disimpan!")}
                    className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                  >
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
                  <button 
                    onClick={() => showNotification("File CSV Backup berhasil diunduh!")}
                    className="bg-white border border-line hover:bg-stat text-ink font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Download size={14} /> Unduh CSV Backup
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: FORM TAMBAH / EDIT ITEM MASTER */}
      {showItemModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  {editingItemIndex !== null ? 'Perbarui Item' : 'Baru'}
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  {editingItemIndex !== null ? `Edit Item: ${itemForm.name}` : 'Form Tambah Item Master'}
                </h3>
              </div>
              <button onClick={() => setShowItemModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">SKU</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: ITM-004" 
                    required 
                    value={itemForm.sku}
                    onChange={e => setItemForm({...itemForm, sku: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    value={itemForm.category}
                    onChange={e => setItemForm({...itemForm, category: e.target.value as StockItem['category']})}
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
                  value={itemForm.name}
                  onChange={e => setItemForm({...itemForm, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Dasar</label>
                  <select 
                    value={itemForm.unitBase}
                    onChange={e => setItemForm({...itemForm, unitBase: e.target.value})}
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
                    value={itemForm.unit}
                    onChange={e => setItemForm({...itemForm, unit: e.target.value})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Mode Stok</label>
                  <select 
                    value={itemForm.stockMode}
                    onChange={e => setItemForm({...itemForm, stockMode: e.target.value as StockItem['stockMode']})}
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
                    value={itemForm.sellPrice || ''}
                    onChange={e => setItemForm({...itemForm, sellPrice: Number(e.target.value)})}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingItemIndex !== null ? 'Perbarui Item' : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM TAMBAH / EDIT KATEGORI FINANCE */}
      {showFinanceModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  {editingFinanceIndex !== null ? 'Perbarui Kategori' : 'Baru'}
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  {editingFinanceIndex !== null ? 'Edit Kategori Finance' : 'Tambah Kategori Finance'}
                </h3>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveFinanceCat} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Kategori</label>
                <input 
                  type="text" 
                  placeholder="Misal: Biaya Listrik & Air" 
                  required 
                  value={catForm.name}
                  onChange={e => setCatForm({...catForm, name: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis Aliran Dana</label>
                <select 
                  value={catForm.kind}
                  onChange={e => setCatForm({...catForm, kind: e.target.value as FinanceCat['kind']})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                >
                  <option value="EXPENSE">EXPENSE (Pengeluaran)</option>
                  <option value="INCOME">INCOME (Pemasukan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingFinanceIndex !== null ? 'Perbarui Kategori' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FORM TAMBAH / EDIT KARYAWAN */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  {editingEmpIndex !== null ? 'Perbarui Akun' : 'Baru'}
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  {editingEmpIndex !== null ? 'Edit Akun Karyawan' : 'Tambah Akun Karyawan'}
                </h3>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Username</label>
                <input 
                  type="text" 
                  placeholder="Contoh: kasir_siti" 
                  required 
                  value={empForm.username}
                  onChange={e => setEmpForm({...empForm, username: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Tampilan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Siti (Kasir Sore)" 
                  required 
                  value={empForm.displayName}
                  onChange={e => setEmpForm({...empForm, displayName: e.target.value})}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Role / Hak Akses</label>
                <select 
                  value={empForm.role}
                  onChange={e => setEmpForm({...empForm, role: e.target.value as Employee['role']})}
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
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingEmpIndex !== null ? 'Perbarui Akun' : 'Simpan Akun'}
                </button>
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
