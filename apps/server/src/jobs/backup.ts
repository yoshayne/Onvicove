import cron from 'node-cron';
import { db } from '../db/client';
import { backupConfig, runBackup } from '../services/backup';
import { sendTransacEmail } from '../services/email';

/** Right after a deploy: if there is no recent good backup, make one now instead of waiting for the night run */
async function backupIfStale() {
  const last = (await db`SELECT created_at FROM backup_runs WHERE status = 'ok' ORDER BY created_at DESC LIMIT 1`)[0];
  const ageHours = last ? (Date.now() - new Date(last.created_at as string).getTime()) / 3_600_000 : Infinity;
  if (ageHours < 20) return; // a restart loop must not trigger a backup every time
  const firstEver = !last;
  const r = await runBackup('schedule');
  console.log(r.ok ? `Backup after deploy done (${r.key})` : `Backup after deploy failed: ${r.error}`);
  const to = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)[0];
  if (r.ok && firstEver && to) {
    await sendTransacEmail({
      to: [{ email: to, name: to }],
      subject: 'Shop Suite Direct: your first database backup worked',
      htmlContent: `<p>Your first database backup finished and is stored outside Railway (${((r.sizeBytes ?? 0) / 1024).toFixed(0)} KB, encrypted).</p><p>It will now run every night. You can see them under Admin → Backups. Remember to keep a copy of your encryption key somewhere safe.</p>`,
    }).catch((err) => console.error('First backup email error:', err));
  }
}

/** Every night at 03:35 UTC, copy the database to storage outside Railway (and once, shortly after each deploy if none is recent) */
export function startBackupJob() {
  if (!backupConfig().configured) {
    console.log('Database backups are off (set the BACKUP_* variables to turn them on).');
    return;
  }
  cron.schedule('35 3 * * *', () => {
    runBackup('schedule').catch((err) => console.error('Backup job error:', err));
  });
  setTimeout(() => backupIfStale().catch((err) => console.error('Post-deploy backup error:', err)), 90_000);
  console.log('Database backup cron job scheduled (nightly, plus a check 90 seconds after start)');
}
