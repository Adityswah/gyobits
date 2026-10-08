'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Trash2, ArrowRight, CheckCircle2, Sparkles, BookOpen, AlertCircle, X, HelpCircle } from 'lucide-react';
import { api, ItemRecord, FinanceCategoryRecord, RecipeRecord } from '@/lib/api';
import { useApp } from '@/context/AppContext';

interface PurchaseLine {
  id: string;
  itemId: number;
  qty: number;
  unit: string;
  unitPrice: number; // Harga beli per satuan
}

interface BatchIngredient {
  id: string;
  itemId: number;
  name: string;
  stockInfo: string;
  qty: number;
  unit: string;
  avgCost: number;
}

export default function InputPage() {
  const { addAuditLog } = useApp();
  const [activeTab, setActiveTab] = useState<'pembelian' | 'yield' | 'batch' | 'finance' | 'history'>('pembelian');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryRecord[]>([]);
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);

  // Riwayat Transaksi Terbaru untuk Hard Delete
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: number; purchaseCode: string; supplierName: string; purchaseDate: string; paymentChannel: string; totalRupiah: string }>>([]);
  const [recentYields, setRecentYields] = useState<Array<{ id: number; prepCode: string; prepDate: string; sourceQtyUsed: string; cleanOutputQty: string; wasteQty: string; wasteReason?: string }>>([]);
  const [recentBatches, setRecentBatches] = useState<Array<{ id: number; batchCode: string; batchDate: string; qtyGood: string; totalCostRupiah: string; hppPerUnitRupiah: string; notes?: string }>>([]);
  const [recentFinances, setRecentFinances] = useState<Array<{ id: number; txnDate: string; kind: string; channel: string; categoryName?: string; amountRupiah: string; note?: string }>>([]);

  // Modal Quick Add Item
  const [showQuickAddItemModal, setShowQuickAddItemModal] = useState(false);
  const [quickItemForm, setQuickItemForm] = useState({
    name: '',
    category: 'RAW_DRY' as 'RAW_DRY' | 'RAW_PROTEIN' | 'SEMI_FINISHED' | 'FINISHED',
    displayUnit: 'Kg',
    unitBase: 'g',
    unitPrice: 15000,
    minStockAlert: 5,
  });

  // Dynamic Transaction References (Client-Safe to prevent React Hydration Mismatch)
  const [purchaseRef, setPurchaseRef] = useState('PUR-20260925-1001');
  const [yieldRef, setYieldRef] = useState('YLD-20260925-101');
  const [batchRef, setBatchRef] = useState('BCH-20260925-101');
  const [financeRef, setFinanceRef] = useState('FIN-MAN-20260925-1001');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayNum = today.replace(/-/g, '');
    setPurchaseDate(today);
    setFinDate(today);
    setPurchaseRef(`PUR-${todayNum}-${Math.floor(1000 + Math.random() * 9000)}`);
    setYieldRef(`YLD-${todayNum}-${Math.floor(100 + Math.random() * 900)}`);
    setBatchRef(`BCH-${todayNum}-${Math.floor(100 + Math.random() * 900)}`);
    setFinanceRef(`FIN-MAN-${todayNum}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadHistory = useCallback(() => {
    api.purchases.getAll().then((res: { data: unknown }) => setRecentPurchases((res.data as typeof recentPurchases) || [])).catch(() => {});
    api.yields.getAll().then((res: { data: unknown }) => setRecentYields((res.data as typeof recentYields) || [])).catch(() => {});
    api.batches.getAll().then((res: { data: unknown }) => setRecentBatches((res.data as typeof recentBatches) || [])).catch(() => {});
    api.finance.getTransactions().then((res: { data: unknown }) => setRecentFinances((res.data as typeof recentFinances) || [])).catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
      api.recipes.getAll(),
    ])
      .then(([itemsRes, catsRes, recipesRes]) => {
        setItems(itemsRes.data || []);
        setCategories(catsRes.data || []);
        setRecipes(recipesRes.data || []);
        loadHistory();
      })
      .catch((err) => {
        console.warn('Failed to load initial data for input page:', err);
      });
  }, [loadHistory]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
      api.recipes.getAll(),
    ])
      .then(([itemsRes, catsRes, recipesRes]) => {
        if (active) {
          setItems(itemsRes.data || []);
          setCategories(catsRes.data || []);
          setRecipes(recipesRes.data || []);
          loadHistory();
        }
      })
      .catch((err) => {
        console.warn('Failed to load initial data for input page:', err);
      });

    return () => {
      active = false;
    };
  }, [loadHistory]);

  // HARD DELETE HANDLERS
  const handleDeletePurchase = async (id: number) => {
    if (confirm(`Hapus permanen transaksi pembelian #${id}? Saldo stok dan pengeluaran kas terkait akan dibatalkan.`)) {
      try {
        await api.purchases.delete(id);
        showNotification(`Pembelian #${id} berhasil dihapus permanen.`);
        loadHistory();
        loadData();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  const handleDeleteYield = async (id: number) => {
    if (confirm(`Hapus permanen Yield Prep #${id}?`)) {
      try {
        await api.yields.delete(id);
        showNotification(`Yield Prep #${id} berhasil dihapus.`);
        loadHistory();
        loadData();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  const handleDeleteBatch = async (id: number) => {
    if (confirm(`Hapus permanen Batch Produksi #${id}?`)) {
      try {
        await api.batches.delete(id);
        showNotification(`Batch Produksi #${id} berhasil dihapus.`);
        loadHistory();
        loadData();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  const handleDeleteFinance = async (id: number) => {
    if (confirm(`Hapus permanen catatan keuangan #${id}?`)) {
      try {
        await api.finance.deleteTransaction(id);
        showNotification(`Catatan keuangan #${id} berhasil dihapus.`);
        loadHistory();
        loadData();
      } catch (err: unknown) {
        showNotification(`Gagal: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  // ========================================================
  // 1. PEMBELIAN FORM STATE (START FROM 0: BERSIH TANPA DUMMY)
  // ========================================================
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('2026-10-08');
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'BANK'>('BANK');

  const addPurchaseLine = (newItemId?: number, newUnit?: string, newPrice?: number) => {
    if (items.length === 0 && !newItemId) {
      setShowQuickAddItemModal(true);
      return;
    }

    const defaultItem = newItemId 
      ? items.find(i => i.id === newItemId) 
      : (items[0] || { id: 1, name: 'Bahan Baku', displayUnit: 'Pcs', currentAvgCostRupiah: '0' });

    const itId = newItemId || defaultItem?.id || 1;
    const itUnit = newUnit || defaultItem?.displayUnit || defaultItem?.unitBase || 'Pcs';
    const itPrice = newPrice !== undefined ? newPrice : Number(defaultItem?.currentAvgCostRupiah || 0);

    setPurchaseLines(prev => [
      ...prev,
      { 
        id: `${Date.now()}-${prev.length + 1}`, 
        itemId: itId, 
        qty: 1, 
        unit: itUnit, 
        unitPrice: itPrice 
      }
    ]);
  };

  const removePurchaseLine = (id: string) => {
    setPurchaseLines(prev => prev.filter(l => l.id !== id));
  };

  // Hitungan Total Tagihan = SUM(Qty * Harga Satuan)
  const totalPembelian = purchaseLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.unitPrice || 0)), 0);

  const handleSaveQuickItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemForm.name.trim()) {
      showNotification("Nama barang wajib diisi.");
      return;
    }

    try {
      const skuPrefix = quickItemForm.category === 'RAW_PROTEIN' ? 'RAW-PRO' : 
                        quickItemForm.category === 'RAW_DRY' ? 'RAW-DRY' : 
                        quickItemForm.category === 'SEMI_FINISHED' ? 'SEM-ITM' : 'FNS-ITM';
      const generatedSku = `${skuPrefix}-${Date.now().toString().slice(-4)}`;

      const res = await api.items.create({
        sku: generatedSku,
        name: quickItemForm.name.trim(),
        category: quickItemForm.category,
        displayUnit: quickItemForm.displayUnit,
        unitBase: quickItemForm.unitBase,
        stockMode: 'STOCKED',
        minStockAlert: quickItemForm.minStockAlert,
      });

      const created = res.data;
      showNotification(`Item "${created.name}" berhasil ditambahkan ke Master Data!`);
      setShowQuickAddItemModal(false);

      // Refresh items and automatically add this item to the purchase table
      const updatedItems = await api.items.getAll();
      setItems(updatedItems.data || []);

      addPurchaseLine(created.id, created.displayUnit || quickItemForm.displayUnit, quickItemForm.unitPrice);

      // Reset form
      setQuickItemForm({
        name: '',
        category: 'RAW_DRY',
        displayUnit: 'Kg',
        unitBase: 'g',
        unitPrice: 15000,
        minStockAlert: 5,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat item baru';
      showNotification(`Error: ${msg}`);
    }
  };

  const handleSubmitPembelian = async () => {
    if (purchaseLines.length === 0) {
      showNotification("Tambahkan minimal satu baris barang pembelian.");
      return;
    }
    setIsSubmitting(true);
    try {
      const refNum = purchaseRef;
      await api.purchases.create({
        purchaseDate,
        supplierName: supplier || 'Supplier Umum',
        paymentChannel,
        lines: purchaseLines.map(l => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          lineTotalRupiah: Math.round(Number(l.qty) * Number(l.unitPrice)),
        })),
      });
      addAuditLog({
        ref: refNum,
        tipe: 'PURCHASE',
        operator: 'Owner',
        nominal: totalPembelian,
        keterangan: `Pembelian ${purchaseLines.length} item via ${paymentChannel} (${supplier || 'Supplier Umum'})`
      });
      showNotification(`Transaksi Pembelian Rp ${totalPembelian.toLocaleString('id-ID')} berhasil dicatat ke Ledger!`);
      // Reset & refresh ref
      setPurchaseLines([]);
      setPurchaseRef(`PUR-20261008-${Math.floor(1000 + Math.random() * 9000)}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi pembelian';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 2. YIELD / PREP STATE (START FROM 0: BERSIH TANPA DUMMY)
  // ========================================================
  const proteinItems = items.filter(i => i.category === 'RAW_PROTEIN' || i.category === 'SEMI_FINISHED');
  const [sourceItemId, setSourceItemId] = useState<number>(0);
  const [outputItemId, setOutputItemId] = useState<number>(0);
  const [beratAsal, setBeratAsal] = useState<number>(0);
  const [beratBersih, setBeratBersih] = useState<number>(0);
  const [alasanSusut, setAlasanSusut] = useState<string>('');

  const beratSusut = Math.max(0, beratAsal - beratBersih);
  const persenSusut = beratAsal > 0 ? ((beratSusut / beratAsal) * 100).toFixed(0) : '0';
  
  const sourceItem = items.find(i => i.id === sourceItemId);
  const sourceStockVal = Number(sourceItem?.currentStockValueRupiah || 0);
  const sourceStockQty = Number(sourceItem?.currentStockQty || 0);
  const totalValTransfer = sourceStockQty > 0 ? Math.round((beratAsal * sourceStockVal) / sourceStockQty) : 0;
  const hppPerGram = (totalValTransfer / (beratBersih || 1)).toFixed(2);

  const handleSubmitYield = async () => {
    if (beratBersih <= 0 || beratBersih > beratAsal) {
      showNotification("Berat bersih harus lebih dari 0 dan tidak boleh melebihi berat asal.");
      return;
    }
    setIsSubmitting(true);
    try {
      const refNum = yieldRef;
      await api.yields.create({
        sourceItemId,
        outputItemId,
        sourceQtyUsed: beratAsal,
        cleanOutputQty: beratBersih,
        wasteReason: alasanSusut,
      });
      addAuditLog({
        ref: refNum,
        tipe: 'YIELD',
        operator: 'Chef Dapur',
        nominal: totalValTransfer,
        keterangan: `Yield Prep: ${beratAsal}g -> ${beratBersih}g bersih (Susut ${persenSusut}%)`
      });
      showNotification(`Yield Prep berhasil disimpan! HPP Hasil: Rp ${hppPerGram}/g`);
      setYieldRef(`YLD-20261008-${Math.floor(100 + Math.random() * 900)}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan yield prep';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 3. PRODUKSI BATCH STATE (START FROM 0: BERSIH TANPA DUMMY)
  // ========================================================
  const [batchOutputItemId, setBatchOutputItemId] = useState<number>(0);
  const [qtyGood, setQtyGood] = useState<number>(0);
  const [qtyWaste, setQtyWaste] = useState<number>(0);
  const [batchWasteTreatment, setBatchWasteTreatment] = useState<'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK'>('ABSORBED_TO_HPP');
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [batchIngredients, setBatchIngredients] = useState<BatchIngredient[]>([]);

  // Cari resep BOM aktif untuk item output yang dipilih
  const matchedRecipe = recipes.find(r => r.outputItemId === batchOutputItemId);

  // Fungsi untuk menarik formula resep BOM ke tabel bahan baku
  const applyRecipeBom = useCallback((targetOutputId: number, targetQty: number) => {
    const rec = recipes.find(r => r.outputItemId === targetOutputId);
    if (rec && rec.lines && rec.lines.length > 0) {
      const basis = Number(rec.basisQty) || 1;
      const ratio = targetQty > 0 ? targetQty / basis : 1;

      const loadedIngredients: BatchIngredient[] = rec.lines.map((line, idx) => {
        const found = items.find(i => i.id === line.itemId);
        const avg = Number(found?.currentAvgCostRupiah || 50);
        const scaledQty = Math.round((Number(line.qtyPerBasis) * ratio) * 100) / 100;
        return {
          id: `bom-${line.id || idx}-${Date.now()}`,
          itemId: line.itemId,
          name: line.itemName || found?.name || `Bahan #${line.itemId}`,
          stockInfo: `Stok: ${found?.currentStockQty || 0} ${found?.displayUnit || found?.unitBase || 'g'} | HPP: Rp ${avg}`,
          qty: scaledQty,
          unit: line.unit || found?.displayUnit || found?.unitBase || 'g',
          avgCost: avg,
        };
      });

      setBatchIngredients(loadedIngredients);
    }
  }, [recipes, items]);

  // Saat output item diganti, coba otomatis load resep BOM
  const handleOutputItemChange = (newItemId: number) => {
    setBatchOutputItemId(newItemId);
    const rec = recipes.find(r => r.outputItemId === newItemId);
    if (rec) {
      applyRecipeBom(newItemId, qtyGood);
    }
  };

  const addBatchIngredient = () => {
    const rawItems = items.filter(i => i.category !== 'FINISHED');
    const pick = rawItems[batchIngredients.length % rawItems.length] || items[0];
    if (pick) {
      const avg = Number(pick.currentAvgCostRupiah || 50);
      setBatchIngredients(prev => [
        ...prev,
        {
          id: `custom-${Date.now()}-${prev.length + 1}`,
          itemId: pick.id,
          name: pick.name,
          stockInfo: `Stok: ${pick.currentStockQty} ${pick.displayUnit || pick.unitBase} | HPP: Rp ${avg}`,
          qty: 50,
          unit: pick.displayUnit || pick.unitBase || 'g',
          avgCost: avg,
        }
      ]);
    }
  };

  const removeBatchIngredient = (id: string) => {
    setBatchIngredients(prev => prev.filter(item => item.id !== id));
  };

  // Estimasi Total Biaya Bahan Baku
  const estimatedBatchCost = batchIngredients.reduce((acc, ing) => {
    const found = items.find(i => i.id === ing.itemId);
    const avg = Number(found?.currentAvgCostRupiah ?? ing.avgCost ?? 50);
    return acc + (Number(ing.qty || 0) * avg);
  }, 0);

  const estimatedHppPerPcs = qtyGood > 0 ? (estimatedBatchCost / qtyGood).toFixed(0) : '0';

  const handleSubmitBatch = async () => {
    if (qtyGood <= 0) {
      showNotification("Qty Good (Hasil Baik) harus lebih dari 0.");
      return;
    }
    if (batchIngredients.length === 0) {
      showNotification("Pilih minimal satu bahan baku untuk produksi batch.");
      return;
    }
    setIsSubmitting(true);
    try {
      const refNum = batchRef;
      await api.batches.create({
        outputItemId: batchOutputItemId,
        recipeId: matchedRecipe?.id,
        inputs: batchIngredients.map(b => ({ itemId: b.itemId, qty: Number(b.qty) })),
        qtyGood,
        qtyWaste,
        wasteTreatment: batchWasteTreatment,
        notes: batchNotes,
      });
      addAuditLog({
        ref: refNum,
        tipe: 'BATCH',
        operator: 'Chef Dapur',
        nominal: estimatedBatchCost,
        keterangan: `Batch Produksi: ${qtyGood} unit jadi (${batchIngredients.length} bahan)`
      });
      showNotification(`Produksi Batch berhasil! Menghasilkan ${qtyGood} unit (HPP ~Rp ${Number(estimatedHppPerPcs).toLocaleString('id-ID')}/unit).`);
      setBatchRef(`BCH-20260925-${Math.floor(100 + Math.random() * 900)}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan produksi batch';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 4. FINANCE MANUAL STATE
  // ========================================================
  const [finDate, setFinDate] = useState('2026-10-06');
  const [finJenis, setFinJenis] = useState<'EXPENSE' | 'INCOME'>('INCOME');
  const [finNominal, setFinNominal] = useState('');
  const [finCat, setFinCat] = useState('Setoran Modal Pemilik / Kas Kecil');
  const [finChannel, setFinChannel] = useState<'BANK' | 'CASH'>('CASH');
  const [finNote, setFinNote] = useState('');

  // Saat jenis mutasi berubah, ganti kategori default yang sesuai
  useEffect(() => {
    if (finJenis === 'INCOME') {
      const inc = categories.find(c => c.kind === 'INCOME' && c.name !== 'Penjualan Kasir');
      setFinCat(inc ? inc.name : 'Setoran Modal Pemilik / Kas Kecil');
    } else {
      const exp = categories.find(c => c.kind === 'EXPENSE');
      setFinCat(exp ? exp.name : 'Biaya Pemasaran / Iklan');
    }
  }, [finJenis, categories]);

  const handleSubmitFinance = async () => {
    const nom = Number(finNominal);
    if (!nom || nom <= 0) {
      showNotification("Masukkan nominal transaksi yang valid (> 0).");
      return;
    }
    setIsSubmitting(true);
    try {
      const refNum = financeRef;
      await api.finance.createTransaction({
        txnDate: finDate,
        kind: finJenis,
        channel: finChannel,
        categoryName: finCat,
        amountRupiah: nom,
        note: finNote,
      });
      addAuditLog({
        ref: refNum,
        tipe: 'EXPENSE',
        operator: 'Owner',
        nominal: nom,
        keterangan: `${finJenis === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} [${finCat}] via ${finChannel}: ${finNote || '-'}`
      });
      showNotification(`Transaksi ${finJenis} Rp ${nom.toLocaleString('id-ID')} berhasil dicatat ke Kas Buku!`);
      setFinNominal('');
      setFinNote('');
      setFinanceRef(`FIN-MAN-20260925-${Math.floor(1000 + Math.random() * 9000)}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat transaksi finance';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1050px] mx-auto pb-12 font-sans relative">
      <Topbar />

      {/* Floating Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 bg-green text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            OPERASIONAL DAPUR & GUDANG
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Form Input Operasional</h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-line pb-px overflow-x-auto hidden-scrollbar">
        {[
          { id: 'pembelian', label: '1. Pembelian (Beli Bahan)' },
          { id: 'yield', label: '2. Yield / Prep (Daging)' },
          { id: 'batch', label: '3. Produksi Batch (BOM Resep)' },
          { id: 'finance', label: '4. Finance Manual (Kas/Bank)' },
          { id: 'history', label: '5. Riwayat & Hapus (Hard Delete)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'pembelian' | 'yield' | 'batch' | 'finance' | 'history');
              if (tab.id === 'history') loadHistory();
            }}
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

      {/* Content Container */}
      <div className="bg-card border border-line rounded-[14px] p-6 shadow-sm min-h-[500px]">
        
        {/* ========================================================
            TAB 1: PEMBELIAN BAHAN BAKU
            ======================================================== */}
        {activeTab === 'pembelian' && (
          <div className="max-w-4xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                  INPUT · PEMBELIAN (IN)
                </div>
                <h2 className="font-serif font-bold text-xl text-ink">Nota Pembelian Bahan Baku</h2>
                <p className="text-xs text-side-text mt-0.5">
                  Input kuantitas dan harga satuan barang. Sistem otomatis mengalikan ke total tagihan dan memperbarui stok gudang.
                </p>
              </div>

              {/* Quick Add Button */}
              <button 
                onClick={() => setShowQuickAddItemModal(true)}
                className="bg-gold-soft border border-chip-border hover:bg-gold hover:text-white text-gold font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                title="Tambah barang baru jika belum terdaftar di Master Data"
              >
                <Plus size={14} /> + Barang Baru (Quick Add)
              </button>
            </div>
            
            {/* Header Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-stat border border-line rounded-xl p-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">No Transaksi / Ref</label>
                <div className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-gold" suppressHydrationWarning>
                  {purchaseRef}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal Pembelian</label>
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Supplier</label>
                <input 
                  type="text" 
                  placeholder="Nama supplier / Toko..." 
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kanal Pembayaran</label>
                <select 
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value as 'CASH' | 'BANK')}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold font-bold" 
                >
                  <option value="CASH">CASH (Kas Tunai)</option>
                  <option value="BANK">BANK (Transfer/Debit)</option>
                </select>
              </div>
            </div>

            {/* Tabel Daftar Barang Pembelian */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-ink block">Daftar Barang yang Dibeli</label>
                <span className="text-[11px] text-side-text">
                  Perhitungan: <span className="font-mono font-bold text-ink">Qty × Harga Satuan = Subtotal</span>
                </span>
              </div>
              
              {/* Header Kolom */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-[10px] font-bold text-side-text uppercase tracking-wider">
                <div className="col-span-5">Barang / Item Master</div>
                <div className="col-span-2 text-center">Jumlah (Qty)</div>
                <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
                <div className="col-span-2 text-right">Subtotal (Rp)</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>

              {purchaseLines.length === 0 ? (
                <div className="text-center py-8 bg-surface border border-dashed border-line rounded-xl p-6">
                  <p className="font-semibold text-xs text-ink mb-1">Daftar Barang Pembelian Masih Kosong</p>
                  <p className="text-[11px] text-side-text mb-3">Klik tombol di bawah untuk menambah baris barang pembelian atau daftarkan item baru.</p>
                  <div className="flex justify-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => addPurchaseLine()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stat border border-line rounded-lg text-xs font-bold text-ink hover:border-gold"
                    >
                      <Plus size={14} /> + Tambah Baris
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickAddItemModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-soft border border-chip-border text-gold rounded-lg text-xs font-bold hover:bg-gold hover:text-white"
                    >
                      <Plus size={14} /> + Quick Add Barang Baru
                    </button>
                  </div>
                </div>
              ) : (
                purchaseLines.map(line => {
                  const subtotal = Number(line.qty || 0) * Number(line.unitPrice || 0);

                  return (
                  <div key={line.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-surface border border-line rounded-xl p-3 shadow-2xs">
                    {/* Item Dropdown */}
                    <div className="sm:col-span-5">
                      <select 
                        value={line.itemId}
                        onChange={(e) => {
                          const itId = Number(e.target.value);
                          const selItem = items.find(i => i.id === itId);
                          setPurchaseLines(prev => prev.map(l => l.id === line.id ? {
                            ...l,
                            itemId: itId,
                            unit: selItem?.displayUnit || selItem?.unitBase || 'Pcs',
                            unitPrice: Number(selItem?.currentAvgCostRupiah || l.unitPrice)
                          } : l));
                        }}
                        className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none focus:border-gold font-bold"
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.sku}) - {it.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty & Unit */}
                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <input 
                        type="number" 
                        min="0.01"
                        step="any"
                        value={line.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPurchaseLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                        }}
                        placeholder="Qty"
                        className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-xs text-ink outline-none font-mono text-center focus:border-gold font-bold" 
                      />
                      <span className="text-[11px] font-bold text-side-text whitespace-nowrap min-w-[28px]">{line.unit}</span>
                    </div>

                    {/* Harga Satuan */}
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPurchaseLines(prev => prev.map(l => l.id === line.id ? { ...l, unitPrice: val } : l));
                          }}
                          placeholder="Harga Satuan"
                          className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-xs text-ink outline-none font-mono text-right focus:border-gold" 
                        />
                      </div>
                    </div>

                    {/* Subtotal (Otomatis Dikali) */}
                    <div className="sm:col-span-2 text-right">
                      <div className="font-mono font-bold text-xs text-green py-1.5 px-2 bg-stat/60 rounded-lg border border-line/60">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Hapus */}
                    <div className="sm:col-span-1 flex justify-center">
                      <button 
                        onClick={() => removePurchaseLine(line.id)}
                        className="p-1.5 text-red/60 hover:text-red hover:bg-red/10 rounded-lg transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
              )}
              
              <button 
                onClick={() => addPurchaseLine()}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors font-bold mt-2"
              >
                <Plus size={14} /> Tambah Baris Pembelian
              </button>
            </div>

            {/* Total Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-line gap-4">
              <div>
                <span className="text-xs text-side-text block">TOTAL PEMBELIAN NOTA:</span>
                <div className="text-2xl font-serif text-ink">
                  Total Tagihan: <span className="font-bold text-green font-mono">Rp {totalPembelian.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button 
                onClick={handleSubmitPembelian}
                disabled={isSubmitting}
                className="bg-gold hover:bg-[#A38225] disabled:bg-line text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
              >
                {isSubmitting ? "Menyimpan ke Ledger..." : "Simpan Transaksi ke Ledger"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: YIELD / PREP
            ======================================================== */}
        {activeTab === 'yield' && (
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · YIELD / PREP
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Pre-Processing Protein (Pemisahan Tulang/Lemak)</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">NO TRANSAKSI / REF</label>
                <div className="bg-surface border border-line rounded-lg px-3 py-2 text-gold font-mono font-bold text-xs" suppressHydrationWarning>
                  {yieldRef}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM ASAL (RAW)</label>
                <select
                  value={sourceItemId}
                  onChange={(e) => setSourceItemId(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                >
                  {proteinItems.map(it => (
                    <option key={it.id} value={it.id}>{it.name} (Stok: {it.currentStockQty}g)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM HASIL BERSIH</label>
                <select
                  value={outputItemId}
                  onChange={(e) => setOutputItemId(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                >
                  {proteinItems.map(it => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT ASAL (g)</label>
                <input 
                  type="number" 
                  value={beratAsal}
                  onChange={(e) => setBeratAsal(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT BERSIH (g)</label>
                <input 
                  type="number" 
                  value={beratBersih}
                  onChange={(e) => setBeratBersih(Number(e.target.value))}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT SUSUT (g)</label>
                <div className="w-full bg-stat border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono flex items-center">
                  {beratSusut.toLocaleString('id-ID')} g <span className="text-side-text ml-2">· {persenSusut}%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ALASAN SUSUT</label>
              <input 
                type="text" 
                value={alasanSusut}
                onChange={(e) => setAlasanSusut(e.target.value)}
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />
            </div>

            <div className="bg-surface border border-chip-border rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-line" />
              <label className="text-[10px] font-bold text-gold uppercase block mb-2 tracking-wider">PRATINJAU HPP BERSIH</label>
              <div className="font-mono text-2xl font-bold text-green mb-1">
                Rp {hppPerGram} / g
              </div>
              <div className="text-[11px] text-side-text">
                Nilai aset dipindah Rp {totalValTransfer.toLocaleString('id-ID')} · Konservasi nilai gudang (Prinsip I-2)
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-line">
              <button 
                onClick={handleSubmitYield}
                disabled={isSubmitting}
                className="bg-gold hover:bg-[#A38225] disabled:bg-line text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
              >
                {isSubmitting ? "Memproses Pemindahan Nilai..." : "Simpan & Pindahkan Saldo ke Daging Bersih"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: PRODUKSI BATCH (INTEGRASI BOM & RESEP STANDAR)
            ======================================================== */}
        {activeTab === 'batch' && (
          <div className="max-w-4xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                  INPUT · PRODUKSI BATCH
                </div>
                <h2 className="font-serif font-bold text-xl text-ink">Produksi Resep (BOM) & Pencatatan Afkir</h2>
                <p className="text-xs text-side-text mt-0.5">
                  Pilih item olahan yang ingin dibuat. Jika ada resep di Master BOM, bahan baku akan keluar otomatis dan dapat Anda sesuaikan riil di bawah.
                </p>
              </div>

              {matchedRecipe && (
                <button
                  onClick={() => applyRecipeBom(batchOutputItemId, qtyGood)}
                  className="bg-gold-soft border border-chip-border hover:bg-gold hover:text-white text-gold font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Terapkan kembali takaran dari Master BOM"
                >
                  <Sparkles size={14} /> Muat Ulang Formula BOM
                </button>
              )}
            </div>

            {/* Banner BOM Aktif */}
            {matchedRecipe ? (
              <div className="bg-gold-soft/70 border border-chip-border rounded-xl p-3.5 mb-6 flex items-start gap-3 text-xs text-ink">
                <BookOpen size={18} className="text-gold shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-gold">
                    Resep Master Terhubung: <span className="underline">{matchedRecipe.outputItemName}</span> (Basis: {matchedRecipe.basisQty} {matchedRecipe.outputItemUnit || 'Pcs'})
                  </div>
                  <div className="text-[11px] text-side-text mt-0.5">
                    Bahan-bahan di bawah otomatis terisi sesuai takaran standar. Anda dapat bebas mengedit gramasi riil atau menambah bahan baru sesuai kondisi dapur hari ini.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stat border border-line rounded-xl p-3 mb-6 flex items-center gap-2 text-xs text-side-text">
                <HelpCircle size={16} className="text-gold shrink-0" />
                <span>
                  Belum ada resep BOM baku untuk item ini di Master Data. Anda dapat menambahkan bahan secara manual di bawah.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Kolom Bahan Baku */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-line pb-2">
                  <h3 className="font-bold text-sm text-ink">Bahan Baku yang Digunakan</h3>
                  <span className="text-[10px] text-side-text uppercase font-bold font-mono">
                    {batchIngredients.length} Komponen
                  </span>
                </div>
                
                <div className="space-y-3">
                  {batchIngredients.length === 0 ? (
                    <div className="text-center py-8 bg-surface border border-dashed border-line rounded-xl p-4">
                      <p className="font-semibold text-xs text-ink mb-1">Belum Ada Komposisi Bahan Baku</p>
                      <p className="text-[11px] text-side-text">Pilih item output olahan yang memiliki Resep BOM, atau klik tombol di bawah untuk menambah bahan secara manual.</p>
                    </div>
                  ) : (
                    batchIngredients.map(item => (
                    <div key={item.id} className="bg-surface border border-line rounded-xl p-3 flex justify-between items-center shadow-2xs">
                      <div className="flex-1">
                        <select 
                          value={item.itemId}
                          onChange={(e) => {
                            const itId = Number(e.target.value);
                            const sel = items.find(i => i.id === itId);
                            const avg = Number(sel?.currentAvgCostRupiah || 0);
                            setBatchIngredients(prev => prev.map(b => b.id === item.id ? {
                              ...b,
                              itemId: itId,
                              name: sel?.name || '',
                              unit: sel?.displayUnit || sel?.unitBase || 'g',
                              avgCost: avg,
                              stockInfo: `Stok: ${sel?.currentStockQty} | HPP: Rp ${avg}`,
                            } : b));
                          }}
                          className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-bold text-ink outline-none mb-1"
                        >
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.name} (Stok: {it.currentStockQty} {it.displayUnit || it.unitBase})
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-side-text font-mono">{item.stockInfo}</div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        <input 
                          type="number" 
                          step="any"
                          value={item.qty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBatchIngredients(prev => prev.map(i => i.id === item.id ? {...i, qty: val} : i));
                          }}
                          className="w-20 bg-surface border border-line rounded text-xs p-1.5 font-mono text-right outline-none focus:border-gold font-bold" 
                        />
                        <span className="text-xs font-bold text-side-text w-8">{item.unit}</span>
                        <button 
                          onClick={() => removeBatchIngredient(item.id)}
                          className="text-red/60 hover:text-red hover:bg-red/10 p-1 rounded transition-colors"
                          title="Hapus bahan"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>

                <button 
                  onClick={addBatchIngredient}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors font-bold"
                >
                  <Plus size={16} /> + Tambah Bahan Baku Baru
                </button>
              </div>

              {/* Kolom Hasil Produksi */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2">Target & Hasil Produksi</h3>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">NO BATCH PRODUKSI / REF</label>
                  <div className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-gold mb-2" suppressHydrationWarning>
                    {batchRef}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM OUTPUT (HASIL OLAHAN)</label>
                  <select 
                    value={batchOutputItemId}
                    onChange={(e) => handleOutputItemChange(Number(e.target.value))}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold mb-3"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>{it.name} ({it.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY GOOD (HASIL BAIK)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={qtyGood}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQtyGood(val);
                        // Optional auto-scale if connected to BOM
                        if (matchedRecipe) {
                          applyRecipeBom(batchOutputItemId, val);
                        }
                      }}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY WASTE (AFKIR)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={qtyWaste}
                      onChange={(e) => setQtyWaste(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1 mt-2">PERLAKUAN SISA/AFKIR</label>
                  <select 
                    value={batchWasteTreatment}
                    onChange={(e) => setBatchWasteTreatment(e.target.value as 'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK')}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold text-xs font-bold"
                  >
                    <option value="ABSORBED_TO_HPP">ABSORBED_TO_HPP (Bebankan biaya afkir ke hasil baik)</option>
                    <option value="LOSS">LOSS (Catat afkir sebagai kerugian non-kas)</option>
                    <option value="RETURNED_TO_STOCK">RETURNED_TO_STOCK (Sisa bahan tak terpakai dikembalikan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">CATATAN BATCH</label>
                  <input 
                    type="text" 
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none focus:border-gold"
                  />
                </div>

                <div className="bg-stat border border-line rounded-xl p-3.5 mt-4">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-side-text">Total Biaya Bahan Baku</span>
                    <span className="font-mono font-bold text-ink">Rp {estimatedBatchCost.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-line">
                    <span className="text-side-text">Estimasi HPP per Unit ({qtyGood} Unit)</span>
                    <span className="font-mono font-bold text-green text-sm">
                      Rp {Number(estimatedHppPerPcs).toLocaleString('id-ID')} / unit
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-line mt-6">
              <button 
                onClick={handleSubmitBatch}
                disabled={isSubmitting}
                className="bg-gold hover:bg-[#A38225] disabled:bg-line text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? "Menyelesaikan Batch..." : "Simpan & Selesaikan Batch"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: FINANCE MANUAL (KAS / BANK)
            ======================================================== */}
        {activeTab === 'finance' && (
          <div className="max-w-xl mx-auto">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1 text-center">
              INPUT · FINANCE MANUAL
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-2 text-center">Catat Kas & Bank Operasional</h2>
            <p className="text-xs text-side-text text-center mb-6">
              Catat aliran dana kas fisik maupun mutasi bank di luar transaksi kasir POS.
            </p>

            {/* Helper Alert Box: Fungsi INCOME vs EXPENSE */}
            {finJenis === 'INCOME' ? (
              <div className="bg-gold-soft border border-chip-border rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-ink">
                <Sparkles size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gold block mb-0.5">Fungsi Pemasukan (Income) Manual:</span>
                  Untuk mencatat uang masuk ke kas kecil atau rekening bank yang <strong>BUKAN dari penjualan kasir harian</strong>.
                  Contoh: Setoran modal awal Owner, penjualan limbah kardus / minyak jelantah sisa dapur, bunga bank, atau pengembalian dana (refund) dari supplier.
                </div>
              </div>
            ) : (
              <div className="bg-stat border border-line rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-side-text">
                <AlertCircle size={16} className="text-red shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink block mb-0.5">Fungsi Pengeluaran (Expense) Manual:</span>
                  Untuk mencatat biaya operasional rutin di luar pembelian bahan baku inventory.
                  Contoh: Biaya listrik, tagihan air PDAM, pembelian gas elpiji 12kg, iklan medsos, atau gaji karyawan.
                </div>
              </div>
            )}
            
            <div className="bg-stat border border-line rounded-xl p-5 space-y-4 shadow-sm">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">NO TRANSAKSI / REF</label>
                <div className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-gold" suppressHydrationWarning>
                  {financeRef}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    value={finDate}
                    onChange={(e) => setFinDate(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis Mutasi</label>
                  <select 
                    value={finJenis}
                    onChange={(e) => setFinJenis(e.target.value as 'EXPENSE' | 'INCOME')}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="INCOME">INCOME (Pemasukan Kas/Bank Non-Penjualan)</option>
                    <option value="EXPENSE">EXPENSE (Pengeluaran Operasional)</option>
                  </select>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1.5">Preset Cepat Kategori</label>
                <div className="flex flex-wrap gap-1.5">
                  {finJenis === 'INCOME' ? (
                    [
                      { cat: 'Setoran Modal Pemilik / Kas Kecil', note: 'Setoran modal kas kecil dari Owner' },
                      { cat: 'Pendapatan Luar Usaha (Jual Limbah/Kardus)', note: 'Penjualan kardus bekas & minyak jelantah' },
                      { cat: 'Bunga Bank / Jasa Giro', note: 'Pendapatan bunga tabungan bank' },
                      { cat: 'Refund & Klaim Supplier', note: 'Pengembalian uang retur dari supplier' },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFinCat(chip.cat);
                          setFinNote(chip.note);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          finCat === chip.cat 
                            ? 'bg-gold text-white border-gold shadow-2xs' 
                            : 'bg-surface text-side-text hover:text-ink border-line'
                        }`}
                      >
                        {chip.cat}
                      </button>
                    ))
                  ) : (
                    [
                      { cat: 'Biaya Utilitas (Listrik, Air, Gas)', note: 'Beli token listrik / gas elpiji dapur' },
                      { cat: 'Biaya Pemasaran / Iklan', note: 'Iklan Instagram Story promo akhir pekan' },
                      { cat: 'Gaji Karyawan', note: 'Gaji shift / mingguan kru dapur' },
                      { cat: 'Operasional Lainnya', note: 'Biaya operasional tak terduga' },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFinCat(chip.cat);
                          setFinNote(chip.note);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          finCat === chip.cat 
                            ? 'bg-gold text-white border-gold shadow-2xs' 
                            : 'bg-surface text-side-text hover:text-ink border-line'
                        }`}
                      >
                        {chip.cat}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori Akun</label>
                  <select 
                    value={finCat}
                    onChange={(e) => setFinCat(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                  >
                    {categories.filter(c => c.kind === finJenis).length > 0 ? (
                      categories.filter(c => c.kind === finJenis).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      finJenis === 'INCOME' ? (
                        <>
                          <option value="Setoran Modal Pemilik / Kas Kecil">Setoran Modal Pemilik / Kas Kecil</option>
                          <option value="Pendapatan Luar Usaha (Jual Limbah/Kardus)">Pendapatan Luar Usaha (Jual Limbah/Kardus)</option>
                          <option value="Bunga Bank / Jasa Giro">Bunga Bank / Jasa Giro</option>
                          <option value="Refund & Klaim Supplier">Refund & Klaim Supplier</option>
                        </>
                      ) : (
                        <>
                          <option value="Biaya Utilitas (Listrik, Air, Gas)">Biaya Utilitas (Listrik, Air, Gas)</option>
                          <option value="Biaya Pemasaran / Iklan">Biaya Pemasaran / Iklan</option>
                          <option value="Gaji Karyawan">Gaji Karyawan</option>
                          <option value="Operasional Lainnya">Operasional Lainnya</option>
                        </>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kanal Pembayaran</label>
                  <select 
                    value={finChannel}
                    onChange={(e) => setFinChannel(e.target.value as 'BANK' | 'CASH')}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="CASH">CASH (Kas Fisik)</option>
                    <option value="BANK">BANK (Transfer / QRIS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nominal (Rp)</label>
                <input 
                  type="number" 
                  placeholder="50000" 
                  value={finNominal}
                  onChange={(e) => setFinNominal(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-3 text-lg font-bold text-ink font-mono outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Keterangan / Catatan</label>
                <textarea 
                  rows={3} 
                  placeholder="Keterangan transaksi..." 
                  value={finNote}
                  onChange={(e) => setFinNote(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                ></textarea>
              </div>

              <button 
                onClick={handleSubmitFinance}
                disabled={isSubmitting}
                className="w-full bg-gold hover:bg-[#A38225] disabled:bg-line text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-sm mt-2"
              >
                {isSubmitting ? "Menyimpan ke Buku Kas..." : "Simpan Catatan Finance"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: RIWAYAT & HARD DELETE (SEMUA TRANSAKSI BISA DIHAPUS)
            ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-line pb-4">
              <div>
                <span className="text-[10px] font-bold text-red uppercase tracking-wider bg-red/10 px-2 py-0.5 rounded-full border border-red/20">
                  MANAJEMEN TRANSAKSI & HARD DELETE
                </span>
                <h2 className="font-serif font-bold text-xl text-ink mt-1">Riwayat & Hapus Transaksi</h2>
                <p className="text-xs text-side-text">
                  Hapus transaksi yang salah input secara permanen. Mutasi stok dan catatan kas terkait akan dibersihkan otomatis.
                </p>
              </div>
              <button 
                onClick={loadHistory}
                className="px-3 py-1.5 bg-surface border border-line hover:border-gold text-xs font-bold text-ink rounded-lg transition-colors flex items-center gap-1.5"
              >
                🔄 Refresh Riwayat
              </button>
            </div>

            {/* Sub-section 1: Pembelian */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Riwayat Pembelian Bahan Baku ({recentPurchases.length})
                </h3>
              </div>
              <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">No Ref / ID</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                      <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-side-text italic">
                          Belum ada data transaksi pembelian.
                        </td>
                      </tr>
                    ) : (
                      recentPurchases.map(p => (
                        <tr key={p.id} className="hover:bg-stat/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-gold">{p.purchaseCode || `#${p.id}`}</td>
                          <td className="py-2.5 px-3 text-side-text">{p.purchaseDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-ink">{p.supplierName || '-'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-line/60 text-ink">
                              {p.paymentChannel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-ink">
                            Rp {Number(p.totalRupiah || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeletePurchase(p.id)}
                              className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Hapus Permanen Transaksi Pembelian Ini"
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

            {/* Sub-section 2: Yield / Prep */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Riwayat Yield & Trim Daging ({recentYields.length})
                </h3>
              </div>
              <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Kode Prep</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Bahan Masuk</th>
                      <th className="py-2.5 px-3 text-right">Hasil Bersih</th>
                      <th className="py-2.5 px-3 text-right">Susut / Waste</th>
                      <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentYields.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-side-text italic">
                          Belum ada data yield prep.
                        </td>
                      </tr>
                    ) : (
                      recentYields.map(y => (
                        <tr key={y.id} className="hover:bg-stat/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-gold">{y.prepCode || `#${y.id}`}</td>
                          <td className="py-2.5 px-3 text-side-text">{y.prepDate}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-ink">{Number(y.sourceQtyUsed).toLocaleString('id-ID')} g</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-600">{Number(y.cleanOutputQty).toLocaleString('id-ID')} g</td>
                          <td className="py-2.5 px-3 font-mono text-right text-red">{Number(y.wasteQty).toLocaleString('id-ID')} g</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteYield(y.id)}
                              className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Hapus Permanen Yield Prep Ini"
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

            {/* Sub-section 3: Batch Produksi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Riwayat Produksi Batch ({recentBatches.length})
                </h3>
              </div>
              <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Kode Batch</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Hasil Jadi (Good)</th>
                      <th className="py-2.5 px-3 text-right">Total Biaya</th>
                      <th className="py-2.5 px-3 text-right">HPP / Unit</th>
                      <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-side-text italic">
                          Belum ada data batch produksi.
                        </td>
                      </tr>
                    ) : (
                      recentBatches.map(b => (
                        <tr key={b.id} className="hover:bg-stat/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-gold">{b.batchCode || `#${b.id}`}</td>
                          <td className="py-2.5 px-3 text-side-text">{b.batchDate}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-ink">{b.qtyGood} pcs</td>
                          <td className="py-2.5 px-3 font-mono text-right text-ink">Rp {Number(b.totalCostRupiah || 0).toLocaleString('id-ID')}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-emerald-600 font-bold">Rp {Number(b.hppPerUnitRupiah || 0).toLocaleString('id-ID')}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteBatch(b.id)}
                              className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Hapus Permanen Batch Produksi Ini"
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

            {/* Sub-section 4: Finance Manual */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Riwayat Catatan Keuangan Kas / Bank ({recentFinances.length})
                </h3>
              </div>
              <div className="overflow-x-auto border border-line rounded-xl bg-surface/50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stat text-side-text border-b border-line uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-3">Akun</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Catatan</th>
                      <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentFinances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-side-text italic">
                          Belum ada catatan keuangan kas / bank.
                        </td>
                      </tr>
                    ) : (
                      recentFinances.map(f => (
                        <tr key={f.id} className="hover:bg-stat/60 transition-colors">
                          <td className="py-2.5 px-3 text-side-text">{f.txnDate}</td>
                          <td className="py-2.5 px-3 font-bold">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${f.kind === 'INCOME' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red/10 text-red'}`}>
                              {f.kind === 'INCOME' ? 'MASUK' : 'KELUAR'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-ink">{f.channel}</td>
                          <td className="py-2.5 px-3 text-ink font-semibold">{f.categoryName || '-'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-ink">
                            Rp {Number(f.amountRupiah || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-side-text truncate max-w-xs">{f.note || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteFinance(f.id)}
                              className="p-1.5 text-red/70 hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Hapus Catatan Keuangan Ini"
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

          </div>
        )}

      </div>

      {/* ========================================================
          MODAL: QUICK ADD BARANG BARU (LANGSUNG DARI PEMBELIAN)
          ======================================================== */}
      {showQuickAddItemModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-line bg-stat flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  QUICK ADD
                </span>
                <h3 className="font-serif font-bold text-lg text-ink">
                  Tambah Barang ke Master Data
                </h3>
              </div>
              <button 
                onClick={() => setShowQuickAddItemModal(false)}
                className="text-side-text hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickItem} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Barang / Bahan</label>
                <input 
                  type="text" 
                  placeholder="Misal: Bawang Bombay Kering" 
                  required 
                  value={quickItemForm.name}
                  onChange={e => setQuickItemForm({...quickItemForm, name: e.target.value})}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    value={quickItemForm.category}
                    onChange={e => setQuickItemForm({...quickItemForm, category: e.target.value as 'RAW_DRY' | 'RAW_PROTEIN' | 'SEMI_FINISHED' | 'FINISHED'})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="RAW_DRY">RAW_DRY (Bahan Kering)</option>
                    <option value="RAW_PROTEIN">RAW_PROTEIN (Daging/Basah)</option>
                    <option value="SEMI_FINISHED">SEMI_FINISHED (Olahan)</option>
                    <option value="FINISHED">FINISHED (Menu Jadi)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Tampilan</label>
                  <input 
                    type="text" 
                    placeholder="Kg, Pcs, Pack, Galon..." 
                    required 
                    value={quickItemForm.displayUnit}
                    onChange={e => setQuickItemForm({...quickItemForm, displayUnit: e.target.value})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold font-bold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Satuan Dasar</label>
                  <select 
                    value={quickItemForm.unitBase}
                    onChange={e => setQuickItemForm({...quickItemForm, unitBase: e.target.value})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="g">g (gram)</option>
                    <option value="pcs">pcs</option>
                    <option value="ml">ml (milliliter)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Estimasi Harga Beli (Rp)</label>
                  <input 
                    type="number" 
                    value={quickItemForm.unitPrice}
                    onChange={e => setQuickItemForm({...quickItemForm, unitPrice: Number(e.target.value)})}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none font-mono focus:border-gold" 
                  />
                </div>
              </div>

              <div className="bg-stat border border-line rounded-lg p-2.5 text-[11px] text-side-text">
                💡 Barang baru akan langsung disimpan ke Master Data dan seketika ditambahkan ke baris nota pembelian Anda tanpa perlu keluar halaman.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button 
                  type="button" 
                  onClick={() => setShowQuickAddItemModal(false)}
                  className="px-4 py-2 border border-line rounded-lg text-sm text-side-text hover:bg-stat font-bold"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gold hover:bg-[#A38225] text-white font-bold rounded-lg text-sm shadow-sm"
                >
                  Simpan & Pilih Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
