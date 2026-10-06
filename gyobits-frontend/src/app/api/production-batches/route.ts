import { NextResponse } from 'next/server';
import { db } from '@/db';
import { productionBatches, productionInputs, financeTransactions, financeCategories, items } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { eq, inArray } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      recipeId,
      outputItemId,
      inputs = [], // [{ itemId, qty, isOverhead }]
      qtyGood,
      qtyWaste = 0,
      wasteTreatment = 'ABSORBED_TO_HPP', // 'ABSORBED_TO_HPP' | 'LOSS' | 'RETURNED_TO_STOCK'
      batchDate = new Date().toISOString(),
      notes,
      userId = 1,
    } = body;

    const good = Number(qtyGood);
    const waste = Number(qtyWaste);

    if (good <= 0) {
      return NextResponse.json(
        { error: { code: 'ZERO_GOOD_OUTPUT', message: 'Hasil baik (qty_good) harus > 0' } },
        { status: 422 }
      );
    }

    const batchCode = `BCH-${Date.now().toString().slice(-8)}`;

    const result = await db.transaction(async (tx) => {
      // 1. Calculate inputs cost by locking input items
      const itemIds = inputs.map((i: any) => i.itemId);
      const lockedItems = await tx
        .select()
        .from(items)
        .where(inArray(items.id, itemIds))
        .for('update');

      const itemMap = new Map(lockedItems.map((i) => [i.id, i]));

      let totalCost = 0;
      const calculatedInputs = [];
      const ledgerDeductions = [];

      for (const input of inputs) {
        const item = itemMap.get(input.itemId);
        if (!item) throw new Error(`Bahan baku item ID ${input.itemId} tidak ditemukan`);

        const stockQty = Number(item.currentStockQty);
        const stockVal = Number(item.currentStockValueRupiah);
        const inputQty = Number(input.qty);

        if (stockQty < inputQty) {
          throw new Error(`Stok ${item.name} tidak cukup (${stockQty} < ${inputQty})`);
        }

        let inputVal = 0;
        if (Math.abs(stockQty - inputQty) < 0.0001) {
          inputVal = stockVal;
        } else {
          inputVal = Number(((inputQty * stockVal) / stockQty).toFixed(4));
        }

        totalCost += inputVal;
        calculatedInputs.push({
          itemId: input.itemId,
          qty: inputQty,
          valueRupiah: inputVal,
          isOverhead: !!input.isOverhead,
        });

        ledgerDeductions.push({
          itemId: input.itemId,
          type: 'PRODUCTION_INPUT' as const,
          qtyDelta: -inputQty,
          valueDelta: -inputVal,
          referenceType: 'PRODUCTION_BATCH',
          referenceId: 0, // updated after batch created
          userId,
          notes: `Input produksi batch ${batchCode}`,
        });
      }

      totalCost = Number(totalCost.toFixed(4));

      // 2. Calculate HPP, output value, loss value based on wasteTreatment (§6.4)
      let outputVal = totalCost;
      let lossVal = 0;
      let hppUnit = Number((totalCost / good).toFixed(4));

      if (wasteTreatment === 'ABSORBED_TO_HPP') {
        outputVal = totalCost;
        lossVal = 0;
        hppUnit = Number((totalCost / good).toFixed(4));
      } else if (wasteTreatment === 'LOSS') {
        lossVal = Number(((totalCost * waste) / (good + waste)).toFixed(4));
        outputVal = Number((totalCost - lossVal).toFixed(4));
        hppUnit = Number((outputVal / good).toFixed(4));
      } else if (wasteTreatment === 'RETURNED_TO_STOCK') {
        outputVal = totalCost;
        lossVal = 0;
        hppUnit = Number((totalCost / (good + waste)).toFixed(4));
      }

      // 3. Insert batch record (status = COMPLETED)
      const [newBatch] = await tx
        .insert(productionBatches)
        .values({
          batchCode,
          recipeId: recipeId || null,
          outputItemId,
          operatorId: userId,
          status: 'COMPLETED',
          batchDate: new Date(batchDate),
          qtyGood: good.toString(),
          qtyWaste: waste.toString(),
          wasteTreatment,
          totalCostRupiah: totalCost.toString(),
          outputValueRupiah: outputVal.toString(),
          lossValueRupiah: lossVal.toString(),
          hppPerUnitRupiah: hppUnit.toString(),
          notes,
          completedAt: new Date(),
        })
        .returning();

      // 4. Save batch inputs
      for (const cin of calculatedInputs) {
        await tx.insert(productionInputs).values({
          batchId: newBatch.id,
          itemId: cin.itemId,
          qty: cin.qty.toString(),
          valueRupiah: cin.valueRupiah.toString(),
          isOverhead: cin.isOverhead,
        });
      }

      // 5. Post all deductions to ledger
      const deductionsWithRef = ledgerDeductions.map((d) => ({
        ...d,
        referenceId: newBatch.id,
      }));
      await postLedger(deductionsWithRef, { tx });

      // 6. Post production output into inventory
      const qtyMasukStok = wasteTreatment === 'RETURNED_TO_STOCK' ? good + waste : good;
      await postLedger(
        [
          {
            itemId: outputItemId,
            type: 'PRODUCTION_OUTPUT',
            qtyDelta: qtyMasukStok,
            valueDelta: outputVal,
            referenceType: 'PRODUCTION_BATCH',
            referenceId: newBatch.id,
            userId,
            notes: `Output produksi batch ${batchCode}`,
          },
        ],
        { tx }
      );

      // 7. If LOSS, record non-cash loss finance transaction (PRD §5.6, §6.4)
      if (lossVal > 0) {
        let [lossCategory] = await tx
          .select()
          .from(financeCategories)
          .where(eq(financeCategories.name, 'Kerugian Produksi'));

        if (!lossCategory) {
          [lossCategory] = await tx
            .insert(financeCategories)
            .values({
              name: 'Kerugian Produksi',
              kind: 'EXPENSE',
              isSystem: true,
            })
            .returning();
        }

        await tx.insert(financeTransactions).values({
          txnDate: batchDate.split('T')[0],
          kind: 'EXPENSE',
          channel: null, // non-kas
          categoryId: lossCategory.id,
          amountRupiah: Math.round(lossVal).toString(),
          sourceType: 'BATCH_LOSS',
          sourceId: newBatch.id,
          createdBy: userId,
          note: `Kerugian produksi batch ${batchCode}`,
        });
      }

      return newBatch;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BATCH_ERROR', message: error.message } },
      { status: 422 }
    );
  }
}
