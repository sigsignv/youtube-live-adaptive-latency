import { defineUnlistedScript } from "#imports";
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
        console.log({ kind: "slow mode" });
        player.setPlaybackRate(0.75);
      } else if (latency > 2.6) {
        console.log({ kind: "fast mode" });
        player.setPlaybackRate(1.25);
      }
      setTimeout(stop, 50);
    };

    const stop = () => {
      const rate = player.getPlaybackRate();
      if (rate !== 0.75 && rate !== 1.25) {
        return;
      }
      const latency = getLiveLatency(player);
      if (latency === null) {
        setTimeout(stop, 50);
        return;
      }

      if (latency > 2.4 && latency < 2.6) {
        console.log({ kind: "stop fast/slow mode" });
        player.setPlaybackRate(1.0);
      } else {
        setTimeout(stop, 50);
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
