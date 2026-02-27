import React from "react";
import { createRoot } from "react-dom/client";
import "@prismforge/tokens-css/tokens.css";
import "./styles.css";
import App from "./App";

document.documentElement.dataset.brand = "acme";
document.documentElement.dataset.mode = "light";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

