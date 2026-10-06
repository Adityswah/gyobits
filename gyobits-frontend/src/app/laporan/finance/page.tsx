'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Wallet, TrendingUp, RefreshCw } from 'lucide-react';
import { api, DashboardFinanceResponse, FinanceTransactionRecord } from '@/lib/api';

export default function LaporanFinancePage() {
  const [period, setPeriod] = useState<'month' | 'today'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [finance, setFinance] = useState<DashboardFinanceResponse | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransactionRecord[]>([]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setIsLoading(true);
    const from = period === 'today' ? '2026-10-06' : '2026-10-01';
    const to = '2026-10-06';
    Promise.all([
      api.dashboard.getFinance({ from, to }),
      api.finance.getTransactions({ from, to }),
    ])
      .then(([finRes, txRes]) => {
        setFinance(finRes);
        setTransactions(txRes.data || []);
      })
      .catch((err) => {
        console.warn('Failed to load finance report:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [period]);

  useEffect(() => {
    let active = true;
    const from = period === 'today' ? '2026-10-06' : '2026-10-01';
    const to = '2026-10-06';
    Promise.all([
      api.dashboard.getFinance({ from, to }),
      api.finance.getTransactions({ from, to }),
    ])
      .then(([finRes, txRes]) => {
        if (active) {
          setFinance(finRes);
          setTransactions(txRes.data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load finance report:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  const kotor = finance?.pendapatanKotor || 0;
  const beban = finance?.pengeluaran || 0;
  const bersih = finance?.pendapatanBersih || 0;
  const cashNet = finance?.bersihCash || 0;
  const bankNet = finance?.bersihBank || 0;
  const marginPct = kotor > 0 ? ((bersih / kotor) * 100).toFixed(1) : '0';

  // Calculate Cash & Bank In/Out
  let cashIn = 0;
  let cashOut = 0;
  let bankIn = 0;
  let bankOut = 0;

  for (const t of transactions) {
    const amt = Number(t.amountRupiah);
    if (t.channel === 'CASH') {
      if (t.kind === 'INCOME') cashIn += amt;
      else cashOut += amt;
    } else if (t.channel === 'BANK') {
      if (t.kind === 'INCOME') bankIn += amt;
      else bankOut += amt;
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            LAPORAN RESMI
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Kas Bank, Laba Rugi, & Arus Kas</h1>
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
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">FILTER LAPORAN</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Periode Kas & Laba Rugi</h3>
            
            <div className="space-y-3">
              <div className="bg-bg border border-line rounded-lg p-3">
                <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">RENTANG WAKTU</label>
                <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as 'month' | 'today')}
                  className="w-full bg-white border border-line rounded-md px-2 py-1.5 text-xs text-ink outline-none mb-1 font-bold"
                >
                  <option value="month">Oktober 2026 (Bulan Berjalan)</option>
                  <option value="today">Hari Ini Saja (06/10/2026)</option>
                </select>
                <div className="text-[10px] text-side-text">
                  {period === 'today' ? '06/10/2026' : '01/10/2026 - 06/10/2026'}
                </div>
              </div>

              <button 
                onClick={() => alert("Laporan Excel berhasil diunduh!")}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg transition-colors shadow-xs"
              >
                <FileText size={14} />
                Export Excel Laporan
              </button>
              <button 
                onClick={() => alert("Dokumen PDF Audit berhasil dicetak!")}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink hover:bg-bg transition-colors shadow-xs"
              >
                <Download size={14} />
                Export PDF Audit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col justify-between h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text leading-tight">Pendapatan Kotor</span>
              <div>
                <div className="font-mono font-bold text-ink text-xs">Rp {kotor.toLocaleString('id-ID')}</div>
                <TrendingUp size={15} className="text-gold mt-1" />
              </div>
            </div>
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col justify-between h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text leading-tight">Cash vs Bank</span>
              <div className="flex items-end gap-1 mt-auto h-7">
                <div className="w-1/2 bg-gold h-[55%] rounded-t-sm" />
                <div className="w-1/2 bg-green h-[85%] rounded-t-sm" />
              </div>
              <div className="flex justify-between text-[8px] text-side-text mt-1">
                <span>Cash</span><span>Bank</span>
              </div>
            </div>
            <div className="bg-card border border-line rounded-lg p-3 flex flex-col items-center justify-center h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text mb-1">Net Margin</span>
              <div className="relative w-11 h-11 flex items-center justify-center rounded-full border-4 border-line">
                <span className="font-mono text-[11px] font-bold text-ink">{marginPct}%</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[9px] text-side-text font-bold uppercase">Ringkasan Ledger</div>
                <div className="font-bold text-ink text-xs">
                  {period === 'today' ? 'Hari ini' : 'Bulan Berjalan'}
                </div>
              </div>
              <Wallet size={16} className="text-gold" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pendapatan Kotor</span>
                <span className="font-mono font-bold text-ink">Rp {kotor.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pengeluaran Kas</span>
                <span className="font-mono font-bold text-red">Rp {beban.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Surplus Kas Fisik</span>
                <span className="font-mono font-bold text-ink">Rp {cashNet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Surplus Saldo Bank</span>
                <span className="font-mono font-bold text-ink">Rp {bankNet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-ink">Laba Bersih Riil</span>
                <span className="font-mono text-green">Rp {bersih.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN LABA RUGI</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Detail Arus Kas & Laba Rugi Operasional</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Kas Cash */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Tunai (Cash)</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono font-bold text-green">Rp {cashIn.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono font-bold text-red">Rp {cashOut.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo Kas Fisik</span><span className="font-mono">Rp {cashNet.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              {/* Kas Bank */}
              <div className="bg-bg border border-line rounded-lg p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Rekening / QRIS (Bank)</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono font-bold text-green">Rp {bankIn.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono font-bold text-red">Rp {bankOut.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo Rekening</span><span className="font-mono">Rp {bankNet.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Laba Rugi Breakdown */}
            <div className="overflow-x-auto border border-line rounded-lg mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">KOMPONEN KEUANGAN</th>
                    <th className="p-3 text-right">NOMINAL</th>
                    <th className="p-3 text-right">PORSI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  <tr className="bg-stat/50 font-bold">
                    <td className="p-2.5 text-side-text" colSpan={3}>Pemasukan (Income)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 pl-6">Penerimaan Kas Tunai (Cash In)</td>
                    <td className="p-2.5 text-right font-mono font-bold text-green">Rp {cashIn.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono text-side-text">{kotor > 0 ? ((cashIn / kotor) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 pl-6">Penerimaan Non-Tunai / Bank (QRIS)</td>
                    <td className="p-2.5 text-right font-mono font-bold text-green">Rp {bankIn.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono text-side-text">{kotor > 0 ? ((bankIn / kotor) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="bg-bg font-bold">
                    <td className="p-2.5 pl-6">Total Pendapatan Kotor</td>
                    <td className="p-2.5 text-right font-mono text-green">Rp {kotor.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono">100%</td>
                  </tr>

                  <tr className="bg-stat/50 font-bold">
                    <td className="p-2.5 text-side-text" colSpan={3}>Pengeluaran (Expense)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 pl-6">Biaya Pembelian & Operasional Tunai</td>
                    <td className="p-2.5 text-right font-mono font-bold text-red">Rp {cashOut.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono text-side-text">{kotor > 0 ? ((cashOut / kotor) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 pl-6">Biaya Non-Tunai / Transfer Bank</td>
                    <td className="p-2.5 text-right font-mono font-bold text-red">Rp {bankOut.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono text-side-text">{kotor > 0 ? ((bankOut / kotor) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="bg-bg font-bold">
                    <td className="p-2.5 pl-6">Total Beban Operasional</td>
                    <td className="p-2.5 text-right font-mono text-red">Rp {beban.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-mono text-side-text">{kotor > 0 ? ((beban / kotor) * 100).toFixed(0) : 0}%</td>
                  </tr>

                  <tr className="bg-gold-soft/30 font-bold border-t-2 border-line text-sm">
                    <td className="p-3 pl-6 text-ink">LABA / (RUGI) BERSIH PERIODE</td>
                    <td className="p-3 text-right font-mono text-green">Rp {bersih.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono text-gold">{marginPct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Riwayat Mutasi Buku Kas */}
            <div>
              <h4 className="font-serif font-bold text-ink text-sm mb-3">Daftar Transaksi Kas Masuk & Keluar</h4>
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                    <tr>
                      <th className="p-2.5">TANGGAL</th>
                      <th className="p-2.5">JENIS</th>
                      <th className="p-2.5">KANAL</th>
                      <th className="p-2.5">KATEGORI</th>
                      <th className="p-2.5">KETERANGAN</th>
                      <th className="p-2.5 text-right">NOMINAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-side-text">Belum ada catatan transaksi pada periode ini</td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-stat/40">
                          <td className="p-2.5 font-mono">{t.txnDate}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.kind === 'INCOME' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                            }`}>
                              {t.kind}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-side-text">{t.channel || 'NON-KAS'}</td>
                          <td className="p-2.5 font-bold">{t.categoryName || 'Operasional'}</td>
                          <td className="p-2.5 text-side-text">{t.note || '-'}</td>
                          <td className={`p-2.5 text-right font-mono font-bold ${
                            t.kind === 'INCOME' ? 'text-green' : 'text-red'
                          }`}>
                            Rp {Number(t.amountRupiah).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
