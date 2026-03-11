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
  const listener = (event: CustomEvent<NavigateFinishDetail>) => {
    if (!isLiveWatchPage(event.detail)) {
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const abort = () => controller.abort();
    document.addEventListener("yt-navigate-finish", abort, { signal });

    try {
      callback(signal);
    } catch (error) {
      console.error({ message: "Error in onNavigate() callback", error });
    }
  };
  document.addEventListener("yt-navigate-finish", listener);

  return () => document.removeEventListener("yt-navigate-finish", listener);
}

function isLiveWatchPage(detail: NavigateFinishDetail): boolean {
  return (
    detail?.pageType === "watch" &&
    !!detail?.response?.playerResponse?.videoDetails?.isLive
  );
}
