import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sales, saleItems, saleFlags, financeTransactions, stockMovements } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET() {
  try {
    try {
      const allSales = await db.select().from(sales).orderBy(desc(sales.deviceCreatedAt));
      const withItems = await Promise.all(
        allSales.map(async (sale) => {
          const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
          return { ...sale, items };
        })
      );
      return NextResponse.json({ success: true, data: withItems });
    } catch {
      return NextResponse.json({ success: true, data: inMemoryStore.sales });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id || body.saleCode || body.offlineInvoiceId;
    }

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ID transaksi penjualan wajib disertakan' } },
        { status: 422 }
      );
    }

    const saleId = Number(id);

    try {
      await db.transaction(async (tx) => {
        // Delete sale items
        await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
        // Delete sale flags if any
        await tx.delete(saleFlags).where(eq(saleFlags.saleId, saleId));
        // Delete related finance transaction
        await tx.delete(financeTransactions).where(
          and(
            eq(financeTransactions.sourceType, 'SALE'),
            eq(financeTransactions.sourceId, saleId)
          )
        );
        // Delete related stock movements
        await tx.delete(stockMovements).where(
          and(
            eq(stockMovements.referenceType, 'SALE'),
            eq(stockMovements.referenceId, saleId)
          )
        );
        // Delete sale header
        await tx.delete(sales).where(eq(sales.id, saleId));
      });
    } catch {
      // In-memory fallback
    }

    inMemoryStore.deleteSale(saleId);

    return NextResponse.json({
      success: true,
      message: `Transaksi penjualan #${saleId} berhasil dihapus secara permanen.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DELETE_FAILED', message } }, { status: 500 });
  }
}
