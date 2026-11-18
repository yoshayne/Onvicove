import { z } from 'zod';
import { db } from '../db/client';

export const orderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

type OrderedTable = 'services' | 'products' | 'staff';

/** Save the owner's order: the i-th id gets sort_order i. Only rows that belong to the store are touched. */
export async function reorderRows(table: OrderedTable, tenantId: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await db`UPDATE ${db(table)} SET sort_order = ${i} WHERE id = ${ids[i]} AND tenant_id = ${tenantId}`;
  }
}

/** The sort_order for a new row: the end of the list */
export const nextSortOrder = (table: OrderedTable, tenantId: string) =>
  db`(SELECT COALESCE(MAX(sort_order), -1) + 1 FROM ${db(table)} WHERE tenant_id = ${tenantId})`;
