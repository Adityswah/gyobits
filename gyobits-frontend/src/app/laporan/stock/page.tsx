'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Box, RefreshCw } from 'lucide-react';
import { api, DashboardStockResponse, ItemRecord } from '@/lib/api';

export default function LaporanStockPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState<DashboardStockResponse | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setIsLoading(true);
    Promise.all([
      api.dashboard.getStock(),
      api.items.getAll(),
    ])
      .then(([stkRes, itmRes]) => {
        setStockSummary(stkRes);
        setItems(itmRes.data || []);
      })
      .catch((err) => {
        console.warn('Failed to load stock report:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.dashboard.getStock(),
      api.items.getAll(),
    ])
      .then(([stkRes, itmRes]) => {
        if (active) {
          setStockSummary(stkRes);
          setItems(itmRes.data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load stock report:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalNilai = stockSummary?.nilaiStockTotal || 0;
  const totalSku = stockSummary?.totalSku || 0;
  const kondisiKritis = stockSummary?.kondisiKritis || 0;

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            LAPORAN RESMI
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Valuasi Stok, Mutasi Masuk & Keluar</h1>
        </div>
        <button
          onClick={loadReport}
          disabled={isLoading}
          className="bg-card border border-line text-ink hover:bg-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh Laporan
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN STOCK</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Periode Stock Gudang</h3>
            
            <div className="space-y-3">
              <div className="bg-bg border border-line rounded-lg p-3">
                <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">PERIODE</label>
                <div className="text-xs font-bold text-ink">Bulan Oktober 2026</div>
                <div className="text-[10px] text-side-text mt-0.5">01/10/2026 - 06/10/2026</div>
              </div>

              <button 
                onClick={() => alert("Laporan Excel Stok berhasil diunduh!")}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg transition-colors shadow-xs"
              >
                <FileText size={14} />
                Export Excel Stok
              </button>
              <button 
                onClick={() => alert("Laporan PDF Analitik Stok berhasil dicetak!")}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg transition-colors shadow-xs"
              >
                <Download size={14} />
                Export PDF Analitik
              </button>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="text-[10px] text-side-text mb-1 uppercase font-bold tracking-wider">Nilai stok saat ini</div>
            <div className="font-mono font-bold text-2xl text-green mb-4">Rp {totalNilai.toLocaleString('id-ID')}</div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Total SKU Aktif</span>
                <span className="font-mono font-bold text-ink">{totalSku} Item</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Item Kritis / Habis</span>
                <span className={`font-mono font-bold ${kondisiKritis > 0 ? 'text-red' : 'text-green'}`}>
                  {kondisiKritis} Item
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-side-text">Metode Valuasi</span>
                <span className="font-mono font-bold text-ink">Moving Avg (WAC)</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[9px] text-side-text font-bold uppercase">Kondisi Fisik</div>
                <div className="font-bold text-ink text-xs">Peringatan Restock</div>
              </div>
              <Box size={16} className="text-gold" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-stat border border-line rounded-lg">
                <div className="font-bold text-ink text-xs">Item Di Bawah Safety Stock</div>
                <div className="text-[11px] text-side-text mt-0.5">
                  {kondisiKritis > 0 
                    ? `Terdapat ${kondisiKritis} item dengan stok kritis yang perlu segera dilakukan order pembelian.` 
                    : "Semua item berada dalam batas aman stok."}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">VALUASI & SALDO STOK</h2>
                <h3 className="font-serif font-bold text-ink text-base">Rincian Fisik, Rata-Rata Biaya, dan Nilai Aset per SKU</h3>
              </div>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">SKU / NAMA ITEM</th>
                    <th className="p-3">KATEGORI</th>
                    <th className="p-3 text-right">SALDO FISIK</th>
                    <th className="p-3 text-right">HPP SATUAN</th>
                    <th className="p-3 text-right">TOTAL NILAI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-side-text">Memuat daftar inventaris...</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const qty = Number(item.currentStockQty || 0);
                      const avg = Number(item.currentAvgCostRupiah || 0);
                      const val = Number(item.currentStockValueRupiah || 0);
                      const unit = item.displayUnit || item.unitBase;

                      return (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-bg'}>
                          <td className="p-3">
                            <div className="font-bold text-ink">{item.name}</div>
                            <div className="text-[10px] font-mono text-side-text">{item.sku}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-gold-soft text-gold px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {qty.toLocaleString('id-ID')} <span className="text-side-text text-[10px]">{unit}</span>
                          </td>
                          <td className="p-3 text-right font-mono text-side-text">
                            Rp {avg.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-green">
                            Rp {val.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
