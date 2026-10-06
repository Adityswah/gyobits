'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Trash2, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, ItemRecord, FinanceCategoryRecord } from '@/lib/api';

interface PurchaseLine {
  id: string;
  itemId: number;
  qty: number;
  unit: string;
  price: number;
}

interface BatchIngredient {
  id: string;
  itemId: number;
  name: string;
  stockInfo: string;
  qty: number;
  unit: string;
}

export default function InputPage() {
  const [activeTab, setActiveTab] = useState<'pembelian' | 'yield' | 'batch' | 'finance'>('pembelian');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryRecord[]>([]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadData = useCallback(() => {
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
    ])
      .then(([itemsRes, catsRes]) => {
        setItems(itemsRes.data || []);
        setCategories(catsRes.data || []);
      })
      .catch((err) => {
        console.warn('Failed to load items/categories for input page:', err);
      });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.items.getAll(),
      api.finance.getCategories(),
    ])
      .then(([itemsRes, catsRes]) => {
        if (active) {
          setItems(itemsRes.data || []);
          setCategories(catsRes.data || []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load items/categories for input page:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // ========================================================
  // 1. PEMBELIAN FORM STATE
  // ========================================================
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([
    { id: '1', itemId: 6, qty: 5, unit: 'Pack', price: 75000 }
  ]);
  const [supplier, setSupplier] = useState('Toko Sejahtera');
  const [purchaseDate, setPurchaseDate] = useState('2026-10-06');
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'BANK'>('CASH');

  const addPurchaseLine = () => {
    const defaultItem = items[0] || { id: 1, name: 'Bahan Baku', displayUnit: 'Pcs' };
    setPurchaseLines(prev => [
      ...prev,
      { id: `${prev.length + 1}`, itemId: defaultItem.id, qty: 1, unit: defaultItem.displayUnit || 'Pcs', price: 50000 }
    ]);
  };

  const removePurchaseLine = (id: string) => {
    setPurchaseLines(prev => prev.filter(l => l.id !== id));
  };

  const totalPembelian = purchaseLines.reduce((acc, l) => acc + l.price, 0);

  const handleSubmitPembelian = async () => {
    if (purchaseLines.length === 0) {
      showNotification("Tambahkan minimal satu baris barang pembelian.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.purchases.create({
        purchaseDate,
        supplierName: supplier || 'Supplier Umum',
        paymentChannel,
        lines: purchaseLines.map(l => ({
          itemId: l.itemId,
          qty: l.qty,
          lineTotalRupiah: l.price,
        })),
      });
      showNotification(`Transaksi Pembelian Rp ${totalPembelian.toLocaleString('id-ID')} berhasil dicatat ke Ledger!`);
      // Reset
      setPurchaseLines([{ id: '1', itemId: items[0]?.id || 1, qty: 1, unit: 'Pcs', price: 50000 }]);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi pembelian';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 2. YIELD / PREP STATE
  // ========================================================
  const proteinItems = items.filter(i => i.category === 'RAW_PROTEIN' || i.category === 'SEMI_FINISHED');
  const [sourceItemId, setSourceItemId] = useState<number>(4); // Daging Sapi Utuh
  const [outputItemId, setOutputItemId] = useState<number>(5); // Daging Sapi Cincang Bersih
  const [beratAsal, setBeratAsal] = useState<number>(10000);
  const [beratBersih, setBeratBersih] = useState<number>(8000);
  const [alasanSusut, setAlasanSusut] = useState<string>('Tulang, lemak, dan trimming');

  const beratSusut = Math.max(0, beratAsal - beratBersih);
  const persenSusut = beratAsal > 0 ? ((beratSusut / beratAsal) * 100).toFixed(0) : '0';
  
  const sourceItem = items.find(i => i.id === sourceItemId);
  const sourceStockVal = Number(sourceItem?.currentStockValueRupiah || 380000);
  const sourceStockQty = Number(sourceItem?.currentStockQty || 10000);
  const totalValTransfer = sourceStockQty > 0 ? Math.round((beratAsal * sourceStockVal) / sourceStockQty) : 380000;
  const hppPerGram = (totalValTransfer / (beratBersih || 1)).toFixed(2);

  const handleSubmitYield = async () => {
    if (beratBersih <= 0 || beratBersih > beratAsal) {
      showNotification("Berat bersih harus lebih dari 0 dan tidak boleh melebihi berat asal.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.yields.create({
        sourceItemId,
        outputItemId,
        sourceQtyUsed: beratAsal,
        cleanOutputQty: beratBersih,
        wasteReason: alasanSusut,
      });
      showNotification(`Yield Prep berhasil disimpan! HPP Daging Bersih: Rp ${hppPerGram}/g`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan yield prep';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 3. PRODUKSI BATCH STATE
  // ========================================================
  const [batchOutputItemId, setBatchOutputItemId] = useState<number>(7); // Gyoza Mentah
  const [batchIngredients, setBatchIngredients] = useState<BatchIngredient[]>([
    { id: '1', itemId: 5, name: 'Daging Sapi Cincang Bersih', stockInfo: 'Stok: 8.000 g | HPP: Rp 47,5/g', qty: 2000, unit: 'g' },
    { id: '2', itemId: 6, name: 'Kulit Gyoza', stockInfo: 'Stok: 100 Pcs | HPP: Rp 150/Pcs', qty: 30, unit: 'Pcs' }
  ]);
  const [qtyGood, setQtyGood] = useState<number>(28);
  const [qtyWaste, setQtyWaste] = useState<number>(2);
  const [batchWasteTreatment, setBatchWasteTreatment] = useState<'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK'>('ABSORBED_TO_HPP');
  const [batchNotes, setBatchNotes] = useState<string>('Produksi batch harian dapur utama');

  const addBatchIngredient = () => {
    const rawItems = items.filter(i => i.category !== 'FINISHED');
    const pick = rawItems[batchIngredients.length % rawItems.length] || items[0];
    if (pick) {
      setBatchIngredients(prev => [
        ...prev,
        {
          id: `${prev.length + 1}`,
          itemId: pick.id,
          name: pick.name,
          stockInfo: `Stok: ${pick.currentStockQty} ${pick.displayUnit} | HPP: Rp ${pick.currentAvgCostRupiah || 0}`,
          qty: 50,
          unit: pick.displayUnit || pick.unitBase || 'g',
        }
      ]);
    }
  };

  const removeBatchIngredient = (id: string) => {
    setBatchIngredients(prev => prev.filter(item => item.id !== id));
  };

  // Estimate total ingredient cost
  const estimatedBatchCost = batchIngredients.reduce((acc, ing) => {
    const found = items.find(i => i.id === ing.itemId);
    const avg = Number(found?.currentAvgCostRupiah || 50);
    return acc + (ing.qty * avg);
  }, 0);

  const estimatedHppPerPcs = qtyGood > 0 ? (estimatedBatchCost / qtyGood).toFixed(0) : '0';

  const handleSubmitBatch = async () => {
    if (qtyGood <= 0) {
      showNotification("Qty Good harus lebih dari 0.");
      return;
    }
    if (batchIngredients.length === 0) {
      showNotification("Pilih minimal satu bahan baku untuk produksi batch.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.batches.create({
        outputItemId: batchOutputItemId,
        inputs: batchIngredients.map(b => ({ itemId: b.itemId, qty: b.qty })),
        qtyGood,
        qtyWaste,
        wasteTreatment: batchWasteTreatment,
        notes: batchNotes,
      });
      showNotification(`Produksi Batch berhasil! Menghasilkan ${qtyGood} unit (HPP ~Rp ${estimatedHppPerPcs}/unit).`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan produksi batch';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 4. FINANCE MANUAL FORM STATE
  // ========================================================
  const [finDate, setFinDate] = useState('2026-10-06');
  const [finJenis, setFinJenis] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [finNominal, setFinNominal] = useState('');
  const [finCat, setFinCat] = useState('Biaya Pemasaran / Iklan');
  const [finChannel, setFinChannel] = useState<'BANK' | 'CASH'>('BANK');
  const [finNote, setFinNote] = useState('');

  const handleSubmitFinance = async () => {
    const nom = Number(finNominal);
    if (!nom || nom <= 0) {
      showNotification("Masukkan nominal transaksi yang valid (> 0).");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.finance.createTransaction({
        txnDate: finDate,
        kind: finJenis,
        channel: finChannel,
        categoryName: finCat,
        amountRupiah: nom,
        note: finNote,
      });
      showNotification(`Transaksi ${finJenis} Rp ${nom.toLocaleString('id-ID')} berhasil dicatat ke Kas Buku!`);
      setFinNominal('');
      setFinNote('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat transaksi finance';
      showNotification(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1000px] mx-auto pb-10 font-sans relative">
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
            OPERASIONAL DAPUR & GUDANG
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Form Input Operasional</h1>
        </div>
        <button 
          onClick={loadData}
          className="p-2 border border-line rounded-lg text-ink bg-card hover:bg-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw size={14} /> Refresh Master
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-px">
        {[
          { id: 'pembelian', label: '1. Pembelian (Beli Bahan)' },
          { id: 'yield', label: '2. Yield / Prep (Daging)' },
          { id: 'batch', label: '3. Produksi Batch (Gyoza)' },
          { id: 'finance', label: '4. Finance Manual (Kas/Bank)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'pembelian' | 'yield' | 'batch' | 'finance')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
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
        
        {/* ================= TAB 1: PEMBELIAN ================= */}
        {activeTab === 'pembelian' && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · PEMBELIAN (IN)
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Nota Pembelian Bahan Baku</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6 bg-stat border border-line rounded-xl p-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal Pembelian</label>
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Nama Supplier</label>
                <input 
                  type="text" 
                  placeholder="Nama supplier..." 
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kanal Pembayaran</label>
                <select 
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value as 'CASH' | 'BANK')}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                >
                  <option value="CASH">CASH (Kas Tunai)</option>
                  <option value="BANK">BANK (Transfer/Debit)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-ink block">Daftar Barang yang Dibeli</label>
              
              {purchaseLines.map(line => (
                <div key={line.id} className="flex gap-3 items-center bg-bg border border-line rounded-xl p-3">
                  <div className="flex-1">
                    <select 
                      value={line.itemId}
                      onChange={(e) => {
                        const itId = Number(e.target.value);
                        const selItem = items.find(i => i.id === itId);
                        setPurchaseLines(prev => prev.map(l => l.id === line.id ? {
                          ...l,
                          itemId: itId,
                          unit: selItem?.displayUnit || selItem?.unitBase || 'Pcs'
                        } : l));
                      }}
                      className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none focus:border-gold font-bold"
                    >
                      {items.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.sku}) - {it.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input 
                      type="number" 
                      value={line.qty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPurchaseLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                      }}
                      placeholder="Qty"
                      className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none font-mono text-center focus:border-gold" 
                    />
                  </div>

                  <div className="w-20">
                    <span className="text-xs font-bold text-side-text">{line.unit}</span>
                  </div>

                  <div className="w-40">
                    <input 
                      type="number" 
                      value={line.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPurchaseLines(prev => prev.map(l => l.id === line.id ? { ...l, price: val } : l));
                      }}
                      placeholder="Total Harga"
                      className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none font-mono text-right focus:border-gold font-bold text-green" 
                    />
                  </div>

                  <button 
                    onClick={() => removePurchaseLine(line.id)}
                    className="p-1.5 text-red/60 hover:text-red hover:bg-red/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={addPurchaseLine}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors font-bold"
              >
                <Plus size={14} /> Tambah Baris Pembelian
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-line">
              <div className="text-xl font-serif text-ink">
                Total Tagihan: <span className="font-bold text-green font-mono">Rp {totalPembelian.toLocaleString('id-ID')}</span>
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

        {/* ================= TAB 2: YIELD / PREP ================= */}
        {activeTab === 'yield' && (
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · YIELD / PREP
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Pre-Processing Protein (Pemisahan Tulang/Lemak)</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM ASAL (RAW)</label>
                <select
                  value={sourceItemId}
                  onChange={(e) => setSourceItemId(Number(e.target.value))}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                >
                  {proteinItems.map(it => (
                    <option key={it.id} value={it.id}>{it.name} (Stok: {it.currentStockQty}g)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM OUTPUT (BERSIH)</label>
                <select
                  value={outputItemId}
                  onChange={(e) => setOutputItemId(Number(e.target.value))}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT ASAL (g)</label>
                <input 
                  type="number" 
                  value={beratAsal}
                  onChange={(e) => setBeratAsal(Number(e.target.value))}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT BERSIH (g)</label>
                <input 
                  type="number" 
                  value={beratBersih}
                  onChange={(e) => setBeratBersih(Number(e.target.value))}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">BERAT SUSUT (g)</label>
                <div className="w-full bg-stat border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono flex items-center bg-[#F9F5F0]">
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
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />
            </div>

            <div className="bg-white border border-chip-border rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
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

        {/* ================= TAB 3: PRODUKSI BATCH ================= */}
        {activeTab === 'batch' && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · PRODUKSI BATCH
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Produksi Resep & Pencatatan Afkir</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Kolom Bahan Baku */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2">Bahan Baku yang Digunakan</h3>
                
                <div className="space-y-3">
                  {batchIngredients.map(item => (
                    <div key={item.id} className="bg-stat border border-line rounded-xl p-3 flex justify-between items-center">
                      <div className="flex-1">
                        <select 
                          value={item.itemId}
                          onChange={(e) => {
                            const itId = Number(e.target.value);
                            const sel = items.find(i => i.id === itId);
                            setBatchIngredients(prev => prev.map(b => b.id === item.id ? {
                              ...b,
                              itemId: itId,
                              name: sel?.name || '',
                              unit: sel?.displayUnit || sel?.unitBase || 'g',
                              stockInfo: `Stok: ${sel?.currentStockQty} | HPP: Rp ${sel?.currentAvgCostRupiah || 0}`,
                            } : b));
                          }}
                          className="w-full bg-white border border-line rounded px-2 py-1 text-xs font-bold text-ink outline-none mb-1"
                        >
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.name} (Stok: {it.currentStockQty} {it.displayUnit})
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-side-text font-mono">{item.stockInfo}</div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBatchIngredients(prev => prev.map(i => i.id === item.id ? {...i, qty: val} : i));
                          }}
                          className="w-20 bg-white border border-line rounded text-xs p-1.5 font-mono text-right outline-none focus:border-gold" 
                        />
                        <span className="text-xs font-bold text-side-text w-8">{item.unit}</span>
                        <button 
                          onClick={() => removeBatchIngredient(item.id)}
                          className="text-red/60 hover:text-red p-1"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={addBatchIngredient}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors font-bold"
                >
                  <Plus size={16} /> Tambah Baris Bahan
                </button>
              </div>

              {/* Kolom Hasil Produksi */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2">Hasil Produksi</h3>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM OUTPUT</label>
                  <select 
                    value={batchOutputItemId}
                    onChange={(e) => setBatchOutputItemId(Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold mb-3"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>{it.name} ({it.category})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY GOOD (HASIL BAIK)</label>
                    <input 
                      type="number" 
                      value={qtyGood}
                      onChange={(e) => setQtyGood(Number(e.target.value))}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono font-bold" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY WASTE (AFKIR)</label>
                    <input 
                      type="number" 
                      value={qtyWaste}
                      onChange={(e) => setQtyWaste(Number(e.target.value))}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1 mt-2">PERLAKUAN SISA/AFKIR</label>
                  <select 
                    value={batchWasteTreatment}
                    onChange={(e) => setBatchWasteTreatment(e.target.value as 'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK')}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold text-xs"
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
                    className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none focus:border-gold"
                  />
                </div>

                <div className="bg-stat border border-line rounded-xl p-3.5 mt-4">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-side-text">Estimasi Biaya Bahan Baku</span>
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

        {/* ================= TAB 4: FINANCE MANUAL ================= */}
        {activeTab === 'finance' && (
          <div className="max-w-xl mx-auto">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1 text-center">
              INPUT · FINANCE MANUAL
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6 text-center">Catat Kas & Bank Operasional</h2>
            
            <div className="bg-stat border border-line rounded-xl p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal Transaksi</label>
                  <input 
                    type="date" 
                    value={finDate}
                    onChange={(e) => setFinDate(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis Mutasi</label>
                  <select 
                    value={finJenis}
                    onChange={(e) => setFinJenis(e.target.value as 'EXPENSE' | 'INCOME')}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="EXPENSE">EXPENSE (Pengeluaran Kas/Bank)</option>
                    <option value="INCOME">INCOME (Pemasukan Kas/Bank)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori Akun</label>
                  <select 
                    value={finCat}
                    onChange={(e) => setFinCat(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    {categories.length > 0 ? (
                      categories.filter(c => c.kind === finJenis).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Biaya Pemasaran / Iklan">Biaya Pemasaran / Iklan</option>
                        <option value="Gaji Karyawan">Gaji Karyawan</option>
                        <option value="Sewa Tempat">Sewa Tempat</option>
                        <option value="Operasional Lainnya">Operasional Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kanal Pembayaran</label>
                  <select 
                    value={finChannel}
                    onChange={(e) => setFinChannel(e.target.value as 'BANK' | 'CASH')}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-bold"
                  >
                    <option value="BANK">BANK (Transfer / QRIS)</option>
                    <option value="CASH">CASH (Kas Fisik)</option>
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
                  className="w-full bg-white border border-line rounded-lg px-3 py-3 text-lg font-bold text-ink font-mono outline-none focus:border-gold" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Keterangan / Catatan</label>
                <textarea 
                  rows={3} 
                  placeholder="Keterangan transaksi..." 
                  value={finNote}
                  onChange={(e) => setFinNote(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
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

      </div>
    </div>
  );
}
