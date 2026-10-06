import { NextResponse } from 'next/server';
import { db } from '@/db';
import { items } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { inMemoryStore, ItemData } from '@/lib/store';

export async function GET() {
  try {
    try {
      const allItems = await db.select().from(items).orderBy(desc(items.createdAt));
      return NextResponse.json({ success: true, data: allItems });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.items.filter((i) => i.isActive) });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sku,
      name,
      category,
      unitBase = 'g',
      displayUnit = 'g',
      displayFactor = 1,
      stockMode = 'STOCKED',
      sellPriceRupiah = 0,
      minStockAlert = 0,
      normalShrinkMinPct,
      normalShrinkMaxPct,
    } = body;

    if (!sku || !name || !category) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'sku, name, dan category wajib diisi' } },
        { status: 422 }
      );
    }

    try {
      const [newItem] = await db
        .insert(items)
        .values({
          sku,
          name,
          category,
          unitBase,
          displayUnit,
          displayFactor: displayFactor.toString(),
          stockMode,
          sellPriceRupiah: sellPriceRupiah?.toString(),
          minStockAlert: minStockAlert?.toString(),
          normalShrinkMinPct: normalShrinkMinPct?.toString(),
          normalShrinkMaxPct: normalShrinkMaxPct?.toString(),
        })
        .returning();

      return NextResponse.json({ success: true, data: newItem }, { status: 201 });
    } catch {
      // In-memory fallback
      const newItem: ItemData = {
        id: inMemoryStore.items.length + 1,
        sku,
        name,
        category,
        stockMode,
        unitBase,
        displayUnit,
        displayFactor: displayFactor.toString(),
        currentStockQty: '0',
        currentStockValueRupiah: '0',
        currentAvgCostRupiah: '0',
        oversold: false,
        minStockAlert: minStockAlert.toString(),
        sellPriceRupiah: sellPriceRupiah.toString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryStore.items.unshift(newItem);
      return NextResponse.json({ success: true, data: newItem }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message } },
      { status: 422 }
    );
  }
}
