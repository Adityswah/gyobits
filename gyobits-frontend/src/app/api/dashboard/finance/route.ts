import { NextResponse } from 'next/server';
import { db } from '@/db';
import { financeTransactions } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Conditions: exclude reversed transactions
    const conditions = [eq(financeTransactions.isReversed, false)];
    if (from) conditions.push(gte(financeTransactions.txnDate, from));
    if (to) conditions.push(lte(financeTransactions.txnDate, to));

    const txns = await db
      .select()
      .from(financeTransactions)
      .where(and(...conditions));

    let pendapatanKotor = 0;
    let pengeluaran = 0;
    let cashIn = 0;
    let cashOut = 0;
    let bankIn = 0;
    let bankOut = 0;

    for (const t of txns) {
      const amount = Number(t.amountRupiah);
      if (t.kind === 'INCOME') {
        pendapatanKotor += amount;
        if (t.channel === 'CASH') cashIn += amount;
        if (t.channel === 'BANK') bankIn += amount;
      } else if (t.kind === 'EXPENSE') {
        // Only cash & bank count towards cash flow (loss kerugian non-kas has channel = null)
        if (t.channel) {
          pengeluaran += amount;
          if (t.channel === 'CASH') cashOut += amount;
          if (t.channel === 'BANK') bankOut += amount;
        }
      }
    }

    const bersihCash = cashIn - cashOut;
    const bersihBank = bankIn - bankOut;
    const pendapatanBersih = pendapatanKotor - pengeluaran;

    return NextResponse.json({
      pendapatanKotor,
      pengeluaran,
      bersihCash,
      bersihBank,
      pendapatanBersih,
      // Verified mathematical identity I-6: Bersih Cash + Bersih Bank = Pendapatan Bersih
      identityCheck: bersihCash + bersihBank === pendapatanBersih,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
