import { db } from '../db/client';

/** Records an admin action. Never throws: a logging hiccup must not turn a completed action into an error. */
export async function recordAdminAction(
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db`
      INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, details)
      VALUES (${adminEmail}, ${action}, ${targetType}, ${targetId}, ${db.json(details as never)})
    `;
  } catch (err) {
    console.error('Could not write audit log entry:', err instanceof Error ? err.message : err);
  }
}
