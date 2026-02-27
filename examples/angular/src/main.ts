import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component";

document.documentElement.dataset["brand"] = "acme";
document.documentElement.dataset["mode"] = "dark";

bootstrapApplication(AppComponent).catch((err) => console.error(err));
