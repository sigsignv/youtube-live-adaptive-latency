import * as v from "valibot";

declare global {
  interface DocumentEventMap {
    "yt-navigate-finish": CustomEvent<unknown>;
  }
}

const NavigateFinishDetailSchema = v.object({
  pageType: v.literal("watch"),
  response: v.object({
    playerResponse: v.object({
      videoDetails: v.object({
        isLive: v.literal(true),
      }),
    }),
  }),
});

type NavigateCallback = () => Disposer | undefined;

type Disposer = () => void;

export function onNavigate(setup: NavigateCallback): Disposer {
  let dispose: Disposer | undefined;

  const runDispose = () => {
    try {
      dispose?.();
    } catch (ex) {
      console.error(ex);
    } finally {
      dispose = undefined;
    }
  };

  const listener = (event: CustomEvent<unknown>) => {
    runDispose();

    const parsed = v.safeParse(NavigateFinishDetailSchema, event.detail);
    if (!parsed.success) {
      return;
    }

    try {
      dispose = setup();
    } catch (ex) {
      console.error(ex);
    }
  };
  document.addEventListener("yt-navigate-finish", listener);

  return () => {
    document.removeEventListener("yt-navigate-finish", listener);
    runDispose();
  };
}
