export interface BusyPeriod {
  start_time: string; // ISO
  end_time: string;   // ISO
}

// ── Google Calendar freebusy ──────────────────────────────────────────────────

export async function fetchGoogleCalBusyTimes(
  refreshToken: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyPeriod[]> {
  // Refresh access token
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
  if (!tokenRes.ok) throw new Error(`Google token refresh failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json() as { access_token: string };

  // Query freebusy
  const busyRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: 'primary' }],
    }),
  });
  if (!busyRes.ok) throw new Error(`Google freebusy failed: ${busyRes.status}`);

  const data = await busyRes.json() as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } };
  };
  return (data.calendars?.primary?.busy ?? []).map((b) => ({
    start_time: b.start,
    end_time: b.end,
  }));
}

// ── Outlook / Microsoft Graph freebusy ───────────────────────────────────────

export async function fetchOutlookCalBusyTimes(
  refreshToken: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyPeriod[]> {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  // Refresh access token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Calendars.Read offline_access',
      }),
    }
  );
  if (!tokenRes.ok) throw new Error(`Microsoft token refresh failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json() as { access_token: string };

  // Query calendar view (simpler than getSchedule, works for the user's own calendar)
  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    '$select': 'start,end,showAs',
    '$top': '100',
  });
  const eventsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
    { headers: { 'Authorization': `Bearer ${access_token}` } }
  );
  if (!eventsRes.ok) throw new Error(`Outlook calendarView failed: ${eventsRes.status}`);

  const data = await eventsRes.json() as {
    value?: { start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string }; showAs: string }[];
  };

  // Only block "busy" and "tentative" — skip "free", "oof", "workingElsewhere"
  return (data.value ?? [])
    .filter((e) => e.showAs === 'busy' || e.showAs === 'tentative')
    .map((e) => ({
      // Microsoft Graph dateTime is already in UTC when queried via calendarView
      // (the API converts to UTC for the response regardless of event timezone)
      start_time: new Date(e.start.dateTime).toISOString(),
      end_time: new Date(e.end.dateTime).toISOString(),
    }));
}
