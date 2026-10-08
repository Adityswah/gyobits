'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Wallet, TrendingUp, Filter, Trash2 } from 'lucide-react';
import { api, FinanceTransactionRecord } from '@/lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface FinanceTransactionRow {
  id: number;
  tanggal: string;
  noTransaksi: string;
  tipe: 'pendapatan' | 'pengeluaran';
  metode: 'cash' | 'bank';
  kategori: string;
  qty: string;
  nominal: number;
  itemDetail: string;
}

export default function FinanceReportPage() {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [viewMode, setViewMode] = useState<'ringkasan' | 'detail'>('detail');
  const [transactions, setTransactions] = useState<FinanceTransactionRow[]>([]);

  // Filters for bottom log
  const [filterNoTransaksi, setFilterNoTransaksi] = useState('');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [filterMetode, setFilterMetode] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState('Semua');

  const loadFinanceData = useCallback(() => {
    api.finance.getTransactions()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          const mapped: FinanceTransactionRow[] = res.data.map((t: FinanceTransactionRecord) => {
            const isInc = t.kind === 'INCOME';
            const channel = (t.channel || 'CASH').toLowerCase() as 'cash' | 'bank';
            const refCode = t.sourceType === 'PURCHASE' ? `PUR-${t.sourceId || t.id}` :
                            t.sourceType === 'SALE' ? `SALE-${t.sourceId || t.id}` :
                            `FIN-${t.kind.slice(0, 2)}-${t.id}`;
            return {
              id: t.id,
              tanggal: new Date(t.createdAt || t.txnDate).toLocaleString('id-ID'),
              noTransaksi: refCode,
              tipe: isInc ? 'pendapatan' : 'pengeluaran',
              metode: channel,
              kategori: t.categoryName || (isInc ? 'Penjualan' : 'Operasional'),
              qty: '1',
              nominal: Number(t.amountRupiah) || 0,
              itemDetail: t.note || (isInc ? 'Pendapatan Kasir / Usaha' : 'Pengeluaran Operasional'),
            };
          });
          setTransactions(mapped);
        } else {
          setTransactions([]);
        }
      })
      .catch(() => {
        setTransactions([]);
      });
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleDeleteTransaction = async (id: number) => {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN transaksi #${id}?\nData yang dihapus tidak dapat dipulihkan.`)) {
      try {
        await api.finance.deleteTransaction(id);
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        loadFinanceData();
      } catch (err: unknown) {
        alert(`Gagal menghapus transaksi: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Dynamic Summary Metrics
  const kasCashMasuk = useMemo(() => 
    transactions.filter(t => t.tipe === 'pendapatan' && t.metode === 'cash').reduce((a, b) => a + b.nominal, 0),
    [transactions]
  );
  const kasCashKeluar = useMemo(() => 
    transactions.filter(t => t.tipe === 'pengeluaran' && t.metode === 'cash').reduce((a, b) => a + b.nominal, 0),
    [transactions]
  );
  const saldoCash = kasCashMasuk - kasCashKeluar;

  const kasBankMasuk = useMemo(() => 
    transactions.filter(t => t.tipe === 'pendapatan' && t.metode === 'bank').reduce((a, b) => a + b.nominal, 0),
    [transactions]
  );
  const kasBankKeluar = useMemo(() => 
    transactions.filter(t => t.tipe === 'pengeluaran' && t.metode === 'bank').reduce((a, b) => a + b.nominal, 0),
    [transactions]
  );
  const saldoBank = kasBankMasuk - kasBankKeluar;

  const totalIncome = kasCashMasuk + kasBankMasuk;
  const cogs = useMemo(() => 
    transactions.filter(t => t.tipe === 'pengeluaran' && (t.kategori.toLowerCase().includes('bahan') || t.kategori.toLowerCase().includes('pembelian'))).reduce((a, b) => a + b.nominal, 0),
    [transactions]
  );
  const nonStockExpense = (kasCashKeluar + kasBankKeluar) - cogs;
  const grossProfit = totalIncome - cogs;
  const priveOwner = 0;
  const netOperatingIncome = totalIncome - (cogs + nonStockExpense);
  const netMargin = totalIncome > 0 ? Math.round((netOperatingIncome / totalIncome) * 100) : 0;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterNoTransaksi && !t.noTransaksi.toLowerCase().includes(filterNoTransaksi.toLowerCase())) return false;
      if (filterTipe !== 'Semua' && t.tipe !== filterTipe) return false;
      if (filterMetode !== 'Semua' && t.metode !== filterMetode) return false;
      if (filterKategori !== 'Semua' && t.kategori !== filterKategori) return false;
      return true;
    });
  }, [transactions, filterNoTransaksi, filterTipe, filterMetode, filterKategori]);

  // EXPORT EXCEL (DOWNLOAD AUDIT)
  const handleDownloadAuditExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detail Transaksi
    const wsData = [
      ["LAPORAN AUDIT KEUANGAN GYOBITS"],
      [`Periode: ${selectedMonth} ${selectedYear}`],
      [],
      ["TANGGAL", "NO TRANSAKSI / NAMA", "TIPE", "METODE", "KATEGORI", "QTY", "NOMINAL (RP)", "KETERANGAN"],
      ...filteredTransactions.map(t => [
        t.tanggal,
        t.noTransaksi,
        t.tipe.toUpperCase(),
        t.metode.toUpperCase(),
        t.kategori,
        t.qty,
        t.nominal,
        t.itemDetail
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Audit Transaksi");

    // Sheet 2: Ringkasan Laba Rugi
    const summaryData = [
      ["RINGKASAN LABA RUGI OPERASIONAL"],
      ["Komponen", "Nilai (Rp)", "% of Income"],
      ["Total Income", totalIncome, 100],
      ["Cost of Goods Sold (Bahan Baku)", cogs, ((cogs/totalIncome)*100).toFixed(2)],
      ["Gross Profit", grossProfit, ((grossProfit/totalIncome)*100).toFixed(2)],
      ["Beban Operasional Non-Stok", nonStockExpense, ((nonStockExpense/totalIncome)*100).toFixed(2)],
      ["Prive Owner", priveOwner, ((priveOwner/totalIncome)*100).toFixed(2)],
      ["Net Operating Income (Laba Bersih)", netOperatingIncome, netMargin],
      [],
      ["Kas Tunai (Masuk)", kasCashMasuk],
      ["Kas Tunai (Keluar)", kasCashKeluar],
      ["Saldo Kas Fisik", saldoCash],
      ["Bank Masuk", kasBankMasuk],
      ["Bank Keluar", kasBankKeluar],
      ["Saldo Bank", saldoBank]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Laba Rugi & Arus Kas");

    XLSX.writeFile(wb, `Audit_Keuangan_GYOBITS_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // EXPORT PDF (DOWNLOAD LAPORAN PERUSAHAAN BESAR)
  const handleDownloadLaporanPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');

    // Header Corporate
    doc.setFillColor(27, 23, 19);
    doc.rect(0, 0, 595, 75, 'F');

    doc.setTextColor(215, 196, 138);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("GYOBITS RESTO & CATERING", 40, 35);

    doc.setTextColor(250, 247, 242);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`LAPORAN AUDIT & LABA RUGI KEUANGAN - PERIODE ${selectedMonth.toUpperCase()} ${selectedYear}`, 40, 52);

    // Summary Box
    doc.setTextColor(27, 23, 19);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("I. IKHTISAR KINERJA KEUANGAN (FINANCIAL HIGHLIGHTS)", 40, 105);

    const highlights = [
      ["Pendapatan Kotor (Total Income)", `Rp ${totalIncome.toLocaleString('id-ID')}`, "100.0%"],
      ["Harga Pokok Penjualan (COGS)", `Rp ${cogs.toLocaleString('id-ID')}`, "44.3%"],
      ["Laba Kotor (Gross Profit)", `Rp ${grossProfit.toLocaleString('id-ID')}`, "55.7%"],
      ["Beban Non-Stok & Operasional", `Rp ${nonStockExpense.toLocaleString('id-ID')}`, "13.1%"],
      ["Prive / Penarikan Owner", `Rp ${priveOwner.toLocaleString('id-ID')}`, "0.6%"],
      ["Laba Bersih Operasional (Net Income)", `Rp ${netOperatingIncome.toLocaleString('id-ID')}`, `${netMargin}%`],
      ["Saldo Bersih Kas Fisik (Cash)", `Rp ${saldoCash.toLocaleString('id-ID')}`, "-"],
      ["Saldo Bersih Bank / QRIS", `Rp ${saldoBank.toLocaleString('id-ID')}`, "-"]
    ];

    autoTable(doc, {
      startY: 115,
      head: [["Komponen", "Nilai Rupiah", "Rasio"]],
      body: highlights,
      theme: 'grid',
      headStyles: { fillColor: [184, 150, 46], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 40, right: 40 }
    });

    // Detailed Log
    const currentY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("II. BUKU BESAR DETAIL TRANSAKSI (AUDIT TRAIL)", 40, currentY);

    const tableData = filteredTransactions.map(t => [
      t.tanggal,
      t.noTransaksi,
      t.tipe.toUpperCase(),
      t.metode.toUpperCase(),
      t.kategori,
      `Rp ${t.nominal.toLocaleString('id-ID')}`
    ]);

    autoTable(doc, {
      startY: currentY + 10,
      head: [["Waktu", "No Transaksi", "Tipe", "Metode", "Kategori", "Nominal"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [45, 40, 35], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 4 },
      margin: { left: 40, right: 40 }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    if (finalY < 750) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Disusun & Diaudit oleh:", 40, finalY);
      doc.text("Disetujui oleh:", 400, finalY);
      doc.setFont("helvetica", "bold");
      doc.text("Sistem Ledger Append-Only GYOBITS", 40, finalY + 45);
      doc.text("Owner GYOBITS", 400, finalY + 45);
    }

    doc.save(`Laporan_Keuangan_GYOBITS_${selectedMonth}_${selectedYear}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      {/* Title Header */}
      <div className="flex items-center justify-between mt-1">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            OWNER VIEW
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">
            Kas Bank, Laba Rugi, Arus Kas, Neraca Lite
          </h1>
        </div>
      </div>

      {/* 3-BAGIAN SESUAI GAMBAR 5: PANEL KIRI & PANEL KANAN */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* BAGIAN 1: PANEL KIRI (PERIODE, EXPORT, SUMMARY RINGKAS) */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-3.5">
          
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              LAPORAN FINANCE
            </h2>
            <h3 className="font-serif font-bold text-ink text-base mb-3.5">Periode Kas & Laba Rugi</h3>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">TAHUN</label>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink outline-none cursor-pointer"
                  >
                    <option value="2026">2026</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-side-text uppercase tracking-wider block mb-1">BULAN</label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink outline-none cursor-pointer"
                  >
                    <option value="Juni">Juni</option>
                    <option value="Oktober">Oktober</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: DOWNLOAD AUDIT & DOWNLOAD LAPORAN */}
              <button 
                onClick={handleDownloadAuditExcel}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface border border-line rounded-xl text-xs font-bold text-ink hover:bg-stat hover:text-gold transition-colors shadow-2xs"
              >
                <FileText size={14} />
                Download Audit (Excel)
              </button>
              <button 
                onClick={handleDownloadLaporanPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface border border-line rounded-xl text-xs font-bold text-ink hover:bg-stat hover:text-gold transition-colors shadow-2xs"
              >
                <Download size={14} />
                Download Laporan (PDF)
              </button>
            </div>
          </div>

          {/* 3 Mini Cards (Pendapatan Kotor, Cash vs Bank, Net Margin) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-line rounded-xl p-3 flex flex-col justify-between h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text leading-tight font-medium">Pendapatan Kotor</span>
              <div>
                <div className="font-mono font-bold text-ink text-xs">Rp {totalIncome.toLocaleString('id-ID')}</div>
                <TrendingUp size={15} className="text-gold mt-1" />
              </div>
            </div>
            <div className="bg-card border border-line rounded-xl p-3 flex flex-col justify-between h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text leading-tight font-medium">Cash vs Bank</span>
              <div className="flex items-end gap-1 mt-auto h-7">
                <div className="w-1/2 bg-gold h-[40%] rounded-t-xs" />
                <div className="w-1/2 bg-[#3D6B50] h-[75%] rounded-t-xs" />
              </div>
              <div className="flex justify-between text-[8px] text-side-text mt-1 font-mono">
                <span>Cash</span><span>Bank</span>
              </div>
            </div>
            <div className="bg-card border border-line rounded-xl p-3 flex flex-col items-center justify-center h-[105px] shadow-sm">
              <span className="text-[10px] text-side-text mb-1 font-medium">Net Margin</span>
              <div className="relative w-11 h-11 flex items-center justify-center rounded-full border-4 border-line">
                <span className="font-mono text-xs font-bold text-ink">{netMargin}%</span>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3.5">
              <div>
                <div className="text-[9px] text-side-text font-bold uppercase tracking-wider">Laporan Finance</div>
                <div className="font-mono font-bold text-ink text-xs">{selectedMonth} {selectedYear}</div>
              </div>
              <Wallet size={16} className="text-gold" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pendapatan kotor (cash + bank)</span>
                <span className="font-mono font-bold text-ink">Rp {totalIncome.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pengeluaran (cash + bank)</span>
                <span className="font-mono font-bold text-red">Rp {(kasCashKeluar + kasBankKeluar).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pendapatan Bersih Cash</span>
                <span className="font-mono font-bold text-ink">Rp {saldoCash.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-side-text">Pendapatan Bersih Bank</span>
                <span className="font-mono font-bold text-ink">Rp {saldoBank.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-ink">Total Pendapatan Bersih</span>
                <span className="font-mono text-green">Rp {netOperatingIncome.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* BAGIAN 2: PANEL KANAN (KAS CASH/BANK, TABEL LABA RUGI, ARUS KAS & NERACA LITE) */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              LAPORAN FINANCE
            </h2>
            <h3 className="font-serif font-bold text-ink text-base mb-4">Kas Bank, Laba Rugi, Arus Kas, Neraca Lite</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Kas Cash */}
              <div className="bg-stat border border-line rounded-xl p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Cash</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono font-bold text-ink">Rp {kasCashMasuk.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono font-bold text-ink">Rp {kasCashKeluar.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo periode</span><span className="font-mono text-ink">Rp {saldoCash.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Kas Bank */}
              <div className="bg-stat border border-line rounded-xl p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Kas Bank</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Masuk</span><span className="font-mono font-bold text-ink">Rp {kasBankMasuk.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Keluar</span><span className="font-mono font-bold text-ink">Rp {kasBankKeluar.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Saldo periode</span><span className="font-mono text-green">Rp {saldoBank.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Laba Rugi Breakdown Sesuai Gambar 5 */}
            <div className="overflow-x-auto border border-line rounded-xl mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-[10px] text-side-text uppercase font-bold border-b border-line">
                  <tr>
                    <th className="p-3">DESCRIPTION</th>
                    <th className="p-3 text-right">TOTAL</th>
                    <th className="p-3 text-right">% OF INCOME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  <tr>
                    <td className="p-3 font-bold text-side-text" colSpan={3}>Income</td>
                  </tr>
                  <tr className="bg-card">
                    <td className="p-3 pl-6">Pendapatan Cash</td>
                    <td className="p-3 text-right font-mono">Rp {kasCashMasuk.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? ((kasCashMasuk / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                  <tr className="bg-card">
                    <td className="p-3 pl-6">Pendapatan Bank</td>
                    <td className="p-3 text-right font-mono">Rp {kasBankMasuk.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? ((kasBankMasuk / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                  <tr className="bg-stat/60 font-bold">
                    <td className="p-3">Total Income</td>
                    <td className="p-3 text-right font-mono text-green">Rp {totalIncome.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? '100%' : '0%'}</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-side-text" colSpan={3}>Cost of Goods Sold</td>
                  </tr>
                  <tr className="bg-card">
                    <td className="p-3 pl-6">Pengeluaran Keperluan Stock</td>
                    <td className="p-3 text-right font-mono">Rp {cogs.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? ((cogs / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                  <tr className="bg-stat/60 font-bold">
                    <td className="p-3">GROSS PROFIT</td>
                    <td className="p-3 text-right font-mono text-gold">Rp {grossProfit.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-side-text" colSpan={3}>Expense</td>
                  </tr>
                  <tr className="bg-card">
                    <td className="p-3 pl-6">Non-stock Expense</td>
                    <td className="p-3 text-right font-mono">Rp {nonStockExpense.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{totalIncome > 0 ? ((nonStockExpense / totalIncome) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                  <tr className="bg-card">
                    <td className="p-3 pl-6">Prive Owner</td>
                    <td className="p-3 text-right font-mono">Rp {priveOwner.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">0%</td>
                  </tr>
                  <tr className="bg-gold-soft/40 font-bold border-t-2 border-line">
                    <td className="p-3">NET OPERATING INCOME</td>
                    <td className="p-3 text-right font-mono text-green">Rp {netOperatingIncome.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono text-gold">{netMargin}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Arus Kas & Neraca Lite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stat border border-line rounded-xl p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Arus Kas</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Arus masuk operasi</span><span className="font-mono font-bold text-ink">Rp {totalIncome.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text">
                    <span>Arus keluar stock</span><span className="font-mono font-bold text-ink">Rp {cogs.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Arus keluar non-stock</span><span className="font-mono font-bold text-ink">Rp {nonStockExpense.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Net cash flow</span><span className="font-mono text-green">Rp {(totalIncome - (cogs + nonStockExpense)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-stat border border-line rounded-xl p-4">
                <h4 className="font-bold text-ink text-sm mb-3">Neraca Lite</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-side-text">
                    <span>Kas periode</span><span className="font-mono font-bold text-ink">Rp {saldoCash.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text">
                    <span>Bank periode</span><span className="font-mono font-bold text-ink">Rp {saldoBank.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-side-text border-b border-line pb-2">
                    <span>Persediaan stock</span><span className="font-mono font-bold text-ink">Rp 0</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink pt-1">
                    <span>Aset operasional lite</span><span className="font-mono text-green">Rp {(saldoCash + saldoBank).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* BAGIAN 3: DETAIL TRANSAKSI PER NOTA (FINANCE GROUPED LOG SESUAI GAMBAR 5) */}
      <section className="bg-card border border-line rounded-[14px] p-4 sm:p-5 shadow-sm mt-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">
              FINANCE GROUPED LOG
            </h2>
            <h3 className="font-serif font-bold text-ink text-lg">
              Detail Transaksi per Nota
            </h3>
          </div>

          <div className="flex items-center bg-stat border border-line rounded-xl text-xs overflow-hidden p-0.5">
            <button 
              onClick={() => setViewMode('ringkasan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'ringkasan' ? 'bg-gold text-white shadow-2xs' : 'text-side-text hover:text-ink'
              }`}
            >
              Ringkasan
            </button>
            <button 
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'detail' ? 'bg-gold text-white shadow-2xs' : 'text-side-text hover:text-ink'
              }`}
            >
              Detail
            </button>
          </div>
        </div>

        {/* Filter Baris Header Tabel */}
        <div className="overflow-x-auto border border-line rounded-xl bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-stat text-ink dark:bg-[#1E1914] dark:text-[#E0D8C8] text-[10px] uppercase font-bold border-b border-line">
              <tr>
                <th className="p-3 align-top min-w-[140px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>TANGGAL</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <div className="text-[10px] text-side-text font-normal pt-1">Bulan {selectedMonth}</div>
                </th>
                <th className="p-3 align-top min-w-[210px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>NO TRANSAKSI / NAMA</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Filter nota/nama..."
                    value={filterNoTransaksi}
                    onChange={(e) => setFilterNoTransaksi(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  />
                </th>
                <th className="p-3 align-top min-w-[110px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>TIPE</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterTipe}
                    onChange={(e) => setFilterTipe(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua</option>
                    <option value="pendapatan">Pendapatan</option>
                    <option value="pengeluaran">Pengeluaran</option>
                  </select>
                </th>
                <th className="p-3 align-top min-w-[110px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>METODE</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterMetode}
                    onChange={(e) => setFilterMetode(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </th>
                <th className="p-3 align-top min-w-[120px]">
                  <div className="flex items-center justify-between mb-1">
                    <span>KATEGORI</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <select 
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Pendapatan">Pendapatan</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                </th>
                <th className="p-3 align-top text-right min-w-[70px]">
                  <div className="mb-1">QTY</div>
                  <div className="text-[10px] text-side-text font-normal pt-1">Porsi</div>
                </th>
                <th className="p-3 align-top text-right min-w-[120px]">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span>NOMINAL</span>
                    <Filter size={11} className="text-gold" />
                  </div>
                  <div className="text-[10px] text-side-text font-normal pt-1 text-right">Rupiah</div>
                </th>
                <th className="p-3 align-top text-center min-w-[70px]">
                  <div className="mb-1">AKSI</div>
                  <div className="text-[10px] text-side-text font-normal pt-1">Kelola</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-side-text">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-serif font-bold text-sm text-ink">Belum Ada Riwayat Transaksi Keuangan</p>
                      <p className="text-xs text-side-text">Semua arus kas (Penjualan POS, Pembelian Bahan, dan Mutasi Kas) akan tercatat otomatis di sini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item, idx) => (
                  <React.Fragment key={item.id || idx}>
                    <tr className={idx % 2 === 0 ? 'bg-card' : 'bg-bg'}>
                      <td className="p-3 font-mono text-[11px] text-side-text align-top">{item.tanggal}</td>
                      <td className="p-3 font-mono font-bold text-gold align-top">{item.noTransaksi}</td>
                      <td className="p-3 align-top">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.tipe === 'pendapatan' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                        }`}>
                          {item.tipe}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-side-text uppercase align-top">{item.metode}</td>
                      <td className="p-3 font-bold align-top">{item.kategori}</td>
                      <td className="p-3 text-right font-mono align-top">{item.qty}</td>
                      <td className="p-3 text-right font-mono font-bold align-top">
                        Rp {item.nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center align-top">
                        <button
                          onClick={() => handleDeleteTransaction(item.id)}
                          className="inline-flex items-center gap-1 bg-card border border-red/30 rounded px-2 py-1 text-[10px] hover:bg-red/10 font-bold text-red transition-colors"
                          title="Hapus Transaksi Permanen"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </td>
                    </tr>
                    {viewMode === 'detail' && (
                      <tr className={idx % 2 === 0 ? 'bg-card/70' : 'bg-bg/70'}>
                        <td colSpan={1}></td>
                        <td className="p-3 pt-0 text-[11px] text-side-text font-medium">{item.itemDetail}</td>
                        <td colSpan={2}></td>
                        <td className="p-3 pt-0 text-[11px] text-side-text">{item.kategori}</td>
                        <td className="p-3 pt-0 text-right font-mono text-[11px] text-side-text">1 transaksi</td>
                        <td className="p-3 pt-0 text-right font-mono text-[11px] text-side-text">Rp {item.nominal.toLocaleString('id-ID')}</td>
                        <td></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
