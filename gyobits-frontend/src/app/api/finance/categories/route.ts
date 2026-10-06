import { NextResponse } from 'next/server';
import { db } from '@/db';
import { financeCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inMemoryStore } from '@/lib/store';

export async function GET() {
  try {
    try {
      const cats = await db.select().from(financeCategories).where(eq(financeCategories.isActive, true));
      return NextResponse.json({ success: true, data: cats });
    } catch {
      return NextResponse.json({
        success: true,
        data: inMemoryStore.categories.filter((c) => c.isActive),
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, kind = 'EXPENSE' } = body;

    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Nama kategori wajib diisi' } },
        { status: 422 }
      );
    }

    try {
      const [newCat] = await db
        .insert(financeCategories)
        .values({
          name,
          kind: kind as 'INCOME' | 'EXPENSE',
          isSystem: false,
          isActive: true,
        })
        .returning();

      return NextResponse.json({ success: true, data: newCat }, { status: 201 });
    } catch {
      const newCat = {
        id: inMemoryStore.categories.length + 1,
        name,
        kind: kind as 'INCOME' | 'EXPENSE',
        isSystem: false,
        isActive: true,
      };
      inMemoryStore.categories.push(newCat);
      return NextResponse.json({ success: true, data: newCat }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
