import { render } from "solid-js/web";
import App from "./App";

function main() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Mount point not found");
  }

  render(() => <App />, root);
}

main();
