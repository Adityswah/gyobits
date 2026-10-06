import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sales, saleItems } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET() {
  try {
    try {
      const allSales = await db.select().from(sales).orderBy(desc(sales.deviceCreatedAt));
      const withItems = await Promise.all(
        allSales.map(async (sale) => {
          const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
          return { ...sale, items };
        })
      );
      return NextResponse.json({ success: true, data: withItems });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.sales });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}
