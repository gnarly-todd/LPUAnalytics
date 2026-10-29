const origin = "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site";
const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
url.searchParams.set("audience", origin);
const identity = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(15_000) });
if (!identity.ok) throw new Error(`Runner identity failed: ${identity.status}`);
const { value } = await identity.json();
const response = await fetch(`${origin}/api/owner-scans/tick`, { method: "POST", headers: { Authorization: `Bearer ${value}` }, signal: AbortSignal.timeout(100_000) });
if (!response.ok) throw new Error(`Background queue check failed: ${response.status}`);
// Never log credentials, scan identifiers or collection data.
const result = await response.json();
console.log(JSON.stringify({ status: result.status, processed: result.processed ?? 0, retryAt: result.retryAt ?? null }));
