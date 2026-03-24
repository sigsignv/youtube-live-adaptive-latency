type PlayerLike = {
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
};

type StopCondition = () => boolean;

export type LatencyControlCommand = {
  player: PlayerLike;
  targetPlaybackRate: 0.75 | 0.95 | 1.05 | 1.25;
  stopConditions: StopCondition[];
  pollIntervalMs: number;
};

export async function applyLatencyControlCommand({
  player,
  targetPlaybackRate,
  stopConditions,
  pollIntervalMs,
}: LatencyControlCommand): Promise<void> {
  if (stopConditions.length === 0) {
    throw new Error("No stop conditions provided for latency control");
  }

  if (player.getPlaybackRate() !== 1.0) {
    throw new Error("Playback rate should be 1.0 to use latency control");
  }

  const shouldFinish = () => {
    return stopConditions.some((cond) => {
      try {
        return cond();
      } catch (ex) {
        console.error("stopCondition failed:", ex);
        return true;
      }
    });
  };

  if (shouldFinish()) {
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      player.setPlaybackRate(targetPlaybackRate);
    } catch (ex) {
      reject(ex);
      return;
    }

    const intervalID = setInterval(() => {
      if (shouldFinish()) {
        try {
          if (player.getPlaybackRate() === targetPlaybackRate) {
            player.setPlaybackRate(1.0);
          }
          resolve();
        } catch (ex) {
          reject(ex);
        } finally {
          clearInterval(intervalID);
        }
      }
    }, pollIntervalMs);
  });
}
