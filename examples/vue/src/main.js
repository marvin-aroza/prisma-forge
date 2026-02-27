import { createApp } from "vue";
import "@prismforge/tokens-css/tokens.css";
import "./style.css";
import App from "./App.vue";

document.documentElement.dataset.brand = "nova";
document.documentElement.dataset.mode = "dark";

createApp(App).mount("#app");

