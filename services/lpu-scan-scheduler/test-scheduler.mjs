import assert from "node:assert/strict";
import schedulerWorker, { authorized, createScheduler } from "./worker/index.js";

const wakeSecret = "wake-" + "a".repeat(40);
const tickSecret = "tick-" + "b".repeat(40);
const request = (secret) =>
  new Request("https://scheduler.example/wake", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
assert(await authorized(request(wakeSecret), wakeSecret));
assert.equal(await authorized(request("wrong"), wakeSecret), false);
assert.equal(await authorized(request(wakeSecret), "short"), false);

let time = 100_000,
  alarm = null,
  result = { status: "checked", pending: 1, retryAt: 0 };
let calls = 0;
const values = new Map();
const state = {
  storage: {
    async getAlarm() {
      return alarm;
    },
    async setAlarm(value) {
      alarm = value;
    },
    async get(key) {
      return values.get(key);
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  },
};
const scheduler = createScheduler(
  state,
  { SCAN_TICK_SECRET: tickSecret },
  {
    now: () => time,
    send: async (url, init) => {
      calls++;
      assert.equal(
        url,
        "https://todd-lpu-profile-relay.nicelife70117.chatgpt.site/api/owner-scans/tick",
      );
      assert.equal(init.headers.Authorization, `Bearer ${tickSecret}`);
      if (result === "offline") throw new Error("Network unavailable");
      if (result === "bad-response") return Response.json({ pending: "unknown" });
      return Response.json(result);
    },
  },
);
await scheduler.wake();
assert.equal(alarm, time + 1_000, "A new scan starts without a browser or GitHub schedule");
alarm = null;
await scheduler.run();
assert.equal(alarm, time + 2_000, "Pending work schedules another batch");
result = { status: "cooldown", pending: 1, retryAt: time + 120_000 };
await scheduler.run();
assert.equal(alarm, time + 120_000, "A rate limit is respected without early upstream calls");
time += 120_000;
alarm = null;
result = { status: "idle", pending: 0 };
await scheduler.run();
assert.equal(alarm, null, "No idle polling alarm remains after the queue drains");
result = "offline";
await scheduler.run();
assert.equal(alarm, time + 5_000, "A temporary failure schedules its own retry");
time += 5_000;
await scheduler.run();
assert.equal(alarm, time + 10_000, "Repeated errors back off");
result = "bad-response";
time += 10_000;
await scheduler.run();
assert.equal(
  alarm,
  time + 20_000,
  "Invalid responses are retried, not mistaken for an empty queue",
);
result = { status: "checked", pending: 1 };
time += 20_000;
await scheduler.run();
assert.equal(values.has("failures"), false, "A successful check clears retry backoff");

let wakes = 0,
  scheduledPromise;
const binding = {
  idFromName: (name) => {
    assert.equal(name, "global");
    return name;
  },
  get: () => ({
    async fetch() {
      wakes++;
      return Response.json({ state: "scheduled" }, { status: 202 });
    },
  }),
};
const env = { SCAN_WAKE_SECRET: wakeSecret, SCAN_SCHEDULER: binding };
assert.equal((await schedulerWorker.fetch(request("bad"), env)).status, 403);
assert.equal(wakes, 0);
assert.equal((await schedulerWorker.fetch(request(wakeSecret), env)).status, 202);
schedulerWorker.scheduled({}, env, {
  waitUntil: (promise) => {
    scheduledPromise = promise;
  },
});
await scheduledPromise;
assert.equal(wakes, 2, "A separate watchdog can wake the same coordinator");
assert(calls >= 6);
console.log(
  "PASS: durable scheduler wake, authentication, draining, cooldowns, retries, and watchdog recovery.",
);
