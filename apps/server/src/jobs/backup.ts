import cron from 'node-cron';
import { backupConfig, runBackup } from '../services/backup';

/** Every night at 03:35 UTC, copy the database to storage outside Railway */
export function startBackupJob() {
  if (!backupConfig().configured) {
    console.log('Database backups are off (set the BACKUP_* variables to turn them on).');
    return;
  }
  cron.schedule('35 3 * * *', () => {
    runBackup('schedule').catch((err) => console.error('Backup job error:', err));
  });
  console.log('Database backup cron job scheduled (nightly)');
}
