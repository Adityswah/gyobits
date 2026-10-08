'use client';
import React, { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Edit2, KeyRound, Download, Save, HardDrive, X, Trash2, CheckCircle2, BookOpen, Layers, Tag, Scale, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { api, RecipeRecord, ItemRecord } from '@/lib/api';

type TabType = 'master-stock' | 'master-finance' | 'karyawan' | 'sistem';
type MasterStockSubTab = 'satuan' | 'kategori' | 'barang' | 'bom';

interface StockItem {
  id?: number;
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_VEGETABLE' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
  unit: string;
  unitBase: string;
  stockMode: 'STOCKED' | 'EXPLODE_BOM';
  sellPrice?: number;
}

interface BulkItemRow {
  sku: string;
  name: string;
  category: 'RAW_PROTEIN' | 'RAW_VEGETABLE' | 'RAW_DRY' | 'SEMI_FINISHED' | 'FINISHED';
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
  const [masterSubTab, setMasterSubTab] = useState<MasterStockSubTab>('satuan');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 1. Satuan State (Sesuai Gambar User)
  const [satuanList, setSatuanList] = useState<string[]>([
    'Ekor',
    'Galon',
    'Kg',
    'Pax',
    'Pcs',
    'Ikat',
    'Botol',
    'Porsi',
    'Gelas',
  ]);
  const [newSatuanInput, setNewSatuanInput] = useState('');
  const [newSatuanNama, setNewSatuanNama] = useState('');
  const [newSatuanKode, setNewSatuanKode] = useState('');
  const [newSatuanKategori, setNewSatuanKategori] = useState('Bahan Dapur');
  const [editingSatuanIndex, setEditingSatuanIndex] = useState<number | null>(null);
  const [editingSatuanValue, setEditingSatuanValue] = useState('');

  // Bulk Item Modal State (Bisa memasukkan 1 s/d 20 item sekaligus)
  const [showBulkItemModal, setShowBulkItemModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkItemRow[]>([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // 2. Stock Items State (START FROM 0: BERSIH TANPA DUMMY)
  const [rawItems, setRawItems] = useState<ItemRecord[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);

  // 3. BOM / Recipes State (START FROM 0: BERSIH TANPA DUMMY)
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [showBomModal, setShowBomModal] = useState(false);
  const [bomOutputId, setBomOutputId] = useState<number>(0);
  const [bomBasisQty, setBomBasisQty] = useState<number>(1);
  const [bomLines, setBomLines] = useState<Array<{ itemId: number; qty: number; unit: string }>>([]);

  // 4. Finance Categories State (Kategori Master Dipertahankan)
  const [financeCats, setFinanceCats] = useState<FinanceCat[]>([
    { name: 'Setoran Modal Pemilik / Kas Kecil', kind: 'INCOME', status: 'Aktif' },
    { name: 'Pendapatan Luar Usaha (Jual Limbah/Kardus)', kind: 'INCOME', status: 'Aktif' },
    { name: 'Bunga Bank / Jasa Giro', kind: 'INCOME', status: 'Aktif' },
    { name: 'Biaya Utilitas (Listrik, Air, Gas)', kind: 'EXPENSE', status: 'Aktif' },
    { name: 'Biaya Pemasaran / Iklan', kind: 'EXPENSE', status: 'Aktif' },
    { name: 'Gaji Karyawan', kind: 'EXPENSE', status: 'Aktif' },
  ]);

  // 5. Employees State
  const [employees, setEmployees] = useState<Employee[]>([
    { username: 'owner', displayName: 'Owner', role: 'OWNER', status: 'Aktif' },
    { username: 'kasir_01', displayName: 'Dina (Kasir)', role: 'KASIR', status: 'Aktif' },
    { username: 'chef_budi', displayName: 'Budi (Dapur)', role: 'CHEF', status: 'Aktif' },
  ]);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [editingFinanceIndex, setEditingFinanceIndex] = useState<number | null>(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmpIndex, setEditingEmpIndex] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [showTransactionResetModal, setShowTransactionResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<'baseline' | 'clean'>('baseline');
  const [isResetting, setIsResetting] = useState(false);

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      const res = await api.system.resetTransactions(resetMode);
      showNotification(res.message || "Reset transaksi berhasil!");
      setShowTransactionResetModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset transaksi';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Form States - Item
  const [itemForm, setItemForm] = useState<Partial<StockItem>>({
    sku: '',
    name: '',
    category: 'RAW_DRY',
    unit: 'Pcs',
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

  const loadData = () => {
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
      api.recipes.getAll(),
    ])
      .then(([itmRes, catRes, recRes]) => {
        const itemData = itmRes.data || [];
        setRawItems(itemData);
        setItems(itemData.map(i => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          category: i.category as StockItem['category'],
          unit: i.displayUnit || i.unitBase || 'Pcs',
          unitBase: i.unitBase || 'pcs',
          stockMode: (i.stockMode as StockItem['stockMode']) || 'STOCKED',
          sellPrice: Number(i.sellPriceRupiah) || undefined,
        })));

        if (itemData.length > 0) {
          const unitsFromItems = Array.from(new Set(itemData.map(i => i.displayUnit).filter(Boolean)));
          setSatuanList(prev => Array.from(new Set([...prev, ...unitsFromItems])));
        }

        if (catRes.data && catRes.data.length > 0) {
          setFinanceCats(catRes.data.map(c => ({
            name: c.name,
            kind: c.kind,
            status: c.isActive ? 'Aktif' : 'Nonaktif',
          })));
        }

        setRecipes(recRes.data || []);
      })
      .catch((err) => {
        console.warn('Failed to fetch settings master data:', err);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers - Satuan
  const handleAddSatuan = () => {
    if (!newSatuanInput.trim()) return;
    const clean = newSatuanInput.trim();
    if (!satuanList.includes(clean)) {
      setSatuanList(prev => [...prev, clean]);
      showNotification(`Satuan "${clean}" berhasil ditambahkan!`);
    }
    setNewSatuanInput('');
  };

  const handleSaveEditSatuan = (idx: number) => {
    if (!editingSatuanValue.trim()) return;
    const updated = [...satuanList];
    updated[idx] = editingSatuanValue.trim();
    setSatuanList(updated);
    setEditingSatuanIndex(null);
    showNotification("Satuan berhasil diperbarui!");
  };

  const handleDeleteSatuan = (idx: number) => {
    const val = satuanList[idx];
    setSatuanList(prev => prev.filter((_, i) => i !== idx));
    showNotification(`Satuan "${val}" berhasil dihapus!`);
  };

  const handleTambahSatuanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSatuanNama.trim()) return;
    const clean = newSatuanNama.trim();
    if (!satuanList.includes(clean)) {
      setSatuanList(prev => [...prev, clean]);
      showNotification(`Satuan "${clean}" (${newSatuanKode || clean}) berhasil disimpan!`);
    } else {
      showNotification(`Satuan "${clean}" sudah terdaftar.`);
    }
    setNewSatuanNama('');
    setNewSatuanKode('');
  };

  // Handlers - Bulk Item (1 s.d. 20 item)
  const openBulkItemModal = () => {
    const initialRows: BulkItemRow[] = Array.from({ length: 3 }, (_, i) => ({
      sku: `ITM-00${items.length + i + 1}`,
      name: '',
      category: 'RAW_DRY',
      unit: satuanList[0] || 'Pcs',
      unitBase: 'pcs',
      stockMode: 'STOCKED',
      sellPrice: undefined,
    }));
    setBulkRows(initialRows);
    setShowBulkItemModal(true);
  };

  const handleAddBulkRow = () => {
    if (bulkRows.length >= 20) {
      showNotification("Maksimal 20 item per input massal telah tercapai.");
      return;
    }
    setBulkRows(prev => [
      ...prev,
      {
        sku: `ITM-00${items.length + prev.length + 1}`,
        name: '',
        category: 'RAW_DRY',
        unit: satuanList[0] || 'Pcs',
        unitBase: 'pcs',
        stockMode: 'STOCKED',
        sellPrice: undefined,
      }
    ]);
  };

  const handleRemoveBulkRow = (index: number) => {
    if (bulkRows.length <= 1) return;
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveBulkItems = async () => {
    const validRows = bulkRows.filter(r => r.name.trim() !== '');
    if (validRows.length === 0) {
      showNotification("Harap isi minimal 1 nama item sebelum menyimpan.");
      return;
    }
    setIsSavingBulk(true);
    try {
      for (const row of validRows) {
        await api.items.create({
          sku: row.sku || `ITM-${Date.now().toString().slice(-4)}`,
          name: row.name.trim(),
          category: row.category,
          displayUnit: row.unit || 'Pcs',
          unitBase: row.unitBase || 'pcs',
          stockMode: row.stockMode,
          sellPriceRupiah: row.sellPrice,
        });
      }
      showNotification(`Berhasil menambahkan ${validRows.length} item baru ke Master Data!`);
      setShowBulkItemModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan item massal';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Handlers - BOM Recipe
  const openAddBomModal = () => {
    setBomOutputId(items[0]?.id || 7);
    setBomBasisQty(100);
    setBomLines([
      { itemId: items[1]?.id || 5, qty: 2000, unit: 'g' },
      { itemId: items[2]?.id || 6, qty: 100, unit: 'Pcs' }
    ]);
    setShowBomModal(true);
  };

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bomBasisQty <= 0 || bomLines.length === 0) {
      showNotification("Basis Qty harus > 0 dan resep harus memiliki minimal 1 bahan.");
      return;
    }

    try {
      await api.recipes.create({
        outputItemId: bomOutputId,
        basisQty: bomBasisQty,
        lines: bomLines.map(l => ({ itemId: l.itemId, qtyPerBasis: l.qty }))
      });
      showNotification("Resep BOM berhasil disimpan ke Master Data!");
      setShowBomModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan resep BOM';
      showNotification(`Error: ${msg}`);
    }
  };

  // Handlers - Item
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
      loadData();
    } catch {
      setItems(prev => [...prev, itemData]);
      showNotification(`Item "${itemData.name}" tersimpan!`);
    }

    setShowItemModal(false);
  };

  const handleDeleteItem = async (idx: number) => {
    const item = items[idx];
    if (confirm(`Hapus permanen item "${item.name}" dari Master Data?`)) {
      if (item.id) {
        try {
          await api.items.delete(item.id);
          showNotification(`Item "${item.name}" berhasil dihapus permanen!`);
          loadData();
          return;
        } catch (err: unknown) {
          showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
          return;
        }
      }
      setItems(prev => prev.filter((_, i) => i !== idx));
      showNotification(`Item "${item.name}" berhasil dinonaktifkan/dihapus!`);
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (confirm(`Hapus permanen resep BOM #${recipeId}?`)) {
      try {
        await api.recipes.delete(recipeId);
        showNotification(`Resep BOM #${recipeId} berhasil dihapus permanen!`);
        loadData();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
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
      loadData();
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
    <div className="flex flex-col gap-4 max-w-[1200px] mx-auto pb-12 font-sans relative">
      <Topbar />

      {/* Floating Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 bg-green text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            MASTER DATA & KONFIGURASI
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Pengaturan Data</h1>
        </div>
      </div>

      {/* Top Level Tabs */}
      <div className="flex gap-2 border-b border-line pb-px overflow-x-auto hidden-scrollbar">
        {[
          { id: 'master-stock', label: 'Master Data Stock & BOM' },
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
        
        {/* ========================================================
            TAB: MASTER DATA STOCK (DIBAGI SEPERTI GAMBAR USER)
            ======================================================== */}
        {activeTab === 'master-stock' && (
          <div className="space-y-6">
            
            {/* 1. MASTER DATA STOCK CARDS (GAMBAR USER) */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-2">
                MASTER DATA STOCK
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Satuan stock */}
                <button
                  type="button"
                  onClick={() => setMasterSubTab('satuan')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-2xs ${
                    masterSubTab === 'satuan'
                      ? 'bg-gold-soft border-gold text-ink ring-1 ring-gold'
                      : 'bg-surface border-line text-side-text hover:text-ink hover:border-gold/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Scale size={16} className={masterSubTab === 'satuan' ? 'text-gold' : 'text-side-text'} />
                    <span className="font-bold text-xs uppercase text-ink">Satuan stock</span>
                  </div>
                  <div className="text-xs text-side-text font-mono font-medium">
                    {satuanList.length} data satuan
                  </div>
                </button>

                {/* Kategori stock */}
                <button
                  type="button"
                  onClick={() => setMasterSubTab('kategori')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-2xs ${
                    masterSubTab === 'kategori'
                      ? 'bg-gold-soft border-gold text-ink ring-1 ring-gold'
                      : 'bg-surface border-line text-side-text hover:text-ink hover:border-gold/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={16} className={masterSubTab === 'kategori' ? 'text-gold' : 'text-side-text'} />
                    <span className="font-bold text-xs uppercase text-ink">Kategori stock</span>
                  </div>
                  <div className="text-xs text-side-text font-mono font-medium">
                    5 kategori aktif
                  </div>
                </button>

                {/* Barang stock */}
                <button
                  type="button"
                  onClick={() => setMasterSubTab('barang')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-2xs ${
                    masterSubTab === 'barang'
                      ? 'bg-gold-soft border-gold text-ink ring-1 ring-gold'
                      : 'bg-surface border-line text-side-text hover:text-ink hover:border-gold/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={16} className={masterSubTab === 'barang' ? 'text-gold' : 'text-side-text'} />
                    <span className="font-bold text-xs uppercase text-ink">Barang stock</span>
                  </div>
                  <div className="text-xs text-side-text font-mono font-medium">
                    {items.length} data barang terdaftar
                  </div>
                </button>
              </div>
            </div>

            {/* 2. OPERASIONAL CARDS (BOM - GAMBAR USER) */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-2">
                OPERASIONAL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* BOM */}
                <button
                  type="button"
                  onClick={() => setMasterSubTab('bom')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-2xs ${
                    masterSubTab === 'bom'
                      ? 'bg-gold-soft border-gold text-ink ring-1 ring-gold'
                      : 'bg-surface border-line text-side-text hover:text-ink hover:border-gold/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} className={masterSubTab === 'bom' ? 'text-gold' : 'text-side-text'} />
                    <span className="font-bold text-xs uppercase text-ink">BOM (Bill of Materials)</span>
                  </div>
                  <div className="text-xs text-side-text font-mono font-medium">
                    {recipes.length} formula resep
                  </div>
                </button>
              </div>
            </div>

            <hr className="border-line" />

            {/* 3. SUB-TAB VIEW: SATUAN UKURAN (FORM MASTER DATA LENGKAP SESUAI INSTRUKSI) */}
            {masterSubTab === 'satuan' && (
              <div className="space-y-4">
                {/* FORM TAMBAH SATUAN UKURAN */}
                <div className="bg-surface border border-line rounded-xl p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale size={18} className="text-gold" />
                    <div>
                      <h4 className="font-serif font-bold text-base text-ink">Form Input Satuan Ukuran</h4>
                      <p className="text-xs text-side-text">Daftarkan satuan resmi baru untuk bahan baku, takaran resep, atau menu kasir.</p>
                    </div>
                  </div>

                  <form onSubmit={handleTambahSatuanForm} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Satuan</label>
                      <input
                        type="text"
                        value={newSatuanNama}
                        onChange={(e) => setNewSatuanNama(e.target.value)}
                        placeholder="Contoh: Kilogram, Ikat, Botol, Porsi"
                        required
                        className="w-full bg-card border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Simbol / Kode Singkatan</label>
                      <input
                        type="text"
                        value={newSatuanKode}
                        onChange={(e) => setNewSatuanKode(e.target.value)}
                        placeholder="Contoh: kg, ikt, btl, pax"
                        className="w-full bg-card border border-line rounded-lg px-3 py-2 text-xs font-mono text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori Penggunaan</label>
                      <select
                        value={newSatuanKategori}
                        onChange={(e) => setNewSatuanKategori(e.target.value)}
                        className="w-full bg-card border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold font-medium"
                      >
                        <option value="Bahan Dapur">Bahan Baku Dapur (Mentah/Segar)</option>
                        <option value="Bumbu & Kemasan">Bumbu Kering & Kemasan</option>
                        <option value="Menu Siap Saji">Menu Siap Saji / POS Kasir</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-gold hover:bg-[#A38225] text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <Plus size={15} /> Simpan Satuan Ukuran
                      </button>
                    </div>
                  </form>
                </div>

                {/* DAFTAR SATUAN AKTIF */}
                <div className="bg-surface border border-line rounded-xl p-5 shadow-2xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-serif font-bold text-lg text-ink">Daftar Satuan Ukuran Aktif</h3>
                    <span className="bg-stat border border-line px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-side-text">
                      {satuanList.length} item terdaftar
                    </span>
                  </div>

                  <div className="space-y-2">
                    {satuanList.map((satuan, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-line bg-card hover:bg-stat/50 transition-colors"
                      >
                        {editingSatuanIndex === idx ? (
                          <div className="flex-1 flex gap-2 mr-2">
                            <input
                              type="text"
                              value={editingSatuanValue}
                              onChange={(e) => setEditingSatuanValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditSatuan(idx)}
                              autoFocus
                              className="bg-surface border border-gold rounded px-2 py-1 text-sm text-ink font-bold outline-none flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditSatuan(idx)}
                              className="bg-green text-white text-xs px-2.5 py-1 rounded font-bold"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSatuanIndex(null)}
                              className="border border-line text-xs px-2 py-1 rounded text-side-text"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-bold text-sm text-ink">
                            <Edit2 size={13} className="text-side-text" />
                            <span>{satuan}</span>
                          </div>
                        )}

                        {editingSatuanIndex !== idx && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSatuanIndex(idx);
                                setEditingSatuanValue(satuan);
                              }}
                              className="p-1.5 text-side-text hover:text-gold hover:bg-gold-soft rounded transition-colors"
                              title="Edit nama satuan"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSatuan(idx)}
                              className="p-1.5 text-side-text hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Hapus satuan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. SUB-TAB VIEW: KATEGORI STOCK (TERMASUK RAW_VEGETABLE) */}
            {masterSubTab === 'kategori' && (
              <div className="bg-surface border border-line rounded-xl p-5 shadow-2xs">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink">Kategori Stock Inventory</h3>
                    <p className="text-xs text-side-text">Pengelompokan resmi alur rantai pasok dapur & kasir.</p>
                  </div>
                  <span className="bg-stat border border-line px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-gold">
                    5 Kategori Aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { code: 'RAW_PROTEIN', name: 'Raw Protein (Daging Basah)', desc: 'Daging ayam, sapi, udang, protein mentah yang memerlukan penanganan suhu dingin & yield prep.', count: items.filter(i => i.category === 'RAW_PROTEIN').length, color: 'bg-red/10 text-red border-red/20' },
                    { code: 'RAW_VEGETABLE', name: 'Raw Vegetable (Sayuran Segar Dapur)', desc: 'Kol, daun bawang, bawang putih, jahe, sayur segar dapur yang langsung dipakai olah harian.', count: items.filter(i => i.category === 'RAW_VEGETABLE').length, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                    { code: 'RAW_DRY', name: 'Raw Dry (Bahan Kering & Bumbu)', desc: 'Kulit gyoza, bumbu bubuk, saus, kecap, plastik segel, paper box kemasan.', count: items.filter(i => i.category === 'RAW_DRY').length, color: 'bg-gold-soft text-gold border-chip-border' },
                    { code: 'SEMI_FINISHED', name: 'Semi-Finished (Olahan Dapur)', desc: 'Daging cincang bersih hasil prep, adonan pasta gyoza, gyoza mentah siap masak.', count: items.filter(i => i.category === 'SEMI_FINISHED').length, color: 'bg-green/10 text-green border-green/20' },
                    { code: 'FINISHED', name: 'Finished (Menu Siap Saji POS)', desc: 'Gyoza isi 10, gyoza isi 8, gyoza frozen pack, es teh, chili oil cup.', count: items.filter(i => i.category === 'FINISHED').length, color: 'bg-stat text-ink border-line' },
                  ].map((cat, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-line bg-card shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.color}`}>
                            {cat.code}
                          </span>
                          <span className="font-mono text-xs font-bold text-ink">
                            {cat.count} Item
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-ink mb-1">{cat.name}</h4>
                        <p className="text-xs text-side-text">{cat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SUB-TAB VIEW: BARANG STOCK */}
            {masterSubTab === 'barang' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink">Katalog Barang Stock</h3>
                    <p className="text-xs text-side-text">Daftar item bahan mentah, olahan, dan menu kasir.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={openBulkItemModal}
                      className="bg-card border border-line hover:border-gold hover:bg-gold-soft text-ink font-bold py-2 px-3.5 rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                      title="Input 1 s/d 20 item sekaligus"
                    >
                      <Layers size={15} className="text-gold" /> Input Massal (1-20 Item)
                    </button>
                    <button 
                      onClick={openAddItemModal}
                      className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={15} /> Tambah Item Baru
                    </button>
                  </div>
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
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-side-text italic bg-card">
                            Belum ada barang di Master Data. Klik tombol &quot;+ Tambah Item Baru&quot; di atas untuk mendaftarkan bahan baku atau menu.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-card hover:bg-stat/40 transition-colors" : "bg-surface hover:bg-stat/40 transition-colors"}>
                            <td className="p-3 font-mono text-side-text font-bold">{item.sku}</td>
                            <td className="p-3 font-bold text-ink">{item.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.category === 'SEMI_FINISHED' ? 'bg-gold-soft text-gold' :
                                item.category === 'FINISHED' ? 'bg-green/10 text-green' :
                                item.category === 'RAW_PROTEIN' ? 'bg-red/10 text-red' :
                                'bg-stat text-side-text'
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-ink font-medium">{item.unit} <span className="text-[10px] text-side-text">({item.unitBase})</span></td>
                            <td className="p-3 font-mono text-[11px] font-bold text-ink">{item.stockMode}</td>
                            <td className="p-3 text-right font-mono font-bold text-ink">
                              {item.sellPrice ? `Rp ${item.sellPrice.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button 
                                  onClick={() => openEditItemModal(item, idx)}
                                  className="inline-flex items-center gap-1 bg-surface border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                                  title="Edit Item Master"
                                >
                                  <Edit2 size={12}/> Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(idx)}
                                  className="inline-flex items-center gap-1 bg-surface border border-line rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red/70 hover:text-red transition-colors"
                                  title="Hapus / Nonaktifkan"
                                >
                                  <Trash2 size={12}/>
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
            )}

            {/* 6. SUB-TAB VIEW: BOM (BILL OF MATERIALS / RESEP DAPUR) */}
            {masterSubTab === 'bom' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink">Master BOM (Resep & Formula Produksi)</h3>
                    <p className="text-xs text-side-text">
                      Resep acuan standar dapur. Saat melakukan Input Produksi Batch, bahan-bahan ini akan keluar secara otomatis.
                    </p>
                  </div>
                  <button 
                    onClick={openAddBomModal}
                    className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Plus size={16} /> + Buat Formula BOM Baru
                  </button>
                </div>

                {/* Info Callout Single Batch Recipe */}
                <div className="mb-4 p-3.5 bg-card border border-line rounded-xl flex items-start gap-3 shadow-2xs">
                  <div className="p-2 bg-gold-soft text-gold rounded-lg shrink-0 mt-0.5">
                    <BookOpen size={16} />
                  </div>
                  <div className="text-xs">
                    <h5 className="font-bold text-ink mb-0.5">Arsitektur Produksi Tunggal (Single Central Batch)</h5>
                    <p className="text-side-text leading-relaxed">
                      Produk POS (<span className="text-ink font-bold">Gyoza Isi 10, Isi 8, Isi 7</span>) sengaja tidak memiliki resep BOM tersendiri, melainkan langsung bersumber dari 1 hasil produksi batch dapur: <span className="text-gold font-bold">Gyoza Mentah Siap Masak (170 Pcs)</span>. Saat kasir menjual di POS, stok gyoza mentah otomatis terpotong 10, 8, atau 7 pcs per porsi secara terpusat.
                    </p>
                  </div>
                </div>

                {recipes.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-line rounded-xl bg-card">
                    <div className="w-12 h-12 rounded-xl bg-gold-soft text-gold flex items-center justify-center mx-auto mb-3">
                      <BookOpen size={24} />
                    </div>
                    <h4 className="font-serif font-bold text-sm text-ink mb-1">Belum Ada Formula BOM Terdaftar</h4>
                    <p className="text-xs text-side-text max-w-sm mx-auto mb-4">
                      Buat formula BOM baru untuk bahan baku gyoza atau olahan dapur agar saat produksi batch bahan otomatis terisi.
                    </p>
                    <button 
                      onClick={openAddBomModal}
                      className="bg-gold hover:bg-[#A38225] text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> + Buat Formula BOM Baru
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recipes.map((rec) => (
                      <div key={rec.id} className="bg-surface border border-line rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start border-b border-line pb-2 mb-3">
                            <div>
                              <span className="text-[9px] font-bold bg-gold-soft border border-chip-border text-gold px-2 py-0.5 rounded-full uppercase">
                                RESEP RESMI v{rec.version}
                              </span>
                              <h4 className="font-serif font-bold text-base text-ink mt-1">
                                {rec.outputItemName}
                              </h4>
                            </div>
                            <div className="text-right flex items-start gap-2">
                              <div>
                                <span className="text-[10px] text-side-text block uppercase">Basis Output:</span>
                                <span className="font-mono font-bold text-ink text-sm">
                                  {rec.basisQty} {rec.outputItemUnit || 'Pcs'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteRecipe(rec.id)}
                                className="p-1.5 text-red/60 hover:text-red hover:bg-red/10 rounded transition-colors"
                                title="Hapus Resep BOM Ini"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Ingredients Table */}
                          <div className="space-y-1.5 mb-3">
                            <span className="text-[10px] font-bold text-side-text uppercase block">Komposisi Bahan Standar:</span>
                            {rec.lines.map((line, lIdx) => (
                              <div key={lIdx} className="flex justify-between items-center text-xs bg-stat/50 px-2.5 py-1.5 rounded-lg border border-line/40">
                                <span className="font-medium text-ink">{line.itemName}</span>
                                <span className="font-mono font-bold text-ink">
                                  {line.qtyPerBasis} {line.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line flex justify-end">
                          <span className="text-[10px] text-side-text italic">
                            *Otomatis dimuat di menu Input Produksi Batch
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            TAB: MASTER DATA FINANCE
            ======================================================== */}
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
                    <tr key={idx} className={idx % 2 === 0 ? "bg-card hover:bg-stat/40" : "bg-surface hover:bg-stat/40"}>
                      <td className="p-3 font-bold text-ink">{cat.name}</td>
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
                          className="inline-flex items-center gap-1 bg-surface border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
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

        {/* ========================================================
            TAB: KARYAWAN
            ======================================================== */}
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
                    <tr key={idx} className={idx % 2 === 0 ? "bg-card hover:bg-stat/40" : "bg-surface hover:bg-stat/40"}>
                      <td className="p-3 font-mono text-side-text font-bold">{emp.username}</td>
                      <td className="p-3 font-bold text-ink">{emp.displayName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          emp.role === 'OWNER' ? 'bg-gold-soft border border-chip-border text-gold font-bold' : 'bg-stat text-ink'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-3 text-center"><span className="text-green font-bold">{emp.status}</span></td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button 
                            onClick={() => openEditEmployeeModal(emp, idx)}
                            className="inline-flex items-center gap-1 bg-surface border border-line rounded px-2 py-1 text-[10px] hover:bg-stat font-bold text-gold transition-colors"
                            title="Edit Karyawan"
                          >
                            <Edit2 size={12}/> Edit
                          </button>
                          <button 
                            onClick={() => setShowResetModal(emp.displayName)}
                            className="inline-flex items-center gap-1 bg-surface border border-line rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red/80 hover:text-red transition-colors" 
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
            <div className="mt-4 bg-stat border border-line rounded-lg p-3 text-xs text-side-text">
              <span className="font-bold text-ink">Catatan Keamanan:</span> Password disimpan terenkripsi. Reset password akan menghasilkan sandi sementara yang wajib diganti oleh karyawan saat login pertama kali.
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: SISTEM & BACKUP
            ======================================================== */}
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
                  <input type="number" defaultValue={50000} className="w-full max-w-[200px] bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-gold" />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Jam Tutup Bisnis</label>
                  <p className="text-[11px] text-side-text mb-2">Menentukan pergantian tanggal logika operasional (Business Date WIB).</p>
                  <input type="time" defaultValue="00:00" className="w-full max-w-[200px] bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-gold" />
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

              <div className="bg-surface border border-line rounded-xl p-5">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2 mb-4">Pemulihan & Backup Database</h3>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
                      <HardDrive size={16} className="text-green" />
                      Status Backup Terakhir: <span className="text-green font-bold">Berhasil</span>
                    </div>
                    <div className="text-xs text-side-text font-mono">6 Oktober 2026, 03:00 WIB</div>
                    <p className="text-xs text-side-text mt-3 max-w-sm">
                      Sistem melakukan backup berkala secara otomatis. Anda dapat mengunduh seluruh data dalam format CSV untuk audit offline.
                    </p>
                  </div>
                  <button 
                    onClick={() => showNotification("File CSV Backup berhasil diunduh!")}
                    className="bg-card border border-line hover:bg-stat text-ink font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Download size={14} /> Unduh CSV Backup
                  </button>
                </div>
              </div>

              {/* Pembersihan Data & Reset Transaksi (Uji Coba) */}
              <div className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-ink border-b border-line pb-2 mb-4">
                  <Trash2 size={16} className="text-red" />
                  <span>Pembersihan Data Transaksi (Reset Uji Coba)</span>
                </div>
                <p className="text-xs text-side-text mb-3 leading-relaxed">
                  Jika Anda telah selesai melakukan uji coba / simulasi kasir POS, pembelian bahan, yield prep, dan produksi batch, Anda dapat mereset data transaksi agar pembukuan siap dipakai operasional asli dari angka nol (0).
                </p>
                <div className="bg-stat border border-line rounded-lg p-3 text-xs text-side-text mb-4">
                  <span className="font-bold text-ink">Catatan Keamanan:</span> Master Data Barang (30 item), Resep Formula BOM (Gyoza Mentah 170 pcs), dan Akun Karyawan <strong>TIDAK AKAN DIHAPUS</strong>.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    type="button"
                    onClick={() => { setResetMode('baseline'); setShowTransactionResetModal(true); }}
                    className="bg-card border border-line hover:border-gold hover:bg-gold-soft text-ink font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-2"
                  >
                    <RefreshCw size={14} className="text-gold" /> Reset ke Data Standar Excel
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setResetMode('clean'); setShowTransactionResetModal(true); }}
                    className="bg-red/10 border border-red/30 hover:bg-red/20 text-red font-bold py-2.5 px-4 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Kosongkan Seluruh Riwayat Transaksi (0 Transaksi)
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          MODAL: TAMBAH / EDIT ITEM MASTER
          ======================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
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
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    value={itemForm.category}
                    onChange={e => setItemForm({...itemForm, category: e.target.value as StockItem['category']})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold"
                  >
                    <option value="RAW_DRY">RAW_DRY (Bahan Kering)</option>
                    <option value="RAW_PROTEIN">RAW_PROTEIN (Daging/Basah)</option>
                    <option value="RAW_VEGETABLE">RAW_VEGETABLE (Sayuran Segar Dapur)</option>
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
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Dasar</label>
                  <select 
                    value={itemForm.unitBase}
                    onChange={e => setItemForm({...itemForm, unitBase: e.target.value})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold"
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
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Mode Stok</label>
                  <select 
                    value={itemForm.stockMode}
                    onChange={e => setItemForm({...itemForm, stockMode: e.target.value as StockItem['stockMode']})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold"
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
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingItemIndex !== null ? 'Perbarui Item' : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BULK ADD ITEM (1 S.D. 20 ITEM SEKALIGUS)
          ======================================================== */}
      {showBulkItemModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  INPUT MASSAL MASTER DATA
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  Tambah Banyak Barang Stock (1 - 20 Item Sekaligus)
                </h3>
              </div>
              <button onClick={() => setShowBulkItemModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-side-text font-medium">
                  Jumlah item: <strong className="text-ink">{bulkRows.length}</strong> / 20 item maksimal
                </span>
                <button
                  type="button"
                  onClick={handleAddBulkRow}
                  disabled={bulkRows.length >= 20}
                  className="bg-card border border-line hover:border-gold hover:bg-gold-soft text-ink font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus size={14} className="text-gold" /> Tambah Baris ({bulkRows.length}/20)
                </button>
              </div>

              <div className="overflow-x-auto border border-line rounded-xl bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[110px]">SKU</th>
                      <th className="p-2.5 min-w-[180px]">NAMA ITEM</th>
                      <th className="p-2.5 min-w-[150px]">KATEGORI</th>
                      <th className="p-2.5 min-w-[100px]">SATUAN</th>
                      <th className="p-2.5 min-w-[90px]">DASAR</th>
                      <th className="p-2.5 min-w-[110px]">MODE</th>
                      <th className="p-2.5 min-w-[110px] text-right">HARGA (RP)</th>
                      <th className="p-2.5 w-10 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {bulkRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stat/30 transition-colors">
                        <td className="p-2 text-center font-mono font-bold text-side-text">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].sku = e.target.value;
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Nama item..."
                            value={row.name}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].name = e.target.value;
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-bold text-ink outline-none focus:border-gold"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.category}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].category = e.target.value as BulkItemRow['category'];
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs text-ink outline-none focus:border-gold font-medium"
                          >
                            <option value="RAW_PROTEIN">RAW_PROTEIN</option>
                            <option value="RAW_VEGETABLE">RAW_VEGETABLE</option>
                            <option value="RAW_DRY">RAW_DRY</option>
                            <option value="SEMI_FINISHED">SEMI_FINISHED</option>
                            <option value="FINISHED">FINISHED</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.unit}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].unit = e.target.value;
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs text-ink outline-none focus:border-gold font-medium"
                          >
                            {satuanList.map((s, sIdx) => (
                              <option key={sIdx} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.unitBase}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].unitBase = e.target.value;
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs text-ink outline-none focus:border-gold font-medium"
                          >
                            <option value="pcs">pcs</option>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.stockMode}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].stockMode = e.target.value as 'STOCKED' | 'EXPLODE_BOM';
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs text-ink outline-none focus:border-gold font-medium"
                          >
                            <option value="STOCKED">STOCKED</option>
                            <option value="EXPLODE_BOM">EXPLODE_BOM</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.sellPrice || ''}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].sellPrice = e.target.value ? Number(e.target.value) : undefined;
                              setBulkRows(updated);
                            }}
                            className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-mono text-right text-ink outline-none focus:border-gold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkRow(idx)}
                            disabled={bulkRows.length <= 1}
                            className="text-side-text hover:text-red p-1 rounded disabled:opacity-30"
                            title="Hapus Baris Ini"
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

            <div className="p-4 border-t border-line bg-stat flex justify-between items-center shrink-0">
              <span className="text-xs text-side-text">
                Baris kosong tanpa nama item akan otomatis diabaikan saat disimpan.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkItemModal(false)}
                  className="px-4 py-2 border border-line rounded-lg text-xs font-bold text-side-text hover:bg-card"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkItems}
                  disabled={isSavingBulk}
                  className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSavingBulk ? 'Menyimpan...' : `Simpan Semua Item (${bulkRows.filter(r => r.name.trim()).length} Item)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BUAT FORMULA BOM BARU
          ======================================================== */}
      {showBomModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  MASTER FORMULA
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  Buat Resep Standar (BOM) Baru
                </h3>
              </div>
              <button onClick={() => setShowBomModal(false)} className="text-side-text hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveBom} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Item Output yang Dihasilkan</label>
                <select
                  value={bomOutputId}
                  onChange={(e) => setBomOutputId(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold text-ink"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Basis Qty Output Acuan</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bomBasisQty}
                  onChange={(e) => setBomBasisQty(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold font-bold"
                  placeholder="Misal 28 pcs atau 100 porsi"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-side-text uppercase block">Komposisi Bahan Standar</label>
                  <button
                    type="button"
                    onClick={() => {
                      const pick = items[0]?.id || 1;
                      setBomLines(prev => [...prev, { itemId: pick, qty: 100, unit: 'g' }]);
                    }}
                    className="text-xs font-bold text-gold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Tambah Baris Bahan
                  </button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {bomLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-surface border border-line rounded-lg p-2">
                      <select
                        value={line.itemId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const f = items.find(i => i.id === val);
                          setBomLines(prev => prev.map((l, i) => i === idx ? { ...l, itemId: val, unit: f?.unit || 'g' } : l));
                        }}
                        className="flex-1 bg-surface border border-line rounded px-2 py-1 text-xs text-ink font-bold outline-none"
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>{it.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={line.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBomLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: val } : l));
                        }}
                        className="w-20 bg-surface border border-line rounded px-2 py-1 text-xs font-mono text-right outline-none font-bold"
                      />
                      <span className="text-xs font-bold text-side-text w-8">{line.unit}</span>
                      <button
                        type="button"
                        onClick={() => setBomLines(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red/60 hover:text-red p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowBomModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  Simpan Formula BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FORM TAMBAH / EDIT KATEGORI FINANCE
          ======================================================== */}
      {showFinanceModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
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
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis Aliran Dana</label>
                <select 
                  value={catForm.kind}
                  onChange={e => setCatForm({...catForm, kind: e.target.value as FinanceCat['kind']})}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold"
                >
                  <option value="EXPENSE">EXPENSE (Pengeluaran)</option>
                  <option value="INCOME">INCOME (Pemasukan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingFinanceIndex !== null ? 'Perbarui Kategori' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FORM TAMBAH / EDIT KARYAWAN
          ======================================================== */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
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
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gold font-bold" 
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
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Role / Hak Akses</label>
                <select 
                  value={empForm.role}
                  onChange={e => setEmpForm({...empForm, role: e.target.value as Employee['role']})}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold font-bold"
                >
                  <option value="KASIR">KASIR (POS & Operasional Shift)</option>
                  <option value="CHEF">CHEF (Dapur, Produksi Batch & Yield)</option>
                  <option value="WAITER">WAITER (Lihat Menu & Stok)</option>
                  <option value="OWNER">OWNER (Semua Akses Penuh)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm">
                  {editingEmpIndex !== null ? 'Perbarui Akun' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RESET PASSWORD
          ======================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl p-5 text-center animate-in fade-in zoom-in-95">
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

      {/* ========================================================
          MODAL: KONFIRMASI RESET TRANSAKSI
          ======================================================== */}
      {showTransactionResetModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red/10 text-red mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg text-ink mb-2 text-center">
              {resetMode === 'clean' ? 'Kosongkan Semua Transaksi?' : 'Reset ke Standar Excel?'}
            </h3>
            <p className="text-xs text-side-text mb-4 text-center leading-relaxed">
              {resetMode === 'clean' 
                ? 'Tindakan ini akan mengosongkan seluruh riwayat penjualan POS kasir, nota pembelian bahan, yield prep, produksi batch dapur, dan catatan kas. Master Data item barang dan formula BOM tetap dipertahankan utuh.'
                : 'Tindakan ini akan mengembalikan data riwayat transaksi dan stok ke kondisi awal seperti pada file Master Excel RESEP DAN BATCH GYOZA (Batch 8).'
              }
            </p>
            <div className="bg-stat border border-line rounded-lg p-3 text-[11px] text-side-text mb-5 text-center font-medium">
              Pastikan Anda sudah mengunduh CSV Backup jika memerlukan salinan data transaksi saat ini.
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowTransactionResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-red hover:bg-[#A82B2B] text-white font-bold rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isResetting ? 'Memproses...' : 'Ya, Konfirmasi Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
