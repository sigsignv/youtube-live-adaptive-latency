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
  modules: ["@wxt-dev/module-solid", "@wxt-dev/unocss"],
  imports: false,
  srcDir: "src",
});
