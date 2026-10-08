'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Topbar from "@/components/Topbar";
import { Download, FileText, Box, RefreshCw, Filter, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api, DashboardStockResponse, ItemRecord } from '@/lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface StockMovementAuditRow {
  id: string;
  waktu: string;
  noTransaksi: string;
  bahan: string;
  sku: string;
  kategori: string;
  arah: 'MASUK' | 'KELUAR';
  qtyMutasi: string;
  qtyNum: number;
  saldoAkhir: string;
  saldoNum: number;
  status: 'Aman' | 'Rendah' | 'Kritis' | 'Habis';
  nilai: number;
  keterangan: string;
}

const MOCK_STOCK_MOVEMENTS: StockMovementAuditRow[] = [];

export default function LaporanStockPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [stockSummary, setStockSummary] = useState<DashboardStockResponse | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);

  // Periode Filter (sesuai Gambar 5: hanya Tahun & Bulan yang ada datanya)
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('Oktober');

  // In-Header Filters for "Riwayat Keluar Masuknya Barang"
  const [filterNoTransaksi, setFilterNoTransaksi] = useState('');
  const [filterBahan, setFilterBahan] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStok, setFilterStok] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterNilai, setFilterNilai] = useState<'default' | 'desc' | 'asc'>('default');

  const [movementsData, setMovementsData] = useState<StockMovementAuditRow[]>([]);

  const loadReport = () => {
    setIsLoading(true);
    Promise.all([
      api.dashboard.getStock(),
      api.items.getAll(),
      fetch('/api/stock-movements').then(r => r.json()).catch(() => ({ success: false, data: [] })),
    ])
      .then(([stkRes, itmRes, movRes]) => {
        setStockSummary(stkRes);
        setItems(itmRes.data || []);
        if (movRes.data && Array.isArray(movRes.data)) {
          const mapped: StockMovementAuditRow[] = movRes.data.map((m: {
            id: number;
            occurredAt: string;
            movementType: string;
            qtyDelta: string;
            valueDeltaRupiah: string;
            qtyAfter: string;
            referenceType: string;
            referenceId: number;
            notes?: string;
            itemName?: string;
            sku?: string;
            category?: string;
          }) => ({
            id: `m-${m.id}`,
            waktu: new Date(m.occurredAt).toLocaleString('id-ID'),
            noTransaksi: `${m.referenceType || 'TXN'}-${m.referenceId || m.id}`,
            bahan: m.itemName || `Item #${m.referenceId}`,
            sku: m.sku || 'SKU-00',
            kategori: m.category || 'Bahan',
            arah: Number(m.qtyDelta) >= 0 ? 'MASUK' : 'KELUAR',
            qtyMutasi: `${Number(m.qtyDelta) >= 0 ? '+' : ''}${m.qtyDelta}`,
            qtyNum: Number(m.qtyDelta) || 0,
            saldoAkhir: `${m.qtyAfter}`,
            saldoNum: Number(m.qtyAfter) || 0,
            status: Number(m.qtyAfter) > 0 ? 'Aman' : 'Habis',
            nilai: Math.abs(Number(m.valueDeltaRupiah) || 0),
            keterangan: m.notes || m.movementType,
          }));
          setMovementsData(mapped);
        }
      })
      .catch((err) => {
        console.warn('Failed to load stock report:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.dashboard.getStock(),
      api.items.getAll(),
      fetch('/api/stock-movements').then(r => r.json()).catch(() => ({ success: false, data: [] })),
    ])
      .then(([stkRes, itmRes, movRes]) => {
        if (active) {
          setStockSummary(stkRes);
          setItems(itmRes.data || []);
          if (movRes.data && Array.isArray(movRes.data)) {
            const mapped: StockMovementAuditRow[] = movRes.data.map((m: {
              id: number;
              occurredAt: string;
              movementType: string;
              qtyDelta: string;
              valueDeltaRupiah: string;
              qtyAfter: string;
              referenceType: string;
              referenceId: number;
              notes?: string;
              itemName?: string;
              sku?: string;
              category?: string;
            }) => ({
              id: `m-${m.id}`,
              waktu: new Date(m.occurredAt).toLocaleString('id-ID'),
              noTransaksi: `${m.referenceType || 'TXN'}-${m.referenceId || m.id}`,
              bahan: m.itemName || `Item #${m.referenceId}`,
              sku: m.sku || 'SKU-00',
              kategori: m.category || 'Bahan',
              arah: Number(m.qtyDelta) >= 0 ? 'MASUK' : 'KELUAR',
              qtyMutasi: `${Number(m.qtyDelta) >= 0 ? '+' : ''}${m.qtyDelta}`,
              qtyNum: Number(m.qtyDelta) || 0,
              saldoAkhir: `${m.qtyAfter}`,
              saldoNum: Number(m.qtyAfter) || 0,
              status: Number(m.qtyAfter) > 0 ? 'Aman' : 'Habis',
              nilai: Math.abs(Number(m.valueDeltaRupiah) || 0),
              keterangan: m.notes || m.movementType,
            }));
            setMovementsData(mapped);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load stock report:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalNilai = stockSummary?.nilaiStockTotal ?? 0;
  const totalSku = stockSummary?.totalSku ?? 0;
  const kondisiKritis = stockSummary?.kondisiKritis ?? 0;

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    let result = movementsData.filter((m) => {
      // Filter periode sederhana: jika bulan Juni, ambil transaksi bulan 06; jika Oktober, ambil bulan 10
      const targetMonthNum = selectedMonth === 'Juni' ? '/06/' : '/10/';
      if (!m.waktu.includes(targetMonthNum)) {
        return false;
      }

      // 1. No Transaksi
      if (filterNoTransaksi.trim() !== '') {
        const query = filterNoTransaksi.toLowerCase();
        if (!m.noTransaksi.toLowerCase().includes(query)) return false;
      }

      // 2. Bahan / SKU
      if (filterBahan.trim() !== '') {
        const query = filterBahan.toLowerCase();
        if (!m.bahan.toLowerCase().includes(query) && !m.sku.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 3. Kategori
      if (filterKategori !== 'Semua' && m.kategori !== filterKategori) {
        return false;
      }

      // 4. Stok Ketersediaan
      if (filterStok === 'Ada Stok' && m.saldoNum <= 0) return false;
      if (filterStok === 'Kosong' && m.saldoNum > 0) return false;

      // 5. Status
      if (filterStatus !== 'Semua' && m.status !== filterStatus) {
        return false;
      }

      return true;
    });

    // 6. Nilai sort
    if (filterNilai === 'desc') {
      result = [...result].sort((a, b) => b.nilai - a.nilai);
    } else if (filterNilai === 'asc') {
      result = [...result].sort((a, b) => a.nilai - b.nilai);
    }

    return result;
  }, [selectedMonth, filterNoTransaksi, filterBahan, filterKategori, filterStok, filterStatus, filterNilai]);

  // EXPORT EXCEL (DOWNLOAD AUDIT)
  const handleDownloadAuditExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Riwayat Keluar Masuknya Barang
    const wsAuditData = [
      ["LAPORAN AUDIT MUTASI INVENTARIS GYOBITS"],
      [`Periode: ${selectedMonth} ${selectedYear}`],
      [],
      ["NO TRANSAKSI", "WAKTU", "BAHAN", "SKU", "KATEGORI", "ARAH", "QTY MUTASI", "SALDO AKHIR", "STATUS", "VALUASI (RP)", "KETERANGAN"],
      ...filteredMovements.map(m => [
        m.noTransaksi,
        m.waktu,
        m.bahan,
        m.sku,
        m.kategori,
        m.arah,
        m.qtyMutasi,
        m.saldoAkhir,
        m.status,
        m.nilai,
        m.keterangan
      ])
    ];
    const wsAudit = XLSX.utils.aoa_to_sheet(wsAuditData);
    XLSX.utils.book_append_sheet(wb, wsAudit, "Mutasi Keluar-Masuk");

    // Sheet 2: Saldo & Valuasi Fisik
    const wsStockData = [
      ["VALUASI DAN SALDO FISIK STOK GUDANG"],
      [`Periode: ${selectedMonth} ${selectedYear}`],
      [],
      ["SKU", "NAMA ITEM", "KATEGORI", "SALDO FISIK", "SATUAN", "HPP SATUAN (RP)", "TOTAL VALUASI (RP)"],
      ...items.map(i => [
        i.sku,
        i.name,
        i.category,
        Number(i.currentStockQty || 0),
        i.displayUnit || i.unitBase,
        Number(i.currentAvgCostRupiah || 0),
        Number(i.currentStockValueRupiah || 0)
      ])
    ];
    const wsStock = XLSX.utils.aoa_to_sheet(wsStockData);
    XLSX.utils.book_append_sheet(wb, wsStock, "Saldo & Valuasi Fisik");

    XLSX.writeFile(wb, `Audit_Stok_GYOBITS_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // EXPORT PDF (DOWNLOAD LAPORAN FORMAL PERUSAHAAN)
  const handleDownloadLaporanPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');

    // Corporate Header
    doc.setFillColor(27, 23, 19);
    doc.rect(0, 0, 595, 75, 'F');

    doc.setTextColor(215, 196, 138);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("GYOBITS RESTO & CATERING", 40, 35);

    doc.setTextColor(250, 247, 242);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`LAPORAN AUDIT & MUTASI INVENTARIS GUDANG - PERIODE ${selectedMonth.toUpperCase()} ${selectedYear}`, 40, 52);

    // Summary Box
    doc.setTextColor(27, 23, 19);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("I. IKHTISAR VALUASI GUDANG (INVENTORY SUMMARY)", 40, 105);

    const highlights = [
      ["Total Valuasi Aset Stok", `Rp ${totalNilai.toLocaleString('id-ID')}`, "Metode WAC Moving Average"],
      ["Total SKU Terdaftar", `${totalSku} Item Aktif`, "Inventaris Lengkap"],
      ["Item Kritis / Perlu Restock", `${kondisiKritis} Item`, kondisiKritis > 0 ? "Peringatan Safety Stock" : "Aman"],
      ["Status Periode Audit", `${selectedMonth} ${selectedYear}`, "Terverifikasi Operasional"]
    ];

    autoTable(doc, {
      startY: 115,
      head: [["Parameter Inventaris", "Nilai", "Keterangan"]],
      body: highlights,
      theme: 'grid',
      headStyles: { fillColor: [184, 150, 46], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 40, right: 40 }
    });

    // Section 2: Riwayat Mutasi
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 200;
    doc.setTextColor(27, 23, 19);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("II. RIWAYAT MUTASI KELUAR & MASUK BAHAN (AUDIT TRAIL)", 40, lastY + 25);

    const movementTableData = filteredMovements.map(m => [
      m.noTransaksi,
      m.waktu,
      m.bahan,
      m.kategori,
      m.qtyMutasi,
      `Rp ${m.nilai.toLocaleString('id-ID')}`,
      m.status
    ]);

    autoTable(doc, {
      startY: lastY + 35,
      head: [["No Transaksi", "Waktu", "Bahan", "Kategori", "Qty", "Nilai", "Status"]],
      body: movementTableData,
      theme: 'striped',
      headStyles: { fillColor: [40, 34, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3.5 },
      margin: { left: 40, right: 40 }
    });

    // Formal Signatures
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 450;
    if (finalY < 720) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 34, 27);
      doc.text("Disiapkan oleh,", 60, finalY + 45);
      doc.text("Diketahui & Diverifikasi oleh,", 380, finalY + 45);

      doc.setFont("helvetica", "normal");
      doc.text("__________________________", 60, finalY + 95);
      doc.text("Chef Dapur / Stock Lead", 60, finalY + 110);

      doc.text("__________________________", 380, finalY + 95);
      doc.text("Owner / Finance Lead", 380, finalY + 110);
    }

    doc.save(`Laporan_Audit_Stok_GYOBITS_${selectedMonth}_${selectedYear}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-10 font-sans">
      <Topbar />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="bg-gold-soft border border-chip-border text-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            LAPORAN RESMI
          </span>
          <h1 className="text-2xl font-serif font-bold text-ink mt-2">Stock & Mutasi Inventaris</h1>
        </div>
        <button
          onClick={loadReport}
          disabled={isLoading}
          className="bg-card border border-line text-ink hover:bg-stat px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh Laporan
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          
          {/* PERIODE STOCK GUDANG (SESUAI GAMBAR 5: HANYA TAHUN & BULAN YANG ADA DATANYA) */}
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-1">LAPORAN STOCK</h2>
            <h3 className="font-serif font-bold text-ink text-base mb-3">Periode Stock Gudang</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Tahun</label>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded-lg p-2 text-xs font-bold outline-none focus:border-gold"
                  >
                    <option value="2026">2026</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-side-text uppercase block mb-1">Bulan</label>
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded-lg p-2 text-xs font-bold outline-none focus:border-gold"
                  >
                    <option value="Oktober">Oktober</option>
                    <option value="Juni">Juni</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button 
                  onClick={handleDownloadAuditExcel}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-card border border-line rounded-lg text-xs font-bold text-ink hover:bg-stat transition-colors shadow-xs"
                >
                  <FileText size={14} className="text-gold" />
                  Download Audit
                </button>
                <button 
                  onClick={handleDownloadLaporanPDF}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-card border border-line rounded-lg text-xs font-bold text-ink hover:bg-stat transition-colors shadow-xs"
                >
                  <Download size={14} className="text-gold" />
                  Download Laporan
                </button>
              </div>
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
        <div className="flex-1 flex flex-col gap-4 w-full">
          
          {/* TABEL 1: RIWAYAT KELUAR MASUKNYA BARANG (AUDIT LOG TRAIL) */}
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-0.5">MUTASI GUDANG DAPUR</h2>
                <h3 className="font-serif font-bold text-ink text-base">Riwayat Keluar Masuknya Barang</h3>
              </div>
              <span className="text-xs text-side-text font-mono">{filteredMovements.length} mutasi tercatat</span>
            </div>

            {/* In-Header Filters Table Sesuai Instruksi User */}
            <div className="overflow-x-auto border border-line rounded-xl bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-ink dark:bg-[#1E1914] dark:text-[#E0D8C8] text-[10px] uppercase font-bold border-b border-line">
                  <tr>
                    {/* 1. NO TRANSAKSI */}
                    <th className="p-3 align-top min-w-[170px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>NO TRANSAKSI</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Filter nota..."
                        value={filterNoTransaksi}
                        onChange={(e) => setFilterNoTransaksi(e.target.value)}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      />
                    </th>

                    {/* 2. BAHAN */}
                    <th className="p-3 align-top min-w-[190px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>BAHAN</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Cari bahan / SKU..."
                        value={filterBahan}
                        onChange={(e) => setFilterBahan(e.target.value)}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-2 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      />
                    </th>

                    {/* 3. KATEGORI */}
                    <th className="p-3 align-top min-w-[130px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>KATEGORI</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <select 
                        value={filterKategori}
                        onChange={(e) => setFilterKategori(e.target.value)}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      >
                        <option value="Semua">Semua Kategori</option>
                        <option value="Raw Protein (Daging Basah)">Raw Protein (Daging Basah)</option>
                        <option value="Raw Dry (Bahan Kering & Bumbu)">Raw Dry (Bahan Kering & Bumbu)</option>
                        <option value="Semi-Finished (Olahan Dapur)">Semi-Finished (Olahan Dapur)</option>
                        <option value="Finished (Menu Siap Jual)">Finished (Menu Siap Jual)</option>
                      </select>
                    </th>

                    {/* 4. STOK */}
                    <th className="p-3 align-top min-w-[140px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>STOK</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <select 
                        value={filterStok}
                        onChange={(e) => setFilterStok(e.target.value)}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      >
                        <option value="Semua">Semua</option>
                        <option value="Ada Stok">Ada Stok (&gt;0)</option>
                        <option value="Kosong">Kosong (=0)</option>
                      </select>
                    </th>

                    {/* 5. STATUS */}
                    <th className="p-3 align-top min-w-[110px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>STATUS</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      >
                        <option value="Semua">Semua</option>
                        <option value="Aman">Aman</option>
                        <option value="Rendah">Rendah</option>
                        <option value="Kritis">Kritis</option>
                        <option value="Habis">Habis</option>
                      </select>
                    </th>

                    {/* 6. NILAI */}
                    <th className="p-3 align-top text-right min-w-[130px]">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <span>NILAI</span>
                        <Filter size={11} className="text-gold" />
                      </div>
                      <select 
                        value={filterNilai}
                        onChange={(e) => setFilterNilai(e.target.value as 'default' | 'desc' | 'asc')}
                        className="w-full bg-card border border-line text-ink dark:bg-[#14100D] dark:border-[#382E22] dark:text-[#FAF7F2] rounded px-1.5 py-1 text-[11px] font-normal outline-none focus:border-gold"
                      >
                        <option value="default">Default</option>
                        <option value="desc">Tertinggi</option>
                        <option value="asc">Terendah</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-side-text">
                        Tidak ada riwayat mutasi barang pada filter ini
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-bg'}>
                        {/* No Transaksi & Waktu */}
                        <td className="p-3 align-top">
                          <div className="font-mono font-bold text-gold text-xs">{item.noTransaksi}</div>
                          <div className="font-mono text-[10px] text-side-text mt-0.5">{item.waktu}</div>
                        </td>

                        {/* Bahan & Keterangan */}
                        <td className="p-3 align-top">
                          <div className="font-bold text-ink">{item.bahan}</div>
                          <div className="text-[10px] font-mono text-side-text">{item.sku}</div>
                          <div className="text-[10px] text-side-text mt-1">{item.keterangan}</div>
                        </td>

                        {/* Kategori */}
                        <td className="p-3 align-top">
                          <span className="bg-gold-soft border border-chip-border text-gold px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {item.kategori}
                          </span>
                        </td>

                        {/* Stok Mutasi & Saldo */}
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-1 font-mono font-bold text-xs">
                            {item.arah === 'MASUK' ? (
                              <ArrowDownLeft size={13} className="text-green shrink-0" />
                            ) : (
                              <ArrowUpRight size={13} className="text-red shrink-0" />
                            )}
                            <span className={item.arah === 'MASUK' ? 'text-green' : 'text-red'}>
                              {item.qtyMutasi}
                            </span>
                          </div>
                          <div className="text-[10px] text-side-text font-mono mt-0.5">
                            Saldo: {item.saldoAkhir}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3 align-top">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'Aman' ? 'bg-green/10 text-green' :
                            item.status === 'Habis' ? 'bg-red/10 text-red opacity-70' :
                            item.status === 'Kritis' ? 'bg-red/10 text-red' :
                            'bg-gold-soft text-gold'
                          }`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Nilai */}
                        <td className="p-3 text-right font-mono font-bold text-ink align-top">
                          Rp {item.nilai.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL 2: RINCIAN VALUASI & SALDO FISIK PER SKU */}
          <div className="bg-card border border-line rounded-[14px] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-[9px] font-bold tracking-[0.1em] text-side-text uppercase mb-0.5">VALUASI & SALDO STOK</h2>
                <h3 className="font-serif font-bold text-ink text-base">Rincian Fisik, Rata-Rata Biaya, dan Nilai Aset per SKU</h3>
              </div>
              <span className="text-xs text-side-text font-mono">{items.length} SKU terdaftar</span>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-stat text-ink dark:bg-[#1E1914] dark:text-[#E0D8C8] text-[10px] uppercase font-bold border-b border-line">
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
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-bg'}>
                          <td className="p-3">
                            <div className="font-bold text-ink">{item.name}</div>
                            <div className="text-[10px] font-mono text-side-text">{item.sku}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-gold-soft border border-chip-border text-gold px-2.5 py-0.5 rounded-full text-[10px] font-bold">
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
