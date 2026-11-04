import { pathToFileURL } from "node:url";

// Decide from the intended cron hour, not the potentially delayed start time.
export function shouldRefreshProfile(event, schedule, now = new Date()) {
  if (event !== "schedule") return true;
  const hour = schedule === "0 12 * * *" ? 12 : schedule === "0 13 * * *" ? 13 : null;
  // An unrecognized schedule should not silently disable future refreshes.
  if (hour === null) return true;
  const scheduled = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour),
  );
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(scheduled) === "08"
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(
    `should_run=${shouldRefreshProfile(process.env.EVENT_NAME, process.env.EVENT_SCHEDULE)}`,
  );
}
