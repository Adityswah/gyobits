import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, purchaseLines, financeTransactions, financeCategories } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      purchaseDate,
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

    const totalRupiah = lines.reduce((acc: number, l: any) => acc + Number(l.lineTotalRupiah || 0), 0);
    const purchaseCode = `PUR-${Date.now().toString().slice(-8)}`;

    const result = await db.transaction(async (tx) => {
      // 1. Insert Purchase
      const [newPurchase] = await tx
        .insert(purchases)
        .values({
          purchaseCode,
          supplierName,
          purchaseDate: purchaseDate,
          paymentChannel,
          totalRupiah: totalRupiah.toString(),
          createdBy: userId,
        })
        .returning();

      // 2. Insert Purchase Lines
      for (const line of lines) {
        await tx.insert(purchaseLines).values({
          purchaseId: newPurchase.id,
          itemId: line.itemId,
          qty: line.qty.toString(),
          lineTotalRupiah: line.lineTotalRupiah.toString(),
        });
      }

      // 3. Post Ledger movements (PURCHASE_IN)
      const ledgerLines = lines.map((l: any) => ({
        itemId: l.itemId,
        type: 'PURCHASE_IN' as const,
        qtyDelta: Number(l.qty),
        valueDelta: Number(l.lineTotalRupiah), // Exact value from transaction
        referenceType: 'PURCHASE',
        referenceId: newPurchase.id,
        userId,
        notes: `Pembelian dari ${supplierName}`,
      }));

      await postLedger(ledgerLines, { tx });

      // 4. Finance Transaction (Pengeluaran kas/bank)
      // Check / get expense category for Bahan Baku
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
        channel: paymentChannel,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'TRANSACTION_ERROR', message: error.message } },
      { status: 422 }
    );
  }
}
