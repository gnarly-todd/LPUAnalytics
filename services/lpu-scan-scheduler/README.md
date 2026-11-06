# Durable owner-scan scheduler

This Worker coordinates scans using a SQLite-backed Durable Object alarm. The
existing profile relay still stores jobs, snapshots, cancellations and LPU
cooldowns in its current R2 bucket, so existing scans and cached owners remain
available. The alarm wakes when a scan is submitted, runs bounded relay batches,
and schedules the next check after the recorded cooldown. A five-minute
Cloudflare Cron Trigger is a recovery watchdog for missed wake-ups; no GitHub
Actions schedule or open browser is needed after migration.

## Configuration

The scheduler requires a Cloudflare account with Workers and Durable Objects
enabled. The Worker is configured for the Workers Free plan's SQLite-backed
objects. Set two independent, random secrets of at least 32 characters:

- `SCAN_TICK_SECRET`: shared with the relay; authorizes queue processing.
- `SCAN_WAKE_SECRET`: shared with the relay; authorizes wake requests.

Keep both values out of source control and client code. Store them as Worker
secrets and as runtime secrets on the existing relay Site. The relay also needs
`SCAN_SCHEDULER_URL`, the deployed scheduler's HTTPS origin. Never use a user
profile ID or scan ID as a secret.

## Safe rollout

1. Generate the two secrets securely. Deploy the updated relay with only
   `SCAN_TICK_SECRET` set initially; leave `SCAN_SCHEDULER_URL` unset so the
   existing runner remains active.
2. Set both secrets on this Worker using Wrangler's secret mechanism, then
   deploy with `wrangler deploy --config services/lpu-scan-scheduler/wrangler.toml`.
3. Verify an authenticated wake, an unauthorized request, a short scan, and a
   scan resuming after a simulated cooldown. Check that the relay's existing R2
   jobs and owner snapshots are still present.
4. Set the relay's `SCAN_WAKE_SECRET` and `SCAN_SCHEDULER_URL` together and
   redeploy the relay. A submission receives confirmation only after the
   scheduler has accepted the wake. If the wake fails, the saved job remains
   retryable with the same ID. The watchdog also checks for stranded jobs.
5. Verify a live scan while the browser is closed, including cooldown recovery.
   Only after that succeeds, remove the scheduled GitHub runner. Keep its
   manual trigger during the transition for rollback.

To roll back, unset the relay's `SCAN_SCHEDULER_URL` and redeploy, then resume
the existing runner. Do not delete or replace the relay's R2 bucket.

## Checks

Run `node services/lpu-scan-scheduler/test-scheduler.mjs` and
`node services/lpu-profile-relay/scripts/test-background-scans.mjs` from the
repository root. The latter exercises the relay and scheduler together with
the browser disconnected and an upstream cooldown. `wrangler deploy --dry-run
--config services/lpu-scan-scheduler/wrangler.toml` validates the Worker build.
