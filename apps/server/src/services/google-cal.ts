export async function createGoogleCalendarEvent(params: {
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

  // Step 1: Exchange refresh token for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Google token refresh failed (${tokenRes.status}): ${text}`);
  }

  const tokenData = await tokenRes.json() as { access_token: string };
  const accessToken = tokenData.access_token;

  // Step 2: Create the calendar event
  const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startIso, timeZone: timezone },
      end: { dateTime: endIso, timeZone: timezone },
      attendees: [{ email: attendeeEmail, displayName: attendeeName }],
    }),
  });

  if (!eventRes.ok) {
    const text = await eventRes.text();
    throw new Error(`Google Calendar event creation failed (${eventRes.status}): ${text}`);
  }
}
