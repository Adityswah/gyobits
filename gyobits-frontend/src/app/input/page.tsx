'use client';
import React, { useState } from 'react';
import Topbar from "@/components/Topbar";
import { Plus, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PurchaseLine {
  id: string;
  item: string;
  qty: number;
  unit: string;
  price: number;
}

interface BatchIngredient {
  id: string;
  name: string;
  stockInfo: string;
  qty: number;
  unit: string;
}

export default function InputPage() {
  const [activeTab, setActiveTab] = useState<'pembelian' | 'yield' | 'batch' | 'finance'>('batch');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Yield State (Wireframe 10.7)
  const [beratAsal, setBeratAsal] = useState<number>(10000);
  const [beratBersih, setBeratBersih] = useState<number>(8000);
  
  const beratSusut = beratAsal - beratBersih;
  const persenSusut = ((beratSusut / beratAsal) * 100).toFixed(0);
  const totalValue = 380000;
  const hppPerGram = (totalValue / (beratBersih || 1)).toFixed(4);

  // Pembelian Form State
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([
    { id: '1', item: 'Kulit Gyoza 1 Pack', qty: 5, unit: 'Pack', price: 75000 }
  ]);
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('2026-10-06');
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'BANK'>('CASH');

  const addPurchaseLine = () => {
    setPurchaseLines(prev => [
      ...prev,
      { id: Date.now().toString(), item: 'Daging Sapi Cincang', qty: 1, unit: 'Kg', price: 95000 }
    ]);
  };

  const removePurchaseLine = (id: string) => {
    setPurchaseLines(prev => prev.filter(l => l.id !== id));
  };

  const totalPembelian = purchaseLines.reduce((acc, l) => acc + l.price, 0);

  // Batch Form State - Dynamic Ingredients
  const [batchIngredients, setBatchIngredients] = useState<BatchIngredient[]>([
    { id: '1', name: 'Daging Sapi Cincang Bersih', stockInfo: 'Stok: 8.000 g | HPP: Rp 47,5/g', qty: 2000, unit: 'g' },
    { id: '2', name: 'Kulit Gyoza', stockInfo: 'Stok: 100 Pcs | HPP: Rp 150/Pcs', qty: 30, unit: 'Pcs' }
  ]);

  const [qtyGood, setQtyGood] = useState<number>(28);
  const [qtyWaste, setQtyWaste] = useState<number>(2);
  const [batchWasteTreatment, setBatchWasteTreatment] = useState('ABSORBED_TO_HPP');

  const addBatchIngredient = () => {
    setBatchIngredients(prev => [
      ...prev,
      { id: Date.now().toString(), name: 'Bumbu Racik Gyoza', stockInfo: 'Stok: 500 g | HPP: Rp 25/g', qty: 100, unit: 'g' }
    ]);
  };

  const removeBatchIngredient = (id: string) => {
    setBatchIngredients(prev => prev.filter(item => item.id !== id));
  };

  // Finance Form State
  const [finJenis, setFinJenis] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [finNominal, setFinNominal] = useState('');
  const [finCat, setFinCat] = useState('Biaya Pemasaran / Iklan');
  const [finChannel, setFinChannel] = useState<'BANK' | 'CASH'>('BANK');
  const [finNote, setFinNote] = useState('');

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
            OPERASIONAL
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Input Data</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-px">
        {[
          { id: 'pembelian', label: 'Pembelian' },
          { id: 'yield', label: 'Yield / Prep' },
          { id: 'batch', label: 'Produksi Batch' },
          { id: 'finance', label: 'Finance Manual' }
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
        
        {/* TAB: YIELD / PREP (PRD Wireframe 10.7) */}
        {activeTab === 'yield' && (
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · YIELD / PREP
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Pre-Processing Protein</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM ASAL</label>
                <div className="bg-stat border border-line rounded-lg px-3 py-2 text-ink text-sm">
                  Daging Sapi Utuh
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM OUTPUT</label>
                <div className="bg-stat border border-line rounded-lg px-3 py-2 text-ink text-sm">
                  Daging Sapi Cincang Bersih
                </div>
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
                  {beratSusut.toLocaleString('id-ID')} <span className="text-side-text ml-2">· {persenSusut}%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ALASAN SUSUT</label>
              <input 
                type="text" 
                defaultValue="Tulang, lemak"
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />
            </div>

            <div className="bg-white border border-chip-border rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-line" />
              <label className="text-[10px] font-bold text-gold uppercase block mb-2 tracking-wider">PRATINJAU HPP</label>
              <div className="font-mono text-xl font-bold text-green mb-1">
                Rp {hppPerGram} / g
              </div>
              <div className="text-[11px] text-side-text">
                Nilai dipindah Rp {totalValue.toLocaleString('id-ID')} · gudang sebelum = sesudah
              </div>
            </div>

            <button 
              onClick={() => showNotification("Data Yield berhasil disimpan!")}
              className="bg-gold hover:bg-[#A38225] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors active:scale-95 shadow-sm"
            >
              Simpan Yield
            </button>
          </div>
        )}

        {/* TAB: PRODUKSI BATCH (DYNAMIC INGREDIENTS) */}
        {activeTab === 'batch' && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · PRODUKSI BATCH
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Produksi Batch Baru</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-line pb-2">
                  <h3 className="font-bold text-sm text-ink">Bahan Baku & Penolong</h3>
                  <span className="text-[11px] text-side-text">{batchIngredients.length} bahan dimasukkan</span>
                </div>
                
                {/* Dynamic Ingredients Rows */}
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {batchIngredients.map((item) => (
                    <div key={item.id} className="bg-white border border-line rounded-lg p-3 flex gap-3 items-center shadow-xs">
                      <div className="flex-1 min-w-0">
                        <input 
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchIngredients(prev => prev.map(i => i.id === item.id ? {...i, name: val} : i));
                          }}
                          className="text-sm font-bold text-ink w-full outline-none border-b border-transparent focus:border-gold"
                        />
                        <div className="text-[10px] text-side-text font-mono mt-0.5 truncate">{item.stockInfo}</div>
                      </div>
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBatchIngredients(prev => prev.map(i => i.id === item.id ? {...i, qty: val} : i));
                        }}
                        className="w-20 bg-bg border border-line rounded text-sm p-1.5 font-mono text-right outline-none focus:border-gold" 
                      />
                      <select 
                        value={item.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBatchIngredients(prev => prev.map(i => i.id === item.id ? {...i, unit: val} : i));
                        }}
                        className="text-xs font-bold text-side-text bg-bg border border-line rounded px-1.5 py-1.5 outline-none"
                      >
                        <option value="g">g</option>
                        <option value="Pcs">Pcs</option>
                        <option value="ml">ml</option>
                      </select>
                      <button 
                        onClick={() => removeBatchIngredient(item.id)}
                        className="text-red/50 hover:text-red p-1 transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={addBatchIngredient}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors font-bold"
                >
                  <Plus size={16} /> Tambah Baris Bahan
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-sm text-ink border-b border-line pb-2">Hasil Produksi</h3>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">ITEM OUTPUT</label>
                  <select className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold mb-3">
                    <option>Gyoza Siap Masak (SEMI_FINISHED)</option>
                    <option>Isian Daging Gyoza (SEMI_FINISHED)</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY GOOD</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={qtyGood}
                        onChange={(e) => setQtyGood(Number(e.target.value))}
                        className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono" 
                      />
                      <span className="text-xs font-bold text-side-text">Pcs</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">QTY WASTE</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={qtyWaste}
                        onChange={(e) => setQtyWaste(Number(e.target.value))}
                        className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold font-mono" 
                      />
                      <span className="text-xs font-bold text-side-text">Pcs</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1 mt-3">WASTE TREATMENT</label>
                  <select 
                    value={batchWasteTreatment}
                    onChange={(e) => setBatchWasteTreatment(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    <option value="ABSORBED_TO_HPP">ABSORBED_TO_HPP (Bebankan ke hasil baik)</option>
                    <option value="LOSS">LOSS (Catat sebagai kerugian produksi)</option>
                    <option value="RETURNED_TO_STOCK">RETURNED_TO_STOCK (Sisa bahan tak terpakai)</option>
                  </select>
                </div>

                <div className="bg-stat border border-line rounded-xl p-3 mt-4">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-side-text">Total Biaya Bahan Terpakai</span>
                    <span className="font-mono font-bold text-ink">Rp 99.500</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-line">
                    <span className="text-side-text">Estimasi HPP per Satuan ({qtyGood} Pcs)</span>
                    <span className="font-mono font-bold text-green">
                      Rp {(99500 / (qtyGood || 1)).toFixed(0)} / Pcs
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-line">
              <button 
                onClick={() => showNotification("Produksi Batch berhasil disimpan & HPP diperbarui!")}
                className="bg-gold hover:bg-[#A38225] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                Simpan & Selesaikan Batch <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB: PEMBELIAN */}
        {activeTab === 'pembelian' && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              INPUT · PEMBELIAN (IN)
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6">Nota Pembelian Bahan</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6 bg-stat border border-line rounded-xl p-4">
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal</label>
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Supplier</label>
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
                  <option value="CASH">CASH</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {purchaseLines.map((line) => (
                <div key={line.id} className="flex gap-3 items-end bg-bg p-2.5 rounded-xl border border-line">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Item Bahan</label>
                    <input 
                      type="text" 
                      value={line.item}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPurchaseLines(prev => prev.map(l => l.id === line.id ? {...l, item: val} : l));
                      }}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Qty</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        value={line.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPurchaseLines(prev => prev.map(l => l.id === line.id ? {...l, qty: val} : l));
                        }}
                        className="w-full bg-white border border-line rounded-lg px-2 py-2 text-sm text-ink font-mono outline-none focus:border-gold" 
                      />
                      <span className="text-xs text-side-text font-bold">{line.unit}</span>
                    </div>
                  </div>
                  <div className="w-40">
                    <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Total Harga Baris</label>
                    <input 
                      type="number" 
                      value={line.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPurchaseLines(prev => prev.map(l => l.id === line.id ? {...l, price: val} : l));
                      }}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-gold" 
                    />
                  </div>
                  <button 
                    onClick={() => removePurchaseLine(line.id)}
                    className="text-red/50 hover:text-red p-2.5"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              
              <button 
                onClick={addPurchaseLine}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-line text-side-text hover:text-gold hover:border-gold hover:bg-gold-soft rounded-lg text-sm transition-colors"
              >
                <Plus size={14} /> Tambah Baris Pembelian
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-line">
              <div className="text-xl font-serif text-ink">
                Total Tagihan: <span className="font-bold text-green font-mono">Rp {totalPembelian.toLocaleString('id-ID')}</span>
              </div>
              <button 
                onClick={() => showNotification("Transaksi Pembelian berhasil disimpan ke Ledger!")}
                className="bg-gold hover:bg-[#A38225] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
              >
                Simpan Transaksi
              </button>
            </div>
          </div>
        )}

        {/* TAB: FINANCE MANUAL */}
        {activeTab === 'finance' && (
          <div className="max-w-xl mx-auto">
            <div className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1 text-center">
              INPUT · FINANCE
            </div>
            <h2 className="font-serif font-bold text-xl text-ink mb-6 text-center">Input Finance Operasional</h2>
            
            <div className="bg-stat border border-line rounded-xl p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tanggal</label>
                  <input type="date" defaultValue="2026-10-06" className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Jenis</label>
                  <select 
                    value={finJenis}
                    onChange={(e) => setFinJenis(e.target.value as 'EXPENSE' | 'INCOME')}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    <option value="EXPENSE">EXPENSE (Pengeluaran)</option>
                    <option value="INCOME">INCOME (Pemasukan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kategori</label>
                  <select 
                    value={finCat}
                    onChange={(e) => setFinCat(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    <option value="Biaya Pemasaran / Iklan">Biaya Pemasaran / Iklan</option>
                    <option value="Gaji Karyawan">Gaji Karyawan</option>
                    <option value="Sewa Tempat">Sewa Tempat</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Kanal Pembayaran</label>
                  <select 
                    value={finChannel}
                    onChange={(e) => setFinChannel(e.target.value as 'BANK' | 'CASH')}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    <option value="BANK">BANK</option>
                    <option value="CASH">CASH</option>
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
                <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Catatan</label>
                <textarea 
                  rows={3} 
                  placeholder="Keterangan transaksi..." 
                  value={finNote}
                  onChange={(e) => setFinNote(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                ></textarea>
              </div>

              <button 
                onClick={() => {
                  showNotification("Transaksi Finance berhasil disimpan ke kas buku!");
                  setFinNominal('');
                  setFinNote('');
                }}
                className="w-full bg-gold hover:bg-[#A38225] text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-sm mt-2"
              >
                Simpan Catatan Finance
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
