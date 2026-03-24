import { defineUnlistedScript } from "#imports";
import { applyLatencyControlCommand } from "@/utils/control";
import {
  getYouTubePlayer,
  isLiveWatchPage,
  type YouTubePlayer,
} from "~/utils/player";
import { onNavigate } from "../utils/events";

export default defineUnlistedScript(() => {
  const script = document.currentScript;
  if (!script) {
    return;
  }

  script.addEventListener("from-content-script", (event) => {
    if (event instanceof CustomEvent) {
      console.log(`${event.type}:`, event.detail);
    }
  });

  script.dispatchEvent(
    new CustomEvent("from-injected-script", {
      detail: {
        message: "Message from injected script",
      },
    }),
  );

  onNavigate((signal) => {
    const player = getYouTubePlayer();

    if (!isLiveWatchPage(player)) {
      return;
    }

    const adaptiveLatency = () => {
      if (player.getPlaybackRate() !== 1.0) {
        return;
      }

      const stats = player.getVideoStats();
      if (stats.latency_class !== "LOW" && stats.latency_class !== "ULTRALOW") {
        return;
      }

      const latency = getLiveLatency(player);
      if (latency === null) {
        return;
      }

      if (latency < 2.4) {
        console.log({ kind: "slow mode", latency });
        return applyLatencyControlCommand({
          player,
          targetPlaybackRate: 0.95,
          stopConditions: [
            () => {
              const currentLatency = getLiveLatency(player);
              return currentLatency === null || currentLatency > 2.5;
            },
          ],
          pollIntervalMs: 50,
        })
          .then(() => console.log({ kind: "slow mode applied" }))
          .catch((ex) => {
            console.error("Failed to apply latency control command:", ex);
          });
      }

      if (latency > 2.6 && latency < 3.5) {
        console.log({ kind: "fast mode", latency });
        return applyLatencyControlCommand({
          player,
          targetPlaybackRate: 1.05,
          stopConditions: [
            () => {
              const currentLatency = getLiveLatency(player);
              return currentLatency === null || currentLatency < 2.5;
            },
          ],
          pollIntervalMs: 50,
        })
          .then(() => console.log({ kind: "fast mode applied" }))
          .catch((ex) => {
            console.error("Failed to apply latency control command:", ex);
          });
      }

      if (latency >= 3.5) {
        console.log({ kind: "super fast mode", latency });
        return applyLatencyControlCommand({
          player,
          targetPlaybackRate: 1.25,
          stopConditions: [
            () => {
              const currentLatency = getLiveLatency(player);
              return currentLatency === null || currentLatency < 3.5;
            },
          ],
          pollIntervalMs: 500,
        })
          .then(() => console.log({ kind: "super fast mode applied" }))
          .catch((ex) => {
            console.error("Failed to apply latency control command:", ex);
          });
      }
    };

    const video = player.querySelector("video");
    if (!video) {
      return;
    }

    video.addEventListener("playing", adaptiveLatency);
    const timer = setInterval(adaptiveLatency, 10 * 1000);

    signal.addEventListener("abort", () => {
      clearInterval(timer);
      video.removeEventListener("playing", adaptiveLatency);
    });
  });
});

function getLiveLatency(player: YouTubePlayer): number | null {
  const current = Date.now() / 1000;
  const time = player.getMediaReferenceTime();
  return typeof time === "number" && !Number.isNaN(time)
    ? current - time
    : null;
}
