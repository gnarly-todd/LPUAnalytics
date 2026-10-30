import type { ServerScanProgress } from "./top-owner-profiles";
import { DataTimestamp } from "./activity-status";

export default function ServerScanStatus({
  state,
  progress,
  busy,
  now = 0,
}: {
  state: string;
  progress?: ServerScanProgress;
  busy: boolean;
  now?: number;
}) {
  const labels: Record<string, string> = {
    submitting: "Submitting",
    queued: "Queued",
    running: "In progress",
    cooldown: "LPU cooldown",
    reconnecting: "Reconnecting",
    complete: "Complete",
    cancelled: "Stopped",
  };
  const total = Math.max(0, progress?.total || 0);
  const checked = Math.min(total, Math.max(0, progress?.processed || 0));
  const remaining = total - checked;
  const percent = total ? Math.floor((checked / total) * 100) : 0;
  const seconds = now && progress ? Math.max(0, Math.ceil((progress.retryAt - now) / 1000)) : 0;
  const countdown = `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
  return (
    <section className="server-scan-status" aria-labelledby="server-scan-progress-title">
      <div className="server-scan-heading">
        <h4 id="server-scan-progress-title">Server scan progress</h4>
        <span className="wishlist-scope-badge" role="status">
          {labels[state] || "Checking status"}
          {state === "complete" && !!progress?.failed ? " with failures" : ""}
        </span>
      </div>
      {progress && total > 0 ? (
        <>
          <div className="server-scan-heading server-scan-count">
            <strong>
              {checked.toLocaleString()} of {total.toLocaleString()} profiles checked
            </strong>
            <span>{percent}%</span>
          </div>
          <progress
            aria-label="Server profiles checked"
            value={checked}
            max={total}
            aria-valuetext={`${checked} of ${total} profiles checked, ${remaining} remaining`}
          />
          <p>{remaining.toLocaleString()} remaining in this server request</p>
          <dl className="server-scan-metrics">
            <div>
              <dt>Fetched</dt>
              <dd>{progress.fresh.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Server cache</dt>
              <dd>{progress.cached.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Failed</dt>
              <dd>{progress.failed.toLocaleString()}</dd>
            </div>
          </dl>
          {state === "cooldown" && (
            <p>
              {seconds > 0 ? (
                <>
                  Cooldown remaining: <strong>{countdown}</strong>.{" "}
                </>
              ) : now ? (
                <>Cooldown ended. Waiting for the next server check. </>
              ) : null}
              Automatic resume after <DataTimestamp value={progress.retryAt} />.
            </p>
          )}
          {busy &&
            (!progress.runnerLastSeenAt ||
              progress.checkedAt - progress.runnerLastSeenAt > 5 * 60_000) && (
              <p>
                Waiting for the background runner to check in. This page can advance batches while
                open; scheduled runner starts may be delayed.
              </p>
            )}
          <div className="server-scan-times">
            <p>
              Last server update: <DataTimestamp value={progress.updatedAt} />
            </p>
            <p>
              Last status received: <DataTimestamp value={progress.checkedAt} />
            </p>
            {!!progress.runnerLastSeenAt && (
              <p>
                Background runner check-in: <DataTimestamp value={progress.runnerLastSeenAt} />
              </p>
            )}
          </div>
        </>
      ) : (
        <p>
          {state === "submitting"
            ? "Sending your request. Wait for server confirmation before locking your phone."
            : state === "cancelled"
              ? "Server scan stopped."
              : "Waiting for the first server progress update…"}
        </p>
      )}
      {busy && state !== "submitting" && (
        <p>
          {state === "reconnecting"
            ? "Connection interrupted. Showing the last received progress; the server scan continues. "
            : "Results arrive in batches. This page checks progress about every 15 seconds. "}
          You can lock your phone and return later.
        </p>
      )}
    </section>
  );
}
