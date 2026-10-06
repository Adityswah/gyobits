import { NextResponse } from 'next/server';
import { db } from '@/db';
import { items } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allItems = await db.select().from(items).orderBy(desc(items.createdAt));
    return NextResponse.json({ success: true, data: allItems });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
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
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 422 }
    );
  }
}
