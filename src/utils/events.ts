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

type NavigateCallback = () => Disposer | undefined;

type Disposer = () => void;

export function onNavigate(callback: NavigateCallback) {
  let dispose: Disposer | undefined;

  const runDispose = () => {
    try {
      dispose?.();
    } catch (error) {
      console.error("Error in navigation disposer:", error);
    } finally {
      dispose = undefined;
    }
  };

  const listener = (event: CustomEvent<NavigateFinishDetail>) => {
    runDispose();

    const r = v.safeParse(NavigateFinishDetailSchema, event.detail);
    if (!r.success || !r.output.response.playerResponse.videoDetails.isLive) {
      return;
    }

    try {
      dispose = callback();
    } catch (error) {
      console.error("Error in navigation callback:", error);
    }
  };
  document.addEventListener("yt-navigate-finish", listener);

  return () => {
    document.removeEventListener("yt-navigate-finish", listener);
    runDispose();
  };
}
