import { NextResponse } from 'next/server';
import { db } from '@/db';
import { financeTransactions } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || '2026-10-01';
    const to = searchParams.get('to') || '2026-10-06';

    let txns: Array<{
      amountRupiah: string;
      kind: string;
      channel: string | null;
      txnDate: string;
    }> = [];

    try {
      const conditions = [eq(financeTransactions.isReversed, false)];
      if (from) conditions.push(gte(financeTransactions.txnDate, from));
      if (to) conditions.push(lte(financeTransactions.txnDate, to));

      txns = await db
        .select({
          amountRupiah: financeTransactions.amountRupiah,
          kind: financeTransactions.kind,
          channel: financeTransactions.channel,
          txnDate: financeTransactions.txnDate,
        })
        .from(financeTransactions)
        .where(and(...conditions));
    } catch {
      // In-memory fallback
      txns = inMemoryStore.transactions
        .filter((t) => !t.isReversed)
        .filter((t) => (!from || t.txnDate >= from) && (!to || t.txnDate <= to))
        .map((t) => ({
          amountRupiah: t.amountRupiah,
          kind: t.kind,
          channel: t.channel,
          txnDate: t.txnDate,
        }));
    }

    let pendapatanKotor = 0;
    let pengeluaran = 0;
    let cashIn = 0;
    let cashOut = 0;
    let bankIn = 0;
    let bankOut = 0;

    // Daily breakdown for chart
    const dailyMap: Record<string, { inc: number; exp: number }> = {};

    for (const t of txns) {
      const amount = Number(t.amountRupiah);
      const dateKey = t.txnDate;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { inc: 0, exp: 0 };
      }

      if (t.kind === 'INCOME') {
        pendapatanKotor += amount;
        dailyMap[dateKey].inc += amount;
        if (t.channel === 'CASH') cashIn += amount;
        if (t.channel === 'BANK') bankIn += amount;
      } else if (t.kind === 'EXPENSE') {
        if (t.channel) {
          pengeluaran += amount;
          dailyMap[dateKey].exp += amount;
          if (t.channel === 'CASH') cashOut += amount;
          if (t.channel === 'BANK') bankOut += amount;
        }
      }
    }

    const bersihCash = cashIn - cashOut;
    const bersihBank = bankIn - bankOut;
    const pendapatanBersih = pendapatanKotor - pengeluaran;

    // Prepare chart labels and values sorted chronologically
    const sortedDates = Object.keys(dailyMap).sort();
    const chartLabels = sortedDates.length > 0
      ? sortedDates.map((d) => {
          const parts = d.split('-');
          return parts.length >= 3 ? `${parts[2]} Okt` : d;
        })
      : ['01 Okt', '02 Okt', '03 Okt', '04 Okt', '05 Okt', '06 Okt'];

    const chartPendapatan = sortedDates.length > 0
      ? sortedDates.map((d) => dailyMap[d].inc)
      : [0, 0, 0, 0, 0, 0];

    const chartPengeluaran = sortedDates.length > 0
      ? sortedDates.map((d) => dailyMap[d].exp)
      : [0, 0, 0, 0, 0, 0];

    return NextResponse.json({
      pendapatanKotor,
      pengeluaran,
      bersihCash,
      bersihBank,
      pendapatanBersih,
      identityCheck: bersihCash + bersihBank === pendapatanBersih,
      chartData: {
        labels: chartLabels,
        pendapatan: chartPendapatan,
        pengeluaran: chartPengeluaran,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message } },
      { status: 500 }
    );
  }
}
