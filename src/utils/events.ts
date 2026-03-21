import * as v from "valibot";

declare global {
  interface DocumentEventMap {
    "yt-navigate-finish": CustomEvent<NavigateFinishDetail>;
  }
}

const NavigateFinishDetailSchema = v.object({
  pageType: v.literal("watch"),
  response: v.object({
    playerResponse: v.object({
      videoDetails: v.object({
        isLive: v.boolean(),
      }),
    }),
  }),
});

type NavigateFinishDetail = v.InferOutput<typeof NavigateFinishDetailSchema>;

type NavigateCallback = (signal: AbortSignal) => void;

export function onNavigate(callback: NavigateCallback) {
  const controller = new AbortController();
  const signal = controller.signal;

  const listener = (event: CustomEvent<NavigateFinishDetail>) => {
    const r = v.safeParse(NavigateFinishDetailSchema, event.detail);
    if (!r.success || !r.output.response.playerResponse.videoDetails.isLive) {
      // Wait for the next navigation event
      return document.addEventListener("yt-navigate-finish", listener, {
        once: true,
        signal,
      });
    }

    const tearDownController = new AbortController();
    const tearDownSignal = tearDownController.signal;

    const tearDown = () => tearDownController.abort();
    document.addEventListener("yt-navigate-finish", tearDown, {
      once: true,
      signal,
    });

    try {
      const abortOrTearDownSignal = AbortSignal.any([signal, tearDownSignal]);
      callback(abortOrTearDownSignal);
    } catch (error) {
      console.error("Error in navigation callback:", error);
    }

    document.addEventListener("yt-navigate-finish", listener, {
      once: true,
      signal,
    });
  };

  document.addEventListener("yt-navigate-finish", listener, {
    once: true,
    signal,
  });

  return () => controller.abort();
}
