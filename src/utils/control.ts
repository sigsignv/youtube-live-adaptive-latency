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

if (import.meta.vitest) {
  const { afterEach, beforeEach, describe, it, expect, vi } = import.meta
    .vitest;

  type MockPlayer = PlayerLike & {
    eventLogs: Array<{ rate: number }>;
  };

  const createMockPlayer = (options?: {
    initialPlaybackRate?: number;
    onGetPlaybackRate?: VoidFunction;
    onSetPlaybackRate?: VoidFunction;
  }): MockPlayer => {
    let currentPlaybackRate = options?.initialPlaybackRate ?? 1.0;
    const eventLogs: Array<{ rate: number }> = [];

    return {
      getPlaybackRate() {
        if (options?.onGetPlaybackRate) options.onGetPlaybackRate();
        return currentPlaybackRate;
      },
      setPlaybackRate(rate: number) {
        if (options?.onSetPlaybackRate) options.onSetPlaybackRate();
        currentPlaybackRate = rate;
        eventLogs.push({ rate });
      },
      eventLogs,
    };
  };

  describe("applyLatencyControlCommand", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should resolve immediately if stop condition is already met", async () => {
      const mockPlayer = createMockPlayer();
      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => true],
        pollIntervalMs: 50,
      };

      await expect(
        applyLatencyControlCommand(command),
      ).resolves.toBeUndefined();

      expect(mockPlayer.eventLogs).lengthOf(0);
    });

    it("should resolve once the stop condition is met", async () => {
      let count = 0;

      const mockPlayer = createMockPlayer();
      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => ++count > 5],
        pollIntervalMs: 50,
      };

      const promise = applyLatencyControlCommand(command);
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBeUndefined();

      expect(count).toBeGreaterThan(5);

      expect(mockPlayer.eventLogs).lengthOf(2);
      expect(mockPlayer.eventLogs[0]).toEqual({ rate: 1.25 });
      expect(mockPlayer.eventLogs[1]).toEqual({ rate: 1.0 });
    });

    it("should resolve when any stop condition is met", async () => {
      const beginTime = performance.now();
      let count = 0;

      const mockPlayer = createMockPlayer();
      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [
          () => performance.now() - beginTime > 500,
          () => ++count > 5,
        ],
        pollIntervalMs: 50,
      };

      const promise = applyLatencyControlCommand(command);
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBeUndefined();

      const elapsedTime = performance.now() - beginTime;
      expect(count).toBeGreaterThan(5);
      expect(elapsedTime).toBeLessThan(500);

      expect(mockPlayer.eventLogs).lengthOf(2);
      expect(mockPlayer.eventLogs[0]).toEqual({ rate: 1.25 });
      expect(mockPlayer.eventLogs[1]).toEqual({ rate: 1.0 });
    });

    it("should reject if no stop conditions are provided", async () => {
      const mockPlayer = createMockPlayer();
      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [],
        pollIntervalMs: 50,
      };

      await expect(applyLatencyControlCommand(command)).rejects.toThrow(
        "No stop conditions provided for latency control",
      );

      expect(mockPlayer.eventLogs).lengthOf(0);
    });

    it("should reject if playback rate is not 1.0 at the beginning", async () => {
      const mockPlayer = createMockPlayer({
        initialPlaybackRate: 1.5,
      });
      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => false],
        pollIntervalMs: 50,
      };

      await expect(applyLatencyControlCommand(command)).rejects.toThrow(
        "Playback rate should be 1.0 to use latency control",
      );

      expect(mockPlayer.eventLogs).lengthOf(0);
    });

    it("should reject if getting the playback rate fails", async () => {
      const mockPlayer = createMockPlayer({
        onGetPlaybackRate: () => {
          throw new Error("Failed to get playback rate");
        },
      });

      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => false],
        pollIntervalMs: 50,
      };

      await expect(applyLatencyControlCommand(command)).rejects.toThrow(
        "Failed to get playback rate",
      );

      expect(mockPlayer.eventLogs).lengthOf(0);
    });

    it("should reject if setting the target playback rate fails", async () => {
      const mockPlayer = createMockPlayer({
        onSetPlaybackRate: () => {
          throw new Error("Failed to set playback rate");
        },
      });

      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => false],
        pollIntervalMs: 50,
      };

      await expect(applyLatencyControlCommand(command)).rejects.toThrow(
        "Failed to set playback rate",
      );

      expect(mockPlayer.eventLogs).lengthOf(0);
    });

    it("should reject if getting the playback rate fails while finishing", async () => {
      let count = 0;

      const mockPlayer = createMockPlayer({
        onGetPlaybackRate: () => {
          if (count > 0) {
            throw new Error("Failed to get playback rate");
          }
        },
      });

      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => ++count > 2],
        pollIntervalMs: 50,
      };

      const promise = applyLatencyControlCommand(command);
      vi.runAllTimers();
      await expect(promise).rejects.toThrow("Failed to get playback rate");
    });

    it("should reject if resetting the playback rate fails while finishing", async () => {
      let count = 0;

      const mockPlayer = createMockPlayer({
        onSetPlaybackRate: () => {
          if (count > 0) {
            throw new Error("Failed to set playback rate");
          }
        },
      });

      const command: LatencyControlCommand = {
        player: mockPlayer,
        targetPlaybackRate: 1.25,
        stopConditions: [() => ++count > 2],
        pollIntervalMs: 50,
      };

      const promise = applyLatencyControlCommand(command);
      vi.runAllTimers();
      await expect(promise).rejects.toThrow("Failed to set playback rate");
    });
  });
}
