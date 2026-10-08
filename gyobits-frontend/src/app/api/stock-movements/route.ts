import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stockMovements, items } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET() {
  try {
    try {
      const data = await db
        .select({
          id: stockMovements.id,
          occurredAt: stockMovements.occurredAt,
          movementType: stockMovements.movementType,
          qtyDelta: stockMovements.qtyDelta,
          valueDeltaRupiah: stockMovements.valueDeltaRupiah,
          qtyAfter: stockMovements.qtyAfter,
          valueAfterRupiah: stockMovements.valueAfterRupiah,
          referenceType: stockMovements.referenceType,
          referenceId: stockMovements.referenceId,
          notes: stockMovements.notes,
          itemId: stockMovements.itemId,
          itemName: items.name,
          sku: items.sku,
          category: items.category,
        })
        .from(stockMovements)
        .leftJoin(items, eq(stockMovements.itemId, items.id))
        .orderBy(desc(stockMovements.occurredAt));
      return NextResponse.json({ success: true, data });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.movements });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}
