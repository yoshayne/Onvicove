import { randomBytes } from 'crypto';
import { db } from '../db/client';
import { getCustomerBaseUrl } from '../lib/baseUrl';

export const newManageToken = () => randomBytes(24).toString('base64url');

/** The booking's private reschedule/cancel link, creating the token for older bookings that don't have one. */
export async function manageUrlFor(tenant: object, bookingId: string): Promise<string> {
  const rows = await db`SELECT manage_token FROM bookings WHERE id = ${bookingId} LIMIT 1`;
  let token = rows[0]?.manage_token as string | null | undefined;
  if (!token) {
    token = newManageToken();
    await db`UPDATE bookings SET manage_token = ${token} WHERE id = ${bookingId} AND manage_token IS NULL`;
    const again = await db`SELECT manage_token FROM bookings WHERE id = ${bookingId} LIMIT 1`;
    token = (again[0]?.manage_token as string | undefined) ?? token;
  }
  return `${getCustomerBaseUrl(tenant)}/manage/booking/${token}`;
}
