import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT, summarizeRecoveryMetadata } from './recovery-backup-metadata.mjs';

const fixture = () => ({
  pitr_enabled: false, walg_enabled: true, secret: 'synthetic-do-not-print',
  backups: [{ status: 'COMPLETED', inserted_at: '2026-11-07T04:00:00Z',
    is_physical_backup: true, connection_string: 'synthetic-do-not-print' }],
});

test('allowlists metadata, measures age, and never claims restore proof', () => {
  const result = summarizeRecoveryMetadata(fixture(), new Date('2026-11-07T16:00:00Z'));
  assert.equal(result.project_ref, PROJECT);
  assert.equal(result.completed_backup_age_hours, 12);
  assert.equal(result.restore_verified, false);
  assert.equal(JSON.stringify(result).includes('synthetic-do-not-print'), false);
});

test('empty backup list is not evidence of a completed backup', () => {
  assert.equal(summarizeRecoveryMetadata({ backups: [] }).completed_backup_age_hours, null);
});

test('invalid and potentially hostile fields fail closed', () => {
  for (const change of [{ status: 'synthetic-do-not-print' },
    { inserted_at: 'synthetic-do-not-print' }, { is_physical_backup: 'yes' }]) {
    const input = fixture();
    Object.assign(input.backups[0], change);
    assert.throws(() => summarizeRecoveryMetadata(input), /Invalid backup record/);
  }
  assert.throws(() => summarizeRecoveryMetadata({}), /Invalid backup metadata/);
});
