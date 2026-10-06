import { NextResponse } from 'next/server';
import { db } from '@/db';
import { financeTransactions, financeCategories } from '@/db/schema';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const kind = searchParams.get('kind');
    const channel = searchParams.get('channel');

    try {
      const conditions = [eq(financeTransactions.isReversed, false)];
      if (from) conditions.push(gte(financeTransactions.txnDate, from));
      if (to) conditions.push(lte(financeTransactions.txnDate, to));
      if (kind && (kind === 'INCOME' || kind === 'EXPENSE')) conditions.push(eq(financeTransactions.kind, kind));
      if (channel && (channel === 'CASH' || channel === 'BANK')) conditions.push(eq(financeTransactions.channel, channel));

      const txns = await db
        .select({
          id: financeTransactions.id,
          txnDate: financeTransactions.txnDate,
          kind: financeTransactions.kind,
          channel: financeTransactions.channel,
          categoryId: financeTransactions.categoryId,
          categoryName: financeCategories.name,
          amountRupiah: financeTransactions.amountRupiah,
          sourceType: financeTransactions.sourceType,
          note: financeTransactions.note,
          createdBy: financeTransactions.createdBy,
          createdAt: financeTransactions.createdAt,
        })
        .from(financeTransactions)
        .leftJoin(financeCategories, eq(financeTransactions.categoryId, financeCategories.id))
        .where(and(...conditions))
        .orderBy(desc(financeTransactions.txnDate));

      return NextResponse.json({ success: true, data: txns });
    } catch {
      // In-memory fallback
      let filtered = inMemoryStore.transactions.filter((t) => !t.isReversed);
      if (from) filtered = filtered.filter((t) => t.txnDate >= from);
      if (to) filtered = filtered.filter((t) => t.txnDate <= to);
      if (kind) filtered = filtered.filter((t) => t.kind === kind);
      if (channel) filtered = filtered.filter((t) => t.channel === channel);

      filtered.sort((a, b) => b.txnDate.localeCompare(a.txnDate));
      return NextResponse.json({ success: true, data: filtered });
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
      txnDate = new Date().toISOString().split('T')[0],
      kind = 'EXPENSE',
      channel = 'CASH',
      categoryId,
      categoryName,
      amountRupiah,
      note = '',
      sourceType = 'MANUAL',
      userId = 1,
    } = body;

    const amount = Number(amountRupiah);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Nominal transaksi harus lebih dari 0' } },
        { status: 422 }
      );
    }

    try {
      let resolvedCategoryId = categoryId;
      if (!resolvedCategoryId && categoryName) {
        const [existing] = await db
          .select()
          .from(financeCategories)
          .where(eq(financeCategories.name, categoryName));
        if (existing) {
          resolvedCategoryId = existing.id;
        } else {
          const [newCat] = await db
            .insert(financeCategories)
            .values({ name: categoryName, kind: kind as 'INCOME' | 'EXPENSE' })
            .returning();
          resolvedCategoryId = newCat.id;
        }
      }

      if (!resolvedCategoryId) {
        resolvedCategoryId = 1;
      }

      const [newTxn] = await db
        .insert(financeTransactions)
        .values({
          txnDate,
          kind: kind as 'INCOME' | 'EXPENSE',
          channel: channel as 'CASH' | 'BANK',
          categoryId: resolvedCategoryId,
          amountRupiah: amount.toString(),
          sourceType,
          note,
          createdBy: userId,
        })
        .returning();

      return NextResponse.json({ success: true, data: newTxn }, { status: 201 });
    } catch {
      // In-memory fallback
      const cat = inMemoryStore.categories.find((c) => c.name === categoryName || c.id === categoryId);
      const catId = cat ? cat.id : 1;
      const catName = cat ? cat.name : (categoryName || 'Operasional Lainnya');

      const newTxn = {
        id: inMemoryStore.transactions.length + 1,
        txnDate,
        kind: kind as 'INCOME' | 'EXPENSE',
        channel: channel as 'CASH' | 'BANK',
        categoryId: catId,
        categoryName: catName,
        amountRupiah: amount.toString(),
        sourceType,
        note,
        createdBy: userId,
        isReversed: false,
        createdAt: new Date().toISOString(),
      };

      inMemoryStore.transactions.unshift(newTxn);
      return NextResponse.json({ success: true, data: newTxn }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
