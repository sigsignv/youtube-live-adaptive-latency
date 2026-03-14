declare global {
  interface DocumentEventMap {
    "yt-navigate-finish": CustomEvent<NavigateFinishDetail>;
  }
}

type NavigateFinishDetail = {
  pageType: string;
  response: {
    playerResponse: {
      videoDetails: {
        isLive?: boolean;
      };
    };
  };
};

type NavigateCallback = (signal: AbortSignal) => void;

export function onNavigate(callback: NavigateCallback) {
  const controller = new AbortController();
  const signal = controller.signal;

  const listener = (event: CustomEvent<NavigateFinishDetail>) => {
    if (isLiveWatchPage(event.detail)) {
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

function isLiveWatchPage(detail: NavigateFinishDetail): boolean {
  return (
    detail?.pageType === "watch" &&
    !!detail?.response?.playerResponse?.videoDetails?.isLive
  );
}
