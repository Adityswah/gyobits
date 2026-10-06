import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inventoryYieldPreps, items } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { desc, eq } from 'drizzle-orm';
import { inMemoryStore, YieldPrepData } from '@/lib/store';

export async function GET() {
  try {
    try {
      const allPreps = await db.select().from(inventoryYieldPreps).orderBy(desc(inventoryYieldPreps.prepDate));
      return NextResponse.json({ success: true, data: allPreps });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.yieldPreps });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}

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

    try {
      const result = await db.transaction(async (tx) => {
        // 1. Fetch source item balance to calculate value transfer
        const [srcItem] = await tx.select().from(items).where(eq(items.id, sourceItemId));
        if (!srcItem) throw new Error('Item asal tidak ditemukan');

        const srcStockQty = Number(srcItem.currentStockQty);
        const srcStockVal = Number(srcItem.currentStockValueRupiah);

        if (srcStockQty < sourceQty) {
          throw new Error(`Saldo item asal tidak mencukupi (${srcStockQty} < ${sourceQty})`);
        }

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

        // 3. Post Ledger movements
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
              notes: `Prep out ke ${prepCode}`,
            },
            {
              itemId: outputItemId,
              type: 'PREP_IN',
              qtyDelta: cleanQty,
              valueDelta: transferredValue,
              referenceType: 'YIELD_PREP',
              referenceId: newPrep.id,
              userId,
              notes: `Prep in dari ${prepCode} (susut ${wasteQty}g, ${wasteReason || 'trimming'})`,
            },
          ],
          { tx }
        );

        return newPrep;
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch {
      // In-memory fallback
      const srcItem = inMemoryStore.items.find((i) => i.id === Number(sourceItemId));
      const outItem = inMemoryStore.items.find((i) => i.id === Number(outputItemId));

      if (!srcItem) throw new Error('Item asal tidak ditemukan');
      if (!outItem) throw new Error('Item output tidak ditemukan');

      const srcStockQty = Number(srcItem.currentStockQty);
      const srcStockVal = Number(srcItem.currentStockValueRupiah);

      const transferredValue = srcStockQty > 0
        ? Number(((sourceQty * srcStockVal) / srcStockQty).toFixed(2))
        : 380000;

      // Update source item
      const newSrcQty = Math.max(0, srcStockQty - sourceQty);
      const newSrcVal = Math.max(0, srcStockVal - transferredValue);
      srcItem.currentStockQty = newSrcQty.toString();
      srcItem.currentStockValueRupiah = newSrcVal.toString();
      srcItem.currentAvgCostRupiah = newSrcQty > 0 ? (newSrcVal / newSrcQty).toFixed(2) : '0';

      // Update output item
      const outStockQty = Number(outItem.currentStockQty);
      const outStockVal = Number(outItem.currentStockValueRupiah);
      const newOutQty = outStockQty + cleanQty;
      const newOutVal = outStockVal + transferredValue;
      outItem.currentStockQty = newOutQty.toString();
      outItem.currentStockValueRupiah = newOutVal.toString();
      outItem.currentAvgCostRupiah = newOutQty > 0 ? (newOutVal / newOutQty).toFixed(2) : '0';

      const newPrep: YieldPrepData = {
        id: inMemoryStore.yieldPreps.length + 1,
        prepCode,
        sourceItemId,
        outputItemId,
        sourceQtyUsed: sourceQty.toString(),
        cleanOutputQty: cleanQty.toString(),
        wasteQty: wasteQty.toString(),
        wasteReason,
        transferredValueRupiah: transferredValue.toString(),
        prepDate: new Date().toISOString(),
        createdBy: userId,
      };

      inMemoryStore.yieldPreps.unshift(newPrep);
      return NextResponse.json({ success: true, data: newPrep }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'PREP_ERROR', message } },
      { status: 422 }
    );
  }
}
