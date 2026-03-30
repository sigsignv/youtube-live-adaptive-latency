const stabilityEvents = ["pause", "ratechange", "seeking", "waiting"] as const;

export type StabilityObserverEntry = {
  kind: (typeof stabilityEvents)[number];
  timestamp: number;
};

type StabilityObserverCallback = (
  entries: StabilityObserverEntry[],
  observer: StabilityObserver,
) => void;

export class StabilityObserver {
  private abortController = new AbortController();
  private entries: StabilityObserverEntry[] = [];
  private callback: StabilityObserverCallback;

  constructor(callback: StabilityObserverCallback) {
    this.callback = callback;
  }

  observe(videoElement: HTMLVideoElement) {
    const signal = this.abortController.signal;

    for (const event of stabilityEvents) {
      const listener = (ev: Event) => {
        const entry: StabilityObserverEntry = {
          kind: event,
          timestamp: ev.timeStamp,
        };

        // Remove entries older than 10 minutes
        const activeEntries = Array.from(this.entries).filter(
          (e) => e.timestamp + 10 * 60 * 1000 > entry.timestamp,
        );
        this.entries = [...activeEntries, entry];

        this.callback([...this.entries], this);
      };

      videoElement.addEventListener(event, listener, { signal });
    }
  }

  disconnect() {
    this.abortController.abort();

    this.entries = [];
    this.abortController = new AbortController();
  }
}

export function countBufferingEvents(
  entries: StabilityObserverEntry[],
  withinMs: number,
  now = performance.now(),
): number {
  return entries.filter(
    (e) => e.kind === "waiting" && now - e.timestamp <= withinMs,
  ).length;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("countBufferingEvents", () => {
    it("should count waiting entries within the window", () => {
      const now = 100_000;
      const entries: StabilityObserverEntry[] = [
        { kind: "waiting", timestamp: now - 29_999 },
        { kind: "waiting", timestamp: now - 30_000 },
        { kind: "waiting", timestamp: now - 30_001 },
      ];

      expect(countBufferingEvents(entries, 30_000, now)).toBe(2);
    });

    it("should ignore non-waiting entries", () => {
      const now = 100_000;
      const entries: StabilityObserverEntry[] = [
        { kind: "pause", timestamp: now - 10_000 },
        { kind: "waiting", timestamp: now - 20_000 },
        { kind: "ratechange", timestamp: now - 30_000 },
        { kind: "seeking", timestamp: now - 40_000 },
      ];

      expect(countBufferingEvents(entries, 30_000, now)).toBe(1);
    });

    it("should return 0 for an empty list", () => {
      expect(countBufferingEvents([], 30_000, 100_000)).toBe(0);
    });

    it("should return 0 when there are no waiting entries", () => {
      const now = 100_000;
      const entries: StabilityObserverEntry[] = [
        { kind: "pause", timestamp: now - 10_000 },
        { kind: "ratechange", timestamp: now - 20_000 },
        { kind: "seeking", timestamp: now - 30_000 },
      ];

      expect(countBufferingEvents(entries, 30_000, now)).toBe(0);
    });

    it("should return 0 when waiting entries are outside the window", () => {
      const now = 100_000;
      const entries: StabilityObserverEntry[] = [
        { kind: "waiting", timestamp: now - 40_000 },
        { kind: "waiting", timestamp: now - 50_000 },
      ];

      expect(countBufferingEvents(entries, 30_000, now)).toBe(0);
    });
  });
}
