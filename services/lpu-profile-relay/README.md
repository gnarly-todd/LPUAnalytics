# Public profile relay

Production: https://todd-lpu-profile-relay.nicelife70117.chatgpt.site

GitHub Pages calls `GET /api/lpu-user?userId=<public-profile-id>` on this service. The service reads the public LPU user API from its server and allows browser reads from `https://gnarly-todd.github.io`. No account tokens or other credentials are included in the client.

The worker accepts only explicit user IDs and forwards the public collection fields. It has no arbitrary URL proxy or upstream write endpoint. It coalesces concurrent requests, caches successful results for 30 seconds and preserves their original fetch timestamp. There is no fixed profile-count cap. LPU's `Retry-After` cooldown pauses upstream reads within each running worker instance. The application scans with at most three requests in flight and saves each profile for seven days, using IndexedDB for larger scans with browser-storage fallbacks.

Source: `worker/index.js`. Test with `node services/lpu-profile-relay/scripts/test-relay.mjs`; append `--live` for one permitted public-profile integration check.

The deployed worker is managed through Sites project `appgprj_6adedc6830888191bc917af883255326`. Keep its public access enabled for anonymous GitHub Pages requests. The analytics Site retains its own separate access settings.

## Durable owner scans

Both frontends use `/api/owner-scans` to submit idempotent jobs, retrieve paginated snapshots, and cancel a scan. A random scan identifier is retained in browser storage before submission; it is the capability needed to read or stop that scan. Only public LPU ownership data is stored. R2 (`BUCKET`) holds job progress, per-profile seven-day snapshots, cancellation markers, a global cooldown and an atomic runner lease. Expired records are rejected and incrementally cleaned up. A closed or suspended browser does not cancel a job.

The Cloudflare Durable Object scheduler wakes for a new job and continues
processing it independently of visitors. It schedules the next batch after
any LPU cooldown; a five-minute Cloudflare Cron Trigger recovers missed wakes.
The lease prevents overlapping checks. Each check processes up to 50 profiles,
at most three concurrently, and persists progress every round. Temporary profile
errors retry across up to three checks, then remain visible as failures.

Submission starts a bounded three-profile batch using `ctx.waitUntil`, with
single-attempt ten-second upstream timeouts. An open page can also request a
scoped batch through `POST /api/owner-scans/<id>?action=advance`. The global
lease and persistent cooldown protect all entry points, and the UI shows the
runner heartbeat. See `../lpu-scan-scheduler/README.md` for configuration,
verification, and rollback.

`.github/workflows/owner-scans.yml` remains available as a manual fallback.
It authenticates with a short-lived GitHub OIDC token pinned to this repository,
main branch, workflow, and relay audience. Run it manually if the Cloudflare
scheduler needs to be taken offline. Tests: `node
services/lpu-profile-relay/scripts/test-background-scans.mjs` from the analytics
checkout.
