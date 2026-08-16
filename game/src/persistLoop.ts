/** In-memory PAPER shard dump loop. Not Postgres. Restore is a later pass. */

import { serializeShard, type ShardBlob, type ShardInput } from "./persist.ts";

export const PERSIST_INTERVAL_MS = 10_000;

export type PersistLoopOpts = {
  getShard: () => ShardInput;
  intervalMs?: number;
};

export type PersistLoop = {
  lastBlob: ShardBlob | null;
  stop: () => void;
};

/** Call serializeShard every interval and keep the last PAPER blob in memory. */
export function startPersistLoop({
  getShard,
  intervalMs = PERSIST_INTERVAL_MS,
}: PersistLoopOpts): PersistLoop {
  const loop: PersistLoop = {
    lastBlob: null,
    stop() {
      clearInterval(timer);
    },
  };

  const timer = setInterval(() => {
    loop.lastBlob = serializeShard(getShard());
  }, intervalMs);

  return loop;
}
