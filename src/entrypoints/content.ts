import { defineContentScript, injectScript } from "#imports";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  allFrames: false,

  async main() {
    const { script } = await injectScript("/injected.js", {
      modifyScript(script) {
        script.addEventListener("from-injected-script", (event) => {
          if (event instanceof CustomEvent) {
            console.log(`${event.type}:`, event.detail);
          }
        });
      },
    });

    script.dispatchEvent(
      new CustomEvent("from-content-script", {
        detail: {
          message: "Message from content script",
        },
      }),
    );
  },
});
