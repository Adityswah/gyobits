import { NextResponse } from 'next/server';
import { db } from '@/db';
import { productionBatches, productionInputs, financeTransactions, financeCategories, items } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { desc, eq, inArray } from 'drizzle-orm';
import { inMemoryStore, ProductionBatchData } from '@/lib/store';

interface BatchInputItem {
  itemId: number;
  qty: number | string;
  isOverhead?: boolean;
}

export async function GET() {
  try {
    try {
      const allBatches = await db.select().from(productionBatches).orderBy(desc(productionBatches.batchDate));
      const withInputs = await Promise.all(
        allBatches.map(async (b) => {
          const batchInputs = await db.select().from(productionInputs).where(eq(productionInputs.batchId, b.id));
          return { ...b, inputs: batchInputs };
        })
      );
      return NextResponse.json({ success: true, data: withInputs });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.batches });
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

    try {
      const result = await db.transaction(async (tx) => {
        // 1. Calculate inputs cost by locking input items
        const itemIds = (inputs as BatchInputItem[]).map((i) => i.itemId);
        const lockedItems = await tx
          .select()
          .from(items)
          .where(inArray(items.id, itemIds))
          .for('update');

        const itemMap = new Map(lockedItems.map((i) => [i.id, i]));

        let totalCost = 0;
        const calculatedInputs: Array<{ itemId: number; qty: string; valueRupiah: string; isOverhead: boolean }> = [];
        const ledgerDeductions = [];

        for (const input of inputs as BatchInputItem[]) {
          const item = itemMap.get(input.itemId);
          if (!item) throw new Error(`Bahan baku item ID ${input.itemId} tidak ditemukan`);

          const stockQty = Number(item.currentStockQty);
          const stockVal = Number(item.currentStockValueRupiah);
          const inputQty = Number(input.qty);

          if (stockQty < inputQty) {
            throw new Error(`Stok ${item.name} tidak cukup (${stockQty} < ${inputQty})`);
          }

          let lineVal = 0;
          if (stockQty > 0) {
            lineVal = Number(((inputQty * stockVal) / stockQty).toFixed(4));
          }

          totalCost += lineVal;
          calculatedInputs.push({
            itemId: input.itemId,
            qty: inputQty.toString(),
            valueRupiah: lineVal.toString(),
            isOverhead: !!input.isOverhead,
          });

          ledgerDeductions.push({
            itemId: input.itemId,
            type: 'PRODUCTION_INPUT' as const,
            qtyDelta: -inputQty,
            valueDelta: -lineVal,
            referenceType: 'PRODUCTION_BATCH',
            referenceId: 0,
            userId,
            notes: `Input produksi ${batchCode}`,
          });
        }

        // 2. Compute cost distribution based on wasteTreatment
        let outputVal = 0;
        let lossVal = 0;
        let hppPerUnit = 0;
        const totalUnits = good + waste;

        if (wasteTreatment === 'ABSORBED_TO_HPP') {
          outputVal = totalCost;
          lossVal = 0;
          hppPerUnit = Number((outputVal / good).toFixed(4));
        } else if (wasteTreatment === 'LOSS') {
          const costPerUnit = totalUnits > 0 ? totalCost / totalUnits : 0;
          outputVal = Number((costPerUnit * good).toFixed(4));
          lossVal = Number((costPerUnit * waste).toFixed(4));
          hppPerUnit = Number((costPerUnit).toFixed(4));
        } else if (wasteTreatment === 'RETURNED_TO_STOCK') {
          outputVal = totalCost;
          lossVal = 0;
          hppPerUnit = Number((outputVal / good).toFixed(4));
        }

        // 3. Insert Production Batch Header
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
            hppPerUnitRupiah: hppPerUnit.toString(),
            notes,
            completedAt: new Date(),
          })
          .returning();

        // 4. Insert Batch Inputs
        for (const inp of calculatedInputs) {
          await tx.insert(productionInputs).values({
            batchId: newBatch.id,
            itemId: inp.itemId,
            qty: inp.qty,
            valueRupiah: inp.valueRupiah,
            isOverhead: inp.isOverhead,
          });
        }

        // 5. Post Input Deductions to Ledger
        for (const l of ledgerDeductions) {
          l.referenceId = newBatch.id;
        }
        await postLedger(ledgerDeductions, { tx });

        // 6. Post Output Additions to Ledger (PRODUCTION_OUTPUT)
        await postLedger(
          [
            {
              itemId: outputItemId,
              type: 'PRODUCTION_OUTPUT',
              qtyDelta: good,
              valueDelta: outputVal,
              referenceType: 'PRODUCTION_BATCH',
              referenceId: newBatch.id,
              userId,
              notes: `Output produksi ${batchCode} (HPP Rp ${hppPerUnit}/unit)`,
            },
          ],
          { tx }
        );

        // 7. If wasteTreatment === 'LOSS' and lossVal > 0, record non-cash loss
        if (wasteTreatment === 'LOSS' && lossVal > 0) {
          let [lossCat] = await tx
            .select()
            .from(financeCategories)
            .where(eq(financeCategories.name, 'Loss Kerugian Produksi'));

          if (!lossCat) {
            [lossCat] = await tx
              .insert(financeCategories)
              .values({
                name: 'Loss Kerugian Produksi',
                kind: 'EXPENSE',
                isSystem: true,
              })
              .returning();
          }

          await tx.insert(financeTransactions).values({
            txnDate: new Date(batchDate).toISOString().split('T')[0],
            kind: 'EXPENSE',
            channel: null,
            categoryId: lossCat.id,
            amountRupiah: Math.round(lossVal).toString(),
            sourceType: 'BATCH_LOSS',
            sourceId: newBatch.id,
            createdBy: userId,
            note: `Kerugian afkir batch ${batchCode} (${waste} unit)`,
          });
        }

        return newBatch;
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch {
      // In-memory fallback
      let totalCost = 0;
      for (const input of inputs as BatchInputItem[]) {
        const item = inMemoryStore.items.find((i) => i.id === input.itemId);
        if (item) {
          const inputQty = Number(input.qty);
          const stockQty = Number(item.currentStockQty);
          const stockVal = Number(item.currentStockValueRupiah);
          const lineVal = stockQty > 0 ? Number(((inputQty * stockVal) / stockQty).toFixed(2)) : 0;
          totalCost += lineVal;

          const newQty = Math.max(0, stockQty - inputQty);
          const newVal = Math.max(0, stockVal - lineVal);
          item.currentStockQty = newQty.toString();
          item.currentStockValueRupiah = newVal.toString();
          item.currentAvgCostRupiah = newQty > 0 ? (newVal / newQty).toFixed(2) : '0';

          inMemoryStore.movements.unshift({
            id: inMemoryStore.movements.length + 1,
            itemId: item.id,
            itemName: item.name,
            movementType: 'PRODUCTION_INPUT',
            qtyDelta: `-${inputQty}`,
            valueDeltaRupiah: `-${lineVal}`,
            qtyAfter: item.currentStockQty,
            valueAfterRupiah: item.currentStockValueRupiah,
            referenceType: 'PRODUCTION_BATCH',
            referenceId: inMemoryStore.batches.length + 1,
            notes: `Input produksi ${batchCode}`,
            occurredAt: new Date().toISOString(),
          });
        }
      }

      const outputVal = totalCost;
      const hppPerUnit = good > 0 ? Number((outputVal / good).toFixed(2)) : 0;

      // Add output item
      const outItem = inMemoryStore.items.find((i) => i.id === Number(outputItemId));
      if (outItem) {
        const outStockQty = Number(outItem.currentStockQty);
        const outStockVal = Number(outItem.currentStockValueRupiah);
        const newOutQty = outStockQty + good;
        const newOutVal = outStockVal + outputVal;
        outItem.currentStockQty = newOutQty.toString();
        outItem.currentStockValueRupiah = newOutVal.toString();
        outItem.currentAvgCostRupiah = newOutQty > 0 ? (newOutVal / newOutQty).toFixed(2) : '0';

        inMemoryStore.movements.unshift({
          id: inMemoryStore.movements.length + 1,
          itemId: outItem.id,
          itemName: outItem.name,
          movementType: 'PRODUCTION_OUTPUT',
          qtyDelta: `+${good}`,
          valueDeltaRupiah: `+${outputVal}`,
          qtyAfter: outItem.currentStockQty,
          valueAfterRupiah: outItem.currentStockValueRupiah,
          referenceType: 'PRODUCTION_BATCH',
          referenceId: inMemoryStore.batches.length + 1,
          notes: `Output produksi ${batchCode} (HPP Rp ${hppPerUnit}/unit)`,
          occurredAt: new Date().toISOString(),
        });
      }

      const newBatch: ProductionBatchData = {
        id: inMemoryStore.batches.length + 1,
        batchCode,
        recipeId: recipeId || null,
        outputItemId,
        status: 'COMPLETED',
        batchDate,
        qtyGood: good.toString(),
        qtyWaste: waste.toString(),
        wasteTreatment,
        totalCostRupiah: totalCost.toString(),
        outputValueRupiah: outputVal.toString(),
        lossValueRupiah: '0',
        hppPerUnitRupiah: hppPerUnit.toString(),
        notes,
        createdAt: new Date().toISOString(),
      };

      inMemoryStore.batches.unshift(newBatch);
      return NextResponse.json({ success: true, data: newBatch }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'BATCH_ERROR', message } },
      { status: 422 }
    );
  }
}
