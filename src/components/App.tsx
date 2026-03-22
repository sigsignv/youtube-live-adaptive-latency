import { createSignal, Match, Switch } from "solid-js";
import Settings from "./Settings";
import Watching from "./Watching";

import "./App.css";
import "virtual:uno.css";

export type ViewState = "watching" | "settings";

function App() {
  const [state, setState] = createSignal<ViewState>("watching");

  return (
    <div class="flex flex-col">
      {/* Header */}
      <div class="mb-2 p-2 border-b border-zinc-300">
        <div class="flex items-center justify-between gap-2">
          <div class="w-48 grow shrink-0">
            <h1 class="text-base font-semibold">Adaptive Latency</h1>
          </div>
          <div class="flex-none">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-sm"
              classList={{
                "text-zinc-950 bg-zinc-200 hover:bg-zinc-300":
                  state() !== "settings",
                "text-zinc-50 bg-zinc-900 hover:bg-zinc-800":
                  state() === "settings",
              }}
              onClick={() => {
                setState(state() === "watching" ? "settings" : "watching");
              }}
            >
              settings
            </button>
          </div>
        </div>
      </div>
      {/* Content */}
      <div class="px-2 pb-2">
        <Switch>
          <Match when={state() === "watching"}>
            <Watching />
          </Match>
          <Match when={state() === "settings"}>
            <Settings />
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export default App;
