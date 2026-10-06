import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, purchaseLines, financeTransactions, financeCategories } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { desc, eq } from 'drizzle-orm';
import { inMemoryStore, PurchaseData } from '@/lib/store';

interface PurchaseLineInput {
  itemId: number;
  qty: number | string;
  lineTotalRupiah: number | string;
}

export async function GET() {
  try {
    try {
      const allPurchases = await db.select().from(purchases).orderBy(desc(purchases.createdAt));
      const withLines = await Promise.all(
        allPurchases.map(async (p) => {
          const lines = await db.select().from(purchaseLines).where(eq(purchaseLines.purchaseId, p.id));
          return { ...p, lines };
        })
      );
      return NextResponse.json({ success: true, data: withLines });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.purchases });
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
      purchaseDate = new Date().toISOString().split('T')[0],
      supplierName = 'Supplier',
      paymentChannel = 'CASH', // 'CASH' | 'BANK'
      lines = [], // [{ itemId, qty, lineTotalRupiah }]
      userId = 1,
    } = body;

    if (!purchaseDate || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tanggal dan daftar barang pembelian wajib diisi' } },
        { status: 422 }
      );
    }

    const totalRupiah = lines.reduce(
      (acc: number, l: PurchaseLineInput) => acc + Number(l.lineTotalRupiah || 0),
      0
    );
    const purchaseCode = `PUR-${Date.now().toString().slice(-8)}`;

    try {
      const result = await db.transaction(async (tx) => {
        // 1. Insert Purchase
        const [newPurchase] = await tx
          .insert(purchases)
          .values({
            purchaseCode,
            supplierName,
            purchaseDate,
            paymentChannel: paymentChannel as 'CASH' | 'BANK',
            totalRupiah: totalRupiah.toString(),
            createdBy: userId,
          })
          .returning();

        // 2. Insert Purchase Lines
        for (const line of lines as PurchaseLineInput[]) {
          await tx.insert(purchaseLines).values({
            purchaseId: newPurchase.id,
            itemId: line.itemId,
            qty: line.qty.toString(),
            lineTotalRupiah: line.lineTotalRupiah.toString(),
          });
        }

        // 3. Post Ledger movements (PURCHASE_IN)
        const ledgerLines = (lines as PurchaseLineInput[]).map((l) => ({
          itemId: l.itemId,
          type: 'PURCHASE_IN' as const,
          qtyDelta: Number(l.qty),
          valueDelta: Number(l.lineTotalRupiah),
          referenceType: 'PURCHASE',
          referenceId: newPurchase.id,
          userId,
          notes: `Pembelian dari ${supplierName}`,
        }));

        await postLedger(ledgerLines, { tx });

        // 4. Finance Transaction (Pengeluaran kas/bank)
        let [cat] = await tx
          .select()
          .from(financeCategories)
          .where(eq(financeCategories.name, 'Pembelian Bahan Baku'));

        if (!cat) {
          [cat] = await tx
            .insert(financeCategories)
            .values({
              name: 'Pembelian Bahan Baku',
              kind: 'EXPENSE',
              isSystem: true,
            })
            .returning();
        }

        await tx.insert(financeTransactions).values({
          txnDate: purchaseDate,
          kind: 'EXPENSE',
          channel: paymentChannel as 'CASH' | 'BANK',
          categoryId: cat.id,
          amountRupiah: totalRupiah.toString(),
          sourceType: 'PURCHASE',
          sourceId: newPurchase.id,
          createdBy: userId,
          note: `Pembelian ${purchaseCode} - ${supplierName}`,
        });

        return newPurchase;
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch {
      // In-memory fallback
      const newPurchase: PurchaseData = {
        id: inMemoryStore.purchases.length + 1,
        purchaseCode,
        supplierName,
        purchaseDate,
        paymentChannel: paymentChannel as 'CASH' | 'BANK',
        totalRupiah: totalRupiah.toString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        lines: (lines as PurchaseLineInput[]).map((l) => {
          const item = inMemoryStore.items.find((i) => i.id === l.itemId);
          return {
            itemId: l.itemId,
            itemName: item ? item.name : `Item #${l.itemId}`,
            qty: Number(l.qty),
            lineTotalRupiah: Number(l.lineTotalRupiah),
          };
        }),
      };
      inMemoryStore.purchases.unshift(newPurchase);

      // Update in-memory items stock & value
      for (const line of lines as PurchaseLineInput[]) {
        const item = inMemoryStore.items.find((i) => i.id === line.itemId);
        if (item) {
          const curQty = Number(item.currentStockQty);
          const curVal = Number(item.currentStockValueRupiah);
          const addQty = Number(line.qty);
          const addVal = Number(line.lineTotalRupiah);

          const newQty = curQty + addQty;
          const newVal = curVal + addVal;
          item.currentStockQty = newQty.toString();
          item.currentStockValueRupiah = newVal.toString();
          item.currentAvgCostRupiah = newQty > 0 ? (newVal / newQty).toFixed(2) : '0';

          inMemoryStore.movements.unshift({
            id: inMemoryStore.movements.length + 1,
            itemId: item.id,
            itemName: item.name,
            movementType: 'PURCHASE_IN',
            qtyDelta: `+${addQty}`,
            valueDeltaRupiah: `+${addVal}`,
            qtyAfter: item.currentStockQty,
            valueAfterRupiah: item.currentStockValueRupiah,
            referenceType: 'PURCHASE',
            referenceId: newPurchase.id,
            notes: `Pembelian dari ${supplierName}`,
            occurredAt: new Date().toISOString(),
          });
        }
      }

      // Add expense to inMemoryStore.transactions
      inMemoryStore.transactions.unshift({
        id: inMemoryStore.transactions.length + 1,
        txnDate: purchaseDate,
        kind: 'EXPENSE',
        channel: paymentChannel as 'CASH' | 'BANK',
        categoryId: 3,
        categoryName: 'Pembelian Bahan Baku',
        amountRupiah: totalRupiah.toString(),
        sourceType: 'PURCHASE',
        sourceId: newPurchase.id,
        note: `Pembelian ${purchaseCode} - ${supplierName}`,
        createdBy: userId,
        isReversed: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: newPurchase }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'TRANSACTION_ERROR', message } },
      { status: 422 }
    );
  }
}
