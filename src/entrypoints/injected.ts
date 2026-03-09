import { defineUnlistedScript } from "#imports";

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
});
