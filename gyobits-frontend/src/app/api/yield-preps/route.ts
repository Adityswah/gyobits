import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inventoryYieldPreps, items } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sourceItemId,
      outputItemId,
      sourceQtyUsed,
      cleanOutputQty,
      wasteReason,
      userId = 1,
    } = body;

    const sourceQty = Number(sourceQtyUsed);
    const cleanQty = Number(cleanOutputQty);
    const wasteQty = sourceQty - cleanQty;

    if (sourceQty <= 0 || cleanQty <= 0 || cleanQty > sourceQty) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Berat bersih harus lebih kecil atau sama dengan berat asal' } },
        { status: 422 }
      );
    }

    if (wasteQty > 0 && !wasteReason) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Alasan susut wajib diisi bila terdapat susut' } },
        { status: 422 }
      );
    }

    const prepCode = `YLD-${Date.now().toString().slice(-8)}`;

    const result = await db.transaction(async (tx) => {
      // 1. Fetch source item balance to calculate value transfer
      const [srcItem] = await tx.select().from(items).where(eq(items.id, sourceItemId));
      if (!srcItem) throw new Error('Item asal tidak ditemukan');

      const srcStockQty = Number(srcItem.currentStockQty);
      const srcStockVal = Number(srcItem.currentStockValueRupiah);

      if (srcStockQty < sourceQty) {
        throw new Error(`Saldo item asal tidak mencukupi (${srcStockQty} < ${sourceQty})`);
      }

      // Value to transfer: round(sourceQty * srcStockVal / srcStockQty, 4)
      const transferredValue = Number(((sourceQty * srcStockVal) / srcStockQty).toFixed(4));

      // 2. Insert record
      const [newPrep] = await tx
        .insert(inventoryYieldPreps)
        .values({
          prepCode,
          sourceItemId,
          outputItemId,
          sourceQtyUsed: sourceQty.toString(),
          cleanOutputQty: cleanQty.toString(),
          wasteQty: wasteQty.toString(),
          wasteReason,
          transferredValueRupiah: transferredValue.toString(),
          createdBy: userId,
        })
        .returning();

      // 3. Post Ledger movements (PREP_OUT & PREP_IN)
      await postLedger(
        [
          {
            itemId: sourceItemId,
            type: 'PREP_OUT',
            qtyDelta: -sourceQty,
            valueDelta: -transferredValue,
            referenceType: 'YIELD_PREP',
            referenceId: newPrep.id,
            userId,
            notes: `Yield prep out to ${prepCode}`,
          },
          {
            itemId: outputItemId,
            type: 'PREP_IN',
            qtyDelta: cleanQty,
            valueDelta: transferredValue, // All transferred value moves into the clean yield
            referenceType: 'YIELD_PREP',
            referenceId: newPrep.id,
            userId,
            notes: `Yield prep in from ${prepCode}`,
          },
        ],
        { tx }
      );

      return newPrep;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'YIELD_ERROR', message: error.message } },
      { status: 422 }
    );
  }
}
