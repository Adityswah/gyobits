import { NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'baseline'; // 'baseline' | 'clean'

    if (mode === 'clean') {
      inMemoryStore.clearAllTransactions();
      return NextResponse.json({
        success: true,
        mode: 'clean',
        message: 'Seluruh riwayat transaksi (POS, Pembelian, Yield, Batch, Kas) telah berhasil dibersihkan. Master Data bahan dan resep tetap aman.',
      });
    } else {
      inMemoryStore.resetToExcelBaseline();
      return NextResponse.json({
        success: true,
        mode: 'baseline',
        message: 'Data transaksi dan stok berhasil dikembalikan ke standar awal Master Data Excel RESEP DAN BATCH GYOZA.',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'RESET_FAILED', message } }, { status: 500 });
  }
}
