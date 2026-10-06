import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sales, saleItems, saleFlags, items, recipeLines, recipes, financeTransactions, financeCategories } from '@/db/schema';
import { postLedger } from '@/lib/ledger';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      offline_invoice_id,
      device_id = 'DEVICE-01',
      device_created_at = new Date().toISOString(),
      shift_id = null,
      payment_method = 'CASH',
      items: rawItems = [],
      shipping_cost = 0,
      discount = 0,
      userId = 1,
    } = body;

    if (!offline_invoice_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'offline_invoice_id is required' } },
        { status: 422 }
      );
    }

    // 1. Idempotency Check: if this offline_invoice_id was already processed, return 200 replay
    const [existingSale] = await db
      .select()
      .from(sales)
      .where(eq(sales.offlineInvoiceId, offline_invoice_id));

    if (existingSale) {
      return NextResponse.json(
        {
          sale_code: existingSale.saleCode,
          replay: true,
          total_amount: Number(existingSale.totalAmountRupiah),
          cogs: Number(existingSale.cogsRupiah),
          flags: [],
        },
        { status: 200 }
      );
    }

    // Calculate subtotal & check dates
    const subtotal = rawItems.reduce((acc: number, item: any) => acc + (item.qty * item.unit_price), 0);
    const totalAmount = subtotal + Number(shipping_cost) - Number(discount);

    const receivedAt = new Date();
    const deviceTime = new Date(device_created_at);
    let businessDateStr = deviceTime.toISOString().split('T')[0];

    const detectedFlags: string[] = [];
    // Clock skew check: if device time is ahead of server by > 5 mins
    if (deviceTime.getTime() > receivedAt.getTime() + 5 * 60 * 1000) {
      detectedFlags.push('CLOCK_SKEW');
      businessDateStr = receivedAt.toISOString().split('T')[0];
    }

    const saleCode = `SALE-${businessDateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const result = await db.transaction(async (tx) => {
      // 2. Insert Sale header
      const paymentChannel = (payment_method === 'CASH') ? 'CASH' : 'BANK';
      
      const [newSale] = await tx
        .insert(sales)
        .values({
          saleCode,
          offlineInvoiceId: offline_invoice_id,
          offlineDeviceId: device_id,
          shiftId: shift_id,
          createdBy: userId,
          deviceCreatedAt: deviceTime,
          receivedAt,
          businessDate: businessDateStr,
          subtotalRupiah: subtotal.toString(),
          shippingCostRupiah: shipping_cost.toString(),
          discountRupiah: discount.toString(),
          totalAmountRupiah: totalAmount.toString(),
          cogsRupiah: '0', // will update after calculating components
          paymentMethod: payment_method,
          paymentChannel,
          isOfflineSynced: true,
        })
        .returning();

      // 3. Process items and explode BOM if needed
      let totalCogs = 0;
      const ledgerMovements = [];

      for (const item of rawItems) {
        // Fetch item to determine stock mode & category
        const [dbItem] = await tx.select().from(items).where(eq(items.id, item.item_id));

        if (!dbItem) {
          throw new Error(`Item ${item.item_id} tidak terdaftar`);
        }

        const isExplodeBom = dbItem.stockMode === 'EXPLODE_BOM';

        if (isExplodeBom) {
          // Explode BOM
          const [recipe] = await tx.select().from(recipes).where(eq(recipes.outputItemId, dbItem.id));
          let itemCogs = 0;

          if (recipe) {
            const lines = await tx.select().from(recipeLines).where(eq(recipeLines.recipeId, recipe.id));
            for (const line of lines) {
              const [compItem] = await tx.select().from(items).where(eq(items.id, line.itemId));
              if (compItem) {
                const compAvg = Number(compItem.currentAvgCostRupiah || 0);
                const neededQty = (Number(line.qtyPerBasis) / Number(recipe.basisQty)) * item.qty;
                const lineCost = neededQty * compAvg;
                itemCogs += lineCost;

                // Exploded component ledger deduction (allow negative for POS sync: PRD §6.5)
                ledgerMovements.push({
                  itemId: compItem.id,
                  type: 'SALE_OUT' as const,
                  qtyDelta: -neededQty,
                  referenceType: 'SALE',
                  referenceId: newSale.id,
                  userId,
                  notes: `BOM sale deduction ${saleCode}`,
                });

                if (Number(compItem.currentStockQty) < neededQty) {
                  detectedFlags.push('OVERSOLD');
                }
              }
            }
          }

          totalCogs += itemCogs;

          await tx.insert(saleItems).values({
            saleId: newSale.id,
            lineType: 'MENU',
            itemId: dbItem.id,
            qty: item.qty.toString(),
            unitPriceRupiah: item.unit_price.toString(),
            lineTotalRupiah: (item.qty * item.unit_price).toString(),
            hppSnapshotUnitRupiah: itemCogs ? (itemCogs / item.qty).toString() : '0',
            reductionType: 'BOM_EXPLODE',
          });
        } else {
          // Direct stock deduction
          const itemAvg = Number(dbItem.currentAvgCostRupiah || 0);
          const lineCost = item.qty * itemAvg;
          totalCogs += lineCost;

          ledgerMovements.push({
            itemId: dbItem.id,
            type: 'SALE_OUT' as const,
            qtyDelta: -item.qty,
            referenceType: 'SALE',
            referenceId: newSale.id,
            userId,
            notes: `Direct sale deduction ${saleCode}`,
          });

          if (Number(dbItem.currentStockQty) < item.qty) {
            detectedFlags.push('OVERSOLD');
          }

          await tx.insert(saleItems).values({
            saleId: newSale.id,
            lineType: 'MENU',
            itemId: dbItem.id,
            qty: item.qty.toString(),
            unitPriceRupiah: item.unit_price.toString(),
            lineTotalRupiah: (item.qty * item.unit_price).toString(),
            hppSnapshotUnitRupiah: itemAvg.toString(),
            reductionType: 'DIRECT_STOCK',
          });
        }
      }

      // Add shipping line if applicable (no stock impact)
      if (shipping_cost > 0) {
        await tx.insert(saleItems).values({
          saleId: newSale.id,
          lineType: 'SHIPPING',
          itemId: null,
          qty: '1',
          unitPriceRupiah: shipping_cost.toString(),
          lineTotalRupiah: shipping_cost.toString(),
          hppSnapshotUnitRupiah: '0',
          reductionType: 'NO_STOCK_IMPACT',
        });
      }

      // Execute stock ledger with allowNegative = true (PRD §6.5 POS sales never blocked by stock)
      if (ledgerMovements.length > 0) {
        await postLedger(ledgerMovements, { tx, allowNegative: true });
      }

      // Update sale cogs
      await tx
        .update(sales)
        .set({ cogsRupiah: totalCogs.toString() })
        .where(eq(sales.id, newSale.id));

      // 4. Record income in finance_transactions
      let [salesCategory] = await tx
        .select()
        .from(financeCategories)
        .where(eq(financeCategories.name, 'Penjualan POS'));

      if (!salesCategory) {
        [salesCategory] = await tx
          .insert(financeCategories)
          .values({
            name: 'Penjualan POS',
            kind: 'INCOME',
            isSystem: true,
          })
          .returning();
      }

      await tx.insert(financeTransactions).values({
        txnDate: businessDateStr,
        kind: 'INCOME',
        channel: paymentChannel,
        categoryId: salesCategory.id,
        amountRupiah: totalAmount.toString(),
        sourceType: 'SALE',
        sourceId: newSale.id,
        createdBy: userId,
        note: `Penjualan POS ${saleCode}`,
      });

      // 5. Store flags if any
      const uniqueFlags = Array.from(new Set(detectedFlags));
      for (const flag of uniqueFlags) {
        await tx.insert(saleFlags).values({
          saleId: newSale.id,
          flagType: flag as any,
          detail: { note: `Flag detected during sync: ${flag}` },
        });
      }

      return {
        sale_code: saleCode,
        replay: false,
        total_amount: totalAmount,
        cogs: totalCogs,
        flags: uniqueFlags,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'SYNC_ERROR', message: error.message } },
      { status: 422 }
    );
  }
}
