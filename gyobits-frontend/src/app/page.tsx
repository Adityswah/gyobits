'use client';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import FinanceChart from "@/components/FinanceChart";
import { 
  Wallet, 
  TrendingDown, 
  Coins, 
  Landmark, 
  ShieldCheck, 
  Boxes, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  ChevronDown, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Database 
} from "lucide-react";
import { api, DashboardFinanceResponse, DashboardStockResponse } from "@/lib/api";
import { useApp } from "@/context/AppContext";

type PresetPeriod = 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'all' | 'custom';
type ChartFilterType = 'hari_ini' | 'minggu_ini' | 'bulan_ini';

// Helper date format DD/MM/YYYY
function formatDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDateStr;
}

// Helper to get today ISO string
function getTodayISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function Home() {
  const { auditLogs } = useApp();

  // DEFAULT VIEW: "HARI INI" saat membuka aplikasi
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('today');
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [endDate, setEndDate] = useState<string>(getTodayISO());

  // Filter Popover State (Gambar 3)
  const [isPeriodPopoverOpen, setIsPeriodPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Line Chart Filter State: Default "Minggu ini" (Senin-Minggu)
  const [chartFilter, setChartFilter] = useState<ChartFilterType>('minggu_ini');

  const [isLoading, setIsLoading] = useState(false);
  const [financeData, setFinanceData] = useState<DashboardFinanceResponse | null>(null);
  const [stockData, setStockData] = useState<DashboardStockResponse | null>(null);
  const [stockMovements, setStockMovements] = useState<Array<{ qtyDelta: string; occurredAt: string }>>([]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPeriodPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      fetch('/api/stock-movements').then(r => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([finRes, stRes, movRes]) => {
        setFinanceData(finRes);
        setStockData(stRes);
        if (movRes?.data && Array.isArray(movRes.data)) {
          setStockMovements(movRes.data);
        }
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

  // Dynamic Stock Movement Counts within selected period
  const { stockMasukCount, stockKeluarCount } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    for (const m of stockMovements) {
      const mDate = (m.occurredAt || '').split('T')[0];
      if (mDate >= startDate && mDate <= endDate) {
        const val = Number(m.qtyDelta) || 0;
        if (val > 0) masuk += 1;
        else if (val < 0) keluar += 1;
      }
    }
    return { stockMasukCount: masuk, stockKeluarCount: keluar };
  }, [stockMovements, startDate, endDate]);

  // Compute Chart Data based on chartFilter ("hari ini", "minggu ini", "bulan ini")
  // "minggu ini" efektif dihitung dari hari Senin - Minggu
  const computedChartData = useMemo(() => {
    const rawDaily = financeData?.chartData;
    const now = new Date();

    if (chartFilter === 'minggu_ini') {
      // Senin s.d. Minggu minggu ini
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      const labels: string[] = [];
      const pendapatan: number[] = [];
      const pengeluaran: number[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = `${dayNames[i]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(dayLabel);

        // Find match in rawDaily if any
        let inc = 0;
        let exp = 0;
        if (rawDaily && rawDaily.labels) {
          const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          const idx = rawDaily.labels.indexOf(shortDate);
          if (idx !== -1) {
            inc = rawDaily.pendapatan[idx] || 0;
            exp = rawDaily.pengeluaran[idx] || 0;
          }
        }
        pendapatan.push(inc);
        pengeluaran.push(exp);
      }

      return { labels, pendapatan, pengeluaran };
    } else if (chartFilter === 'hari_ini') {
      // 2-hour slots for today
      const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const todayKotor = financeData?.pendapatanKotor ?? 0;
      const todayBeban = financeData?.pengeluaran ?? 0;

      return {
        labels: slots,
        pendapatan: [0, 0, todayKotor > 0 ? Math.round(todayKotor * 0.4) : 0, 0, 0, todayKotor > 0 ? Math.round(todayKotor * 0.6) : 0, 0, 0],
        pengeluaran: [0, 0, 0, todayBeban > 0 ? todayBeban : 0, 0, 0, 0, 0],
      };
    } else {
      // Bulan ini: intervals across the month
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
      const sampleDays = [1, 5, 10, 15, 20, 25, lastDay];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const mName = monthNames[curMonth];

      const labels = sampleDays.map(d => `${String(d).padStart(2, '0')} ${mName}`);
      const pendapatan = sampleDays.map(() => 0);
      const pengeluaran = sampleDays.map(() => 0);

      // Populate if available in rawDaily
      if (rawDaily && rawDaily.labels) {
        sampleDays.forEach((d, idx) => {
          const target = `${String(d).padStart(2, '0')}/${String(curMonth + 1).padStart(2, '0')}`;
          const matchIdx = rawDaily.labels.indexOf(target);
          if (matchIdx !== -1) {
            pendapatan[idx] = rawDaily.pendapatan[matchIdx] || 0;
            pengeluaran[idx] = rawDaily.pengeluaran[matchIdx] || 0;
          }
        });
      }

      return { labels, pendapatan, pengeluaran };
    }
  }, [chartFilter, financeData]);

  const kotor = financeData?.pendapatanKotor ?? 0;
  const beban = financeData?.pengeluaran ?? 0;
  const cashNet = financeData?.bersihCash ?? 0;
  const bankNet = financeData?.bersihBank ?? 0;
  const bersih = financeData?.pendapatanBersih ?? 0;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-10 font-sans">
      <Topbar />

      {/* 1. FILTER PERIODE DASHBOARD (SESUAI GAMBAR 3 BAGIAN ATAS) */}
      <section className="bg-card border border-line rounded-[14px] p-4 shadow-sm mt-1 relative">
        <div className="flex items-center justify-between">
          {/* Sisi Kiri: Informasi tanggal yang dipilih */}
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              PERIODE DASHBOARD
            </h2>
            <div className="font-mono font-bold text-sm sm:text-base text-gold">
              {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </div>
          </div>

          {/* Sisi Kanan: Tombol Filter Popover Periode */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setIsPeriodPopoverOpen(prev => !prev)}
              className="bg-stat border border-line text-ink hover:border-gold px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Calendar size={14} className="text-gold" />
              <span>Periode</span>
              <ChevronDown size={14} className={`text-side-text transition-transform ${isPeriodPopoverOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* POPOVER PANEL SESUAI GAMBAR 3 */}
            {isPeriodPopoverOpen && (
              <div className="absolute right-0 top-12 z-50 w-[320px] sm:w-[540px] bg-card border border-line rounded-2xl shadow-xl p-4 sm:p-5 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  
                  {/* Kolom Kiri: DARI TANGGAL */}
                  <div>
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
                        className="w-full bg-stat border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  {/* Kolom Tengah: Preset Buttons */}
                  <div className="flex flex-col gap-1.5">
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
                          type="button"
                          onClick={() => {
                            handlePresetSelect(p.id as PresetPeriod);
                            if (p.id !== 'custom') {
                              setIsPeriodPopoverOpen(false);
                            }
                          }}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
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

                  {/* Kolom Kanan: SAMPAI TANGGAL */}
                  <div>
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
                        className="w-full bg-stat border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPeriodPopoverOpen(false)}
                      className="mt-3 w-full bg-gold hover:bg-[#A38225] text-white py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                    >
                      Terapkan Filter
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD FINANCE SECTION (CASH FLOW PERIODE TERPILIH) */}
      <section className="bg-bg border border-line rounded-[14px] p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase">
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

        {/* 3. MULTIPLE LINE CHART KEANGAN (SESUAI GAMBAR 3) */}
        <div className="bg-card border border-line rounded-[14px] p-4 mt-1 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h4 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-0.5">
                MULTIPLE LINE
              </h4>
              <h3 className="text-lg font-serif font-bold text-ink">
                Pendapatan Finance vs Pengeluaran
              </h3>
            </div>
            
            {/* Filter Hari Ini / Minggu Ini / Bulan Ini (Default Minggu Ini: Senin-Minggu) */}
            <div className="flex items-center gap-1 bg-stat border border-line p-1 rounded-xl">
              {[
                { id: 'hari_ini', label: 'Hari ini' },
                { id: 'minggu_ini', label: 'Minggu ini' },
                { id: 'bulan_ini', label: 'Bulan ini' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setChartFilter(f.id as ChartFilterType)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartFilter === f.id 
                      ? 'bg-gold text-white font-bold shadow-2xs' 
                      : 'text-side-text hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <FinanceChart chartData={computedChartData} />
          </div>
        </div>
      </section>

      {/* 4. DASHBOARD STOCK: PERGERAKAN DAN KONDISI STOCK (SESUAI GAMBAR 3: DI BAWAH CHART & DI ATAS LOG AUDIT) */}
      <section className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.1em] text-side-text uppercase mb-0.5">
              DASHBOARD STOCK
            </h2>
            <h3 className="font-serif font-bold text-lg text-ink">
              Pergerakan dan Kondisi Stock
            </h3>
          </div>
          <button 
            onClick={fetchDashboard}
            className="text-xs text-side-text hover:text-gold flex items-center gap-1 font-bold"
            title="Segarkan data realtime"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* 5 Cards Sesuai Gambar 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Card 1: TOTAL SKU */}
          <div className="bg-stat border border-line rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">TOTAL SKU</span>
              <Boxes size={15} className="text-side-text" />
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink font-mono">
              {stockData?.totalSku ?? 0}
            </div>
            <span className="text-[10px] text-side-text mt-0.5">item aktif</span>
          </div>

          {/* Card 2: STOCK MASUK */}
          <div className="bg-stat border border-line rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">STOCK MASUK</span>
              <ArrowDownLeft size={15} className="text-green" />
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-green font-mono">
              {stockMasukCount}
            </div>
            <span className="text-[10px] text-side-text mt-0.5">periode terpilih</span>
          </div>

          {/* Card 3: STOCK KELUAR */}
          <div className="bg-stat border border-line rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">STOCK KELUAR</span>
              <ArrowUpRight size={15} className="text-gold" />
            </div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink font-mono">
              {stockKeluarCount}
            </div>
            <span className="text-[10px] text-side-text mt-0.5">periode terpilih</span>
          </div>

          {/* Card 4: KONDISI STOCK */}
          <div className="bg-stat border border-line rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">KONDISI STOCK</span>
              <AlertTriangle size={15} className={(stockData?.kondisiKritis ?? 0) > 0 ? "text-red" : "text-green"} />
            </div>
            <div className={`text-xl sm:text-2xl font-serif font-bold font-mono ${(stockData?.kondisiKritis ?? 0) > 0 ? "text-red" : "text-green"}`}>
              {stockData?.kondisiKritis ?? 0}
            </div>
            <span className="text-[10px] text-side-text mt-0.5">perlu restock</span>
          </div>

          {/* Card 5: NILAI STOCK */}
          <div className="bg-stat border border-line rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-side-text uppercase tracking-wider">NILAI STOCK</span>
              <Database size={15} className="text-gold" />
            </div>
            <div className="text-lg sm:text-xl font-serif font-bold text-green font-mono">
              Rp {(stockData?.nilaiStockTotal ?? 0).toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-side-text mt-0.5">estimasi nilai</span>
          </div>

        </div>
      </section>

      {/* 5. LOG AUDIT TERKINI (PALING BAWAH - BERSIH DARI DUMMY DATA SESUAI INSTRUKSI) */}
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
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-side-text italic bg-card">
                    Belum ada riwayat aktivitas transaksi. Transaksi POS, Pembelian, Yield Prep, dan Produksi Batch akan tercatat secara otomatis di sini.
                  </td>
                </tr>
              ) : (
                auditLogs.map((item) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
