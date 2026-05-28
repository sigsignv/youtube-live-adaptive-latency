import { defineContentScript, injectScript } from "#imports";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  allFrames: false,

  async main() {
    await injectScript("/injected.js");
  },
});
