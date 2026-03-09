import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "YouTube Live Adaptive Latency",
    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["https://www.youtube.com/*"],
      },
    ],
  },
  modules: ["@wxt-dev/module-solid"],
  imports: false,
  srcDir: "src",
});
