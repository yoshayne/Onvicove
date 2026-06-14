import { db } from '../db/client';

export async function generateOrderNumber(tenantId: string): Promise<string> {
  const result = await db`
    SELECT COUNT(*) as count FROM orders WHERE tenant_id = ${tenantId}
  `;
  const count = parseInt(String(result[0].count)) + 1;
  return `ORD-${String(count).padStart(4, '0')}`;
}
