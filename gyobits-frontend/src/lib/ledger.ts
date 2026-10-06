import { db } from '@/db';
import { stockMovements, items, auditLog } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export interface LedgerLine {
  itemId: number;
  type: 
    | 'PURCHASE_IN' | 'PURCHASE_RETURN' 
    | 'PRODUCTION_INPUT' | 'PRODUCTION_OUTPUT' 
    | 'SALE_OUT' | 'SALE_RETURN'
    | 'WASTE_OUT' | 'OPNAME_ADJUSTMENT' 
    | 'MANUAL_ADJUSTMENT' | 'REVERSAL' 
    | 'PREP_OUT' | 'PREP_IN';
  qtyDelta: number; // positive for addition, negative for reduction
  valueDelta?: number; // optional, calculated from moving avg if not provided
  referenceType: string;
  referenceId: number;
  userId?: number;
  notes?: string;
}

export class InsufficientStockError extends Error {
  constructor(public itemId: number, public available: number, public requested: number) {
    super(`INSUFFICIENT_STOCK: Item ID ${itemId} memiliki saldo ${available}, dibutuhkan ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

/**
 * Executes ledger post following PRD §7.3 Protocol:
 * 1. Lock items in ASC order to prevent deadlock
 * 2. Calculate moving average value delta for deductions
 * 3. Handle last-unit rule when wiping stock
 * 4. Insert stock_movements (append-only)
 * 5. Update items current stock & value
 */
export async function postLedger(
  lines: LedgerLine[],
  options: { allowNegative?: boolean; tx?: any } = {}
) {
  const { allowNegative = false } = options;
  if (!lines || lines.length === 0) return [];

  const runWithTx = async (tx: any) => {
    // 1. Get distinct item IDs, sort ASC to prevent deadlocks (F-06, §7.3)
    const distinctItemIds = Array.from(new Set(lines.map((l) => l.itemId))).sort((a, b) => a - b);

    // 2. Fetch and lock items (SELECT ... FOR UPDATE)
    // Drizzle with Postgres support
    const lockedItems = await tx
      .select()
      .from(items)
      .where(inArray(items.id, distinctItemIds))
      .for('update');

    const itemMap = new Map<number, typeof items.$inferSelect>();
    for (const item of lockedItems) {
      itemMap.set(item.id, item);
    }

    const insertedMovements = [];

    // 3. Process each movement line in requested order
    for (const line of lines) {
      const currentItem = itemMap.get(line.itemId);
      if (!currentItem) {
        throw new Error(`Item ${line.itemId} tidak ditemukan`);
      }

      const qtySaldo = Number(currentItem.currentStockQty);
      const valueSaldo = Number(currentItem.currentStockValueRupiah);
      const qtyDelta = line.qtyDelta;
      let valueDelta = line.valueDelta !== undefined ? line.valueDelta : 0;

      // Handle stock reduction (Keluar)
      if (qtyDelta < 0) {
        const qtyKeluar = Math.abs(qtyDelta);

        // Check stock availability
        if (qtySaldo < qtyKeluar && !allowNegative) {
          throw new InsufficientStockError(line.itemId, qtySaldo, qtyKeluar);
        }

        // Last-unit rule (PRD §6.1): if taking all remaining stock, take exact remaining value
        if (Math.abs(qtyKeluar - qtySaldo) < 0.00001) {
          valueDelta = -valueSaldo;
        } else if (line.valueDelta === undefined) {
          // Moving weighted average reduction: -round(q * nilai_saldo / qty_saldo, 4)
          if (qtySaldo > 0) {
            valueDelta = -Number(((qtyKeluar * valueSaldo) / qtySaldo).toFixed(4));
          } else {
            valueDelta = 0;
          }
        }
      }

      const newQty = Number((qtySaldo + qtyDelta).toFixed(4));
      let newValue = Number((valueSaldo + valueDelta).toFixed(4));

      // Rule: if qty reaches 0, value must also reach exactly 0 (closing rounding residue)
      if (Math.abs(newQty) < 0.00001) {
        newValue = 0;
      }

      const isOversold = newQty < 0;

      // Record movement
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          itemId: line.itemId,
          movementType: line.type,
          qtyDelta: line.qtyDelta.toString(),
          valueDeltaRupiah: valueDelta.toString(),
          qtyAfter: newQty.toString(),
          valueAfterRupiah: newValue.toString(),
          referenceType: line.referenceType,
          referenceId: line.referenceId,
          createdBy: line.userId,
          notes: line.notes,
        })
        .returning();

      // Update item balance
      await tx
        .update(items)
        .set({
          currentStockQty: newQty.toString(),
          currentStockValueRupiah: newValue.toString(),
          oversold: isOversold,
          updatedAt: new Date(),
        })
        .where(eq(items.id, line.itemId));

      // Update in-memory state for subsequent lines touching same item in this batch
      currentItem.currentStockQty = newQty.toString();
      currentItem.currentStockValueRupiah = newValue.toString();
      currentItem.oversold = isOversold;

      insertedMovements.push(movement);
    }

    return insertedMovements;
  };

  if (options.tx) {
    return runWithTx(options.tx);
  } else {
    return db.transaction(runWithTx);
  }
}
