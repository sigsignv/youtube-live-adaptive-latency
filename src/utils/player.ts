import * as v from "valibot";

const VideoStatsSchema = v.object({
  latency_class: v.picklist(["NORMAL", "LOW", "ULTRALOW"]),
  live: v.picklist(["live", "dvr"]),
});

type VideoStats = v.InferOutput<typeof VideoStatsSchema>;

export type YouTubePlayer = HTMLElement & {
  getVideoStats(): VideoStats;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getMediaReferenceTime(): number;
};

export function getYouTubePlayer(): YouTubePlayer {
  const player = document.getElementById("movie_player");

  if (!player || !isYouTubePlayer(player)) {
    throw new Error("YouTube Player is unavailable");
  }

  return player;
}

function isYouTubePlayer(player: HTMLElement): player is YouTubePlayer {
  const requireMethods = new Set([
    "getVideoStats",
    "getPlaybackRate",
    "setPlaybackRate",
    "getMediaReferenceTime",
  ]);

  return requireMethods.isSubsetOf(new Set(Object.keys(player)));
}

export function getVideoStats(player: YouTubePlayer): VideoStats | null {
  let stats: VideoStats;

  try {
    stats = player.getVideoStats();
  } catch (error) {
    console.error("Failed to get video stats:", error);
    return null;
  }

  const r = v.safeParse(VideoStatsSchema, stats);
  if (!r.success) {
    return null;
  }

  return r.output;
}

export function isLiveWatchPage(player: YouTubePlayer): boolean {
  const stats = getVideoStats(player);
  if (!stats) {
    return false;
  }

  return stats.live === "live" || stats.live === "dvr";
}
