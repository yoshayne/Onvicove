import cron from 'node-cron';
import { announcementTick } from '../services/announcements';

/** Starts scheduled announcements when they are due, and finishes any send that was cut off by a restart */
export function startAnnouncementJob() {
  cron.schedule('* * * * *', () => {
    announcementTick().catch((err) => console.error('Announcement job error:', err));
  });
  console.log('Announcement cron job scheduled (every minute)');
}
