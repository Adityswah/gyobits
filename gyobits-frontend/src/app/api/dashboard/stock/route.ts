import { NextResponse } from 'next/server';
import { db } from '@/db';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET() {
  try {
    let allItems: Array<{
      id: number;
      sku: string;
      name: string;
      category: string;
      unitBase: string;
      displayUnit: string;
      currentStockQty: string;
      minStockAlert: string | null;
      currentStockValueRupiah: string;
      currentAvgCostRupiah?: string | null;
    }> = [];

    try {
      allItems = await db.select().from(items).where(eq(items.isActive, true));
    } catch {
      // In-memory fallback
      allItems = inMemoryStore.items
        .filter((i) => i.isActive)
        .map((i) => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          category: i.category,
          unitBase: i.unitBase,
          displayUnit: i.displayUnit,
          currentStockQty: i.currentStockQty,
          minStockAlert: i.minStockAlert,
          currentStockValueRupiah: i.currentStockValueRupiah,
          currentAvgCostRupiah: i.currentAvgCostRupiah,
        }));
    }

    const totalSku = allItems.length;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message } },
      { status: 500 }
    );
  }
}
