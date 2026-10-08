import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sales, saleItems, saleFlags, items, recipeLines, recipes, financeTransactions, financeCategories } from '@/db/schema';
import { postLedger, LedgerLine } from '@/lib/ledger';
import { eq, ilike } from 'drizzle-orm';
import { inMemoryStore, SaleData } from '@/lib/store';

interface SyncItemPayload {
  line_type?: 'MENU' | 'SHIPPING';
  item_id?: number;
  item_name?: string;
  qty: number;
  unit_price: number;
  variant_name?: string;
}

// Deteksi berapa pcs Gyoza Mentah yang digunakan per porsi menu POS
function getGyozaPieceCount(itemName: string): number | null {
  const norm = itemName.toLowerCase();
  if (!norm.includes('gyoza')) return null;
  if (norm.includes('10')) return 10;
  if (norm.includes('8')) return 8;
  if (norm.includes('7')) return 7;
  const match = norm.match(/(?:isi\s*|)(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

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

    // Subtotal & Totals
    const subtotal = (rawItems as SyncItemPayload[]).reduce(
      (acc: number, item) => acc + (Number(item.qty) * Number(item.unit_price)),
      0
    );
    const totalAmount = subtotal + Number(shipping_cost) - Number(discount);
    const paymentChannel = (payment_method === 'CASH') ? 'CASH' : 'BANK';

    const receivedAt = new Date();
    const deviceTime = new Date(device_created_at);
    let businessDateStr = deviceTime.toISOString().split('T')[0];

    const detectedFlags: string[] = [];
    if (deviceTime.getTime() > receivedAt.getTime() + 5 * 60 * 1000) {
      detectedFlags.push('CLOCK_SKEW');
      businessDateStr = receivedAt.toISOString().split('T')[0];
    }

    const saleCode = `SALE-${businessDateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    try {
      // 1. Idempotency Check
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

      const result = await db.transaction(async (tx) => {
        // 2. Insert Sale header
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
            paymentMethod: payment_method,
            paymentChannel,
            isOfflineSynced: true,
          })
          .returning();

        let totalCogs = 0;
        const ledgerLinesToPost: LedgerLine[] = [];

        // 3. Process Items
        for (const rawItem of rawItems as SyncItemPayload[]) {
          const lineType = rawItem.line_type || 'MENU';

          if (lineType === 'SHIPPING' || !rawItem.item_id) {
            await tx.insert(saleItems).values({
              saleId: newSale.id,
              lineType: 'SHIPPING',
              qty: '1',
              unitPriceRupiah: rawItem.unit_price.toString(),
              lineTotalRupiah: (rawItem.qty * rawItem.unit_price).toString(),
              reductionType: 'NO_STOCK_IMPACT',
            });
            continue;
          }

          const [dbItem] = await tx.select().from(items).where(eq(items.id, rawItem.item_id));

          if (!dbItem) {
            continue;
          }

          const gyozaPcs = getGyozaPieceCount(dbItem.name || rawItem.item_name || '');

          // BUSINESS LOGIC: Finished Gyoza items (Gyoza Isi 10/8/7) DO NOT have raw BOM
          // They directly consume 10/8/7 pcs of "Gyoza Mentah Siap Masak" from the central batch!
          if (gyozaPcs !== null) {
            const [gyozaMentah] = await tx
              .select()
              .from(items)
              .where(ilike(items.name, '%Gyoza Mentah%'));

            let lineCogs = 0;
            if (gyozaMentah) {
              const neededPcs = gyozaPcs * Number(rawItem.qty);
              const gyozaAvgCost = Number(gyozaMentah.currentAvgCostRupiah || 917.14);
              const gyozaTotalCost = neededPcs * gyozaAvgCost;
              lineCogs += gyozaTotalCost;

              ledgerLinesToPost.push({
                itemId: gyozaMentah.id,
                type: 'SALE_OUT',
                qtyDelta: -neededPcs,
                referenceType: 'SALE',
                referenceId: newSale.id,
                userId,
                notes: `Pengurangan Batch Central: ${rawItem.qty}x ${dbItem.name} (-${neededPcs} pcs mentah)`,
              });
            }

            totalCogs += lineCogs;

            await tx.insert(saleItems).values({
              saleId: newSale.id,
              lineType: 'MENU',
              itemId: dbItem.id,
              qty: rawItem.qty.toString(),
              unitPriceRupiah: rawItem.unit_price.toString(),
              lineTotalRupiah: (rawItem.qty * rawItem.unit_price).toString(),
              hppSnapshotUnitRupiah: (lineCogs / (rawItem.qty || 1)).toString(),
              reductionType: 'CENTRAL_BATCH_DEDUCT',
            });
          } else if (dbItem.stockMode === 'EXPLODE_BOM') {
            const [recipe] = await tx
              .select()
              .from(recipes)
              .where(eq(recipes.outputItemId, dbItem.id));

            let recipeCogsPerPortion = 0;

            if (recipe) {
              const lines = await tx
                .select()
                .from(recipeLines)
                .where(eq(recipeLines.recipeId, recipe.id));

              for (const rLine of lines) {
                const [ing] = await tx.select().from(items).where(eq(items.id, rLine.itemId));
                if (ing) {
                  const qtyNeeded = (Number(rLine.qtyPerBasis) / Number(recipe.basisQty)) * Number(rawItem.qty);
                  const ingAvgCost = Number(ing.currentAvgCostRupiah || 0);
                  const cost = qtyNeeded * ingAvgCost;
                  recipeCogsPerPortion += cost;

                  ledgerLinesToPost.push({
                    itemId: ing.id,
                    type: 'SALE_OUT',
                    qtyDelta: -qtyNeeded,
                    referenceType: 'SALE',
                    referenceId: newSale.id,
                    userId,
                    notes: `BOM Explode: ${rawItem.qty}x ${dbItem.name}`,
                  });
                }
              }
            }

            totalCogs += recipeCogsPerPortion;

            await tx.insert(saleItems).values({
              saleId: newSale.id,
              lineType: 'MENU',
              itemId: dbItem.id,
              qty: rawItem.qty.toString(),
              unitPriceRupiah: rawItem.unit_price.toString(),
              lineTotalRupiah: (rawItem.qty * rawItem.unit_price).toString(),
              hppSnapshotUnitRupiah: (recipeCogsPerPortion / (rawItem.qty || 1)).toString(),
              reductionType: 'BOM_EXPLODE',
            });
          } else {
            const itemAvgCost = Number(dbItem.currentAvgCostRupiah || 0);
            const lineCogs = Number(rawItem.qty) * itemAvgCost;
            totalCogs += lineCogs;

            ledgerLinesToPost.push({
              itemId: dbItem.id,
              type: 'SALE_OUT',
              qtyDelta: -Number(rawItem.qty),
              referenceType: 'SALE',
              referenceId: newSale.id,
              userId,
              notes: `Direct Sale: ${rawItem.qty}x ${dbItem.name}`,
            });

            await tx.insert(saleItems).values({
              saleId: newSale.id,
              lineType: 'MENU',
              itemId: dbItem.id,
              qty: rawItem.qty.toString(),
              unitPriceRupiah: rawItem.unit_price.toString(),
              lineTotalRupiah: (rawItem.qty * rawItem.unit_price).toString(),
              hppSnapshotUnitRupiah: itemAvgCost.toString(),
              reductionType: 'DIRECT_STOCK',
            });
          }
        }

        // 4. Update Sale COGS
        await tx
          .update(sales)
          .set({ cogsRupiah: totalCogs.toString() })
          .where(eq(sales.id, newSale.id));

        // 5. Post Ledger Lines with allowNegative = true
        if (ledgerLinesToPost.length > 0) {
          await postLedger(ledgerLinesToPost, { allowNegative: true, tx });
        }

        // 6. Record Finance Transaction (Income)
        let [incomeCat] = await tx
          .select()
          .from(financeCategories)
          .where(eq(financeCategories.name, 'Penjualan Kasir'));

        if (!incomeCat) {
          [incomeCat] = await tx
            .insert(financeCategories)
            .values({
              name: 'Penjualan Kasir',
              kind: 'INCOME',
              isSystem: true,
            })
            .returning();
        }

        await tx.insert(financeTransactions).values({
          txnDate: businessDateStr,
          kind: 'INCOME',
          channel: paymentChannel as 'CASH' | 'BANK',
          categoryId: incomeCat.id,
          amountRupiah: totalAmount.toString(),
          sourceType: 'SALE',
          sourceId: newSale.id,
          createdBy: userId,
          note: `Penjualan ${saleCode} (${payment_method})`,
        });

        // 7. Save Flags if any
        for (const flag of detectedFlags) {
          await tx.insert(saleFlags).values({
            saleId: newSale.id,
            flagType: flag,
            detail: { note: 'Auto detected during sync' },
          });
        }

        return {
          sale_code: saleCode,
          replay: false,
          total_amount: totalAmount,
          cogs: totalCogs,
          flags: detectedFlags,
        };
      });

      return NextResponse.json(result, { status: 201 });
    } catch {
      // In-memory fallback
      // Check existing idempotency
      const existing = inMemoryStore.sales.find((s) => s.offlineInvoiceId === offline_invoice_id);
      if (existing) {
        return NextResponse.json(
          {
            sale_code: existing.saleCode,
            replay: true,
            total_amount: Number(existing.totalAmountRupiah),
            cogs: Number(existing.cogsRupiah),
            flags: [],
          },
          { status: 200 }
        );
      }

      let storeTotalCogs = 0;

      // PROSES PENGURANGAN STOK DI IN-MEMORY STORE
      for (const rawItem of (rawItems as SyncItemPayload[])) {
        const lineType = rawItem.line_type || 'MENU';
        if (lineType === 'SHIPPING' || !rawItem.item_id) continue;

        const itm = inMemoryStore.items.find((i) => i.id === rawItem.item_id || i.name === rawItem.item_name);
        const itemName = rawItem.item_name || itm?.name || '';
        const gyozaPcs = getGyozaPieceCount(itemName);

        // JIKA PRODUK GYOZA ISI 10 / 8 / 7:
        // Mengurangi stok central "Gyoza Mentah Siap Masak" sejumlah 10, 8, atau 7 pcs * porsi!
        if (gyozaPcs !== null) {
          const gyozaMentah = inMemoryStore.items.find(
            (i) => i.name.toLowerCase().includes('gyoza mentah') || i.sku === 'SEM-GYO-MNT'
          );

          if (gyozaMentah) {
            const neededPcs = gyozaPcs * Number(rawItem.qty);
            const curStock = Number(gyozaMentah.currentStockQty);
            const curVal = Number(gyozaMentah.currentStockValueRupiah);
            const avgCost = Number(gyozaMentah.currentAvgCostRupiah) || 917.14;
            
            const newStock = curStock - neededPcs;
            const deductionVal = neededPcs * avgCost;
            const newVal = Math.max(0, curVal - deductionVal);

            gyozaMentah.currentStockQty = newStock.toString();
            gyozaMentah.currentStockValueRupiah = newVal.toString();
            if (newStock < 0) gyozaMentah.oversold = true;

            storeTotalCogs += deductionVal;

            inMemoryStore.movements.unshift({
              id: inMemoryStore.movements.length + 1,
              itemId: gyozaMentah.id,
              itemName: gyozaMentah.name,
              movementType: 'SALE_OUT',
              qtyDelta: `-${neededPcs}`,
              valueDeltaRupiah: `-${deductionVal.toFixed(0)}`,
              qtyAfter: gyozaMentah.currentStockQty,
              valueAfterRupiah: gyozaMentah.currentStockValueRupiah,
              referenceType: 'SALE',
              referenceId: inMemoryStore.sales.length + 1,
              notes: `Pengurangan Batch Gyoza: ${rawItem.qty}x ${itemName} (-${neededPcs} pcs mentah)`,
              occurredAt: new Date().toISOString(),
            });
          }

          // Kurangi stok kemasan pelengkap (Paper Box / Plastik Seal, Saos, Sumpit, Stiker)
          const isFrozen = itemName.toLowerCase().includes('frozen');
          const boxItem = inMemoryStore.items.find((i) =>
            isFrozen ? i.name.toLowerCase().includes('plastik seal') : i.name.toLowerCase().includes('paper box m')
          );
          const saosItem = inMemoryStore.items.find((i) => i.name.toLowerCase().includes('saos bangkok'));
          const sumpitItem = inMemoryStore.items.find((i) => i.name.toLowerCase().includes('sumpit'));
          const stikerItem = inMemoryStore.items.find((i) => i.name.toLowerCase().includes('stiker'));

          [boxItem, saosItem, sumpitItem, stikerItem].forEach((pack) => {
            if (pack) {
              const packQty = Number(pack.currentStockQty);
              const packVal = Number(pack.currentStockValueRupiah);
              const packCost = Number(pack.currentAvgCostRupiah) || 0;
              const useQty = Number(rawItem.qty);
              const newPackQty = packQty - useQty;
              const dedVal = useQty * packCost;

              pack.currentStockQty = newPackQty.toString();
              pack.currentStockValueRupiah = Math.max(0, packVal - dedVal).toString();
              storeTotalCogs += dedVal;
            }
          });
        } else if (itm) {
          // Direct stock deduction (misal Es Teh Manis, Chili Oil Ekstra)
          const curStock = Number(itm.currentStockQty);
          const curVal = Number(itm.currentStockValueRupiah);
          const avgCost = Number(itm.currentAvgCostRupiah) || 0;
          const useQty = Number(rawItem.qty);

          const newStock = curStock - useQty;
          const deductionVal = useQty * avgCost;
          const newVal = Math.max(0, curVal - deductionVal);

          itm.currentStockQty = newStock.toString();
          itm.currentStockValueRupiah = newVal.toString();
          storeTotalCogs += deductionVal;

          inMemoryStore.movements.unshift({
            id: inMemoryStore.movements.length + 1,
            itemId: itm.id,
            itemName: itm.name,
            movementType: 'SALE_OUT',
            qtyDelta: `-${useQty}`,
            valueDeltaRupiah: `-${deductionVal.toFixed(0)}`,
            qtyAfter: itm.currentStockQty,
            valueAfterRupiah: itm.currentStockValueRupiah,
            referenceType: 'SALE',
            referenceId: inMemoryStore.sales.length + 1,
            notes: `Penjualan Kasir: ${useQty}x ${itm.name}`,
            occurredAt: new Date().toISOString(),
          });
        }
      }

      // Add to store
      const newSale: SaleData = {
        id: inMemoryStore.sales.length + 1,
        saleCode,
        offlineInvoiceId: offline_invoice_id,
        paymentMethod: payment_method,
        paymentChannel: paymentChannel as 'CASH' | 'BANK',
        totalAmountRupiah: totalAmount.toString(),
        cogsRupiah: storeTotalCogs.toFixed(0),
        deviceCreatedAt: device_created_at,
        items: (rawItems as SyncItemPayload[]).map((i) => ({
          itemId: i.item_id,
          name: i.item_name || 'Menu Item',
          qty: i.qty,
          unitPrice: i.unit_price,
        })),
      };
      inMemoryStore.sales.unshift(newSale);

      // Record income in finance transactions
      inMemoryStore.transactions.unshift({
        id: inMemoryStore.transactions.length + 1,
        txnDate: businessDateStr,
        kind: 'INCOME',
        channel: paymentChannel as 'CASH' | 'BANK',
        categoryId: 1,
        categoryName: 'Penjualan Kasir',
        amountRupiah: totalAmount.toString(),
        sourceType: 'SALE',
        sourceId: newSale.id,
        note: `Penjualan ${saleCode} (${payment_method})`,
        createdBy: userId,
        isReversed: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          sale_code: saleCode,
          replay: false,
          total_amount: totalAmount,
          cogs: storeTotalCogs,
          flags: detectedFlags,
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'SYNC_ERROR', message } },
      { status: 422 }
    );
  }
}
