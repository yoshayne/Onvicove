import { createHmac, timingSafeEqual } from 'crypto';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Turn the simple message format (blank lines = paragraphs, "- " = bullets, **bold**) into safe HTML */
export function renderAnnouncementBody(text: string): string {
  const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      return `<ul style="padding-left:20px;margin:0 0 16px">${lines.map((l) => `<li style="margin-bottom:6px">${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    const heading = /^#{1,3}\s+(.+)$/.exec(lines[0]);
    if (heading && lines.length === 1) return `<h3 style="font-size:17px;margin:20px 0 8px">${inline(heading[1])}</h3>`;
    return `<p style="margin:0 0 16px;line-height:1.6">${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.IMPERSONATE_SECRET || `${process.env.CLERK_SECRET_KEY}_unsubscribe`;
}

/** A link token that proves "this is the link we emailed to that store" without storing anything */
export function unsubscribeToken(tenantId: string): string {
  const sig = createHmac('sha256', secret()).update(`updates:${tenantId}`).digest('base64url');
  return `${tenantId}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [tenantId, sig] = token.split('.');
  if (!tenantId || !sig) return null;
  const expected = createHmac('sha256', secret()).update(`updates:${tenantId}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? tenantId : null;
}
