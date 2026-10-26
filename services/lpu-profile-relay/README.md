# Public profile relay

Production: https://todd-lpu-profile-relay.nicelife70117.chatgpt.site

GitHub Pages calls `GET /api/lpu-user?userId=<public-profile-id>` on this service. The service reads the public LPU user API from its server and allows browser reads from `https://gnarly-todd.github.io`. No account tokens or other credentials are included in the client.

The worker accepts only explicit user IDs and forwards the public collection fields. It has no arbitrary URL proxy, collection enumeration, or write endpoint. It coalesces concurrent requests, caches successful results for 30 seconds and preserves their original fetch timestamp. Its in-memory per-client budget allows 60 upstream attempts per 20 minutes; LPU's `Retry-After` cooldown takes precedence. These in-memory controls operate within each running worker instance. The main application's existing browser budget and seven-day wishlist-owner cache also remain active.

Source: `worker/index.js`. Test with `node services/lpu-profile-relay/scripts/test-relay.mjs`; append `--live` for one permitted public-profile integration check.

The deployed worker is managed through Sites project `appgprj_6adedc6830888191bc917af883255326`. Keep its public access enabled for anonymous GitHub Pages requests. The analytics Site retains its own separate access settings.
