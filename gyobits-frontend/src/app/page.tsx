'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import FinanceChart from "@/components/FinanceChart";
import { Wallet, TrendingDown, Coins, Landmark, ShieldCheck, Box, ArrowDownToLine, ArrowUpRight, AlertTriangle, Layers, RefreshCw } from "lucide-react";
import { api, DashboardFinanceResponse, DashboardStockResponse } from "@/lib/api";

export default function Home() {
  const [period, setPeriod] = useState<'month' | 'week' | 'today'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [financeData, setFinanceData] = useState<DashboardFinanceResponse | null>(null);
  const [stockData, setStockData] = useState<DashboardStockResponse | null>(null);

  const getDates = useCallback(() => {
    const today = '2026-10-06';
    if (period === 'today') {
      return { from: today, to: today, label: '06/10/2026' };
    }
    if (period === 'week') {
      return { from: '2026-10-01', to: today, label: '01/10/2026 - 06/10/2026' };
    }
    return { from: '2026-10-01', to: '2026-10-31', label: '01/10/2026 - 31/10/2026' };
  }, [period]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    const dates = getDates();
    Promise.all([
      api.dashboard.getFinance({ from: dates.from, to: dates.to }),
      api.dashboard.getStock(),
    ])
      .then(([finRes, stkRes]) => {
        setFinanceData(finRes);
        setStockData(stkRes);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [getDates]);

  useEffect(() => {
    let active = true;
    const dates = getDates();
    Promise.all([
      api.dashboard.getFinance({ from: dates.from, to: dates.to }),
      api.dashboard.getStock(),
    ])
      .then(([finRes, stkRes]) => {
        if (active) {
          setFinanceData(finRes);
          setStockData(stkRes);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getDates]);

  const dates = getDates();

  const pendapatanKotor = financeData?.pendapatanKotor ?? 0;
  const pengeluaran = financeData?.pengeluaran ?? 0;
  const bersihCash = financeData?.bersihCash ?? 0;
  const bersihBank = financeData?.bersihBank ?? 0;
  const pendapatanBersih = financeData?.pendapatanBersih ?? 0;

  const totalSku = stockData?.totalSku ?? 0;
  const kondisiKritis = stockData?.kondisiKritis ?? 0;
  const nilaiStockTotal = stockData?.nilaiStockTotal ?? 0;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-10">
      <Topbar />

      {/* Periode Dashboard Section */}
      <section className="bg-bg border border-line rounded-[14px] p-3 flex justify-between items-center mt-2 shadow-sm">
        <div>
          <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
            Periode Dashboard
          </h2>
          <div className="font-mono text-gold font-bold text-sm">
            {dates.label}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 border border-line rounded-lg bg-card text-ink hover:bg-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
          <div className="w-[180px]">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'week' | 'today')}
              className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer focus:border-gold"
            >
              <option value="month">Bulan Ini (Okt 2026)</option>
              <option value="week">Minggu Berjalan</option>
              <option value="today">Hari Ini (06 Okt)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Dashboard Finance Section */}
      <section className="bg-bg border border-line rounded-[14px] p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
              Dashboard Finance
            </h2>
            {isLoading && <span className="text-[10px] text-side-text">(Memuat...)</span>}
          </div>
          <Wallet size={16} className="text-gold" />
        </div>
        
        <div>
          <h3 className="text-xl font-serif font-bold text-ink mb-4">Cash Flow Periode Terpilih</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              title="Pendapatan Kotor"
              icon={Wallet}
              value={`Rp ${pendapatanKotor.toLocaleString('id-ID')}`}
              subValue="cash + bank"
              color="green"
            />
            <StatCard 
              title="Pengeluaran"
              icon={TrendingDown}
              value={`Rp ${pengeluaran.toLocaleString('id-ID')}`}
              subValue="cash + bank"
              color="red"
            />
            <StatCard 
              title="Bersih Cash"
              icon={Coins}
              value={`Rp ${bersihCash.toLocaleString('id-ID')}`}
              subValue="kas tunai"
              color="ink"
            />
            <StatCard 
              title="Bersih Bank"
              icon={Landmark}
              value={`Rp ${bersihBank.toLocaleString('id-ID')}`}
              subValue="rekening bank / qris"
              color="gold"
            />
            <div className="lg:col-span-4 mt-2">
              <StatCard 
                title="Pendapatan Bersih"
                icon={ShieldCheck}
                value={`Rp ${pendapatanBersih.toLocaleString('id-ID')}`}
                subValue={financeData?.identityCheck ? "Terverifikasi I-6 (Cash + Bank)" : "total bersih"}
                color="green"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-line rounded-[14px] p-4 mt-2 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
                Visualisasi Keuangan
              </h4>
              <h3 className="text-lg font-serif font-bold text-ink">
                Pendapatan vs Pengeluaran
              </h3>
            </div>
            <span className="text-xs text-side-text font-mono bg-stat px-2 py-1 rounded border border-line">
              {dates.label}
            </span>
          </div>
          
          <FinanceChart chartData={financeData?.chartData} />
        </div>
      </section>

      {/* Dashboard Stock Section */}
      <section className="bg-bg border border-line rounded-[14px] p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[11px] font-bold tracking-[0.1em] text-side-text uppercase">
            Dashboard Stock
          </h2>
          <Box size={16} className="text-gold" />
        </div>
        
        <h3 className="text-xl font-serif font-bold text-ink mb-4">Pergerakan dan Kondisi Stock</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard 
            title="Total SKU"
            icon={Box}
            value={totalSku.toString()}
            subValue="item aktif"
            color="ink"
          />
          <StatCard 
            title="Stock Masuk"
            icon={ArrowDownToLine}
            value="Active"
            subValue="pembelian & prep"
            color="green"
          />
          <StatCard 
            title="Stock Keluar"
            icon={ArrowUpRight}
            value="Active"
            subValue="penjualan & afkir"
            color="gold"
          />
          <StatCard 
            title="Kondisi Kritis"
            icon={AlertTriangle}
            value={kondisiKritis.toString()}
            subValue="di bawah batas min"
            color={kondisiKritis > 0 ? "red" : "green"}
          />
          <StatCard 
            title="Nilai Stock"
            icon={Layers}
            value={`Rp ${nilaiStockTotal.toLocaleString('id-ID')}`}
            subValue="valuasi moving avg"
            color="green"
          />
        </div>
      </section>

    </div>
  );
}
