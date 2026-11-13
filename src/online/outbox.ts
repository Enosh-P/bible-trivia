import { db } from '../storage/db';
import { pushProgress, saveDailyResult, submitChallenge, useAccount } from './account';

/**
 * Results that need the internet. Played offline (or the connection dropped),
 * they wait on the phone and are sent when it's back online.
 */
export type Job =
  | { kind: 'daily'; day: string; score: number; correct: number; total: number }
  | { kind: 'challenge'; id: string; score: number; correct: number; total: number };

async function run(job: Job) {
  if (job.kind === 'daily') await saveDailyResult(job.day, job.score, job.correct, job.total);
  else await submitChallenge(job.id, job.score, job.correct, job.total);
}

/** A failure that won't fix itself by trying again (e.g. the challenge has expired). */
function permanent(e: unknown) {
  const msg = String((e as { message?: string })?.message ?? e);
  return navigator.onLine && !/fetch|network|timeout|offline|Failed to/i.test(msg);
}

/** Send now, or keep for later. */
export async function send(job: Job) {
  if (!navigator.onLine) return void (await db.outbox.add({ job, at: Date.now() }).catch(() => {}));
  try {
    await run(job);
  } catch (e) {
    if (!permanent(e)) await db.outbox.add({ job, at: Date.now() }).catch(() => {});
  }
}

let flushing = false;

/** Sends everything that's waiting, plus XP and streak. Safe to call any time. */
export async function flushOutbox() {
  if (flushing || !navigator.onLine || !useAccount.getState().session) return;
  flushing = true;
  try {
    for (const row of await db.outbox.orderBy('at').toArray()) {
      try {
        await run(row.job as Job);
        await db.outbox.delete(row.id!);
      } catch (e) {
        if (permanent(e)) await db.outbox.delete(row.id!);
        else break; // still offline: try again later
      }
    }
    await pushProgress().catch(() => {});
    await useAccount.getState().refresh().catch(() => {});
  } finally {
    flushing = false;
  }
}

export function waitingCount(): Promise<number> {
  return db.outbox.count().catch(() => 0);
}
