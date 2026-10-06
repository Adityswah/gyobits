'use client';
import React from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Box } from 'lucide-react';

export default function LaporanStockPage() {
  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            OWNER VIEW
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Stock Masuk, Keluar, dan Kondisi Stock</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          
          <div className="bg-card border border-line rounded-[14px] p-4">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN STOCK</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Periode Stock</h3>
            
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
                Export Excel Juni 2026
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-sm text-ink hover:bg-bg transition-colors">
                <Download size={14} />
                Export PDF analitik Juni 2026
              </button>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4">
            <div className="text-[10px] text-side-text mb-1">Nilai stok saat ini</div>
            <div className="font-mono font-bold text-2xl text-ink mb-6">Rp 1.715.497</div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Nilai Stok Awal</span>
                <span className="font-mono font-bold text-ink">Rp 1.715.497</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Ditambah Pembelian</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Dikurangi Pemakaian</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Ditambah Koreksi Plus</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-side-text">Dikurangi Koreksi Minus</span>
                <span className="font-mono font-bold text-ink">Rp 0</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[9px] text-side-text">Laporan Stock</div>
                <div className="font-bold text-ink text-xs">1/10/2026 - 6/10/2026</div>
              </div>
              <Box size={16} className="text-gold" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Stock Masuk</span>
                <span className="font-mono font-bold text-ink">0</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-side-text">Stock Keluar</span>
                <span className="font-mono font-bold text-ink">0</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-side-text">Kondisi perlu dicek</span>
                <span className="font-mono font-bold text-ink">85</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-card border border-line rounded-[14px] p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">STOCK GROUPED LOG</h2>
                <h3 className="font-serif font-bold text-ink text-base">Audit Trail per Nomor Transaksi</h3>
              </div>
              <div className="flex items-center bg-white border border-line rounded-md text-xs overflow-hidden">
                <button className="px-3 py-1.5 hover:bg-stat">Ringkasan</button>
                <button className="px-3 py-1.5 bg-gold text-white font-bold">Detail</button>
              </div>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">WAKTU</th>
                    <th className="p-3">TIPE</th>
                    <th className="p-3">NO TRANSAKSI / BARANG</th>
                    <th className="p-3 text-right">QTY</th>
                    <th className="p-3 text-right">NOMINAL</th>
                    <th className="p-3">OPERATOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {/* Row 1 */}
                  <tr className="bg-white">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.30.26</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260723-<br/>113023-02EA</td>
                    <td className="p-3 align-top text-right font-mono">0,2</td>
                    <td className="p-3 align-top text-right font-mono">Rp 4.600</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Kecap Manis Indofood 700ml</td>
                    <td className="p-3 pt-0 text-right font-mono">0.2 Pcs</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 4.600</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>
                  
                  {/* Row 2 */}
                  <tr className="bg-bg">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.29.58</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260725-<br/>112957-148A</td>
                    <td className="p-3 align-top text-right font-mono">0,3</td>
                    <td className="p-3 align-top text-right font-mono">Rp 6.000</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-bg">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Gula Merah</td>
                    <td className="p-3 pt-0 text-right font-mono">0.3 Kg</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 6.000</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>

                  {/* Row 3 */}
                  <tr className="bg-white">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.29.46</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260724-<br/>112945-C051</td>
                    <td className="p-3 align-top text-right font-mono">0,2</td>
                    <td className="p-3 align-top text-right font-mono">Rp 4.000</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Gula Merah</td>
                    <td className="p-3 pt-0 text-right font-mono">0.2 Kg</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 4.000</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>

                  {/* Row 4 */}
                  <tr className="bg-bg">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.29.28</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260723-<br/>112927-80E7</td>
                    <td className="p-3 align-top text-right font-mono">0,3</td>
                    <td className="p-3 align-top text-right font-mono">Rp 7.500</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-bg">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Pisang</td>
                    <td className="p-3 pt-0 text-right font-mono">0.3 Pcs</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 7.500</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>

                  {/* Row 5 */}
                  <tr className="bg-white">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.29.10</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260724-<br/>112909-A6A4</td>
                    <td className="p-3 align-top text-right font-mono">0,2</td>
                    <td className="p-3 align-top text-right font-mono">Rp 5.000</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Pisang</td>
                    <td className="p-3 pt-0 text-right font-mono">0.2 Pcs</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 5.000</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>

                  {/* Row 6 */}
                  <tr className="bg-bg">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">27/7/2026,<br/>18.28.51</td>
                    <td className="p-3 align-top"><span className="bg-gold-soft text-gold px-2 py-0.5 rounded text-[10px]">keluar</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">STK-OUT-20260724-<br/>112849-3350</td>
                    <td className="p-3 align-top text-right font-mono">0,4</td>
                    <td className="p-3 align-top text-right font-mono">Rp 2.400</td>
                    <td className="p-3 align-top">Novie</td>
                  </tr>
                  <tr className="bg-bg">
                    <td colSpan={2}></td>
                    <td className="p-3 pt-0">Sereh</td>
                    <td className="p-3 pt-0 text-right font-mono">0.4 Kg</td>
                    <td className="p-3 pt-0 text-right font-mono">Rp 2.400</td>
                    <td className="p-3 pt-0 text-side-text">-</td>
                  </tr>
                  
                  {/* Row 7 - Masuk */}
                  <tr className="bg-white">
                    <td className="p-3 align-top font-mono text-[11px] text-side-text">22/7/2026,<br/>20.52.25</td>
                    <td className="p-3 align-top"><span className="bg-green/10 text-green px-2 py-0.5 rounded text-[10px]">masuk</span></td>
                    <td className="p-3 align-top font-mono text-gold font-bold">FIN-OUT-20260722-<br/>135225-9C58</td>
                    <td className="p-3 align-top text-right font-mono">6</td>
                    <td className="p-3 align-top text-right font-mono">Rp 210.000</td>
                    <td className="p-3 align-top">KHAFI</td>
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
