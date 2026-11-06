import { DurableObject } from "cloudflare:workers";
import { createScheduler, schedulerWorker } from "./core.mjs";

// All LPU requests share one upstream rate limit, so they use one coordinator.
export class ScanScheduler extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.scheduler = createScheduler(state, env);
  }
  async wake() {
    await this.scheduler.wake();
  }
  async alarm() {
    await this.scheduler.run();
  }
}

export default schedulerWorker;
