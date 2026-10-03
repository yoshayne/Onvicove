export async function createOutlookCalendarEvent(params: {
  refreshToken: string;
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
  attendeeEmail: string;
  attendeeName: string;
  timezone: string;
}): Promise<void> {
  const { refreshToken, summary, description, startIso, endIso, attendeeEmail, attendeeName, timezone } = params;

  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  // Step 1: Exchange refresh token for access token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Microsoft token refresh failed (${tokenRes.status}): ${text}`);
  }

  const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string };
  const accessToken = tokenData.access_token;

  // Step 2: Create the calendar event via Microsoft Graph
  const eventRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: summary,
      body: { contentType: 'Text', content: description },
      start: { dateTime: startIso, timeZone: timezone },
      end: { dateTime: endIso, timeZone: timezone },
      attendees: [{
        emailAddress: { address: attendeeEmail, name: attendeeName },
        type: 'required',
      }],
    }),
  });

  if (!eventRes.ok) {
    const text = await eventRes.text();
    throw new Error(`Outlook Calendar event creation failed (${eventRes.status}): ${text}`);
  }
}
