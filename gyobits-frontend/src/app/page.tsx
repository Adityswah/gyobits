'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import FinanceChart from "@/components/FinanceChart";
import { Wallet, TrendingDown, Coins, Landmark, ShieldCheck, Boxes, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { api, DashboardFinanceResponse, DashboardStockResponse } from "@/lib/api";
import { useApp } from "@/context/AppContext";

type PresetPeriod = 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'all' | 'custom';

export default function Home() {
  const { auditLogs } = useApp();
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('all');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');
  
  const [isLoading, setIsLoading] = useState(false);
  const [financeData, setFinanceData] = useState<DashboardFinanceResponse | null>(null);
  const [stockData, setStockData] = useState<DashboardStockResponse | null>(null);

  // Compute actual date range dynamically from preset
  const handlePresetSelect = (preset: PresetPeriod) => {
    setSelectedPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      // Bulan ini: awal bulan s/d akhir bulan
      setStartDate(`${curYear}-${curMonth}-01`);
      const lastDay = new Date(curYear, now.getMonth() + 1, 0).getDate();
      setEndDate(`${curYear}-${curMonth}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const prevMonthDate = new Date(curYear, now.getMonth() - 1, 1);
      const pYear = prevMonthDate.getFullYear();
      const pMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const pLastDay = new Date(pYear, prevMonthDate.getMonth() + 1, 0).getDate();
      setStartDate(`${pYear}-${pMonth}-01`);
      setEndDate(`${pYear}-${pMonth}-${String(pLastDay).padStart(2, '0')}`);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  // Instant fast load (local cache first + background API)
  const fetchDashboard = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      api.dashboard.getFinance({ from: startDate, to: endDate }),
      api.dashboard.getStock(),
    ])
      .then(([finRes, stRes]) => {
        setFinanceData(finRes);
        setStockData(stRes);
      })
      .catch(err => {
        console.warn('Dashboard fetch notice:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kotor = financeData?.pendapatanKotor ?? 0;
  const beban = financeData?.pengeluaran ?? 0;
  const cashNet = financeData?.bersihCash ?? 0;
  const bankNet = financeData?.bersihBank ?? 0;
  const bersih = financeData?.pendapatanBersih ?? 0;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-10">
      <Topbar />

      {/* FILTER PERIODE DASHBOARD (SESUAI GAMBAR 2) */}
      <section className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm mt-1 transition-all">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Dari Tanggal */}
          <div className="w-full lg:w-60">
            <label className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase block mb-1.5">
              DARI TANGGAL
            </label>
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full bg-stat border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Quick Preset Buttons (Center Column on Desktop) */}
          <div className="flex-1 w-full flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {[
              { id: 'today', label: 'Hari ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: '7days', label: '7 hari terakhir' },
              { id: 'month', label: 'Bulan ini' },
              { id: 'last_month', label: 'Bulan kemarin' },
              { id: 'all', label: 'Semua data' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id as PresetPeriod)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active 
                      ? 'bg-gold text-white font-bold shadow-xs' 
                      : 'bg-stat hover:bg-gold-soft hover:text-gold text-side-text border border-line/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Sampai Tanggal */}
          <div className="w-full lg:w-60">
            <label className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase block mb-1.5">
              SAMPAI TANGGAL
            </label>
            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-full bg-stat border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
              />
            </div>
          </div>

        </div>
      </section>

      {/* IKHTISAR STOK & VALUASI INVENTARIS GUDANG (REALTIME) */}
      <section className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Boxes size={18} className="text-gold" />
            <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
              INVENTARIS & STOK GUDANG (REALTIME)
            </h2>
          </div>
          <button 
            onClick={fetchDashboard}
            className="text-xs text-side-text hover:text-gold flex items-center gap-1 font-bold"
            title="Segarkan data realtime"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-stat border border-line rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">Total Nilai Bahan Baku</span>
              <Boxes size={16} className="text-gold" />
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink font-mono">
              Rp {(stockData?.nilaiStockTotal ?? 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-side-text mt-1">Valuasi stok barang di rak & freezer</span>
          </div>

          <div className="bg-stat border border-line rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">Total SKU Terdaftar</span>
              <Package size={16} className="text-ink" />
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink font-mono">
              {stockData?.totalSku ?? 30} Item
            </div>
            <span className="text-[10px] text-side-text mt-1">Sesuai Master Data Bahan & Menu</span>
          </div>

          <div className="bg-stat border border-line rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">Kondisi Stok Menipis</span>
              <AlertTriangle size={16} className={(stockData?.kondisiKritis ?? 0) > 0 ? "text-red" : "text-green"} />
            </div>
            <div className={`text-xl sm:text-2xl font-serif font-bold font-mono ${(stockData?.kondisiKritis ?? 0) > 0 ? "text-red" : "text-green"}`}>
              {stockData?.kondisiKritis ?? 0} Bahan
            </div>
            <span className="text-[10px] text-side-text mt-1">
              {(stockData?.kondisiKritis ?? 0) > 0 ? 'Perlu pembelian / restock segera' : 'Semua stok dalam batas aman'}
            </span>
          </div>
        </div>
      </section>

      {/* DASHBOARD FINANCE SECTION */}
      <section className="bg-bg border border-line rounded-[14px] p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
              DASHBOARD FINANCE
            </h2>
            {isLoading && <span className="text-[10px] text-side-text font-mono">(Memperbarui...)</span>}
          </div>
          <Wallet size={16} className="text-gold" />
        </div>
        
        <div>
          <h3 className="text-xl font-serif font-bold text-ink mb-3.5">Cash Flow Periode Terpilih</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard 
              title="Pendapatan Kotor"
              icon={Wallet}
              value={`Rp ${kotor.toLocaleString('id-ID')}`}
              subValue="cash + bank"
              color="green"
            />
            <StatCard 
              title="Pengeluaran"
              icon={TrendingDown}
              value={`Rp ${beban.toLocaleString('id-ID')}`}
              subValue="cash + bank"
              color="red"
            />
            <StatCard 
              title="Bersih Cash"
              icon={Coins}
              value={`Rp ${cashNet.toLocaleString('id-ID')}`}
              subValue="kas fisik"
              color="ink"
            />
            <StatCard 
              title="Bersih Bank"
              icon={Landmark}
              value={`Rp ${bankNet.toLocaleString('id-ID')}`}
              subValue="rekening/qris"
              color="gold"
            />
            <StatCard 
              title="Pendapatan Bersih"
              icon={ShieldCheck}
              value={`Rp ${bersih.toLocaleString('id-ID')}`}
              subValue="total laba bersih"
              color="green"
            />
          </div>
        </div>

        {/* Chart Keuangan */}
        <div className="bg-card border border-line rounded-[14px] p-4 mt-1 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                MULTIPLE LINE
              </h4>
              <h3 className="text-lg font-serif font-bold text-ink">
                Pendapatan Finance vs Pengeluaran
              </h3>
            </div>
            <div className="text-xs text-side-text font-mono bg-stat px-2.5 py-1 rounded-lg border border-line">
              {startDate} s.d. {endDate}
            </div>
          </div>
          
          <FinanceChart chartData={financeData?.chartData} />
        </div>
      </section>

      {/* LOG LAST ACTIVITY AUDIT TRANSAKSI (MENGGANTIKAN TABEL STOCK LAMA) */}
      <section className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              LOG AUDIT TERKINI
            </h4>
            <h3 className="text-lg font-serif font-bold text-ink">
              Last Activity Audit Transaksi
            </h3>
          </div>
          <span className="text-[11px] font-bold text-side-text bg-stat px-3 py-1 rounded-full border border-line">
            Realtime Append-Only Log
          </span>
        </div>

        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
              <tr>
                <th className="p-3">WAKTU</th>
                <th className="p-3">NO TRANSAKSI / REF</th>
                <th className="p-3">TIPE</th>
                <th className="p-3">KETERANGAN</th>
                <th className="p-3">OPERATOR</th>
                <th className="p-3 text-right">NOMINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {auditLogs.map((item) => (
                <tr key={item.id} className="hover:bg-stat/40 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-side-text whitespace-nowrap">{item.waktu}</td>
                  <td className="p-3 font-mono font-bold text-gold">{item.ref}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.tipe === 'POS' ? 'bg-green/10 text-green' :
                      item.tipe === 'PURCHASE' ? 'bg-gold-soft text-gold' :
                      item.tipe === 'BATCH' ? 'bg-ink/10 text-ink' :
                      item.tipe === 'YIELD' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-red/10 text-red'
                    }`}>
                      {item.tipe}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-ink">{item.keterangan}</td>
                  <td className="p-3 text-side-text">{item.operator}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    Rp {item.nominal.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
