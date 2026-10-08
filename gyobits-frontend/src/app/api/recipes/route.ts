import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipes, recipeLines, items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inMemoryStore, RecipeData } from '@/lib/store';

export async function GET() {
  try {
    try {
      const allRecipes = await db.select().from(recipes).where(eq(recipes.isActive, true));
      const withDetails = await Promise.all(
        allRecipes.map(async (r) => {
          const lines = await db
            .select({
              id: recipeLines.id,
              recipeId: recipeLines.recipeId,
              itemId: recipeLines.itemId,
              qtyPerBasis: recipeLines.qtyPerBasis,
              isOverhead: recipeLines.isOverhead,
              itemName: items.name,
              unit: items.displayUnit,
            })
            .from(recipeLines)
            .leftJoin(items, eq(recipeLines.itemId, items.id))
            .where(eq(recipeLines.recipeId, r.id));

          const [outputItem] = await db.select().from(items).where(eq(items.id, r.outputItemId));

          return {
            ...r,
            outputItemName: outputItem?.name || `Item #${r.outputItemId}`,
            outputItemUnit: outputItem?.displayUnit || 'Pcs',
            lines: lines.map((l) => ({
              ...l,
              itemName: l.itemName || `Bahan #${l.itemId}`,
              unit: l.unit || 'g',
            })),
          };
        })
      );
      return NextResponse.json({ success: true, data: withDetails });
    } catch {
      // In-memory fallback
      const inMemoryRecipes = (inMemoryStore.recipes || []).map((r) => {
        const outItem = (inMemoryStore.items || []).find((i) => i.id === r.outputItemId);
        return {
          ...r,
          outputItemName: outItem?.name || r.outputItemName || `Item #${r.outputItemId}`,
          outputItemUnit: outItem?.displayUnit || 'Pcs',
          lines: (r.lines || []).map((l) => {
            const ingItem = (inMemoryStore.items || []).find((i) => i.id === l.itemId);
            return {
              ...l,
              itemName: ingItem?.name || l.itemName || `Bahan #${l.itemId}`,
              unit: ingItem?.displayUnit || ingItem?.unitBase || l.unit || 'g',
            };
          }),
        };
      });
      return NextResponse.json({ success: true, data: inMemoryRecipes });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outputItemId, basisQty = 1, lines = [] } = body;

    const outId = Number(outputItemId);
    const bQty = Number(basisQty);

    if (!outId || bQty <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'outputItemId dan basisQty (> 0) wajib diisi' } },
        { status: 422 }
      );
    }

    try {
      const [newRecipe] = await db
        .insert(recipes)
        .values({
          outputItemId: outId,
          basisQty: bQty.toString(),
          version: 1,
          isActive: true,
        })
        .returning();

      for (const line of lines) {
        await db.insert(recipeLines).values({
          recipeId: newRecipe.id,
          itemId: Number(line.itemId),
          qtyPerBasis: Number(line.qtyPerBasis || line.qty).toString(),
          isOverhead: !!line.isOverhead,
        });
      }

      return NextResponse.json({ success: true, data: newRecipe }, { status: 201 });
    } catch {
      // In-memory fallback
      const outItem = inMemoryStore.items.find((i) => i.id === outId);
      const newRec: RecipeData = {
        id: inMemoryStore.recipes.length + 1,
        outputItemId: outId,
        outputItemName: outItem?.name || `Item #${outId}`,
        basisQty: bQty.toString(),
        version: 1,
        isActive: true,
        lines: lines.map((l: { itemId: number; qtyPerBasis?: number; qty?: number; isOverhead?: boolean }, idx: number) => {
          const ing = inMemoryStore.items.find((i) => i.id === Number(l.itemId));
          return {
            id: idx + 1,
            recipeId: inMemoryStore.recipes.length + 1,
            itemId: Number(l.itemId),
            itemName: ing?.name || `Bahan #${l.itemId}`,
            unit: ing?.displayUnit || ing?.unitBase || 'g',
            qtyPerBasis: Number(l.qtyPerBasis || l.qty || 1).toString(),
            isOverhead: !!l.isOverhead,
          };
        }),
      };
      inMemoryStore.recipes.push(newRec);
      return NextResponse.json({ success: true, data: newRec }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ID resep wajib disertakan' } },
        { status: 422 }
      );
    }

    const recipeId = Number(id);

    try {
      await db.transaction(async (tx) => {
        await tx.delete(recipeLines).where(eq(recipeLines.recipeId, recipeId));
        await tx.delete(recipes).where(eq(recipes.id, recipeId));
      });
    } catch {
      // In-memory fallback
    }

    inMemoryStore.deleteRecipe(recipeId);

    return NextResponse.json({
      success: true,
      message: `Resep BOM #${recipeId} berhasil dihapus secara permanen.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: { code: 'DELETE_FAILED', message } }, { status: 500 });
  }
}

