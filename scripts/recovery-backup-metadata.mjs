import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PROJECT = 'erptubrslnfmkuouczgn';

// Only explicitly safe metadata leaves the provider response boundary.
export function summarizeRecoveryMetadata(input, now = new Date()) {
  if (!input || !Array.isArray(input.backups)) throw new Error('Invalid backup metadata');
  const backups = input.backups.map((item) => {
    if (!['COMPLETED', 'FAILED', 'PENDING', 'IN_PROGRESS'].includes(item.status)
        || !Number.isFinite(Date.parse(item.inserted_at))
        || typeof item.is_physical_backup !== 'boolean') {
      throw new Error('Invalid backup record');
    }
    return {
      status: item.status,
      inserted_at: new Date(item.inserted_at).toISOString(),
      is_physical_backup: item.is_physical_backup,
    };
  }).sort((a, b) => b.inserted_at.localeCompare(a.inserted_at));
  const latest = backups.find((item) => item.status === 'COMPLETED');
  return {
    project_ref: PROJECT,
    observed_at: now.toISOString(),
    pitr_enabled: typeof input.pitr_enabled === 'boolean' ? input.pitr_enabled : null,
    walg_enabled: typeof input.walg_enabled === 'boolean' ? input.walg_enabled : null,
    completed_backup_age_hours: latest
      ? Math.round((now - new Date(latest.inserted_at)) / 36000) / 100 : null,
    backups,
    restore_verified: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) {
    console.error('No arguments accepted; project and read-only operation are fixed.');
    process.exitCode = 1;
  } else {
    try {
      const raw = execFileSync('supabase', [
        'backups', 'list', '--project-ref', PROJECT, '--output', 'json',
      ], { encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'] });
      console.log(JSON.stringify(summarizeRecoveryMetadata(JSON.parse(raw)), null, 2));
    } catch {
      console.error('ACCESS GAP: backup metadata unavailable or invalid; raw provider output suppressed.');
      process.exitCode = 1;
    }
  }
}
