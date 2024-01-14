import "./app.css";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app") as unknown as Document,
});

export default app;
