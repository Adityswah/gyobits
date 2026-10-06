import { NextResponse } from 'next/server';
import { db } from '@/db';
import { items, stockMovements } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const allItems = await db.select().from(items).where(eq(items.isActive, true));

    let totalSku = allItems.length;
    let kondisiKritis = 0;
    let nilaiStockTotal = 0;

    for (const item of allItems) {
      const stock = Number(item.currentStockQty);
      const minAlert = Number(item.minStockAlert || 0);
      const val = Number(item.currentStockValueRupiah);

      nilaiStockTotal += val;
      if (stock <= minAlert) {
        kondisiKritis++;
      }
    }

    return NextResponse.json({
      totalSku,
      kondisiKritis,
      nilaiStockTotal: Math.round(nilaiStockTotal),
      items: allItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
