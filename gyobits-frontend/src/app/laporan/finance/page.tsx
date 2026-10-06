'use client';
import React from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Wallet, TrendingUp } from 'lucide-react';

export default function LaporanFinancePage() {
  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            OWNER VIEW
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Kas Bank, Laba Rugi, Arus Kas, Neraca Lite</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          
          <div className="bg-card border border-line rounded-[14px] p-4">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN FINANCE</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Periode Kas & Laba Rugi</h3>
            
            <div className="space-y-3">
              <div className="bg-bg border border-line rounded-lg p-3">
                <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">PERIODE</label>
                <select className="w-full bg-white border border-line rounded-md px-2 py-1.5 text-sm text-ink outline-none mb-2">
                  <option>Bulan ini</option>
                </select>
                <div className="text-[10px] text-side-text">1/10/2026 - 6/10/2026</div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">TAHUN</label>
                  <select className="w-full bg-white border border-line rounded-md px-2 py-1.5 text-sm text-ink outline-none">
                    <option>2026</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">BULAN</label>
                  <select className="w-full bg-white border border-line rounded-md px-2 py-1.5 text-sm text-ink outline-none">
                    <option>Juni</option>
                  </select>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-sm text-ink hover:bg-bg transition-colors">
                <FileText size={14} />
                Export Excel Finance
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-sm text-ink hover:bg-bg transition-colors">
                <Download size={14} />
                Export PDF Finance Audit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col justify-between h-[100px]">
              <span className="text-[10px] text-side-text leading-tight">Pendapatan Kotor</span>
              <div>
                <div className="font-mono font-bold text-ink text-sm">Rp 0</div>
                <TrendingUp size={16} className="text-gold mt-1" />
              </div>
            </div>
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col justify-between h-[100px]">
              <span className="text-[10px] text-side-text leading-tight">Cash vs Bank</span>
              <div className="flex items-end gap-1 mt-auto h-8">
                <div className="w-1/2 bg-gold h-[40%]" />
                <div className="w-1/2 bg-green h-[60%]" />
              </div>
              <div className="flex justify-between text-[8px] text-side-text mt-1">
                <span>Cash</span><span>Bank</span>
              </div>
            </div>
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col items-center justify-center h-[100px]">
              <span className="text-[10px] text-side-text mb-2">Net Margin</span>
              <div className="relative w-12 h-12 flex items-center justify-center rounded-full border-4 border-line">
                <span className="font-mono text-xs font-bold text-ink">0%</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[9px] text-side-text">Laporan Finance</div>
                <div className="font-bold text-ink text-xs">1/10/2026 - 6/10/2026</div>
              </div>
              <Wallet size={16} className="text-gold" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Pendapatan kotor (cash + bank)</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Pengeluaran (cash + bank)</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Pendapatan Bersih Cash</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Pendapatan Bersih Bank</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-side-text">Total Pendapatan Bersih</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-card border border-line rounded-[14px] p-4">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN FINANCE</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Kas Bank, Laba Rugi, Arus Kas, Neraca Lite</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Kas Cash */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Cash</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo periode</span><span className="font-mono">Rp 0</span>
                  </div>
                </div>
              </div>
              {/* Kas Bank */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Bank</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo periode</span><span className="font-mono">Rp 0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Laba Rugi */}
            <div className="overflow-x-auto border border-line rounded-lg mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">DESCRIPTION</th>
                    <th className="p-3 text-right">TOTAL</th>
                    <th className="p-3 text-right">% OF INCOME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="p-3 text-side-text" colSpan={3}>Income</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 pl-6">Pendapatan Cash</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-bg">
                    <td className="p-3 pl-6">Pendapatan Bank</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-white font-bold text-ink">
                    <td className="p-3">Total Income</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">100</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-side-text" colSpan={3}>Cost of Goods Sold</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 pl-6">Pengeluaran Keperluan Stock</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-bg font-bold text-ink">
                    <td className="p-3">GROSS PROFIT</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-side-text" colSpan={3}>Expense</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 pl-6">Non-stock Expense</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-bg">
                    <td className="p-3 pl-6">Prive Owner</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-white font-bold text-ink">
                    <td className="p-3">NET OPERATING INCOME</td>
                    <td className="p-3 text-right font-mono">Rp 0</td>
                    <td className="p-3 text-right font-mono">0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Arus Kas */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Arus Kas</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Arus masuk operasi</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text">
                    <span>Arus keluar stock</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Arus keluar non-stock</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Net cash flow</span><span className="font-mono">Rp 0</span>
                  </div>
                </div>
              </div>
              {/* Neraca Lite */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Neraca Lite</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Kas periode</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text">
                    <span>Bank periode</span><span className="font-mono text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Persediaan stock</span><span className="font-mono text-ink">Rp 1.715.497</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Aset operasional lite</span><span className="font-mono">Rp 1.715.497</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Detail Transaksi Per Nota */}
          <div className="bg-card border border-line rounded-[14px] p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">FINANCE GROUPED LOG</h2>
                <h3 className="font-serif font-bold text-ink text-base">Detail Transaksi per Nota</h3>
              </div>
              <div className="flex items-center bg-white border border-line rounded-md text-xs overflow-hidden">
                <button className="px-3 py-1.5 hover:bg-stat">Ringkasan</button>
                <button className="px-3 py-1.5 bg-gold text-white font-bold">Detail</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-y border-line">
                  <tr>
                    <th className="p-3">TANGGAL</th>
                    <th className="p-3">NO TRANSAKSI / NAMA</th>
                    <th className="p-3">TIPE</th>
                    <th className="p-3">METODE</th>
                    <th className="p-3">KATEGORI</th>
                    <th className="p-3 text-right">QTY</th>
                    <th className="p-3 text-right">NOMINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-side-text">
                  <tr>
                    <td colSpan={7} className="p-6 text-center">Belum ada transaksi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
